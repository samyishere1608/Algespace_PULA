using Dapper;
using Microsoft.Data.Sqlite;
using System.Text.Json;
using webapi.Models.Anchors;
using webapi.Models.Student;

namespace webapi.Services
{
    /// <summary>
    /// Writes the student timeline: one row per thing that happened, grouped into sessions.
    ///
    /// WHY THIS EXISTS. The record of a session is spread across eight tables, each with its own key
    /// and shape, so answering "what did this student do from the daily plan to the end of the session"
    /// means a seven-way union by timestamp - and it has to be rewritten every time a module is added.
    /// This is a spine, not a replacement: it records what happened, when, and which value was chosen,
    /// and points at the table that holds the detail.
    ///
    /// TWO DECISIONS WORTH KNOWING.
    ///
    /// 1. The session is resolved HERE, not passed in. A caller writes an event and the open session
    ///    for that student is looked up. Threading a session id through every existing request model
    ///    would have meant changing a dozen contracts, and any call site that forgot it would file its
    ///    event under no session at all.
    ///
    /// 2. Values are constants, mirrored into a labels table at startup. The agency log's source column
    ///    is the cautionary tale: 45 values across 287 rows, 25 of them appearing once, because a row
    ///    id was pasted into a category name. An id belongs in a column.
    /// </summary>
    public static class StudentEventLog
    {
        /// <summary>
        /// How long an open session stays open before the next dashboard visit replaces it.
        ///
        /// The session is meant to end when the student presses End Session. A student who closes the
        /// tab instead never presses it, so without this the sitting would still be open the next day
        /// and every later event would join it. Generous on purpose: twelve hours cannot split a real
        /// sitting, only an abandoned one.
        /// </summary>
        private static readonly TimeSpan SessionLifetime = TimeSpan.FromHours(12);

        private static readonly string AppVersion =
            typeof(StudentEventLog).Assembly.GetName().Version?.ToString() ?? "";

        private static bool _schemaChecked;

        // ── Schema ───────────────────────────────────────────────────────────

        public static void EnsureTables(SqliteConnection conn)
        {
            if (_schemaChecked) return;

            conn.Execute($"CREATE TABLE IF NOT EXISTS {StudentLogTable.EventTable} ({StudentLogTable.EventScheme})");
            conn.Execute($"CREATE TABLE IF NOT EXISTS {StudentLogTable.SessionTable} ({StudentLogTable.SessionScheme})");
            conn.Execute($"CREATE TABLE IF NOT EXISTS {StudentLogTable.VocabularyTable} ({StudentLogTable.VocabularyScheme})");

            // The two queries the timeline is actually read with: one student's session in order, and
            // everything of one kind over a period.
            conn.Execute(
                $"CREATE INDEX IF NOT EXISTS IX_{StudentLogTable.EventTable}_Student_Time " +
                $"ON {StudentLogTable.EventTable} (StudentId, OccurredAt)");
            conn.Execute(
                $"CREATE INDEX IF NOT EXISTS IX_{StudentLogTable.EventTable}_Session " +
                $"ON {StudentLogTable.EventTable} (SessionId, OccurredAt)");
            conn.Execute(
                $"CREATE INDEX IF NOT EXISTS IX_{StudentLogTable.EventTable}_Type_Time " +
                $"ON {StudentLogTable.EventTable} (EventType, OccurredAt)");
            conn.Execute(
                $"CREATE INDEX IF NOT EXISTS IX_{StudentLogTable.EventTable}_Attempt " +
                $"ON {StudentLogTable.EventTable} (AttemptId)");
            conn.Execute(
                $"CREATE INDEX IF NOT EXISTS IX_{StudentLogTable.SessionTable}_Open " +
                $"ON {StudentLogTable.SessionTable} (StudentId, EndedAt)");

            SeedVocabulary(conn);

            _schemaChecked = true;
        }

        /// <summary>
        /// Writes the labels for every value the log may take, so a chart or the data dictionary can
        /// name a value without anyone reading the code that writes it.
        /// </summary>
        private static void SeedVocabulary(SqliteConnection conn)
        {
            foreach (var (value, label) in LogEventType.All)
                Upsert(conn, StudentLogTable.KindEventType, value, label);

            foreach (var (value, label) in LogAgencySource.All)
                Upsert(conn, StudentLogTable.KindAgencySource, value, label);

            static void Upsert(SqliteConnection conn, string kind, string value, string label) =>
                conn.Execute(
                    $"INSERT INTO {StudentLogTable.VocabularyTable} (Kind, Value, Label) VALUES (@Kind, @Value, @Label) " +
                    "ON CONFLICT(Kind, Value) DO UPDATE SET Label = @Label",
                    new { Kind = kind, Value = value, Label = label });
        }

        // ── Sessions ─────────────────────────────────────────────────────────

        /// <summary>
        /// Opens a sitting, or hands back the one already open.
        ///
        /// Resuming rather than replacing matters because the client asks once per browser sitting but
        /// the dashboard is remounted every time the student comes back from an exercise. Replacing on
        /// every mount would split one sitting into eight.
        /// </summary>
        public static StartSessionResponse StartSession(SqliteConnection conn, long studentId, string language)
        {
            var open = OpenSession(conn, studentId);
            if (open is not null)
                return new StartSessionResponse { SessionId = open.Id, StartedAt = open.StartedAt, Resumed = true };

            var now = LogStamp.Now();
            var id = $"s-{studentId}-{Guid.NewGuid():N}"[..28];

            conn.Execute(
                $"INSERT INTO {StudentLogTable.SessionTable} (Id, StudentId, StartedAt, EndedAt, Language) " +
                "VALUES (@Id, @StudentId, @StartedAt, '', @Language)",
                new { Id = id, StudentId = studentId, StartedAt = now, Language = language ?? "" });

            // Written with the session explicit: there was no open session to look up a moment ago.
            WriteInSession(conn, studentId, id, LogEventType.SessionStarted, data: new { resumed = false }, language: language ?? "");

            return new StartSessionResponse { SessionId = id, StartedAt = now, Resumed = false };
        }

        /// <summary>
        /// Closes the sitting and records what it was made of.
        ///
        /// The abandoned exercises are worked out HERE rather than at the moment the student walks away,
        /// because "opened and never finished" is only knowable once the sitting is over - an exercise
        /// opened at 14:00 and finished at 14:20 is not abandoned, and nothing at 14:05 could tell.
        /// </summary>
        public static EndSessionResponse EndSession(SqliteConnection conn, long studentId, string reason)
        {
            var open = OpenSession(conn, studentId);
            if (open is null) return new EndSessionResponse();

            var now = LogStamp.Now();

            // An exercise the student opened in this sitting and never finished. Read from the spine
            // itself, so it is exact rather than inferred from a timestamp window.
            var abandoned = conn.Query<(long AttemptId, string ExerciseType)>(
                $"SELECT e.AttemptId AS AttemptId, COALESCE(a.ExerciseType, '') AS ExerciseType " +
                $"FROM {StudentLogTable.EventTable} e " +
                $"LEFT JOIN {AnchorStoreSettings.Table} a ON a.Id = e.AttemptId " +
                "WHERE e.SessionId = @SessionId AND e.EventType = @Started AND e.AttemptId > 0 " +
                $"AND NOT EXISTS (SELECT 1 FROM {StudentLogTable.EventTable} c " +
                "                WHERE c.AttemptId = e.AttemptId AND c.EventType = @Completed)",
                new { SessionId = open.Id, Started = LogEventType.ExerciseStarted, Completed = LogEventType.ExerciseCompleted })
                .ToList();

            foreach (var (attemptId, exerciseType) in abandoned)
                WriteInSession(conn, studentId, open.Id, LogEventType.ExerciseAbandoned, attemptId: attemptId,
                    value: exerciseType, data: new { reason = "opened and never finished before the session ended" });

            var minutes = 0;
            if (DateTime.TryParse(open.StartedAt, null, System.Globalization.DateTimeStyles.AdjustToUniversal | System.Globalization.DateTimeStyles.AssumeUniversal, out var started))
                minutes = (int)Math.Max(0, (DateTime.UtcNow - started).TotalMinutes);

            WriteInSession(conn, studentId, open.Id, LogEventType.SessionEnded,
                amount: minutes, data: new { reason, abandonedExercises = abandoned.Count });

            conn.Execute(
                $"UPDATE {StudentLogTable.SessionTable} SET EndedAt = @EndedAt WHERE Id = @Id",
                new { Id = open.Id, EndedAt = now });

            return new EndSessionResponse
            {
                SessionId = open.Id,
                AbandonedExercises = abandoned.Count,
                StartedAt = open.StartedAt,
                EndedAt = now,
            };
        }

        /// <summary>The sitting currently open for this student, if there is one.</summary>
        public static string CurrentSessionId(SqliteConnection conn, long studentId) =>
            OpenSession(conn, studentId)?.Id ?? "";

        private static SessionRow? OpenSession(SqliteConnection conn, long studentId)
        {
            var open = conn.QueryFirstOrDefault<SessionRow>(
                $"SELECT Id, StartedAt FROM {StudentLogTable.SessionTable} " +
                "WHERE StudentId = @StudentId AND EndedAt = '' ORDER BY StartedAt DESC LIMIT 1",
                new { StudentId = studentId });

            if (open is null) return null;

            // A session nobody closed. Closed quietly rather than reported, so the sitting it belongs to
            // still has an end time and the next event does not join it.
            if (DateTime.TryParse(open.StartedAt, null, System.Globalization.DateTimeStyles.AdjustToUniversal | System.Globalization.DateTimeStyles.AssumeUniversal, out var started)
                && DateTime.UtcNow - started > SessionLifetime)
            {
                conn.Execute(
                    $"UPDATE {StudentLogTable.SessionTable} SET EndedAt = @EndedAt WHERE Id = @Id",
                    new { Id = open.Id, EndedAt = LogStamp.Now() });

                WriteInSession(conn, studentId, open.Id, LogEventType.SessionEnded,
                    data: new { reason = "closed automatically: the student never pressed End Session" });

                return null;
            }

            return open;
        }

        private sealed class SessionRow
        {
            public string Id { get; set; } = "";
            public string StartedAt { get; set; } = "";
        }

        // ── Events ───────────────────────────────────────────────────────────

        /// <summary>
        /// Records one thing that happened, filed under whatever session is open.
        ///
        /// Never throws and never fails the caller: a logging failure must not break the exercise the
        /// student is in the middle of. The caller's own write is already done by this point.
        /// </summary>
        public static void Write(
            SqliteConnection conn,
            long studentId,
            string eventType,
            long attemptId = 0,
            string refId = "",
            string value = "",
            int amount = 0,
            object? data = null,
            string language = "")
        {
            if (studentId <= 0) return;

            try
            {
                WriteInSession(conn, studentId, CurrentSessionId(conn, studentId), eventType,
                    attemptId, refId, value, amount, data, language);
            }
            catch (Exception exception)
            {
                Console.WriteLine($"[Log] {eventType} for student {studentId} could not be written - {exception.Message}");
            }
        }

        private static void WriteInSession(
            SqliteConnection conn,
            long studentId,
            string sessionId,
            string eventType,
            long attemptId = 0,
            string refId = "",
            string value = "",
            int amount = 0,
            object? data = null,
            string language = "")
        {
            conn.Execute(
                $"INSERT INTO {StudentLogTable.EventTable} " +
                "(StudentId, OccurredAt, EventType, SessionId, AttemptId, RefId, Value, Amount, Data, SchemaVersion, AppVersion, Language) " +
                "VALUES (@StudentId, @OccurredAt, @EventType, @SessionId, @AttemptId, @RefId, @Value, @Amount, @Data, 1, @AppVersion, @Language)",
                new
                {
                    StudentId = studentId,
                    OccurredAt = LogStamp.Now(),
                    EventType = eventType,
                    SessionId = sessionId ?? "",
                    AttemptId = attemptId,
                    RefId = Truncate(refId, 120),
                    Value = Truncate(value, 400),
                    Amount = amount,
                    Data = data is null ? "{}" : JsonSerializer.Serialize(data),
                    AppVersion,
                    Language = language ?? "",
                });
        }

        /// <summary>
        /// Keeps a runaway caller from filling the table with one enormous value. The free text of an
        /// answer is not stored here - the answer itself belongs on the reflection row this event
        /// points at, and only its length is recorded.
        /// </summary>
        private static string Truncate(string value, int max) =>
            string.IsNullOrEmpty(value) ? "" : value.Length <= max ? value : value[..max];
    }
}
