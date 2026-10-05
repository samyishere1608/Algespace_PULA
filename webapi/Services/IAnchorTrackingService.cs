using Dapper;
using Microsoft.Data.Sqlite;
using webapi.Models.Anchors;
using webapi.Models.Database;

namespace webapi.Services
{
    /// <summary>
    /// Persistence and read-back for the adaptive anchors, in our own store.
    /// </summary>
    public interface IAnchorTrackingService
    {
        long StartAttempt(long studentId, string exerciseType, long exerciseId, string agentCondition, bool isStudy);
        void AddAction(long studentId, long attemptId, string name, string action);
        void TrackChoice(long studentId, long attemptId, string name, string choice);
        void TrackType(long studentId, long attemptId, string name, int type);
        void CompleteAttempt(long studentId, long attemptId, double time, int errors, int hints);
        void CompletePhase(long studentId, long attemptId, string name, double time, int errors, int hints, string? choice);

        int GetRecentErrors(long studentId, string name, int limit, int yesAnchor, bool total, string? method = null);
        int GetRecentHints(long studentId, string name, int limit, int yesAnchor, bool total, string? method = null);
        double GetRecentTime(long studentId, string name, int limit, int yesAnchor, bool total, string? method = null);
        bool HasEngaged(long studentId, string name, int yesAnchor);
        int GetAttemptCount(long studentId);
        bool IsMethodImbalanced(long studentId, bool compare, int method1, int method2);

        AvoidanceProfile GetProfile(long studentId);

        /// <summary>
        /// Every completed exercise, flattened into the six goal dimensions, oldest first.
        /// Pass <paramref name="since"/> (an <c>yyyy-MM-ddTHH:mm:ss</c> stamp) to restrict to
        /// attempts completed at or after that moment — the client uses the oldest active goal's
        /// start so a goal only ever counts work done after it was set.
        /// </summary>
        IReadOnlyList<GoalEvent> GetGoalEvents(long studentId, string? since = null);
    }

    /// <summary>
    /// Reads and writes the anchor store.
    ///
    /// The read methods deliberately mirror the study service's semantics so that the existing
    /// decision engines — which decide whether to intervene and what kind of message to show — keep
    /// behaving exactly as they do today. That logic is the valuable part and is reused unchanged;
    /// only its data source differs.
    ///
    /// One semantic worth recording, because it is easy to miss: the study service's "optional" reads
    /// are NOT an optional filter. They restrict history to attempts where the student chose YES at a
    /// particular decision point. The classifier is therefore already comparing "how did it go when I
    /// chose to engage" against "how did it go overall" — an early form of the avoidance reasoning
    /// this feature builds on.
    /// </summary>
    public class AnchorTrackingService : IAnchorTrackingService
    {
        // ── Writes ───────────────────────────────────────────────────────────

        public long StartAttempt(long studentId, string exerciseType, long exerciseId, string agentCondition, bool isStudy)
        {
            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();

            return conn.ExecuteScalar<long>(
                $"INSERT INTO {AnchorStoreSettings.Table} " +
                "(StudentId, ExerciseType, ExerciseId, AgentCondition, IsStudy, StartedAt) " +
                "VALUES (@StudentId, @ExerciseType, @ExerciseId, @AgentCondition, @IsStudy, @StartedAt); " +
                "SELECT last_insert_rowid()",
                new
                {
                    StudentId = studentId,
                    ExerciseType = exerciseType ?? string.Empty,
                    ExerciseId = exerciseId,
                    AgentCondition = agentCondition ?? string.Empty,
                    IsStudy = isStudy ? 1 : 0,
                    StartedAt = AnchorStoreSettings.NowStamp()
                });
        }

        public void AddAction(long studentId, long attemptId, string name, string action)
        {
            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();

            using var tx = conn.BeginTransaction(deferred: false);

            // BEGIN IMMEDIATE rather than the default BEGIN. The upsert below has to read in order to
            // decide whether to insert or update, so a deferred transaction takes a read snapshot first
            // and then tries to upgrade to a writer. Under WAL that upgrade FAILS with "database is
            // locked" if any other write landed in between — and the failure is returned without
            // consulting the busy timeout, because waiting cannot fix a stale snapshot. Taking the
            // write lock up front means the wait applies properly and the statement cannot lose the
            // race halfway through.
            //
            // Actions accumulate, so this appends rather than replaces. Upserting first guarantees the
            // row exists, which keeps the append atomic instead of a read-modify-write race.
            conn.Execute(
                $"INSERT INTO {AnchorStoreSettings.RecordTable} (AttemptId, StudentId, Name, Actions, UpdatedAt) " +
                "VALUES (@AttemptId, @StudentId, @Name, @Action, @UpdatedAt) " +
                "ON CONFLICT(AttemptId, Name) DO UPDATE SET " +
                "Actions = CASE WHEN Actions = '' THEN @Action ELSE Actions || char(10) || @Action END, " +
                "UpdatedAt = @UpdatedAt",
                new { AttemptId = attemptId, StudentId = studentId, Name = name, Action = action, UpdatedAt = AnchorStoreSettings.NowStamp() },
                tx);

            // Denormalise the chosen method onto the attempt, so the profile and the history queries
            // can ask "which method did they use" without joining back through the record table.
            if (string.Equals(name, "SelectedMethod", StringComparison.Ordinal) && !string.IsNullOrWhiteSpace(action))
            {
                conn.Execute(
                    $"UPDATE {AnchorStoreSettings.Table} SET SelectedMethod = @Method " +
                    "WHERE Id = @Id AND StudentId = @StudentId",
                    new { Method = action, Id = attemptId, StudentId = studentId }, tx);
            }

            tx.Commit();
        }

        public void TrackChoice(long studentId, long attemptId, string name, string choice)
            => UpsertRecord(studentId, attemptId, name, choice: choice);

        public void TrackType(long studentId, long attemptId, string name, int type)
            => UpsertRecord(studentId, attemptId, name, messageType: type);

        public void CompletePhase(long studentId, long attemptId, string name, double time, int errors, int hints, string? choice)
            => UpsertRecord(studentId, attemptId, name, time: time, errors: errors, hints: hints, choice: choice);

        public void CompleteAttempt(long studentId, long attemptId, double time, int errors, int hints)
        {
            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();

            conn.Execute(
                $"UPDATE {AnchorStoreSettings.Table} SET TotalTime = @Time, TotalErrors = @Errors, " +
                "TotalHints = @Hints, CompletedAt = @CompletedAt WHERE Id = @Id AND StudentId = @StudentId",
                new
                {
                    Time = time,
                    Errors = errors,
                    Hints = hints,
                    CompletedAt = AnchorStoreSettings.NowStamp(),
                    Id = attemptId,
                    StudentId = studentId
                });
        }

        /// <summary>
        /// Inserts or updates one named tracking point. Only the supplied fields are written, so a
        /// choice update and a phase-timing update on the same name cannot clobber each other.
        ///
        /// The COALESCE calls on INSERT are load-bearing, not decoration. SQLite applies a column
        /// default only when the column is left out of the statement; naming it and passing NULL
        /// stores NULL, which the NOT NULL constraints then reject. Since a partial update
        /// deliberately passes NULL for the fields it is not touching, every such call would fail
        /// without them — a tracked choice would have thrown, and the row it was meant to write
        /// would never have existed.
        /// </summary>
        private static void UpsertRecord(
            long studentId, long attemptId, string name,
            string? choice = null, int? messageType = null,
            double? time = null, int? errors = null, int? hints = null)
        {
            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();

            conn.Execute(
                $"INSERT INTO {AnchorStoreSettings.RecordTable} " +
                "(AttemptId, StudentId, Name, Choice, MessageType, Time, Errors, Hints, UpdatedAt) " +
                "VALUES (@AttemptId, @StudentId, @Name, COALESCE(@Choice, ''), @MessageType, " +
                "        COALESCE(@Time, 0), COALESCE(@Errors, 0), COALESCE(@Hints, 0), @UpdatedAt) " +
                "ON CONFLICT(AttemptId, Name) DO UPDATE SET " +
                "Choice      = CASE WHEN @Choice      IS NULL THEN Choice      ELSE @Choice      END, " +
                "MessageType = CASE WHEN @MessageType IS NULL THEN MessageType ELSE @MessageType END, " +
                "Time        = CASE WHEN @Time        IS NULL THEN Time        ELSE @Time        END, " +
                "Errors      = CASE WHEN @Errors      IS NULL THEN Errors      ELSE @Errors      END, " +
                "Hints       = CASE WHEN @Hints       IS NULL THEN Hints       ELSE @Hints       END, " +
                "UpdatedAt   = @UpdatedAt",
                new
                {
                    AttemptId = attemptId,
                    StudentId = studentId,
                    Name = name,
                    Choice = choice,
                    MessageType = messageType,
                    Time = time,
                    Errors = errors,
                    Hints = hints,
                    UpdatedAt = AnchorStoreSettings.NowStamp()
                });
        }

        // ── Reads (mirroring the study service) ──────────────────────────────

        public int GetRecentErrors(long studentId, string name, int limit, int yesAnchor, bool total, string? method = null)
            => (int)Math.Round(ReadHistory(studentId, name, limit, yesAnchor, total, method, "Errors", average: false));

        public int GetRecentHints(long studentId, string name, int limit, int yesAnchor, bool total, string? method = null)
            => (int)Math.Round(ReadHistory(studentId, name, limit, yesAnchor, total, method, "Hints", average: false));

        public double GetRecentTime(long studentId, string name, int limit, int yesAnchor, bool total, string? method = null)
            => ReadHistory(studentId, name, limit, yesAnchor, total, method, "Time", average: true);

        /// <summary>
        /// Shared implementation of the history readers.
        ///
        /// <paramref name="total"/> reads whole-attempt totals (the study's behaviour), otherwise the
        /// named phase. Sums for errors and hints, averages for time — matching the study service,
        /// because the decision thresholds were tuned against exactly that behaviour.
        /// </summary>
        private static double ReadHistory(
            long studentId, string name, int limit, int yesAnchor, bool total, string? method, string column, bool average)
        {
            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();

            var aggregate = average ? "AVG" : "SUM";
            var parameters = new DynamicParameters();
            parameters.Add("StudentId", studentId);
            parameters.Add("Limit", limit);

            if (total)
            {
                var attemptColumn = column == "Time" ? "TotalTime" : "Total" + column;
                var excludeZero = column == "Time" ? $"AND {attemptColumn} != 0" : string.Empty;

                var totalSql =
                    $"SELECT COALESCE({aggregate}({attemptColumn}), 0) FROM (" +
                    $"  SELECT {attemptColumn} FROM {AnchorStoreSettings.Table} " +
                    $"  WHERE StudentId = @StudentId {excludeZero} " +
                    $"  ORDER BY Id DESC LIMIT @Limit)";

                return conn.ExecuteScalar<double?>(totalSql, parameters) ?? 0;
            }

            parameters.Add("Name", name);
            var yesFilter = AddYesFilter(parameters, yesAnchor);
            var methodFilter = AddMethodFilter(parameters, method);

            // Order inside the subquery then aggregate outside: LIMIT must apply before SUM/AVG, or
            // the aggregate collapses to one row and the limit becomes meaningless.
            var sql =
                $"SELECT COALESCE({aggregate}(t.{column}), 0) FROM (" +
                $"  SELECT r.{column} AS {column} FROM {AnchorStoreSettings.RecordTable} r " +
                $"  JOIN {AnchorStoreSettings.Table} a ON a.Id = r.AttemptId " +
                $"  WHERE r.StudentId = @StudentId AND r.Name = @Name {yesFilter} {methodFilter} " +
                $"  ORDER BY r.Id DESC LIMIT @Limit) t";

            return conn.ExecuteScalar<double?>(sql, parameters) ?? 0;
        }

        public bool HasEngaged(long studentId, string name, int yesAnchor)
        {
            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();

            var parameters = new DynamicParameters();
            parameters.Add("StudentId", studentId);
            parameters.Add("Name", name);
            var yesFilter = AddYesFilter(parameters, yesAnchor);

            var sql =
                $"SELECT COUNT(*) FROM {AnchorStoreSettings.RecordTable} r " +
                $"JOIN {AnchorStoreSettings.Table} a ON a.Id = r.AttemptId " +
                $"WHERE r.StudentId = @StudentId AND r.Name = @Name {yesFilter}";

            return conn.ExecuteScalar<int>(sql, parameters) > 0;
        }

        public int GetAttemptCount(long studentId)
        {
            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();

            return conn.ExecuteScalar<int>(
                $"SELECT COUNT(*) FROM {AnchorStoreSettings.Table} WHERE StudentId = @StudentId",
                new { StudentId = studentId });
        }

        /// <summary>
        /// Whether the student's method usage is unbalanced. Behaviour ported unchanged from the study
        /// service, because the comparison and resolving engines branch on it.
        /// </summary>
        public bool IsMethodImbalanced(long studentId, bool compare, int method1, int method2)
        {
            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();

            var methodCounts = conn.Query<MethodCountRow>(
                $"SELECT SelectedMethod, COUNT(*) AS Count FROM {AnchorStoreSettings.Table} " +
                "WHERE StudentId = @StudentId AND SelectedMethod != '' GROUP BY SelectedMethod",
                new { StudentId = studentId })
                .ToDictionary(r => r.SelectedMethod, r => r.Count, StringComparer.OrdinalIgnoreCase);

            int CountOf(int method) => method switch
            {
                0 => methodCounts.GetValueOrDefault("Equalization"),
                1 => methodCounts.GetValueOrDefault("Substitution"),
                2 => methodCounts.GetValueOrDefault("Elimination"),
                _ => -1
            };

            var counts = new[] { CountOf(0), CountOf(1), CountOf(2) };

            // No method recorded yet — nothing to be unbalanced about.
            if (counts.All(c => c == 0)) return false;

            if (compare)
            {
                var efficient = CountOf(method1);
                if (efficient < 0) return false;

                var other = CountOf(method2);
                // Callers can pass an out-of-range second method; the study service treated that as
                // "compare against whichever method they use most".
                if (other < 0) other = counts.Max();

                return (other - efficient) > 2 || efficient == 0;
            }

            return (counts.Max() - counts.Min()) > 3;
        }

        /// <summary>
        /// Restricts history to attempts in which the student actually carried out the named phase.
        /// The study service expressed this as "the column for that method is non-empty"; the
        /// equivalent here is the presence of a record with that name, which keeps the meaning
        /// ("they did this phase") rather than approximating it from the selected method.
        /// </summary>
        private static string AddMethodFilter(DynamicParameters parameters, string? method)
        {
            if (string.IsNullOrWhiteSpace(method)) return string.Empty;

            parameters.Add("Method", method);

            return $"AND EXISTS (SELECT 1 FROM {AnchorStoreSettings.RecordTable} m " +
                   "WHERE m.AttemptId = a.Id AND m.Name = @Method)";
        }

        /// <summary>
        /// Adds a filter restricting history to attempts where the student chose YES at one decision
        /// point, ignoring choices later overridden to No. Mirrors the study service's BuildWhereClause.
        ///
        /// <paramref name="yesAnchor"/> is −1 for no filter, otherwise the study service's op_int:
        /// 0 self-explanation, 1 comparison, 2 resolving, 3 first solution, 4 second solution.
        /// Some anchors answer with a bare "Yes"/"No" and others with "Yes to Elimination", so these
        /// are prefix matches rather than equalities — which also makes the equality cases work.
        /// </summary>
        private static string AddYesFilter(DynamicParameters parameters, int yesAnchor)
        {
            var (baseChoice, interventionChoice) = yesAnchor switch
            {
                0 => ("SelfExplanationChoice", "SelfExplanationInterventionChoice"),
                1 => ("ComparisonChoice", "ComparisonInterventionChoice"),
                2 => ("ResolvingChoice", "ResolvingInterventionChoice"),
                3 => ("FirstSolutionChoice", "FirstSolutionInterventionChoice"),
                4 => ("SecondSolutionChoice", "SecondSolutionInterventionChoice"),
                _ => (null, null)
            };

            if (baseChoice is null || interventionChoice is null) return string.Empty;

            parameters.Add("YesBase", baseChoice);
            parameters.Add("YesIntervention", interventionChoice);

            var table = AnchorStoreSettings.RecordTable;

            return
                $"AND EXISTS (SELECT 1 FROM {table} c WHERE c.AttemptId = a.Id AND (" +
                "  (c.Name = @YesBase AND c.Choice LIKE 'Yes%')" +
                $"  OR (c.Name = @YesIntervention AND c.Choice LIKE 'Yes%' AND NOT EXISTS (" +
                $"       SELECT 1 FROM {table} d WHERE d.AttemptId = a.Id " +
                "        AND d.Name = @YesIntervention AND d.Choice LIKE 'No%'))))";
        }

        // ── Avoidance profile ────────────────────────────────────────────────

        /// <summary>
        /// Builds the profile from the student's own rows.
        ///
        /// Loads the rows and groups in memory rather than issuing six aggregate queries. A student
        /// accumulates a few hundred rows at most, so the cost is immaterial, and it keeps the
        /// definition of each dimension readable in one place — which matters more here, because
        /// these definitions ARE the measurement.
        /// </summary>
        public AvoidanceProfile GetProfile(long studentId)
        {
            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();

            var attempts = LoadAttempts(conn, studentId);
            var byAttempt = LoadRecords(conn, studentId)
                .GroupBy(r => r.AttemptId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var stats = new List<ElementStat>();

            // Method and exercise type are distributions: every attempt is an opportunity, and the
            // question is how the student spreads themselves across the options.
            stats.AddRange(Distribution(AnchorElement.Method, attempts, a => a.SelectedMethod,
                AnchorDimension.Methods));

            stats.AddRange(Distribution(AnchorElement.ExerciseType, attempts, a => a.ExerciseType,
                AnchorDimension.ExerciseTypes));

            // The rest are yes/no, read from the decision points.
            stats.Add(YesNo(AnchorElement.SolveOnOwn, "Work out the solution yourself", attempts, byAttempt,
                AnchorDimension.SolveOnOwn));

            stats.Add(YesNo(AnchorElement.SelfExplanation, "Explain your own reasoning", attempts, byAttempt,
                AnchorDimension.SelfExplanation));

            stats.Add(YesNo(AnchorElement.MethodComparison, "Compare methods", attempts, byAttempt,
                AnchorDimension.MethodComparison));

            var completed = attempts.Where(a => a.TotalErrors > 0 || a.TotalHints > 0).ToList();

            var gaps = stats
                .Where(s => s.IsGap)
                .OrderBy(s => s.EngagementRate)
                .ThenBy(s => s.Element, StringComparer.Ordinal)
                .ToList();

            return new AvoidanceProfile
            {
                StudentId = studentId,
                ComputedAt = AnchorStoreSettings.NowStamp(),
                Attempts = attempts.Count,
                Elements = stats,
                Gaps = gaps,
                AverageHints = completed.Count > 0 ? Math.Round(completed.Average(a => (double)a.TotalHints), 2) : null,
                AverageErrors = completed.Count > 0 ? Math.Round(completed.Average(a => (double)a.TotalErrors), 2) : null,
            };
        }

        /// <summary>One stat per possible value, with each attempt counting as an opportunity.</summary>
        private static IEnumerable<ElementStat> Distribution(
            string element, List<AttemptRow> attempts,
            Func<AttemptRow, string> valueOf, string[] values)        {
            var eligible = attempts.Where(a => !string.IsNullOrWhiteSpace(valueOf(a))).ToList();

            foreach (var value in values)
            {
                var engaged = eligible.Count(a => string.Equals(valueOf(a), value, StringComparison.OrdinalIgnoreCase));
                yield return Build(element, value, eligible.Count, engaged, value);
            }
        }

        private static ElementStat YesNo(
            string element, string label, List<AttemptRow> attempts,
            Dictionary<long, List<RecordRow>> byAttempt, string[] decisionNames)
        {
            var opportunities = 0;
            var engaged = 0;

            foreach (var attempt in attempts)
            {
                if (!byAttempt.TryGetValue(attempt.Id, out var records)) continue;

                var decisions = records
                    .Where(r => decisionNames.Contains(r.Name, StringComparer.Ordinal))
                    .ToList();

                if (decisions.Count == 0) continue;

                opportunities++;

                // "Yes to Elimination" and a bare "Yes" both count as engaging, matching the reader above.
                if (decisions.Any(d => d.Choice.StartsWith("Yes", StringComparison.OrdinalIgnoreCase)))
                    engaged++;
            }

            return Build(element, string.Empty, opportunities, engaged, label);
        }

        private static ElementStat Build(string element, string value, int opportunities, int engaged, string label)
        {
            var rate = opportunities > 0 ? Math.Round((double)engaged / opportunities, 2) : 0;

            // A gap needs BOTH enough evidence and sustained avoidance. Without the observation floor,
            // a student who declined the first two offers would be labelled an avoider on no evidence —
            // and declining twice is often a deliberate, reasonable choice, not avoidance.
            var isGap = opportunities >= GapThresholds.MinOpportunities
                        && rate <= GapThresholds.MaxEngagementRate;

            return new ElementStat
            {
                Element = element,
                Value = value,
                Opportunities = opportunities,
                Engaged = engaged,
                EngagementRate = rate,
                IsGap = isGap,
                Label = label,
            };
        }

        // ── Goal events ──────────────────────────────────────────────────────

        /// <summary>
        /// Flattens the student's completed exercises into the six goal dimensions.
        ///
        /// Shares <see cref="LoadAttempts"/> and <see cref="LoadRecords"/> with the profile, so the
        /// two can only ever be reading the same rows — which is what makes "your gap" and "your
        /// goal on that gap" reliably refer to the same behaviour.
        /// </summary>
        public IReadOnlyList<GoalEvent> GetGoalEvents(long studentId, string? since = null)
        {
            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();

            var byAttempt = LoadRecords(conn, studentId)
                .GroupBy(r => r.AttemptId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var events = new List<GoalEvent>();

            foreach (var attempt in LoadAttempts(conn, studentId))
            {
                // Only finished exercises count. An abandoned attempt has no completion stamp and
                // would otherwise let a student advance a goal simply by opening exercises.
                if (string.IsNullOrWhiteSpace(attempt.CompletedAt)) continue;

                if (!string.IsNullOrWhiteSpace(since)
                    && string.CompareOrdinal(attempt.CompletedAt, since) < 0) continue;

                byAttempt.TryGetValue(attempt.Id, out var records);
                records ??= [];

                bool Engaged(string[] names) => AnchorDimension.AnyYes(
                    records.Where(r => names.Contains(r.Name, StringComparer.Ordinal)).Select(r => r.Choice));

                events.Add(new GoalEvent
                {
                    Id = attempt.Id,
                    At = attempt.CompletedAt,
                    ExerciseType = attempt.ExerciseType,
                    Method = attempt.SelectedMethod,
                    SelfExplanation = Engaged(AnchorDimension.SelfExplanation),
                    MethodComparison = Engaged(AnchorDimension.MethodComparison),
                    SolveOnOwn = Engaged(AnchorDimension.SolveOnOwn),
                    Errors = attempt.TotalErrors,
                    Hints = attempt.TotalHints,
                    Seconds = attempt.TotalTime,
                });
            }

            return events;
        }

        private static List<AttemptRow> LoadAttempts(SqliteConnection conn, long studentId) =>
            conn.Query<AttemptRow>(
                $"SELECT Id, ExerciseType, SelectedMethod, TotalErrors, TotalHints, TotalTime, CompletedAt " +
                $"FROM {AnchorStoreSettings.Table} " +
                "WHERE StudentId = @StudentId ORDER BY Id",
                new { StudentId = studentId }).ToList();

        private static List<RecordRow> LoadRecords(SqliteConnection conn, long studentId) =>
            conn.Query<RecordRow>(
                $"SELECT AttemptId, Name, Choice FROM {AnchorStoreSettings.RecordTable} " +
                "WHERE StudentId = @StudentId ORDER BY Id",
                new { StudentId = studentId }).ToList();

        private sealed class AttemptRow
        {
            public long Id { get; set; }
            public string ExerciseType { get; set; } = "";
            public string SelectedMethod { get; set; } = "";
            public int TotalErrors { get; set; }
            public int TotalHints { get; set; }
            public double TotalTime { get; set; }
            public string CompletedAt { get; set; } = "";
        }

        private sealed class RecordRow
        {
            public long AttemptId { get; set; }
            public string Name { get; set; } = "";
            public string Choice { get; set; } = "";
        }

        private sealed class MethodCountRow
        {
            public string SelectedMethod { get; set; } = "";
            public int Count { get; set; }
        }
    }
}
