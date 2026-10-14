using Dapper;
using Microsoft.AspNetCore.Mvc;
using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using webapi.Models.Analytics;
using webapi.Models.Anchors;
using webapi.Models.Database;
using webapi.Models.Flexibility;
using webapi.Models.Student;
using webapi.Services;

namespace webapi.Controllers
{
    [ApiController]
    [Route("student-progress")]
    public class StudentProgressController(IConfiguration configuration, IHttpClientFactory httpClientFactory, IAnchorTrackingService anchors) : ControllerBase
    {
        private readonly IConfiguration _configuration = configuration;
        private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;

        /// <summary>
        /// The student's measured behaviour. Goal suggestion needs it because the useful thing to
        /// suggest is almost always the thing they have been avoiding, and that is not visible in any
        /// of the counters this controller keeps for itself.
        /// </summary>
        private readonly IAnchorTrackingService _anchors = anchors;
        // ── Ensure tables exist ───────────────────────────────────────────────

        /// <summary>
        /// Whether the schema has already been checked in this process.
        ///
        /// Running this DDL on every request was the single most expensive thing in the API. It is
        /// roughly twenty statements, most of them `ALTER TABLE ADD COLUMN` for a column that already
        /// exists, so most of them throw and are swallowed — and each one still takes a write lock on
        /// the students database. On a read route that is pure cost, and under concurrent use every
        /// request queues behind every other request's schema check.
        ///
        /// The statements are idempotent, so once per process is enough. This mirrors what
        /// `AnchorStoreSettings.EnsureTables` has always done at startup, and the comment there says
        /// exactly why — this controller was the one place that did not follow it.
        /// </summary>
        private static bool _schemaChecked;

        private static void EnsureTables(Microsoft.Data.Sqlite.SqliteConnection conn)
        {
            if (_schemaChecked) return;
            conn.Execute(
                $"CREATE TABLE IF NOT EXISTS {StudentProgressDBSettings.ProgressTable} " +
                $"({StudentProgressDBSettings.ProgressScheme})");

            // Migrate existing tables by adding new columns (safe to run repeatedly)
            try { conn.Execute($"ALTER TABLE {StudentProgressDBSettings.ProgressTable} ADD COLUMN ExercisesCompleted INTEGER NOT NULL DEFAULT 0"); } catch { }
            try { conn.Execute($"ALTER TABLE {StudentProgressDBSettings.ProgressTable} ADD COLUMN StreakDays INTEGER NOT NULL DEFAULT 0"); } catch { }
            try { conn.Execute($"ALTER TABLE {StudentProgressDBSettings.ProgressTable} ADD COLUMN LastExerciseDate TEXT NOT NULL DEFAULT ''"); } catch { }
            // Agency XP migration columns
            try { conn.Execute($"ALTER TABLE {StudentProgressDBSettings.ProgressTable} ADD COLUMN ChoiceXP INTEGER NOT NULL DEFAULT 0"); } catch { }
            try { conn.Execute($"ALTER TABLE {StudentProgressDBSettings.ProgressTable} ADD COLUMN InsightXP INTEGER NOT NULL DEFAULT 0"); } catch { }
            try { conn.Execute($"ALTER TABLE {StudentProgressDBSettings.ProgressTable} ADD COLUMN ResolveXP INTEGER NOT NULL DEFAULT 0"); } catch { }
            try { conn.Execute($"ALTER TABLE {StudentProgressDBSettings.ProgressTable} ADD COLUMN LifetimeAgencyXP INTEGER NOT NULL DEFAULT 0"); } catch { }
            // Tutorial / onboarding migration columns
            try { conn.Execute($"ALTER TABLE {StudentProgressDBSettings.ProgressTable} ADD COLUMN OnboardingStep TEXT NOT NULL DEFAULT 'bartering'"); } catch { }
            try { conn.Execute($"ALTER TABLE {StudentProgressDBSettings.ProgressTable} ADD COLUMN TutorialsCompleted TEXT NOT NULL DEFAULT '[]'"); } catch { }

            conn.Execute(
                $"CREATE TABLE IF NOT EXISTS {StudentProgressDBSettings.GoalsTable} " +
                $"({StudentProgressDBSettings.GoalsScheme})");

            conn.Execute(
                $"CREATE TABLE IF NOT EXISTS {StudentProgressDBSettings.ActiveGoalsTable} " +
                $"({StudentProgressDBSettings.ActiveGoalsScheme})");

            conn.Execute(
                $"CREATE INDEX IF NOT EXISTS IX_{StudentProgressDBSettings.ActiveGoalsTable}_Student " +
                $"ON {StudentProgressDBSettings.ActiveGoalsTable} (StudentId)");

            conn.Execute(
                $"CREATE TABLE IF NOT EXISTS {StudentProgressDBSettings.ExerciseLogTable} " +
                $"({StudentProgressDBSettings.ExerciseLogScheme})");

            conn.Execute(
                $"CREATE TABLE IF NOT EXISTS {StudentProgressDBSettings.ExerciseCompletionsTable} " +
                $"({StudentProgressDBSettings.ExerciseCompletionsScheme})");

            conn.Execute(
                $"CREATE TABLE IF NOT EXISTS {StudentProgressDBSettings.AgencyLogTable} " +
                $"({StudentProgressDBSettings.AgencyLogScheme})");

            conn.Execute(
                $"CREATE TABLE IF NOT EXISTS {StudentProgressDBSettings.ReflectionQueueTable} " +
                $"({StudentProgressDBSettings.ReflectionQueueScheme})");

            // What the student decided on the exercise, so the reflection can be graded against
            // what actually happened rather than against a low error count the help itself produced.
            // Safe to run repeatedly — the ALTER fails once the column exists.
            try { conn.Execute($"ALTER TABLE {StudentProgressDBSettings.ReflectionQueueTable} ADD COLUMN Decisions TEXT NOT NULL DEFAULT ''"); } catch { }

            // What the goal was narrowed to, so a question about a method goal can name the method and
            // check the answer against it. Until now it existed only inside the display label.
            try { conn.Execute($"ALTER TABLE {StudentProgressDBSettings.ReflectionQueueTable} ADD COLUMN Focus TEXT NOT NULL DEFAULT ''"); } catch { }

            // The counts a goal's questions are built from, worked out once when the goal completes.
            try { conn.Execute($"ALTER TABLE {StudentProgressDBSettings.ReflectionQueueTable} ADD COLUMN Evidence TEXT NOT NULL DEFAULT ''"); } catch { }

            conn.Execute(
                $"CREATE TABLE IF NOT EXISTS {StudentProgressDBSettings.ReflectionHistoryTable} " +
                $"({StudentProgressDBSettings.ReflectionHistoryScheme})");

            // Which question was asked, and which chip was tapped. The first makes it possible to
            // compare questions later; the second is the evidence the Insight award was decided from.
            try { conn.Execute($"ALTER TABLE {StudentProgressDBSettings.ReflectionHistoryTable} ADD COLUMN QuestionId TEXT NOT NULL DEFAULT ''"); } catch { }
            try { conn.Execute($"ALTER TABLE {StudentProgressDBSettings.ReflectionHistoryTable} ADD COLUMN Choice TEXT NOT NULL DEFAULT ''"); } catch { }

            // Whether a next-action commitment has already been checked against an exercise. One
            // promise is judged by the very next exercise, once.
            try { conn.Execute($"ALTER TABLE {StudentProgressDBSettings.ReflectionHistoryTable} ADD COLUMN FollowedUp INTEGER NOT NULL DEFAULT 0"); } catch { }

            // WHICH attempt this reflection is about.
            //
            // The evidence used to come from "the student's most recent completed attempt", which is
            // normally the one just finished but is not guaranteed to be: the queue holds up to three
            // items, so a student who skips the prompt twice and then reflects on the oldest one gets
            // questions built from the newest exercise. The step chips could even come from a different
            // exercise TYPE, which is how a Suitability attempt once produced the wording for a
            // reflection on an Efficiency exercise. Storing the id makes the pairing exact.
            //
            // 0 means "not recorded" (a row enqueued before this shipped), and the reader falls back
            // to the old behaviour for those rather than failing.
            try { conn.Execute($"ALTER TABLE {StudentProgressDBSettings.ReflectionQueueTable} ADD COLUMN AttemptId INTEGER NOT NULL DEFAULT 0"); } catch { }

            // One row per Insight paid for facing a gap, so a gap is paid for once per EPISODE rather
            // than on every engagement while an all-time average is still catching up.
            conn.Execute(
                $"CREATE TABLE IF NOT EXISTS {InsightGapAwardTable} " +
                "(Id INTEGER PRIMARY KEY AUTOINCREMENT, StudentId INTEGER NOT NULL, Element TEXT NOT NULL, " +
                "AttemptId INTEGER NOT NULL, AwardedAt TEXT NOT NULL)");
            conn.Execute(
                $"CREATE INDEX IF NOT EXISTS IX_{InsightGapAwardTable}_Student ON {InsightGapAwardTable} (StudentId, Element)");
            // Only after every statement above has succeeded, so a partial failure is retried on the
            // next request rather than leaving the schema permanently half-built.
            _schemaChecked = true;
        }

        /// <summary>
        /// Runs the schema check once at startup, so that no request ever pays for it.
        ///
        /// Without this the first burst of traffic would all find `_schemaChecked` still false and
        /// every one of them would run the DDL — which is the cost this exists to avoid, just moved
        /// to the busiest possible moment.
        /// </summary>
        public static void InitializeSchema()
        {
            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);
        }

        /// <summary>
        /// Queues a completed goal/exercise for reflection. Keeps only the latest 3
        /// pending items per student (older pending items are auto-skipped).
        /// </summary>
        private static void EnqueueReflection(
            Microsoft.Data.Sqlite.SqliteConnection conn,
            long studentId,
            string itemType,
            string itemId,
            string itemLabel,
            int errors,
            int hints,
            int pippinMessages,
            string method,
            string decisions = "",
            string focus = "",
            string evidence = "",
            long attemptId = 0)
        {
            conn.Execute(
                $"INSERT INTO {StudentProgressDBSettings.ReflectionQueueTable} " +
                "(StudentId, ItemType, ItemId, ItemLabel, Status, Errors, Hints, PippinMessages, Method, Decisions, Focus, Evidence, AttemptId, CompletedAt) " +
                "VALUES (@StudentId, @ItemType, @ItemId, @ItemLabel, 'pending', @Errors, @Hints, @PippinMessages, @Method, @Decisions, @Focus, @Evidence, @AttemptId, @CompletedAt)",
                new
                {
                    StudentId = studentId,
                    ItemType = itemType,
                    ItemId = itemId,
                    ItemLabel = itemLabel,
                    Errors = errors,
                    Hints = hints,
                    PippinMessages = pippinMessages,
                    Method = method,
                    Decisions = decisions ?? string.Empty,
                    Focus = focus ?? string.Empty,
                    Evidence = evidence ?? string.Empty,
                    AttemptId = attemptId,
                    CompletedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss")
                });

            // Cap at 3 pending: keep the latest 3, skip the rest.
            //
            // Session reflections are left out of both halves of this. They are not queued by the work
            // the student does, they are opened from the end-of-session dialog, and letting them into the
            // count would mean that opening one quietly threw away an exercise reflection they had not
            // answered yet. There is at most one of them live at a time, retired by the call that starts
            // the next one.
            conn.Execute(
                $@"UPDATE {StudentProgressDBSettings.ReflectionQueueTable}
                   SET Status = 'skipped'
                   WHERE StudentId = @StudentId
                     AND Status = 'pending'
                     AND ItemType <> 'session'
                     AND Id NOT IN (
                         SELECT Id FROM {StudentProgressDBSettings.ReflectionQueueTable}
                         WHERE StudentId = @StudentId AND Status = 'pending' AND ItemType <> 'session'
                         ORDER BY Id DESC LIMIT 3
                     )",
                new { StudentId = studentId });
        }

        // ── GET /student-progress/{studentId} ────────────────────────────────
        /// <summary>Returns the student's total XP and goals completed in the current ISO week.</summary>
        [HttpGet("{studentId}")]
        public ActionResult<StudentProgressResponse> GetProgress(long studentId)
        {
            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            // Total XP
            var progress = conn.QueryFirstOrDefault<StudentProgressRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ProgressTable} WHERE StudentId = @StudentId",
                new { StudentId = studentId });

            // Goals completed this calendar week (Mon–Sun, ISO week)
            var goalsThisWeek = conn.Query<GoalCompletionRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.GoalsTable} " +
                "WHERE StudentId = @StudentId " +
                "  AND strftime('%Y-%W', CompletedAt) = strftime('%Y-%W', 'now') " +
                "ORDER BY CompletedAt DESC",
                new { StudentId = studentId }).ToList();

            // Method counts from ExerciseLog (all time)
            var methodCounts = conn.Query<MethodCount>(
                $"SELECT ExerciseType AS Method, COUNT(*) AS Value " +
                $"FROM {StudentProgressDBSettings.ExerciseLogTable} " +
                "WHERE StudentId = @StudentId GROUP BY ExerciseType",
                new { StudentId = studentId }).ToList();

            // Goals completed per category, ALL TIME. `GoalId` already holds the category, so this is
            // a straight GROUP BY — the same six names the client's goal catalogue uses.
            //
            // Rows are then filtered to the SIX CURRENT categories, because `GoalId` is not reliably a
            // category in older data: the previous goal catalogue wrote ids like `no-hints`,
            // `master-substitution` and `complete-any-exercise`, and student 1 has 34 such rows. None of
            // those map onto a current category, and guessing a mapping would attribute goals to
            // categories the student never chose. They are dropped instead — the panel is about the
            // current goal model, and a wrong number is worse than a missing one.
            var goalCountsByCategory = conn.Query<GoalCategoryCount>(
                $"SELECT GoalId AS Category, COUNT(*) AS Count " +
                $"FROM {StudentProgressDBSettings.GoalsTable} " +
                "WHERE StudentId = @StudentId AND GoalId <> '' " +
                "GROUP BY GoalId",
                new { StudentId = studentId })
                .Where(row => GoalCatalogue.IsCategory(row.Category))
                .ToList();

            // Actual solving-method counts (Elimination / Equalization / Substitution) from ExerciseCompletions
            var solvingMethodCounts = conn.Query<MethodCount>(
                $"SELECT ExerciseKey AS Method, COUNT(*) AS Value " +
                $"FROM {StudentProgressDBSettings.ExerciseCompletionsTable} " +
                "WHERE StudentId = @StudentId " +
                "  AND ExerciseKey IN ('elimination','equalization','substitution') " +
                "GROUP BY ExerciseKey",
                new { StudentId = studentId }).ToList();

            // XP per day — last 7 calendar days from GoalCompletions
            var dailyXp = conn.Query<DailyXp>(
                $"SELECT strftime('%Y-%m-%d', CompletedAt) AS Day, SUM(XpEarned) AS Xp " +
                $"FROM {StudentProgressDBSettings.GoalsTable} " +
                "WHERE StudentId = @StudentId " +
                "  AND CompletedAt >= date('now', '-6 days') " +
                "GROUP BY strftime('%Y-%m-%d', CompletedAt) " +
                "ORDER BY Day ASC",
                new { StudentId = studentId }).ToList();

            return Ok(new StudentProgressResponse
            {
                TotalXP = progress?.TotalXP ?? 0,
                ExercisesCompleted = progress?.ExercisesCompleted ?? 0,
                StreakDays = progress?.StreakDays ?? 0,
                ChoiceXP = progress?.ChoiceXP ?? 0,
                InsightXP = progress?.InsightXP ?? 0,
                ResolveXP = progress?.ResolveXP ?? 0,
                LifetimeAgencyXP = progress?.LifetimeAgencyXP ?? 0,
                GoalsThisWeek = goalsThisWeek,
                GoalCountsByCategory = goalCountsByCategory,
                MethodCounts = methodCounts,
                SolvingMethodCounts = solvingMethodCounts,
                DailyXp = dailyXp
            });
        }

        // ── Active goals ─────────────────────────────────────────────────────
        //
        // The student's current goals live here and nowhere else. Every mutation returns the
        // resulting list, so the client never has to guess what the server now holds and never has
        // to re-read to find out — one round trip, one source of truth.

        private static List<ActiveGoalRecord> ReadActiveGoals(Microsoft.Data.Sqlite.SqliteConnection conn, long studentId)
            => conn.Query<ActiveGoalRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ActiveGoalsTable} " +
                "WHERE StudentId = @StudentId ORDER BY CreatedAt, Id",
                new { StudentId = studentId }).AsList();

        /// <summary>Puts a client timestamp into the form the goal code depends on.</summary>
        private static string NormalizeGoalStamp(string? stamp)
        {
            if (DateTimeOffset.TryParse(stamp, CultureInfo.InvariantCulture,
                    DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var parsed))
                return parsed.UtcDateTime.ToString("yyyy-MM-ddTHH:mm:ss") + "Z";

            return DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss") + "Z";
        }

        /// <summary>The student's current goals, oldest first.</summary>
        [HttpGet("goals/{studentId:long}")]
        public ActionResult<IReadOnlyList<ActiveGoalRecord>> GetActiveGoals(long studentId)
        {
            if (studentId <= 0) return BadRequest("Invalid student ID.");

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            return Ok(ReadActiveGoals(conn, studentId));
        }

        /// <summary>Sets a goal: adds it, or replaces the existing one with the same id.</summary>
        [HttpPost("goals")]
        public ActionResult<IReadOnlyList<ActiveGoalRecord>> SetActiveGoal([FromBody] SetActiveGoalRequest request)
        {
            if (request.StudentId <= 0 || string.IsNullOrWhiteSpace(request.Id) || string.IsNullOrWhiteSpace(request.Category))
                return BadRequest("Invalid request.");

            // A goal with no target can never be reached, and nothing about it can be measured, so it
            // is refused rather than stored. The CATEGORY is deliberately not validated here: the
            // catalogue belongs to the client, and pinning it server-side would mean a migration
            // every time a category is renamed — the exact coupling this table avoids.
            if (!(request.Target > 0))
                return BadRequest("Target must be greater than zero.");

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            // CreatedAt is deliberately absent from the UPDATE branch. Progress is counted from the
            // moment the goal was set, so re-saving a goal must not move its own start line: doing so
            // would either erase work already counted, or let a student reset the clock at will.
            conn.Execute(
                $"INSERT INTO {StudentProgressDBSettings.ActiveGoalsTable} " +
                "(StudentId, Id, Category, Focus, Metric, Target, Quality, MaxPerExercise, CreatedAt) " +
                "VALUES (@StudentId, @Id, @Category, @Focus, @Metric, @Target, @Quality, @MaxPerExercise, @CreatedAt) " +
                "ON CONFLICT(StudentId, Id) DO UPDATE SET Category = @Category, Focus = @Focus, " +
                "Metric = @Metric, Target = @Target, Quality = @Quality, MaxPerExercise = @MaxPerExercise",
                new
                {
                    request.StudentId,
                    request.Id,
                    request.Category,
                    Focus = request.Focus ?? string.Empty,
                    Metric = string.IsNullOrWhiteSpace(request.Metric) ? "exercises" : request.Metric,
                    request.Target,
                    Quality = request.Quality ?? string.Empty,
                    request.MaxPerExercise,
                    CreatedAt = NormalizeGoalStamp(request.CreatedAt)
                });

            return Ok(ReadActiveGoals(conn, request.StudentId));
        }

        /// <summary>
        /// Removes goals: one of them, or several at once.
        ///
        /// One route and one verb, deliberately. This project has no other DELETE endpoint and the
        /// CORS policy allows only GET/PUT/POST, so a DELETE route here is unreachable from the
        /// browser — which is exactly what happened when this was first written: the request was
        /// refused in preflight and the goal silently stayed. Widening a production CORS policy for a
        /// single call was not worth it, and removing one goal and clearing completed goals are the
        /// same operation in any case.
        /// </summary>
        [HttpPost("goals/remove")]
        public ActionResult<IReadOnlyList<ActiveGoalRecord>> RemoveActiveGoals([FromBody] RemoveActiveGoalsRequest request)
        {
            if (request.StudentId <= 0 || request.GoalIds.Count == 0)
                return BadRequest("Invalid request.");

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            conn.Execute(
                $"DELETE FROM {StudentProgressDBSettings.ActiveGoalsTable} " +
                "WHERE StudentId = @StudentId AND Id IN @Ids",
                new { request.StudentId, Ids = request.GoalIds });

            return Ok(ReadActiveGoals(conn, request.StudentId));
        }

        // ── POST /student-progress/log-goal ────────────────────────────────
        /// <summary>
        /// Records a completed goal and queues it for reflection.
        ///
        /// The XP itself is awarded through the agency wallets, not here — this endpoint exists so the
        /// completion has a durable record (for the "recently completed" list, the weekly XP chart
        /// and the reflection queue) even if the student clears their browser storage.
        /// </summary>
        [HttpPost("log-goal")]
        public ActionResult<int> LogGoal([FromBody] LogGoalRequest request)
        {
            if (request.StudentId <= 0 || string.IsNullOrWhiteSpace(request.GoalId))
                return BadRequest("Invalid request.");

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            // PippinMessages is written as 0: the free-text AI chat was removed, so there is no longer
            // any such thing to count. The column stays for the historical rows that have it.
            conn.Execute(
                $"INSERT INTO {StudentProgressDBSettings.GoalsTable} " +
                "(StudentId, GoalId, GoalLabel, XpEarned, ExerciseType, TotalErrors, TotalHints, PippinMessages, CompletedAt) " +
                "VALUES (@StudentId, @GoalId, @GoalLabel, @XpEarned, @ExerciseType, @TotalErrors, @TotalHints, 0, @CompletedAt)",
                new
                {
                    request.StudentId,
                    request.GoalId,
                    request.GoalLabel,
                    request.XpEarned,
                    request.ExerciseType,
                    request.TotalErrors,
                    request.TotalHints,
                    CompletedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss")
                });

            // Upsert XP total
            conn.Execute(
                $"INSERT INTO {StudentProgressDBSettings.ProgressTable} (StudentId, TotalXP) VALUES (@StudentId, @Xp) " +
                "ON CONFLICT(StudentId) DO UPDATE SET TotalXP = TotalXP + @Xp",
                new { StudentId = request.StudentId, Xp = request.XpEarned });

            // Queue a reflection for this completed goal.
            //
            // The evidence is worked out HERE, at the moment the goal completes, because the questions
            // ask about the exercises inside the goal's own window and that window is not recoverable
            // later: the goal has just been claimed and is about to stop existing.
            EnqueueReflection(conn, request.StudentId, "goal", request.GoalId, request.GoalLabel,
                request.TotalErrors, request.TotalHints, 0, request.ExerciseType, "", request.Focus,
                BuildGoalEvidence(conn, request.StudentId, request.GoalId, request.Since, request.Focus, request.Quality, request.MaxPerExercise));

            var newTotal = conn.ExecuteScalar<int>(
                $"SELECT TotalXP FROM {StudentProgressDBSettings.ProgressTable} WHERE StudentId = @StudentId",
                new { StudentId = request.StudentId });

            return Ok(newTotal);
        }

        // ── POST /student-progress/log-exercise ──────────────────────────────
        /// <summary>
        /// Called every time a student completes any exercise.
        /// Increments ExercisesCompleted, updates streak, and ensures a progress row exists.
        /// </summary>
        [HttpPost("log-exercise")]
        public ActionResult LogExercise([FromBody] LogExerciseRequest request)
        {
            if (request.StudentId <= 0)
                return BadRequest("Invalid student ID.");

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            var todayUtc = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var nowUtc = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss");

            // Ensure a progress row exists
            conn.Execute(
                $"INSERT OR IGNORE INTO {StudentProgressDBSettings.ProgressTable} " +
                "(StudentId, TotalXP, ExercisesCompleted, StreakDays, LastExerciseDate) " +
                "VALUES (@StudentId, 0, 0, 0, '')",
                new { request.StudentId });

            var record = conn.QueryFirstOrDefault<StudentProgressRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ProgressTable} WHERE StudentId = @StudentId",
                new { request.StudentId });

            if (record == null) return StatusCode(500);

            // Streak logic
            int newStreak = record.StreakDays;
            if (record.LastExerciseDate == todayUtc)
            {
                // Already exercised today — streak unchanged
            }
            else if (record.LastExerciseDate == DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-dd"))
            {
                newStreak++;
            }
            else
            {
                newStreak = 1;
            }

            conn.Execute(
                $"UPDATE {StudentProgressDBSettings.ProgressTable} " +
                "SET ExercisesCompleted = ExercisesCompleted + 1, " +
                "    StreakDays = @StreakDays, " +
                "    LastExerciseDate = @Today " +
                "WHERE StudentId = @StudentId",
                new { StreakDays = newStreak, Today = todayUtc, request.StudentId });

            // Log into ExerciseLog for chart data
            if (!string.IsNullOrWhiteSpace(request.ExerciseType))
            {
                conn.Execute(
                    $"INSERT INTO {StudentProgressDBSettings.ExerciseLogTable} " +
                    "(StudentId, ExerciseType, CompletedAt) VALUES (@StudentId, @ExerciseType, @CompletedAt)",
                    new { request.StudentId, request.ExerciseType, CompletedAt = nowUtc });
            }

            // Queue a reflection for this completed exercise
            if (!string.IsNullOrWhiteSpace(request.ExerciseType))
            {
                EnqueueReflection(conn, request.StudentId, "exercise", request.ExerciseType, request.ExerciseType,
                    request.Errors, request.Hints, 0, request.ExerciseType, request.Decisions,
                    attemptId: request.AttemptId);
            }

            // Did this exercise keep the promise the student made at the end of the last reflection?
            //
            // Checked HERE because this call is what tells us an exercise finished, and it carries the
            // decisions and hints the promise is about. A promise is judged by the very NEXT exercise
            // and then closed either way, so a stale one cannot pay out weeks later, and the same
            // promise cannot be paid twice.
            var resolveAwarded = SettleReflectionCommitment(conn, request);

            return Ok(new { resolveAwarded });
        }

        /// <summary>Resolve for following through on the next action the reflection asked for.</summary>
        private const int FollowThroughResolveXp = 5;

        /// <summary>Choice for committing to a next action, paid when they commit rather than when they keep it.</summary>
        private const int CommitmentChoiceXp = 2;

        /// <summary>
        /// Pays the small Choice award for a next-action commitment, once per reflection item.
        ///
        /// Idempotent through the agency log rather than a column: the source names the queue item, and a
        /// student who re-answers the same reflection cannot be paid twice for one promise. The row is
        /// also the audit trail for what the award was for.
        /// </summary>
        private static void AwardCommitmentChoice(
            Microsoft.Data.Sqlite.SqliteConnection conn, long studentId, long queueItemId)
        {
            var source = $"reflection-commit-{queueItemId}";

            var already = conn.ExecuteScalar<int>(
                $"SELECT COUNT(*) FROM {StudentProgressDBSettings.AgencyLogTable} " +
                "WHERE StudentId = @StudentId AND XpType = 'choice' AND Source = @Source",
                new { StudentId = studentId, Source = source });

            if (already > 0) return;

            conn.Execute(
                $"INSERT INTO {StudentProgressDBSettings.AgencyLogTable} (StudentId, XpType, Amount, Source, LoggedAt) " +
                "VALUES (@StudentId, 'choice', @Amount, @Source, @Now)",
                new
                {
                    StudentId = studentId,
                    Amount = CommitmentChoiceXp,
                    Source = source,
                    Now = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss")
                });

            conn.Execute(
                $"UPDATE {StudentProgressDBSettings.ProgressTable} " +
                "SET ChoiceXP = ChoiceXP + @Amount, LifetimeAgencyXP = LifetimeAgencyXP + @Amount " +
                "WHERE StudentId = @StudentId",
                new { StudentId = studentId, Amount = CommitmentChoiceXp });

            Console.WriteLine($"[Reflection] Commitment Choice +{CommitmentChoiceXp} for queue item {queueItemId}");
        }

        /// <summary>
        /// Judges the student's last next-action promise against the exercise they just finished.
        ///
        /// Returns the Resolve awarded, which is normally 0. The promise chips carry the dimension they
        /// are about in their own id, so nothing extra had to be stored to be able to check them.
        ///
        /// TWO CHIPS DELIBERATELY PAY NOTHING even when they come true:
        ///   * the "let it show me" options, because Resolve is for following through on something that
        ///     moves you forward, and a promise to be shown is a promise to be helped; paying it would
        ///     make the reward ambivalent about the thing it exists to encourage.
        ///   * the method promises, because the chip does not name the method, so there is nothing to
        ///     compare against. Left as recorded data rather than guessed at.
        /// </summary>
        private static int SettleReflectionCommitment(Microsoft.Data.Sqlite.SqliteConnection conn, LogExerciseRequest request)
        {
            // ItemId comes along because the same chip means different promises. "pick-elimination" is
            // "compare in elimination next" when it was offered by a method-comparison goal and "work it
            // out yourself in elimination next" when it was offered by a solve-on-own one, and the chip id
            // alone cannot tell the two apart.
            var promise = conn.QueryFirstOrDefault<PromiseRow>(
                $"SELECT Id, ItemId, Choice FROM {StudentProgressDBSettings.ReflectionHistoryTable} " +
                "WHERE StudentId = @StudentId AND FollowedUp = 0 " +
                "  AND (Choice LIKE 'act-%' OR Choice LIKE 'pick-%') " +
                "ORDER BY Id DESC LIMIT 1",
                new { StudentId = request.StudentId });

            if (promise is null) return 0;

            var decisions = request.Decisions ?? "";
            bool Engaged(string element) => decisions.Contains($"{element}=Engaged", StringComparison.OrdinalIgnoreCase);

            // The method of the exercise they have just finished, which several promises are about. Read
            // from the attempt itself, so it cannot come from a different exercise than the one logged.
            var method = request.AttemptId > 0
                ? conn.ExecuteScalar<string?>(
                    $"SELECT SelectedMethod FROM {AnchorStoreSettings.Table} WHERE Id = @Id",
                    new { Id = request.AttemptId })
                : null;

            var kept = promise.Choice switch
            {
                // Taking a hint is still doing it. The two chips differ in wording, not in what they promise.
                "act-explain-myself" or "act-explain-hint" => Engaged("SelfExplanation"),
                "act-compare-myself" or "act-compare-hint" => Engaged("MethodComparison"),
                "act-solo-myself" or "act-solo-hint" => Engaged("SolveOnOwn"),
                "act-target-none" => request.Hints == 0,
                "act-target-one" => request.Hints <= 1,
                // "The same as last time" is judged against the run before this one, which is the only
                // reading of it that means anything.
                "act-target-same" => request.Hints <= PreviousHints(conn, request.StudentId),

                // The goal menus. Flat commitments, each naming the field it will be checked against.
                "act-no-hints" => request.Hints == 0,
                "act-no-errors" => request.Errors == 0,
                "act-solve-alone" => Engaged("SolveOnOwn"),
                "act-explain" => Engaged("SelfExplanation"),
                "act-compare" => Engaged("MethodComparison"),
                // Fewer mistakes than the average they were carrying when they made the promise. The
                // average is taken from the attempts BEFORE this one, because including this one would
                // move the target towards whatever they just did.
                "act-beat-average" => request.Errors < AverageErrors(conn, request.StudentId),
                // "Pick a suitable method" is a promise only a Suitability exercise can keep, so an
                // exercise of another type cannot settle it and is read as not kept.
                "act-suitable-choice" => request.ExerciseType == "Suitability" && ChoseAllowedMethod(conn, request),
                "act-best-choice" => request.ExerciseType == "Efficiency" && ChoseAllowedMethod(conn, request),

                // The two question-type promises: explain your reasoning in that kind of exercise next.
                "pick-efficiency" => request.ExerciseType == "Efficiency" && Engaged("SelfExplanation"),
                "pick-matching" => request.ExerciseType == "Matching" && Engaged("SelfExplanation"),

                // A named method, and what was promised about it, which ItemId is what tells us.
                _ when promise.Choice.StartsWith("pick-", StringComparison.Ordinal) =>
                    MethodMatches(method, promise.Choice, request)
                    && (promise.ItemId == "methodComparison" ? Engaged("MethodComparison") : Engaged("SolveOnOwn")),

                _ => false,
            };

            conn.Execute(
                $"UPDATE {StudentProgressDBSettings.ReflectionHistoryTable} SET FollowedUp = 1 WHERE Id = @Id",
                new { promise.Id });

            if (!kept) return 0;

            var now = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss");

            conn.Execute(
                "INSERT INTO AgencyLog (StudentId, XpType, Amount, Source, LoggedAt) " +
                "VALUES (@StudentId, 'resolve', @Amount, 'reflection-follow-through', @Now)",
                new { request.StudentId, Amount = FollowThroughResolveXp, Now = now });

            conn.Execute(
                $"UPDATE {StudentProgressDBSettings.ProgressTable} " +
                "SET ResolveXP = ResolveXP + @Amount, LifetimeAgencyXP = LifetimeAgencyXP + @Amount " +
                "WHERE StudentId = @StudentId",
                new { request.StudentId, Amount = FollowThroughResolveXp });

            return FollowThroughResolveXp;
        }

        /// <summary>Whether the promise's method is the one this exercise was solved with.</summary>
        private static bool MethodMatches(string? selected, string choice, LogExerciseRequest request) =>
            !string.IsNullOrWhiteSpace(selected)
            && choice.EndsWith(selected.Trim().ToLowerInvariant(), StringComparison.Ordinal);

        /// <summary>
        /// Whether the method they chose was one the exercise allowed, for the two promises that are about
        /// making a good choice rather than about doing the work.
        /// </summary>
        private static bool ChoseAllowedMethod(Microsoft.Data.Sqlite.SqliteConnection conn, LogExerciseRequest request)
        {
            if (request.AttemptId <= 0) return false;

            var attempt = conn.QueryFirstOrDefault<GoalAttemptRow>(
                $"SELECT Id, ExerciseType, ExerciseId, TotalErrors, TotalHints, TotalTime, SelectedMethod " +
                $"FROM {AnchorStoreSettings.Table} WHERE Id = @Id",
                new { Id = request.AttemptId });

            if (attempt is null) return false;

            var type = ExerciseTypeNumber(attempt.ExerciseType);
            var allowed = AllowedMethodsByExercise([attempt]);

            return allowed.TryGetValue((type, attempt.ExerciseId), out var permitted)
                   && permitted.Contains((int)MethodFromName(attempt.SelectedMethod));
        }

        /// <summary>
        /// Their average mistakes per exercise, over the runs BEFORE the one settling the promise.
        ///
        /// The newest attempt is left out because by the time an exercise is logged it IS that exercise,
        /// and averaging it in would move the target towards whatever they just did: a promise to beat
        /// your average would be judged against an average you had dragged to meet your own score.
        ///
        /// Bounded to the recent twenty, so "my average" keeps meaning their current form rather than
        /// everything they have ever done. Zero when there is no history at all, which no score can beat.
        /// </summary>
        private static int AverageErrors(Microsoft.Data.Sqlite.SqliteConnection conn, long studentId)
        {
            var recent = conn.Query<double>(
                $"SELECT TotalErrors FROM {AnchorStoreSettings.Table} " +
                "WHERE StudentId = @StudentId AND CompletedAt <> '' ORDER BY Id DESC LIMIT 20 OFFSET 1",
                new { StudentId = studentId }).ToList();

            return recent.Count == 0 ? 0 : (int)Math.Round(recent.Average());
        }

        /// <summary>Hints on the exercise before the newest one, for a "same as last time" promise.</summary>
        private static int PreviousHints(Microsoft.Data.Sqlite.SqliteConnection conn, long studentId)
        {
            // The per-attempt table, which is the one that carries TotalHints; the record table
            // underneath it counts hints per phase, not per exercise.
            var previous = conn.ExecuteScalar<int?>(
                $"SELECT TotalHints FROM {AnchorStoreSettings.Table} " +
                "WHERE StudentId = @StudentId AND CompletedAt <> '' ORDER BY Id DESC LIMIT 1 OFFSET 1",
                new { StudentId = studentId });

            return previous ?? 0;
        }

        private sealed class PromiseRow
        {
            public long Id { get; set; }

            /// <summary>
            /// The goal category the promise came from. Needed because a chip id can mean two different
            /// things: "pick-elimination" promises a comparison when a method-comparison goal offered it
            /// and a solo attempt when a solve-on-own goal did.
            /// </summary>
            public string ItemId { get; set; } = "";

            public string Choice { get; set; } = "";
        }

        // ── POST /student-progress/spend-xp ──────────────────────────────────
        /// <summary>
        /// Deducts XP (e.g. for shop purchases). Returns new total XP, or 400 if insufficient.
        /// </summary>
        [HttpPost("spend-xp")]
        public ActionResult<int> SpendXp([FromBody] SpendXpRequest request)
        {
            if (request.StudentId <= 0 || request.Amount <= 0)
                return BadRequest("Invalid request.");

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            var record = conn.QueryFirstOrDefault<StudentProgressRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ProgressTable} WHERE StudentId = @StudentId",
                new { request.StudentId });

            if (record == null || record.TotalXP < request.Amount)
                return BadRequest("Insufficient XP.");

            conn.Execute(
                $"UPDATE {StudentProgressDBSettings.ProgressTable} " +
                "SET TotalXP = TotalXP - @Amount WHERE StudentId = @StudentId",
                new { request.Amount, request.StudentId });

            var newTotal = conn.ExecuteScalar<int>(
                $"SELECT TotalXP FROM {StudentProgressDBSettings.ProgressTable} WHERE StudentId = @StudentId",
                new { request.StudentId });

            return Ok(newTotal);
        }

        // ── POST /student-progress/log-agency-xp ────────────────────────────
        /// <summary>
        /// Logs agency XP (Choice, Insight, or Resolve) for a student.
        /// Updates the corresponding column in StudentProgress and logs the event.
        /// </summary>
        [HttpPost("log-agency-xp")]
        public ActionResult<int> LogAgencyXp([FromBody] LogAgencyXpRequest request)
        {
            if (request.StudentId <= 0 || request.Amount <= 0)
                return BadRequest("Invalid request.");
            if (request.XpType != "choice" && request.XpType != "insight" && request.XpType != "resolve")
                return BadRequest("XpType must be 'choice', 'insight', or 'resolve'.");

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            // Ensure progress row exists
            conn.Execute(
                $"INSERT OR IGNORE INTO {StudentProgressDBSettings.ProgressTable} " +
                "(StudentId, TotalXP, ExercisesCompleted, StreakDays, LastExerciseDate, ChoiceXP, InsightXP, ResolveXP, LifetimeAgencyXP) " +
                "VALUES (@StudentId, 0, 0, 0, '', 0, 0, 0, 0)",
                new { request.StudentId });

            // Determine which column to update
            var column = request.XpType switch
            {
                "choice" => "ChoiceXP",
                "insight" => "InsightXP",
                "resolve" => "ResolveXP",
                _ => "ChoiceXP"
            };

            // Update the specific agency XP column AND lifetime total
            conn.Execute(
                $"UPDATE {StudentProgressDBSettings.ProgressTable} " +
                $"SET {column} = {column} + @Amount, " +
                "    LifetimeAgencyXP = LifetimeAgencyXP + @Amount " +
                "WHERE StudentId = @StudentId",
                new { request.Amount, request.StudentId });

            // Log the event
            conn.Execute(
                $"INSERT INTO {StudentProgressDBSettings.AgencyLogTable} " +
                "(StudentId, XpType, Amount, Source, LoggedAt) " +
                "VALUES (@StudentId, @XpType, @Amount, @Source, @LoggedAt)",
                new
                {
                    request.StudentId,
                    request.XpType,
                    request.Amount,
                    Source = request.Source ?? "",
                    LoggedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss")
                });

            // Return the new total for the requested XP type
            var newValue = conn.ExecuteScalar<int>(
                $"SELECT {column} FROM {StudentProgressDBSettings.ProgressTable} WHERE StudentId = @StudentId",
                new { request.StudentId });

            return Ok(newValue);
        }

        private const string InsightGapAwardTable = "InsightGapAward";

        /// <summary>Small by design: it is for STARTING on something avoided, not for continuing.</summary>
        private const int InsightForFacingGapXp = 8;

        // ── POST /student-progress/insight-gap-award ────────────────────────
        /// <summary>
        /// Decides whether engaging with something the student has been avoiding earns Insight, and
        /// records it when it does. The client pays out only what this returns.
        ///
        /// WHY IT LIVES HERE. The rule used to be "the element is currently a gap" on an ALL-TIME
        /// engagement rate. With a long record of declines that rate takes several engagements to climb
        /// past a fifth, and every one of them was paid — a student who simply started working things
        /// out themselves collected the award three times for one change of habit.
        ///
        /// THE RULE. One award per gap EPISODE:
        ///   1. Before this exercise, the element was a gap over the whole record (at least three
        ///      opportunities, at most a fifth engaged).
        ///   2. If it was already paid for, a NEW gap has to have formed since: the last three
        ///      opportunities after that award were all declined. Working on it next time pays nothing;
        ///      falling back into avoiding it, and then facing it again, pays again.
        ///
        /// The exercise being engaged in is excluded from every count, so the answer does not depend on
        /// whether the decision it just wrote has landed yet.
        /// </summary>
        [HttpPost("insight-gap-award")]
        public ActionResult<InsightGapAwardResponse> AwardInsightForGap([FromBody] InsightGapAwardRequest request)
        {
            if (request.StudentId <= 0 || request.AttemptId <= 0)
                return Ok(new InsightGapAwardResponse());

            var names = request.Element switch
            {
                AnchorElement.SolveOnOwn => AnchorDimension.SolveOnOwn,
                AnchorElement.SelfExplanation => AnchorDimension.SelfExplanation,
                AnchorElement.MethodComparison => AnchorDimension.MethodComparison,
                _ => null,
            };
            if (names is null) return Ok(new InsightGapAwardResponse());

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            // The same exercise paid twice (two solution points, or a retried request) is one act.
            var alreadyForThisAttempt = conn.ExecuteScalar<int>(
                $"SELECT COUNT(1) FROM {InsightGapAwardTable} WHERE StudentId = @StudentId AND Element = @Element AND AttemptId = @AttemptId",
                new { request.StudentId, request.Element, request.AttemptId });
            if (alreadyForThisAttempt > 0) return Ok(new InsightGapAwardResponse());

            var attemptIds = conn.Query<long>(
                $"SELECT Id FROM {AnchorStoreSettings.Table} WHERE StudentId = @StudentId AND Id <> @AttemptId ORDER BY Id",
                new { request.StudentId, request.AttemptId }).ToList();

            var records = attemptIds.Count == 0
                ? []
                : conn.Query<DecisionRecordRow>(
                    $"SELECT AttemptId, Name, Choice FROM {AnchorStoreSettings.RecordTable} WHERE StudentId = @StudentId",
                    new { request.StudentId }).ToList();

            var lastAwardedAttempt = conn.ExecuteScalar<long?>(
                $"SELECT MAX(AttemptId) FROM {InsightGapAwardTable} WHERE StudentId = @StudentId AND Element = @Element",
                new { request.StudentId, request.Element }) ?? 0;

            // Whether they engaged, for each exercise that carried this decision at all, oldest first.
            List<bool> Opportunities(long afterAttempt)
            {
                var flags = new List<bool>();

                foreach (var id in attemptIds.Where(id => id > afterAttempt))
                {
                    var answers = Answers(id, names, records).ToList();
                    if (answers.Count == 0) continue;

                    flags.Add(AnchorDimension.Engaged(answers));
                }

                return flags;
            }

            bool IsGap(List<bool> flags) =>
                flags.Count >= GapThresholds.MinOpportunities
                && (double)flags.Count(engaged => engaged) / flags.Count <= GapThresholds.MaxEngagementRate;

            // The first award reads the whole record, as the profile does. Every later one reads only
            // what has happened SINCE the last award, and only its most recent three opportunities: the
            // engagements right after an award are the change of habit being rewarded, so they must not
            // hold the gap shut for the next dozen declines, nor count as a reason to pay again.
            var qualifies = lastAwardedAttempt == 0
                ? IsGap(Opportunities(0))
                : IsGap(Opportunities(lastAwardedAttempt).TakeLast(GapThresholds.MinOpportunities).ToList());
            if (!qualifies) return Ok(new InsightGapAwardResponse());

            conn.Execute(
                $"INSERT INTO {InsightGapAwardTable} (StudentId, Element, AttemptId, AwardedAt) VALUES (@StudentId, @Element, @AttemptId, @AwardedAt)",
                new { request.StudentId, request.Element, request.AttemptId, AwardedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss") });

            return Ok(new InsightGapAwardResponse { Amount = InsightForFacingGapXp });
        }

        // ── GET /student-progress/tutorial/{studentId} ───────────────────────
        /// <summary>Returns the student's onboarding step and completed tutorials.</summary>
        [HttpGet("tutorial/{studentId}")]
        public ActionResult<TutorialStateResponse> GetTutorialState(long studentId)
        {
            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            var progress = conn.QueryFirstOrDefault<StudentProgressRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ProgressTable} WHERE StudentId = @StudentId",
                new { StudentId = studentId });

            var tutorials = new List<string>();
            if (progress != null && !string.IsNullOrWhiteSpace(progress.TutorialsCompleted))
            {
                try { tutorials = JsonSerializer.Deserialize<List<string>>(progress.TutorialsCompleted) ?? []; } catch { }
            }

            return Ok(new TutorialStateResponse
            {
                // Empty string signals "no data yet" — lets the frontend distinguish
                // between an unknown state and a genuine "bartering" step.
                OnboardingStep = progress?.OnboardingStep ?? "",
                TutorialsCompleted = tutorials
            });
        }

        // ── POST /student-progress/tutorial/{studentId} ──────────────────────
        /// <summary>Advances the onboarding step and/or marks a tutorial complete.</summary>
        [HttpPost("tutorial/{studentId}")]
        public ActionResult<TutorialStateResponse> UpdateTutorialState(long studentId, [FromBody] TutorialUpdateRequest request)
        {
            if (request == null || request.StudentId <= 0)
                return BadRequest("Invalid request.");
            if (string.IsNullOrWhiteSpace(request.OnboardingStep) && string.IsNullOrWhiteSpace(request.TutorialKey))
                return BadRequest("Provide onboardingStep and/or tutorialKey.");

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            // Ensure progress row exists
            conn.Execute(
                $"INSERT OR IGNORE INTO {StudentProgressDBSettings.ProgressTable} " +
                "(StudentId, TotalXP, ExercisesCompleted, StreakDays, LastExerciseDate, ChoiceXP, InsightXP, ResolveXP, LifetimeAgencyXP) " +
                "VALUES (@StudentId, 0, 0, 0, '', 0, 0, 0, 0)",
                new { request.StudentId });

            // Fetch current row
            var progress = conn.QueryFirstOrDefault<StudentProgressRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ProgressTable} WHERE StudentId = @StudentId",
                new { StudentId = request.StudentId });

            var onboardingStep = progress?.OnboardingStep ?? "bartering";
            var tutorials = new List<string>();
            if (progress != null && !string.IsNullOrWhiteSpace(progress.TutorialsCompleted))
            {
                try { tutorials = JsonSerializer.Deserialize<List<string>>(progress.TutorialsCompleted) ?? []; } catch { }
            }

            // Apply onboarding step update
            if (!string.IsNullOrWhiteSpace(request.OnboardingStep))
                onboardingStep = request.OnboardingStep;

            // Apply tutorial completion
            if (!string.IsNullOrWhiteSpace(request.TutorialKey) && !tutorials.Contains(request.TutorialKey))
                tutorials.Add(request.TutorialKey);

            conn.Execute(
                $"UPDATE {StudentProgressDBSettings.ProgressTable} " +
                "SET OnboardingStep = @OnboardingStep, TutorialsCompleted = @TutorialsCompleted " +
                "WHERE StudentId = @StudentId",
                new
                {
                    request.StudentId,
                    OnboardingStep = onboardingStep,
                    TutorialsCompleted = JsonSerializer.Serialize(tutorials)
                });

            return Ok(new TutorialStateResponse
            {
                OnboardingStep = onboardingStep,
                TutorialsCompleted = tutorials
            });
        }

        // ── GET /student-progress/exercises/{studentId} ──────────────────────
        /// <summary>Returns all completed exercises/tutorials for a student.</summary>
        [HttpGet("exercises/{studentId}")]
        public ActionResult<List<ExerciseCompletionRecord>> GetCompletedExercises(long studentId)
        {
            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            var records = conn.Query<ExerciseCompletionRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ExerciseCompletionsTable} " +
                "WHERE StudentId = @StudentId ORDER BY CompletedAt ASC",
                new { StudentId = studentId }).ToList();

            return Ok(records);
        }

        // ── POST /student-progress/exercises/{studentId} ─────────────────────
        /// <summary>Marks a single exercise/tutorial complete (idempotent).</summary>
        [HttpPost("exercises/{studentId}")]
        public ActionResult MarkExerciseCompleted(long studentId, [FromBody] ExerciseCompletionRequest request)
        {
            if (request == null || request.StudentId <= 0 ||
                string.IsNullOrWhiteSpace(request.Category) ||
                string.IsNullOrWhiteSpace(request.ExerciseKey) ||
                string.IsNullOrWhiteSpace(request.ExerciseId))
                return BadRequest("Invalid request.");

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            // Idempotent — don't insert duplicates
            var existing = conn.ExecuteScalar<int>(
                $"SELECT COUNT(*) FROM {StudentProgressDBSettings.ExerciseCompletionsTable} " +
                "WHERE StudentId = @StudentId AND Category = @Category " +
                "AND ExerciseKey = @ExerciseKey AND ExerciseId = @ExerciseId",
                new { request.StudentId, request.Category, request.ExerciseKey, request.ExerciseId });

            if (existing == 0)
            {
                conn.Execute(
                    $"INSERT INTO {StudentProgressDBSettings.ExerciseCompletionsTable} " +
                    "(StudentId, Category, ExerciseKey, ExerciseId, CompletedAt) " +
                    "VALUES (@StudentId, @Category, @ExerciseKey, @ExerciseId, @CompletedAt)",
                    new
                    {
                        request.StudentId,
                        request.Category,
                        request.ExerciseKey,
                        request.ExerciseId,
                        CompletedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss")
                    });
            }

            return Ok();
        }

        // ── GET /student-progress/weakness/{studentId} ───────────────────────
        /// <summary>
        /// Computes 6 weakness dimensions and returns the weakest area.
        /// Used by the "Face Your Weakness" goal and dashboard weak-area card.
        /// </summary>
        [HttpGet("weakness/{studentId}")]
        public ActionResult<WeaknessResponse> GetWeakness(long studentId)
        {
            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();

            // Ensure tables exist
            EnsureTables(conn);

            // Progress row (streak, agency XP)
            var progress = conn.QueryFirstOrDefault<StudentProgressRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ProgressTable} WHERE StudentId = @StudentId",
                new { StudentId = studentId });

            // Exercise type counts (Suitability / Efficiency / Matching)
            var typeCounts = conn.Query<MethodCount>(
                $"SELECT ExerciseType AS Method, COUNT(*) AS Value " +
                $"FROM {StudentProgressDBSettings.ExerciseLogTable} " +
                "WHERE StudentId = @StudentId GROUP BY ExerciseType",
                new { StudentId = studentId })
                .ToDictionary(m => m.Method, m => m.Value);

            // Goal completion stats (errors, hints, pippin per exercise)
            var goalStats = conn.QueryFirstOrDefault<GoalCompletionStats>(
                $"SELECT " +
                $"  COUNT(*) AS TotalGoalCompletions, " +
                $"  COALESCE(AVG(TotalErrors), 0) AS AvgErrors, " +
                $"  COALESCE(AVG(TotalHints), 0) AS AvgHints, " +
                $"  COALESCE(AVG(PippinMessages), 0) AS AvgPippin " +
                $"FROM {StudentProgressDBSettings.GoalsTable} " +
                "WHERE StudentId = @StudentId",
                new { StudentId = studentId });

            int total = typeCounts.Values.Sum();
            int suit = typeCounts.GetValueOrDefault("Suitability", 0);
            int eff = typeCounts.GetValueOrDefault("Efficiency", 0);
            int match = typeCounts.GetValueOrDefault("Matching", 0);
            int streak = progress?.StreakDays ?? 0;
            double avgErrors = goalStats?.AvgErrors ?? 0;
            double avgHints = goalStats?.AvgHints ?? 0;
            double avgPippin = goalStats?.AvgPippin ?? 0;

            // ── Compute dimension scores (0–100, higher = stronger) ──────

            // Decision Accuracy: how often they engage with Suitability exercises
            int decisionScore = total > 0 ? (int)Math.Round((double)suit / total * 100) : 0;

            // Efficiency Judgment: how often they engage with Efficiency exercises
            int efficiencyScore = total > 0 ? (int)Math.Round((double)eff / total * 100) : 0;

            // Method Recognition: how often they engage with Matching exercises
            int methodScore = total > 0 ? (int)Math.Round((double)match / total * 100) : 0;

            // Computational Skill: inverse of average errors (0 errors = 100, 5+ errors = 0)
            int compScore = total > 0 ? Math.Max(0, 100 - (int)Math.Round(avgErrors * 20)) : 50;

            // Independence: inverse of avg hints + avg pippin (0 combined = 100, 3+ combined = 0)
            double depPenalty = avgHints + avgPippin;
            int indepScore = total > 0 ? Math.Max(0, 100 - (int)Math.Round(depPenalty * 33)) : 50;

            // Consistency: streak days / 7, capped at 100
            int consistencyScore = Math.Min(100, (int)Math.Round((double)streak / 7 * 100));

            var dimensions = new List<WeaknessDimension>
            {
                new() { Key = "decision-accuracy", Label = "Decision Accuracy", Score = decisionScore, RecommendedExercise = "Suitability" },
                new() { Key = "efficiency-judgment", Label = "Efficiency Judgment", Score = efficiencyScore, RecommendedExercise = "Efficiency" },
                new() { Key = "method-recognition", Label = "Method Recognition", Score = methodScore, RecommendedExercise = "Matching" },
                new() { Key = "computational-skill", Label = "Computational Skill", Score = compScore, RecommendedExercise = "Suitability" },
                new() { Key = "independence", Label = "Independence", Score = indepScore, RecommendedExercise = "Suitability" },
                new() { Key = "consistency", Label = "Consistency", Score = consistencyScore, RecommendedExercise = "Suitability" },
            };

            // Find weakest (lowest score; break ties by choosing first)
            var weakest = dimensions.OrderBy(d => d.Score).First();

            return Ok(new WeaknessResponse
            {
                Dimensions = dimensions,
                Weakest = weakest
            });
        }

        // ── GET /student-progress/analyze-session/{studentId} ───────────────
        /// <summary>
        /// Auto-analyzes today's session: strengths, improvement area, action steps.
        /// Used by the end-session reflection.
        ///
        /// Grounded in the CURRENT goal model — the six goal categories and the three agency
        /// currencies. It used to ask the model to reason about the retired Solo/Pippin split, but
        /// nothing writes those agency sources any more (`picked-solo` / `picked-pippin` appear
        /// nowhere in the client), so both counts were permanently zero and the advice was built on a
        /// distinction that no longer exists.
        /// </summary>
        [HttpGet("analyze-session/{studentId}")]
        public async Task<ActionResult<SessionAnalysisResponse>> AnalyzeSession(long studentId, [FromQuery] string? language = null)
        {
            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");

            var progress = conn.QueryFirstOrDefault<StudentProgressRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ProgressTable} WHERE StudentId = @StudentId",
                new { StudentId = studentId });

            var todayExercises = conn.Query<ExerciseLogRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ExerciseLogTable} " +
                "WHERE StudentId = @StudentId AND CompletedAt >= @Today ORDER BY CompletedAt DESC",
                new { StudentId = studentId, Today = today }).ToList();

            var todayGoals = conn.Query<GoalCompletionRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.GoalsTable} " +
                "WHERE StudentId = @StudentId AND CompletedAt >= @Today",
                new { StudentId = studentId, Today = today }).ToList();

            var agencyLog = conn.Query<AgencyLogEntry>(
                $"SELECT * FROM {StudentProgressDBSettings.AgencyLogTable} " +
                "WHERE StudentId = @StudentId AND LoggedAt >= @Today",
                new { StudentId = studentId, Today = today }).ToList();

            // Demo data for user 1
            if (studentId == 1 && todayExercises.Count == 0)
            {
                todayExercises = GenerateDemoData().Where(e => e.CompletedAt?.CompareTo(today) >= 0).ToList();
                if (progress == null)
                    progress = new StudentProgressRecord { StudentId = 1, ExercisesCompleted = 3, StreakDays = 2, ChoiceXP = 10, InsightXP = 15, ResolveXP = 20 };
            }

            int choiceXpToday = agencyLog.Where(a => a.XpType == "choice").Sum(a => a.Amount);
            int insightXpToday = agencyLog.Where(a => a.XpType == "insight").Sum(a => a.Amount);
            int resolveXpToday = agencyLog.Where(a => a.XpType == "resolve").Sum(a => a.Amount);
            var exerciseTypes = todayExercises.GroupBy(e => e.ExerciseType).ToDictionary(g => g.Key, g => g.Count());
            int hintsToday = todayGoals.Sum(g => g.TotalHints);
            int errorsToday = todayGoals.Sum(g => g.TotalErrors);

            var stats = new StringBuilder();
            stats.AppendLine($"Today's session ({today}):");
            stats.AppendLine($"- Exercises completed: {todayExercises.Count}");
            if (todayExercises.Count == 0 && todayGoals.Count == 0)
                stats.AppendLine("- NOTE: nothing has been logged today. Say that plainly and suggest a way to start — do not describe or imply any activity that the data does not show.");
            stats.AppendLine(exerciseTypes.Count > 0
                ? $"- Exercise types practised: {string.Join(", ", exerciseTypes.Select(kv => $"{kv.Key}×{kv.Value}"))}"
                : "- Exercise types practised: none");
            stats.AppendLine($"- Goals completed: {todayGoals.Count}");
            foreach (var goal in todayGoals)
                stats.AppendLine($"    - \"{goal.GoalLabel}\" (category: {goal.GoalId})");
            stats.AppendLine($"- Hints used: {hintsToday}, errors made: {errorsToday}");
            stats.AppendLine($"- Agency earned today — Choice (deciding): {choiceXpToday}, Insight (facing something avoided): {insightXpToday}, Resolve (following through): {resolveXpToday}");
            stats.AppendLine($"- Current streak: {progress?.StreakDays ?? 0} days");

            // The end-session advice is the longest AI output a student reads, so it has to come back in
            // the language they are working in rather than always in English.
            var lang = GoalSuggestionText.Resolve(language);
            var responseLanguage = lang switch
            {
                GoalSuggestionText.Lang.Ja => "Japanese",
                GoalSuggestionText.Lang.De => "German",
                _ => "English"
            };

            var apiKey = _configuration["OpenAI:ApiKey"];
            if (!string.IsNullOrWhiteSpace(apiKey))
            {
                try
                {
                    var prompt = $@"You are a supportive math tutor. Analyse this student's session and give feedback in three parts.

1. STRENGTHS: what they actually did well today. Refer to the concrete things in the data below — the exercise types they practised, the goals they followed through on, the agency they earned. 1-2 sentences.
2. IMPROVEMENT: one area to grow, framed positively. 1 sentence.
3. ACTION STEPS: 2-3 concrete things to try next session.

The app's goal system has SIX categories. Suggest next steps using these, and prefer a category the student has NOT just used:
- method — practise a specific solving method (Elimination, Substitution or Equalization)
- exerciseType — do more of one exercise type (Suitability, Efficiency or Matching)
- selfExplanation — put your reasoning into words
- methodComparison — compare two methods on the same system
- solveOnOwn — work through an exercise without help
- hintsAndErrors — aim for fewer hints, or fewer errors

The app tracks THREE agency currencies. Describe what they represent, never the numbers:
- Choice — deciding rather than doing (opting into a reflection, setting your own goal)
- Insight — facing something you tend to avoid
- Resolve — following through on something you committed to

Rules:
- Warm tone, like a coach rather than a robot.
- Never mention XP numbers; describe the behaviour instead.
- The category names listed above (method, exerciseType, selfExplanation, methodComparison, solveOnOwn, hintsAndErrors) are internal codes. NEVER print them or anything that looks like a code. Name the action in plain words a student would use.
- Base everything on the session data below. If very little happened today, say so kindly rather than inventing detail.
- Write your whole response in {responseLanguage}.

Session data:
{stats}

Respond ONLY in this JSON:
{{""strengths"":""..."",""improvement"":""..."",""actionSteps"":[""step 1"",""step 2"",""step 3""]}}";

                    var raw = await CallOpenAI(apiKey,
                        $"You are a supportive math coach. Analyse a student's study session and give encouraging, actionable feedback. Anchor every point in the session data you are given. Write your whole response in {responseLanguage}. Always output valid JSON.",
                        prompt);

                    if (raw != null)
                    {
                        var jsonStart = raw.IndexOf('{');
                        var jsonEnd = raw.LastIndexOf('}');
                        if (jsonStart >= 0 && jsonEnd > jsonStart)
                        {
                            var parsed = JsonSerializer.Deserialize<SessionAnalysisResponse>(
                                raw.Substring(jsonStart, jsonEnd - jsonStart + 1),
                                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                            if (parsed != null)
                            {
                                parsed.IsAiGenerated = true;
                                PopulateVisualizationData(parsed, todayExercises, todayGoals, agencyLog);
                                return Ok(parsed);
                            }
                        }
                    }
                }
                catch { /* fall through to rule-based fallback */ }
            }

            // Rule-based fallback, worded in the student's language — see ReflectionText. This is what a
            // student sees when the model is unreachable, so English here means English inside an
            // otherwise Japanese screen.
            var fallback = new SessionAnalysisResponse
            {
                Summary = $"Today you completed {todayExercises.Count} exercise(s) and achieved {todayGoals.Count} goal(s).",
                IsAiGenerated = false
            };

            if (todayGoals.Count > 0)
                fallback.Strengths = ReflectionText.StrengthsGoals(lang, todayGoals.Count);
            else if (todayExercises.Count > 0)
                fallback.Strengths = ReflectionText.StrengthsPractised(lang);
            else
                fallback.Strengths = ReflectionText.StrengthsNothing(lang);

            fallback.Improvement = todayGoals.Count > 0
                ? ReflectionText.ImprovementGoals(lang)
                : ReflectionText.ImprovementNoGoal(lang);

            fallback.ActionSteps = ReflectionText.ActionSteps(lang);

            PopulateVisualizationData(fallback, todayExercises, todayGoals, agencyLog);
            return Ok(fallback);
        }

        // ── Helper: fill visualization fields from session data ──────────────
        private static void PopulateVisualizationData(
            SessionAnalysisResponse result,
            List<ExerciseLogRecord> todayExercises,
            List<GoalCompletionRecord> todayGoals,
            List<AgencyLogEntry> agencyLog)
        {
            result.ExercisesToday = todayExercises.Count;
            result.ExerciseTypeBreakdown = todayExercises
                .GroupBy(e => e.ExerciseType)
                .ToDictionary(g => g.Key, g => g.Count());
            result.GoalsCompletedToday = todayGoals.Select(g => g.GoalLabel).ToList();
            result.ActiveGoalsCount = 0; // Set by frontend

            // The session's hint and error totals — the two tracked quality dimensions that remain.
            // The old Solo/Pippin averages went with the Solo/Pippin split: nothing has written
            // `PippinMessages` since the free-text chat was removed, so every row held 0 and the
            // comparison could never mean anything.
            result.TotalHintsToday = todayGoals.Sum(g => g.TotalHints);
            result.TotalErrorsToday = todayGoals.Sum(g => g.TotalErrors);
        }

        // ── POST /student-progress/reflect-on-stats/{studentId} ──────────────
        /// <summary>
        /// Student writes a free-text reflection about their performance.
        /// The model compares it against their actual data and gives honest feedback.
        /// NO XP is awarded — this is purely informational feedback.
        /// For demo user "demo1", synthetic data is generated if no real data exists.
        /// </summary>
        [HttpPost("reflect-on-stats/{studentId}")]
        public async Task<ActionResult<ReflectOnStatsResponse>> ReflectOnStats(
            long studentId, [FromBody] ReflectOnStatsRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.StudentReflection))
                return BadRequest("Reflection text is required.");

            var lang = GoalSuggestionText.Resolve(request.Language);

            var apiKey = _configuration["OpenAI:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
                return Ok(new ReflectOnStatsResponse
                {
                    Feedback = ReflectionText.ReflectionNoApiKey(lang),
                    Category = "unclear"
                });

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            var progress = conn.QueryFirstOrDefault<StudentProgressRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ProgressTable} WHERE StudentId = @StudentId",
                new { StudentId = studentId });

            var exerciseLog = conn.Query<ExerciseLogRecord>(
                $"SELECT ExerciseType, CompletedAt FROM {StudentProgressDBSettings.ExerciseLogTable} " +
                "WHERE StudentId = @StudentId ORDER BY CompletedAt DESC LIMIT 20",
                new { StudentId = studentId }).ToList();

            // For demo1, use demo data if no real data
            if (studentId == 1 && (progress == null || exerciseLog.Count == 0))
            {
                exerciseLog = GenerateDemoData();
                progress = new StudentProgressRecord
                {
                    StudentId = 1, TotalXP = 120, ExercisesCompleted = 8, StreakDays = 2,
                    ChoiceXP = 25, InsightXP = 30, ResolveXP = 45, LifetimeAgencyXP = 100
                };
            }

            // Build stats summary for the model
            var stats = new System.Text.StringBuilder();
            if (progress != null)
            {
                stats.AppendLine($"Exercises completed: {progress.ExercisesCompleted}");
                stats.AppendLine($"Current streak: {progress.StreakDays} days");
                stats.AppendLine($"Agency XP — Choice: {progress.ChoiceXP}, Insight: {progress.InsightXP}, Resolve: {progress.ResolveXP}, Total: {progress.ChoiceXP + progress.InsightXP + progress.ResolveXP}");
            }
            var typeCounts = exerciseLog
                .GroupBy(e => e.ExerciseType)
                .ToDictionary(g => g.Key, g => g.Count());
            stats.AppendLine("Exercise breakdown by type:");
            foreach (var kv in typeCounts)
                stats.AppendLine($"  - {kv.Key}: {kv.Value} exercises");
            if (typeCounts.Count == 0)
                stats.AppendLine("  (No exercises completed yet)");

            var responseLanguage = lang switch
            {
                GoalSuggestionText.Lang.Ja => "Japanese",
                GoalSuggestionText.Lang.De => "German",
                _ => "English"
            };

            var prompt = $@"You are a supportive study coach. A student has written a reflection about what they think their weak area is. Your job:

1. FIRST, AFFIRM the student. Always validate what they say — never bluntly correct or dismiss them. Even if the data doesn't perfectly match, find something to agree with. Start your feedback with acknowledgement.

2. THEN, gently compare their self-assessment to the actual stats below. If the data suggests additional weak areas, frame them as ""You might also want to keep an eye on..."" or ""One area you might not have noticed..."" — NEVER say ""You're wrong"" or ""Actually..."".

3. If the student's text is complete gibberish, off-topic, or totally unrelated to math/learning/this platform, respond warmly: ""Hmm, I didn't quite catch that! 😊 Could you tell me again — what do you think is your weakest area right now?"" and set category to ""no_xp"".

4. Keep feedback to 2-3 friendly sentences. Use emojis sparingly (max 1).

5. Write your whole response in {responseLanguage}.

CATEGORY RULES (pick exactly one):
- 'goal' — text is about goals, targets or commitments (e.g. ""I want to finish my 5 Elimination exercises"", ""my weak area is completing the goals I set"")
- 'practice' — text is about doing exercises, practicing methods (e.g. ""I'm bad at elimination"", ""I struggle with matching exercises"", ""I need more practice with substitution"")
- 'both' — text mentions BOTH goal-related AND practice-related things
- 'no_xp' — gibberish, off-topic, not related to math/learning/motivation/this platform at all (use rarely)
- 'unclear' — learning-related but too vague to classify (last resort only)

STUDENT STATS:
{stats}

STUDENT REFLECTION:
{request.StudentReflection}

Respond ONLY in this JSON: {{""category"":""goal|practice|both|unclear|no_xp"",""feedback"":""2-3 sentences, affirmation first, gentle suggestion second""}}

IMPORTANT — two different languages in one reply:
- The ""category"" value MUST stay exactly one of the English codes above.
- The ""feedback"" value MUST be written entirely in {responseLanguage}, however much English appears elsewhere in these instructions.";

            try
            {
                var rawText = await CallOpenAI(apiKey,
                    $"You are a supportive study coach. Always affirm the student's self-assessment first, then gently suggest additional areas from their stats. Never bluntly correct them. For gibberish/off-topic, warmly ask them to try again. Classify into: goal, practice, both, unclear, or no_xp. Write your whole response in {responseLanguage}. Always output valid JSON.",
                    prompt);

                if (rawText == null)
                {
                    return Ok(new ReflectOnStatsResponse
                    {
                        Feedback = ReflectionText.ReflectionUnreachable(lang),
                        Category = "unclear"
                    });
                }

                // Try to parse the JSON response
                try
                {
                    var jsonStart = rawText.IndexOf('{');
                    var jsonEnd = rawText.LastIndexOf('}');
                    if (jsonStart >= 0 && jsonEnd > jsonStart)
                    {
                        var jsonText = rawText.Substring(jsonStart, jsonEnd - jsonStart + 1);
                        using var resultDoc = JsonDocument.Parse(jsonText);
                        var category = resultDoc.RootElement.TryGetProperty("category", out var catProp)
                            ? catProp.GetString()?.ToLower() ?? "unclear"
                            : "unclear";
                        var feedback = resultDoc.RootElement.TryGetProperty("feedback", out var fbProp)
                            ? fbProp.GetString() ?? ""
                            : rawText;

                        var validCategories = new HashSet<string> { "goal", "practice", "both", "unclear", "no_xp" };
                        if (!validCategories.Contains(category))
                            category = "unclear";

                        return Ok(new ReflectOnStatsResponse { Feedback = AiTextFormatter.StripMathDelimiters(feedback), Category = category });
                    }
                }
                catch { /* fall through to raw text */ }

                return Ok(new ReflectOnStatsResponse { Feedback = AiTextFormatter.StripMathDelimiters(rawText), Category = "unclear" });
            }
            catch
            {
                return Ok(new ReflectOnStatsResponse
                {
                    Feedback = ReflectionText.ReflectionFailed(lang),
                    Category = CategoryDetector.DetectCategoryFromText(request.StudentReflection)
                });
            }
        }

        // ── POST /student-progress/suggest-goals/{studentId} ─────────────────
        /// <summary>
        /// Uses the model to suggest 3 goals from the predefined catalogue based on
        /// the student's performance data. Each suggestion includes a one-line reason.
        /// For demo user "demo1", synthetic data is generated if no real data exists.
        ///
        /// `language` is the UI language. Everything this returns is prose the student reads in the
        /// goal picker, so it has to arrive in their language — from the model via an instruction, and
        /// from the rule-based fallback, which builds its own sentences server-side.
        /// </summary>
        [HttpPost("suggest-goals/{studentId}")]
        public async Task<ActionResult<GoalPlanResponse>> SuggestGoals(long studentId, [FromQuery] string? language = null)
        {
            var lang = GoalSuggestionText.Resolve(language);

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            // Fetch student progress
            var progress = conn.QueryFirstOrDefault<StudentProgressRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ProgressTable} WHERE StudentId = @StudentId",
                new { StudentId = studentId });

            var exerciseLog = conn.Query<ExerciseLogRecord>(
                $"SELECT ExerciseType, CompletedAt FROM {StudentProgressDBSettings.ExerciseLogTable} " +
                "WHERE StudentId = @StudentId ORDER BY CompletedAt DESC LIMIT 20",
                new { StudentId = studentId }).ToList();

            // For demo1, generate synthetic demo data if no real data exists
            bool isDemo = false;
            if (studentId == 1 && (progress == null || exerciseLog.Count == 0))
            {
                isDemo = true;
                exerciseLog = GenerateDemoData();
                progress = new StudentProgressRecord
                {
                    StudentId = 1,
                    TotalXP = 120,
                    ExercisesCompleted = 8,
                    StreakDays = 2,
                    ChoiceXP = 5,
                    InsightXP = 10,
                    ResolveXP = 15,
                    LifetimeAgencyXP = 30
                };
            }

            // If no progress at all, return honest no-data response
            if (progress == null || progress.ExercisesCompleted == 0)
            {
                return Ok(new GoalPlanResponse
                {
                    PlanTitle = GoalSuggestionText.NoDataTitle(lang),
                    PlanNarrative = GoalSuggestionText.NoDataNarrative(lang)
                });
            }

            var typeCounts = exerciseLog
                .GroupBy(e => e.ExerciseType)
                .ToDictionary(g => g.Key, g => g.Count());

            // What the student actually does when offered something, which is the one input that makes
            // a suggestion specific rather than generic. Null when their history is too thin, which is
            // handled by the same "not enough data" path as a first suggestion.
            var profile = _anchors.GetProfile(studentId);

            var stats = BuildSuggestionStats(studentId, isDemo, progress, typeCounts, profile);

            // Try OpenAI first, fall back to rules if it fails
            var apiKey = _configuration["OpenAI:ApiKey"];
            if (!string.IsNullOrWhiteSpace(apiKey))
            {
                try
                {
                    var aiResult = await TryAISuggestions(apiKey, stats, language);
                    if (aiResult != null && aiResult.Goals.Count > 0)
                        return Ok(aiResult);
                }
                catch
                {
                    // AI failed — fall through to rule-based fallback
                }
            }

            // Rule-based fallback (always works, no AI needed)
            return Ok(GenerateFallbackPlan(progress, typeCounts, profile, lang));
        }

        // ── AI suggestion helper ───────────────────────────────────────────────

        private async Task<GoalPlanResponse?> TryAISuggestions(string apiKey, string statsSummary, string? language)
        {

            var goalCatalogue = BuildGoalCatalogueForPrompt();

            var prompt = $@"You are a helpful study planner. Create a coherent mini-plan of 3 goals for this student.

Student data:
{statsSummary}

{GoalSuggestionText.LangInstruction(language)}

{goalCatalogue}

RULES:
1. Write a SHORT plan title (max 6 words) capturing the theme.
2. Write a 2-sentence narrative explaining WHY these 3 goals fit together for THIS student. Reference their own numbers. Never use generic praise.
3. Speak TO the student, using ""you"" and ""your"". The title, the narrative and every reason are shown to the student directly, so never write about them in the third person (""the student"", ""they have"").
4. Suggest EXACTLY 3 goals, using ONLY the categories listed above, spelled exactly as given.
5. WHAT THEY ARE AVOIDING COMES FIRST. If the data names a behaviour the student consistently turns down, at least one goal MUST target it. That is the most useful thing you can suggest — they cannot see their own pattern, and it is the one input that makes a suggestion specific rather than generic.
6. For each goal give: category, focus (a method or an exercise type, or omit for any), metric, target, and for hintsAndErrors also quality and maxPerExercise. Then a specific, data-aware reason (max 20 words) quoting the student's own numbers. Never write a reason that would fit any student.
7. Respond ONLY in this JSON format:
{{""planTitle"":""short title"",""planNarrative"":""2-sentence narrative"",""goals"":[{{""category"":""methodComparison"",""focus"":""Elimination"",""metric"":""exercises"",""target"":5,""quality"":"""",""maxPerExercise"":0,""reason"":""reason text""}}]}}";

            var text = await CallOpenAI(apiKey,
                "You are a study planner. Only suggest goals from the provided catalogue, using the exact category names. Address the student as \"you\". Always output valid JSON with planTitle, planNarrative, and goals array.",
                prompt);

            if (text == null) return null;

            // Extract JSON object from response
            var jsonStart = text.IndexOf('{');
            var jsonEnd = text.LastIndexOf('}');
            if (jsonStart >= 0 && jsonEnd > jsonStart)
                text = text.Substring(jsonStart, jsonEnd - jsonStart + 1);

            var plan = JsonSerializer.Deserialize<GoalPlanResponse>(text,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (plan == null || plan.Goals == null || plan.Goals.Count == 0) return null;

            // Everything the model produces is normalised against the catalogue, so a suggestion is
            // always a goal that exists with legal values. An invented category is dropped rather than
            // repaired: guessing what it meant could hand the student a goal about something nobody
            // asked for.
            plan.Goals = plan.Goals
                .Select(NormaliseGoalSuggestion)
                .OfType<GoalSuggestion>()
                .GroupBy(suggestion => $"{suggestion.Category}|{suggestion.Focus}|{suggestion.Metric}|{suggestion.Target}|{suggestion.Quality}|{suggestion.MaxPerExercise}")
                .Select(group => group.First())
                .Take(3)
                .ToList();

            return plan.Goals.Count > 0 ? plan : null;
        }

        /// <summary>
        /// Describes the goal menu to the model.
        ///
        /// Built from <see cref="GoalCatalogue"/> rather than written out by hand, so the prompt and
        /// the validation can never disagree — a menu the model is told about but the server then
        /// rejects would produce suggestions that silently vanish.
        /// </summary>
        private static string BuildGoalCatalogueForPrompt()
        {
            var lines = new List<string>
            {
                "AVAILABLE GOAL CATEGORIES (use these exact category names):",
                ""
            };

            foreach (var category in GoalCatalogue.Categories)
            {
                lines.Add($"  - {category}: the student aims to {GoalCatalogue.Describe(category)}.");
                lines.Add($"      counted in: {string.Join(" or ", GoalCatalogue.MetricsFor(category))}.");

                var focuses = GoalCatalogue.FocusesFor(category);
                lines.Add(focuses.Length > 0
                    ? $"      focus: one of {string.Join(", ", focuses)}, or omit for any."
                    : "      focus: not applicable — omit it.");

                lines.Add($"      target: one of {string.Join(", ", GoalCatalogue.ExerciseTargets)} exercises"
                          + (GoalCatalogue.AllowsMinutes(category)
                              ? $", or one of {string.Join(", ", GoalCatalogue.MinuteTargets)} minutes."
                              : "."));

                if (category == GoalCatalogue.HintsAndErrors)
                {
                    lines.Add("      quality: \"hints\" or \"errors\"; maxPerExercise: one of "
                              + string.Join(", ", GoalCatalogue.QualityLimits) + ".");
                }
            }

            return string.Join("\n", lines);
        }

        /// <summary>
        /// Forces one model suggestion into a goal the picker can actually build.
        ///
        /// Returns null when the category is not one of the six. Everything else is snapped to a legal
        /// value rather than rejected, because a suggestion that is merely mis-sized is still useful
        /// advice and should not be thrown away over a number.
        /// </summary>
        private static GoalSuggestion? NormaliseGoalSuggestion(GoalSuggestion raw)
        {
            if (raw is null) return null;

            var category = raw.Category?.Trim() ?? "";
            if (!GoalCatalogue.IsCategory(category)) return null;

            var metrics = GoalCatalogue.MetricsFor(category);
            var metric = metrics.Contains(raw.Metric) ? raw.Metric : metrics[0];

            var focuses = GoalCatalogue.FocusesFor(category);
            var focus = focuses.FirstOrDefault(f => string.Equals(f, raw.Focus, StringComparison.OrdinalIgnoreCase)) ?? "";

            var suggestion = new GoalSuggestion
            {
                Category = category,
                Focus = focus,
                Metric = metric,
                Target = GoalCatalogue.SnapTarget(metric, raw.Target > 0 ? raw.Target : GoalCatalogue.TargetsFor(metric)[0]),
                Reason = raw.Reason?.Trim() ?? ""
            };

            if (category == GoalCatalogue.HintsAndErrors)
            {
                suggestion.Quality = raw.Quality == "errors" ? "errors" : "hints";

                // Snapped, not clamped: 0 is a meaningful limit (hint-free), and quietly turning a
                // request for "no hints at all" into "up to one hint" would change what was asked.
                suggestion.MaxPerExercise = GoalCatalogue.QualityLimits
                    .OrderBy(limit => Math.Abs(limit - raw.MaxPerExercise))
                    .ThenBy(limit => limit)
                    .First();
            }

            return suggestion;
        }

        /// <summary>
        /// Everything the planner is told about the student, as one block.
        ///
        /// The avoidance profile is the part that was missing. Without it the suggestions could only
        /// see volume and accuracy, so they could recommend practising something the student already
        /// does constantly, or miss the one behaviour they consistently decline.
        /// </summary>
        private static string BuildSuggestionStats(
            long studentId,
            bool isDemo,
            StudentProgressRecord progress,
            Dictionary<string, int> typeCounts,
            AvoidanceProfile profile)
        {
            var lines = new StringBuilder();

            lines.AppendLine($"Student ID: {studentId}" + (isDemo ? " (demo user)" : ""));
            lines.AppendLine($"Exercises completed: {progress.ExercisesCompleted}");
            lines.AppendLine($"Practice streak: {progress.StreakDays} days");
            lines.AppendLine("Exercise breakdown:");
            foreach (var kv in typeCounts)
                lines.AppendLine($"  - {kv.Key}: {kv.Value} exercises");
            if (typeCounts.Count == 0)
                lines.AppendLine("  (none yet)");

            lines.AppendLine();
            if (profile.IsColdStart)
            {
                lines.AppendLine("What you do when offered a choice: not enough history yet — do NOT claim to know this student's habits.");
            }
            else
            {
                lines.AppendLine($"What you do when offered a choice (across {profile.Attempts} exercises):");
                foreach (var stat in profile.Elements)
                {
                    if (stat.Opportunities == 0) continue;
                    var name = string.IsNullOrEmpty(stat.Value) ? stat.Label : stat.Value;
                    lines.AppendLine($"  - {name}: you took it up {stat.Engaged} of {stat.Opportunities} times");
                }

                lines.AppendLine();
                if (profile.Gaps.Count > 0)
                {
                    lines.AppendLine("CONSISTENTLY AVOIDED — build at least one goal around this:");
                    foreach (var gap in profile.Gaps)
                    {
                        var name = string.IsNullOrEmpty(gap.Value) ? gap.Label : gap.Value;
                        var element = GoalCatalogue.CategoryForElement(gap.Element);
                        lines.AppendLine($"  - {name}: only {gap.Engaged} of {gap.Opportunities} times"
                                         + (element is null ? "" : $" (goal category: {element})"));
                    }
                }
                else
                {
                    lines.AppendLine("No consistent avoidance detected — you engage with what is offered.");
                }

                if (profile.AverageErrors is not null)
                    lines.AppendLine($"Average per exercise: {profile.AverageErrors} errors, {profile.AverageHints} hints.");
            }

            return lines.ToString();
        }

        // ── Fallback suggestion generator (rule-based, no AI) ──────────────────

        /// <summary>
        /// Rule-based plan, for when there is no API key or the model fails.
        ///
        /// Driven by the same inputs as the model — the avoidance profile above all — so a student
        /// gets specific, actionable suggestions even with no AI at all. A fallback that produced
        /// generic advice would make the whole feature look broken whenever the model is unavailable,
        /// which on a school network is often.
        /// </summary>
        private static GoalPlanResponse GenerateFallbackPlan(
            StudentProgressRecord progress,
            Dictionary<string, int> typeCounts,
            AvoidanceProfile profile,
            GoalSuggestionText.Lang lang)
        {
            var suggestions = new List<GoalSuggestion>();

            // 1. The behaviour they avoid. Only three of the six dimensions can be turned down, and a
            //    gap among those is the most useful thing we can offer — it is the one thing the
            //    student cannot see about themselves.
            var declinableGap = profile.Gaps.FirstOrDefault(gap =>
                gap.Element is AnchorElement.SelfExplanation or AnchorElement.MethodComparison or AnchorElement.SolveOnOwn);

            if (declinableGap is not null)
            {
                var category = GoalCatalogue.CategoryForElement(declinableGap.Element)!;
                var declined = declinableGap.Opportunities - declinableGap.Engaged;

                suggestions.Add(new GoalSuggestion
                {
                    Category = category,
                    Metric = GoalCatalogue.ExercisesMetric,
                    Target = 5,
                    Reason = GoalSuggestionText.DeclinedReason(
                        declinableGap.Element, declined, declinableGap.Opportunities, lang)
                });
            }

            // 2. The least-practised exercise type — real, visible, and always actionable.
            var total = typeCounts.Values.Sum();
            var leastPractised = GoalCatalogue.ExerciseTypes
                .Select(type => (Type: type, Count: typeCounts.GetValueOrDefault(type, 0)))
                .OrderBy(entry => entry.Count)
                .First();

            suggestions.Add(new GoalSuggestion
            {
                Category = GoalCatalogue.ExerciseType,
                Focus = leastPractised.Type,
                Metric = GoalCatalogue.ExercisesMetric,
                Target = 3,
                Reason = GoalSuggestionText.LeastPractisedReason(
                    leastPractised.Count, total, leastPractised.Type, lang)
            });

            // 3. Whatever their record actually shows, rather than a fixed third suggestion.
            if (profile.AverageHints is > 1)
            {
                suggestions.Add(new GoalSuggestion
                {
                    Category = GoalCatalogue.HintsAndErrors,
                    Metric = GoalCatalogue.ExercisesMetric,
                    Target = 3,
                    Quality = "hints",
                    MaxPerExercise = 1,
                    Reason = GoalSuggestionText.HintsReason(profile.AverageHints ?? 0, lang)
                });
            }
            else if (profile.AverageErrors is > 1)
            {
                suggestions.Add(new GoalSuggestion
                {
                    Category = GoalCatalogue.HintsAndErrors,
                    Metric = GoalCatalogue.ExercisesMetric,
                    Target = 3,
                    Quality = "errors",
                    MaxPerExercise = 1,
                    Reason = GoalSuggestionText.ErrorsReason(profile.AverageErrors ?? 0, lang)
                });
            }
            else
            {
                var leastUsed = profile.Elements
                    .Where(stat => stat.Element == AnchorElement.Method && !string.IsNullOrEmpty(stat.Value))
                    .OrderBy(stat => stat.Engaged)
                    .FirstOrDefault();

                var method = leastUsed?.Value ?? GoalCatalogue.Methods[0];
                var methodNeverUsed = profile.IsColdStart || leastUsed is null || leastUsed.Engaged == 0;

                suggestions.Add(new GoalSuggestion
                {
                    Category = GoalCatalogue.Method,
                    Focus = method,
                    Metric = GoalCatalogue.ExercisesMetric,
                    Target = 3,
                    Reason = GoalSuggestionText.MethodReason(method, leastUsed?.Engaged ?? 0, methodNeverUsed, lang)
                });
            }

            // The three above are distinct by construction, but a gap and the least-practised type can
            // land on the same category, and repeating a goal would waste a slot.
            suggestions = suggestions
                .GroupBy(suggestion => suggestion.Category + "|" + suggestion.Focus)
                .Select(group => group.First())
                .Take(3)
                .ToList();

            var avoided = declinableGap is not null;

            return new GoalPlanResponse
            {
                PlanTitle = GoalSuggestionText.Title(avoided, lang),
                PlanNarrative = GoalSuggestionText.Narrative(
                    avoided, progress.ExercisesCompleted, leastPractised.Type, lang),
                Goals = suggestions
            };
        }

        // ── Reflection endpoints ──────────────────────────────────────────────

        /// <summary>Returns up to 3 pending reflection items for the student, each with its questions.</summary>
        [HttpGet("reflection-queue/{studentId}")]
        public ActionResult<List<ReflectionQueueItemResponse>> GetReflectionQueue(long studentId)
        {
            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            // The session reflection is deliberately absent. This list is what the dashboard badges and
            // what its prompt bubble offers, and that prompt is about work the student has just finished;
            // the session reflection is opened from the end-of-session dialog, on purpose and at the end
            // of the session. Warning about it in the middle of one would be asking them to summarise a
            // day that is not over.
            var items = conn.Query<ReflectionQueueRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ReflectionQueueTable} " +
                "WHERE StudentId = @StudentId AND Status = 'pending' AND ItemType <> 'session' " +
                "ORDER BY Id DESC LIMIT 3",
                new { StudentId = studentId }).ToList();

            return Ok(items.Select(item => ToQueueResponse(conn, item)).ToList());
        }

        /// <summary>
        /// The counts a goal's questions are built from, as one compact line.
        ///
        /// Worked out when the goal completes, because the set it describes is "the completed exercises
        /// since the goal was set" and that window closes the moment the goal is claimed. The cap of
        /// five is the same window the goal maths itself uses, so a question can never describe a larger
        /// set than the goal actually counted.
        ///
        /// Stored as JSON rather than a flat string, because the goal questions ask about the individual
        /// exercises in ORDER — did the errors go down, were the later ones faster, which method had the
        /// most errors. Totals cannot answer any of those.
        /// </summary>
        private static string BuildGoalEvidence(
            Microsoft.Data.Sqlite.SqliteConnection conn,
            long studentId,
            string category,
            string since,
            string focus,
            string quality,
            int limit)
        {
            // Narrowed the same way the goal itself was measured, so a question can never describe a set
            // the goal did not count: a method goal is about one method, an exercise-type goal one type.
            //
            // The other four categories are about a DECISION any exercise can be part of, so theirs stays
            // open — and has to, because their questions compare the exercises where the decision was
            // taken against the ones where it was not, which needs both kinds in the window.
            var narrowing =
                category == "method" && !string.IsNullOrWhiteSpace(focus) ? "AND SelectedMethod = @Focus COLLATE NOCASE " :
                category == "exerciseType" && !string.IsNullOrWhiteSpace(focus) ? "AND ExerciseType = @Focus COLLATE NOCASE " :
                "";

            // The named parameters have to be passed as one object, so the whole set is built here and
            // reused by the two queries below rather than each spelling its own.
            var windowArgs = narrowing.Length == 0
                ? (object)(string.IsNullOrWhiteSpace(since)
                    ? new { StudentId = studentId }
                    : new { StudentId = studentId, Since = since })
                : (string.IsNullOrWhiteSpace(since)
                    ? new { StudentId = studentId, Focus = focus }
                    : new { StudentId = studentId, Since = since, Focus = focus });

            var attempts = conn.Query<GoalAttemptRow>(
                $"SELECT Id, ExerciseType, ExerciseId, TotalErrors, TotalHints, TotalTime, SelectedMethod " +
                $"FROM {AnchorStoreSettings.Table} " +
                "WHERE StudentId = @StudentId AND CompletedAt <> '' " +
                (string.IsNullOrWhiteSpace(since) ? "" : "AND CompletedAt >= @Since ") +
                narrowing +
                "ORDER BY Id DESC LIMIT 5",
                windowArgs)
                .ToList();

            if (attempts.Count == 0) return "";

            var ids = attempts.Select(attempt => attempt.Id).ToList();
            var records = conn.Query<DecisionRecordRow>(
                $"SELECT AttemptId, Name, Choice FROM {AnchorStoreSettings.RecordTable} WHERE AttemptId IN @Ids",
                new { Ids = ids }).ToList();

            // Which methods each exercise allowed, so "was their choice a good one" can be answered. Read
            // from the exercises database, which is a different file from the attempts.
            var allowed = AllowedMethodsByExercise(attempts);

            var window = new ReflectionGoalWindow { Quality = quality ?? "", Limit = limit };

            // Oldest first: every option rule is about order — "later" versus "earlier", the first
            // exercise versus the last.
            foreach (var attempt in attempts.OrderBy(a => a.Id))
            {
                window.Exercises.Add(ToGoalExercise(attempt, records, allowed));
            }

            // The exercises that came BEFORE this goal, for the options that read "I explained in a
            // method I used to skip". That comparison is against their habit before the goal, which the
            // window itself cannot show: inside it, everything the goal is about has already changed.
            var priorAttempts = conn.Query<GoalAttemptRow>(
                $"SELECT Id, ExerciseType, ExerciseId, TotalErrors, TotalHints, TotalTime, SelectedMethod " +
                $"FROM {AnchorStoreSettings.Table} " +
                "WHERE StudentId = @StudentId AND CompletedAt <> '' AND Id < @Before ORDER BY Id DESC LIMIT 20",
                new { StudentId = studentId, Before = attempts.Min(a => a.Id) }).ToList();

            if (priorAttempts.Count > 0)
            {
                var priorIds = priorAttempts.Select(a => a.Id).ToList();
                var priorRecords = conn.Query<DecisionRecordRow>(
                    $"SELECT AttemptId, Name, Choice FROM {AnchorStoreSettings.RecordTable} WHERE AttemptId IN @Ids",
                    new { Ids = priorIds }).ToList();

                foreach (var attempt in priorAttempts)
                {
                    window.OtherMethodExercises.Add(ToGoalExercise(attempt, priorRecords, allowed));

                    var method = (int)MethodFromName(attempt.SelectedMethod);
                    if (Declined(attempt.Id, AnchorDimension.SelfExplanation, priorRecords)) window.PriorSkippedExplanation.Add(method);
                    if (Declined(attempt.Id, AnchorDimension.MethodComparison, priorRecords)) window.PriorSkippedComparison.Add(method);
                    if (Declined(attempt.Id, AnchorDimension.SolveOnOwn, priorRecords)) window.PriorSystem.Add(method);
                }
            }

            return System.Text.Json.JsonSerializer.Serialize(window);
        }

        /// <summary>One attempt reduced to the shape a question can be built from.</summary>
        private static ReflectionGoalExercise ToGoalExercise(
            GoalAttemptRow attempt,
            List<DecisionRecordRow> records,
            Dictionary<(int Type, long Id), List<int>> allowed)
        {
            var method = (int)MethodFromName(attempt.SelectedMethod);
            var type = ExerciseTypeNumber(attempt.ExerciseType);

            return new ReflectionGoalExercise
            {
                Method = method,
                ExerciseType = type,
                Errors = attempt.TotalErrors,
                Hints = attempt.TotalHints,
                Time = attempt.TotalTime,
                Own = Engaged(attempt.Id, AnchorDimension.SolveOnOwn, records),
                Explained = Engaged(attempt.Id, AnchorDimension.SelfExplanation, records),
                Compared = Engaged(attempt.Id, AnchorDimension.MethodComparison, records),
                WasShown = Declined(attempt.Id, AnchorDimension.SolveOnOwn, records),
                Correct = allowed.TryGetValue((type, attempt.ExerciseId), out var ok) && ok.Contains(method),
            };
        }

        private static bool Engaged(long attemptId, string[] names, List<DecisionRecordRow> records) =>
            AnchorDimension.Engaged(Answers(attemptId, names, records));

        /// <summary>
        /// Whether they turned the offer down. Distinct from "no record at all", which means they never
        /// reached that point rather than that they refused it.
        /// </summary>
        private static bool Declined(long attemptId, string[] names, List<DecisionRecordRow> records) =>
            Answers(attemptId, names, records)
                .Any(choice => choice.StartsWith("No", StringComparison.OrdinalIgnoreCase));

        /// <summary>The answers recorded for one dimension on one attempt, in the order they were made.</summary>
        private static IEnumerable<string> Answers(long attemptId, string[] names, List<DecisionRecordRow> records) =>
            records
                .Where(record => record.AttemptId == attemptId && names.Contains(record.Name, StringComparer.Ordinal))
                .Select(record => record.Choice);

        /// <summary>
        /// For each attempt, the methods its exercise allowed. Empty for Matching, which gives the method
        /// rather than asking for one, and for any exercise that cannot be found.
        /// </summary>
        private static Dictionary<(int Type, long Id), List<int>> AllowedMethodsByExercise(List<GoalAttemptRow> attempts)
        {
            var result = new Dictionary<(int, long), List<int>>();

            // Only the two types that ask the student to choose have a right answer here.
            var chosen = attempts
                .Select(attempt => (Type: ExerciseTypeNumber(attempt.ExerciseType), attempt.ExerciseId))
                .Where(attempt => attempt.Type is 1 or 2)
                .Distinct()
                .ToList();

            foreach (var group in chosen.GroupBy(attempt => attempt.Type))
            {
                var column = group.Key == 1 ? "EfficientMethods" : "SuitableMethods";
                var table = group.Key == 1 ? "EfficiencyExercises" : "SuitabilityExercises";
                var ids = group.Select(attempt => attempt.ExerciseId).Distinct().ToList();

                try
                {
                    using var exerciseConn = DBSettings.GetSQLiteConnectionForExercisesDB();
                    var rows = exerciseConn.Query<(long Id, string Methods)>(
                        $"SELECT Id, {column} AS Methods FROM {table} WHERE Id IN @Ids", new { Ids = ids });

                    foreach (var row in rows)
                        result[(group.Key, row.Id)] = [.. ParseMethodList(row.Methods)];
                }
                catch
                {
                    // The exercises database is not essential to a reflection. If it cannot be read the
                    // choice questions simply lose their correct answer, which the bank already treats as
                    // "we cannot check this" rather than as a wrong answer.
                }
            }

            return result;
        }

        /// <summary>
        /// The exercise type as the questions number it, from the name the attempt stored.
        ///
        /// The attempts table keeps the type NAME, so this is the one place the two are bridged: the
        /// questions were specified against numbers (Efficiency 1, Suitability 2, Matching 3) and every
        /// rule in the bank is written with those. Zero means unrecognised, which callers treat as "there
        /// is no right answer to check" rather than as a fourth kind of exercise.
        /// </summary>
        private static int ExerciseTypeNumber(string? name) => name?.Trim().ToLowerInvariant() switch
        {
            "efficiency" => 1,
            "suitability" => 2,
            "matching" => 3,
            _ => 0,
        };

        /// <summary>The method list as stored: a JSON array of the enum's numeric values.</summary>
        private static List<int> ParseMethodList(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return [];

            try
            {
                return [.. System.Text.Json.JsonSerializer.Deserialize<List<int>>(json) ?? []];
            }
            catch
            {
                return [];
            }
        }

        /// <summary>The Method enum's value for a stored method name, or Equalization when unrecognised.</summary>
        private static Method MethodFromName(string? name) => name?.Trim().ToLowerInvariant() switch
        {
            "substitution" => Method.Substitution,
            "elimination" => Method.Elimination,
            _ => Method.Equalization,
        };

        /// <summary>
        /// The goal's window as it was stored at completion, or null when it cannot be read.
        ///
        /// Null is a normal outcome, not a failure: rows written before the window was stored as JSON
        /// still hold the old flat string, and a goal whose window was empty stored nothing at all. The
        /// caller falls back to the plain questions for those, so an old row degrades instead of breaking.
        /// </summary>
        private static ReflectionGoalWindow? ParseGoalWindow(string? evidence)
        {
            if (string.IsNullOrWhiteSpace(evidence)) return null;
            if (!evidence.TrimStart().StartsWith('{')) return null;

            try
            {
                return System.Text.Json.JsonSerializer.Deserialize<ReflectionGoalWindow>(evidence);
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// Everything the questions need about one item.
        ///
        /// The step breakdown is summed from the anchor records, which are written per PHASE, onto the
        /// four steps the questions use. For an exercise item the attempt is the most recent completed
        /// one, which is the one just finished: the reflection row is created by the very call that
        /// follows it. For a goal the most recent few stand in for the goal's own window, which is no
        /// longer recoverable once the goal has been claimed.
        /// </summary>
        private static ReflectionEvidence BuildEvidence(Microsoft.Data.Sqlite.SqliteConnection conn, ReflectionQueueRecord item)
        {
            var isGoal = item.ItemType == "goal";
            var isSession = item.ItemType == "session";

            var evidence = new ReflectionEvidence
            {
                IsGoal = isGoal,
                IsSession = isSession,
                // For a goal this is its category, which decides the question. For an exercise it is the
                // type, which decides which decision the student actually saw. A session has neither: it
                // is not narrowed to a category or a type, so it decides nothing.
                Focus = isSession ? "" : isGoal ? item.ItemId : item.Method,
                Errors = item.Errors,
                Hints = item.Hints,
                InSet = 1,
            };

            if (isGoal && item.Focus.Length > 0)
            {
                // The narrowed value: the method for a method goal, the TYPE for an exercise-type goal.
                // The category is in ItemId and is not enough — all three types share one category.
                evidence.GoalFocus = item.Focus;

                if (item.ItemId == "method")
                    evidence.FocusLabelKey = $"flexibility:{item.Focus.ToLowerInvariant()}-method";
            }

            evidence.DecisionDimension =
                evidence.Focus == "Suitability" ? "compare" :
                evidence.Focus is "Efficiency" or "Matching" ? "explain" : "";

            // What the student chose, from the snapshot the row already carries.
            foreach (var chunk in (item.Decisions ?? "").Split(';', StringSplitOptions.RemoveEmptyEntries))
            {
                var bits = chunk.Split('=');
                if (bits.Length != 2) continue;

                var engaged = !bits[1].StartsWith("Declined", StringComparison.OrdinalIgnoreCase);

                switch (bits[0])
                {
                    case "SolveOnOwn":
                        evidence.HasDecisions = true;
                        evidence.DidSolveOnOwn |= engaged;
                        evidence.WasShownAnswer |= !engaged;
                        break;
                    case "SelfExplanation":
                        evidence.HasDecisions = true;
                        evidence.DidExplain |= engaged;
                        evidence.WasShownExplanation |= !engaged;
                        break;
                    case "MethodComparison":
                        evidence.HasDecisions = true;
                        evidence.DidCompare |= engaged;
                        evidence.WasShownComparison |= !engaged;
                        break;
                }
            }

            var set = 1;

            // A goal's window: the exercises it covered, in order, plus the limit it was measured
            // against. Stored as JSON so the questions can ask about ORDER — did the errors go down,
            // were the later ones faster, which method had the most errors — none of which a total
            // can answer.
            //
            // A session is read the same way, and for the same reason: its first question is a menu read
            // from the day's own exercises, so it needs them one by one rather than summed. Its window is
            // today's exercises rather than a goal's set, which is the only difference, and it carries no
            // limit and no prior-history lists because it asks nothing that would use them.
            if (isGoal || isSession)
            {
                var window = ParseGoalWindow(item.Evidence);

                if (window is not null && window.Exercises.Count > 0)
                {
                    evidence.GoalExercises = window.Exercises;
                    evidence.GoalQuality = window.Quality;
                    evidence.GoalLimit = window.Limit;

                    set = window.Exercises.Count;
                    evidence.InSet = set;
                    // "Without a single mistake" is what the count question says, so it counts mistakes only:
                    // hints are a different question, answered by HintFreeRuns.
                    evidence.CleanRuns = window.Exercises.Count(e => e.Errors == 0);
                    evidence.HintFreeRuns = window.Exercises.Count(e => e.Hints == 0);
                    evidence.SolvedOnOwnRuns = window.Exercises.Count(e => e.Own);
                    evidence.ExplainedSelfRuns = window.Exercises.Count(e => e.Explained);
                    evidence.ComparedRuns = window.Exercises.Count(e => e.Compared);

                    // The goal's own totals, so every question that reads them stays consistent with the
                    // window the goal was actually measured over.
                    evidence.Errors = window.Exercises.Sum(e => e.Errors);
                    evidence.Hints = window.Exercises.Sum(e => e.Hints);

                    evidence.HasDecisions = window.Exercises.Any(e => e.Own || e.Explained || e.Compared || e.WasShown);
                    evidence.DidSolveOnOwn = window.Exercises.Any(e => e.Own);
                    evidence.WasShownAnswer = window.Exercises.Any(e => e.WasShown);
                    evidence.DidExplain = window.Exercises.Any(e => e.Explained);
                    evidence.DidCompare = window.Exercises.Any(e => e.Compared);

                    evidence.UsedFocusRuns = string.IsNullOrWhiteSpace(item.Focus)
                        ? 0
                        : window.Exercises.Count(e => e.Method == (int)MethodFromName(item.Focus));

                    // The history the window cannot show: the exercises from BEFORE this goal. Three of the
                    // Q1 options read "I did this in a method I used to skip", and the method goal's
                    // comparison question reads the student's other methods, so all four lists have to be
                    // carried across — without them those options can never be the right answer and a
                    // student who answers honestly is marked wrong.
                    evidence.OtherMethodExercises = window.OtherMethodExercises;
                    evidence.PriorSkippedExplanation = window.PriorSkippedExplanation;
                    evidence.PriorSkippedComparison = window.PriorSkippedComparison;
                    evidence.PriorSystem = window.PriorSystem;
                }
            }

            if (evidence.GoalExercises.Count == 0)
            {
                // One exercise, so every count is the decision itself.
                evidence.CleanRuns = item.Errors == 0 ? 1 : 0;
                evidence.HintFreeRuns = item.Hints == 0 ? 1 : 0;
                evidence.SolvedOnOwnRuns = evidence.DidSolveOnOwn ? 1 : 0;
                evidence.ExplainedSelfRuns = evidence.DidExplain ? 1 : 0;
                evidence.ComparedRuns = evidence.DidCompare ? 1 : 0;
                evidence.UsedFocusRuns = 1;
            }

            // For an exercise this is the row's OWN attempt, so the step numbers and the decisions can
            // never come from a different exercise than the one the queue item names. Rows written
            // before the id was recorded carry 0, and for those the newest completed attempt is the old
            // behaviour and the best guess available.
            // A session item is given none of them. Its questions read the window, not the steps, and
            // "the newest attempts" is exactly the unfounded guess this lookup exists to avoid for
            // everything else — for a session it would read steps from exercises the question is not about.
            var attemptIds = new List<long>();
            if (!isSession)
            {
                attemptIds = item.AttemptId > 0
                    ? [item.AttemptId]
                    : conn.Query<long>(
                        $"SELECT Id FROM {AnchorStoreSettings.Table} " +
                        "WHERE StudentId = @StudentId AND CompletedAt <> '' " +
                        "ORDER BY Id DESC LIMIT @Take",
                        new { StudentId = item.StudentId, Take = set }).ToList();
            }

            if (attemptIds.Count > 0)
            {
                var rows = conn.Query<StepRow>(
                    $"SELECT Name, Time, Errors, Hints FROM {AnchorStoreSettings.RecordTable} WHERE AttemptId IN @Ids",
                    new { Ids = attemptIds }).ToList();

                var byStep = new Dictionary<string, ReflectionStepStat>();

                foreach (var row in rows)
                {
                    var stepId = ReflectionQuestionBank.StepIdFor(row.Name);
                    if (stepId.Length == 0) continue;

                    if (!byStep.TryGetValue(stepId, out var stat))
                    {
                        stat = new ReflectionStepStat
                        {
                            Id = stepId,
                            LabelKey = ReflectionQuestionBank.StepLabelKey(stepId),
                        };
                        byStep[stepId] = stat;
                    }

                    stat.Time += row.Time;
                    stat.Errors += row.Errors;
                    stat.Hints += row.Hints;
                }

                evidence.Steps = [.. byStep.Values];
                evidence.CleanStepIds = [.. evidence.Steps.Where(s => s.Errors == 0 && s.Hints == 0).Select(s => s.Id)];

                // "Cost the most" is errors first, then hints, then time: a step with mistakes in it cost
                // more than one that was merely slow.
                evidence.CostliestStepId = evidence.Steps
                    .OrderByDescending(s => s.Errors)
                    .ThenByDescending(s => s.Hints)
                    .ThenByDescending(s => s.Time)
                    .Select(s => s.Id)
                    .FirstOrDefault() ?? "";
            }

            // The run before this one, for the fallback question when there is no step breakdown.
            var previous = conn.ExecuteScalar<int?>(
                $"SELECT TotalErrors FROM {AnchorStoreSettings.Table} " +
                "WHERE StudentId = @StudentId AND CompletedAt <> '' ORDER BY Id DESC LIMIT 1 OFFSET @Skip",
                new { StudentId = item.StudentId, Skip = set });

            if (previous.HasValue)
            {
                evidence.PreviousErrors = previous.Value;
                evidence.HasHistory = true;
            }

            // Whether the method they chose for THIS exercise was one it allowed. The single exercise's
            // own row is read rather than the newest one, so the answer cannot come from a different
            // exercise than the one the queue item names.
            //
            // Only the two types that ask the student to pick have a right answer here: Matching hands
            // the method over, so it has nothing to be right about and is left unset, which the question
            // reads as "do not offer this option".
            //
            // A session is left out for the same reason it is given no steps: it names no single exercise
            // whose method choice could be checked, so there is nothing here for it to be right about.
            if (!isGoal && !isSession && attemptIds.Count > 0)
            {
                var attempt = conn.QueryFirstOrDefault<GoalAttemptRow>(
                    $"SELECT Id, ExerciseType, ExerciseId, TotalErrors, TotalHints, TotalTime, SelectedMethod " +
                    $"FROM {AnchorStoreSettings.Table} WHERE Id = @Id",
                    new { Id = attemptIds[0] });

                if (attempt is not null)
                {
                    var type = ExerciseTypeNumber(attempt.ExerciseType);
                    var allowed = AllowedMethodsByExercise([attempt]);

                    if (type is 1 or 2 && allowed.TryGetValue((type, attempt.ExerciseId), out var permitted))
                    {
                        evidence.HasAllowedMethods = true;
                        evidence.ChoseAllowedMethod = permitted.Contains((int)MethodFromName(attempt.SelectedMethod));
                    }
                }
            }

            return evidence;
        }

        private sealed class GoalAttemptRow
        {
            public long Id { get; set; }

            /// <summary>
            /// The type NAME, not its number. The attempts table stores "Efficiency", "Suitability" and
            /// "Matching" as text, which is also what the rest of this controller compares against for
            /// exercise reflections.
            /// </summary>
            public string ExerciseType { get; set; } = "";

            public long ExerciseId { get; set; }
            public int TotalErrors { get; set; }
            public int TotalHints { get; set; }
            public double TotalTime { get; set; }
            public string SelectedMethod { get; set; } = "";
        }

        private sealed class DecisionRecordRow
        {
            public long AttemptId { get; set; }
            public string Name { get; set; } = "";
            public string Choice { get; set; } = "";
        }

        private sealed class StepRow
        {
            public string Name { get; set; } = "";
            public double Time { get; set; }
            public int Errors { get; set; }
            public int Hints { get; set; }
        }

        /// <summary>Evaluates one reflection answer against the student's actual performance.</summary>
        [HttpPost("reflection/evaluate")]
        public async Task<ActionResult<ReflectionEvaluateResponse>> EvaluateReflection(
            [FromBody] ReflectionEvaluateRequest request)
        {
            if (request.StudentId <= 0 || request.QueueItemId <= 0)
                return BadRequest("Invalid request.");

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            var item = conn.QueryFirstOrDefault<ReflectionQueueRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ReflectionQueueTable} " +
                "WHERE Id = @Id AND StudentId = @StudentId",
                new { Id = request.QueueItemId, StudentId = request.StudentId });

            if (item == null)
                return Ok(new ReflectionEvaluateResponse
                {
                    Feedback = "That reflection item is no longer available.",
                    Aligned = false,
                    InsightXp = 0,
                    NextStep = ""
                });

            Console.WriteLine($"[Reflection] Evaluate — student={request.StudentId}, itemId={request.QueueItemId}, label=\"{item.ItemLabel}\", type={item.ItemType}, method={item.Method}, errors={item.Errors}, hints={item.Hints}, pippin={item.PippinMessages}, Q={request.QuestionNumber}, mode={request.Mode}, answer=\"{request.Answer}\"");

            // Deterministic features of the student's own words, extracted once and used for two
            // purposes: the off-topic gate below (always) and the feedback prompt (only when the
            // AiFeatures:NlpInformedFeedback flag is on).
            var answerFeatures = string.IsNullOrWhiteSpace(request.Answer)
                ? null
                : NlpFeatureExtractor.Extract(request.Answer, request.Language);

            // Off-topic gate. Runs before the model so that an unrelated answer is never graded,
            // never praised and never earns XP — the student is asked to write it again instead.
            // Asking Pippin for a model answer is exempt: there is no student answer to judge, and so
            // is a chip-only answer, which has no text to be off-topic about.
            if (request.Mode != "pippin"
                && !string.IsNullOrWhiteSpace(request.Answer)
                && OffTopicDetector.IsOffTopic(request.Answer, answerFeatures))
            {
                Console.WriteLine($"[Reflection] Off-topic gate — rejected answer=\"{request.Answer}\"");
                return Ok(new ReflectionEvaluateResponse
                {
                    Feedback = OffTopicDetector.RetryMessage(request.Language),
                    Aligned = false,
                    InsightXp = 0,
                    NextStep = "",
                    NeedsRetry = true
                });
            }

            // NOTHING ABOUT THE STUDENT BEYOND THIS QUESTION'S OWN FACTS reaches the model. It used to be
            // handed the last two reflection turns (from whichever item was answered last), the student's
            // weakest area across everything, and the item's raw error and hint totals — all of which are
            // about something other than the question on screen, and all of which turned up in replies.

            // ── The record decides when it can ────────────────────────────────
            //
            // The question is REBUILT here rather than trusted from the client, so the chips graded
            // against are the ones we actually offered. A chip answer is therefore settled entirely by
            // the student's own record, and the model is left to do the one thing it is better at than
            // any rule: writing a reply worth reading.
            var evidence = BuildEvidence(conn, item);
            var questions = ReflectionQuestionBank.Build(evidence);
            var asked = questions.FirstOrDefault(candidate => candidate.Id == request.QuestionId)
                        ?? questions[Math.Clamp(request.QuestionNumber - 1, 0, questions.Count - 1)];
            var verdict = ReflectionQuestionBank.Grade(asked, request.Choice ?? "");
            var questionLine = ReflectionQuestionBank.DescribeForPrompt(asked, request.SubjectTerms);

            // What the record says they actually did, in plain words, for the prompt.
            //
            // Without this the model has nothing to check a claim against, so when a student taps
            // "I worked it out myself" on an attempt where they asked to be shown, it AGREES with them
            // and then states their claim back as fact — congratulating them for the one thing they got
            // wrong. The prompt asked it to "say what actually happened" and never told it what that
            // was, so it mirrored the student instead.
            var recordLine = ReflectionQuestionBank.DescribeRecord(evidence, asked);

            // Built after the record is read, because the offline reply is not a generic one any more: it
            // says what the record says about the question the student was actually looking at, which is
            // what the help button asks for and what a chip answer needs to be answered with.
            var fallback = BuildReflectionFallback(request, item, evidence, asked);

            // THE VERDICT THE MODEL IS TOLD TO COPY WAS NEVER ACTUALLY GIVEN TO IT.
            //
            // The prompt said "alignment is already decided, it is stated above" and then stated only
            // the expectation, not the decision. So the model judged for itself and freely contradicted
            // the award — a reply reading "that matches up perfectly with how you did" was sent on an
            // answer the record had scored as not matching. The verdict is now printed, so "copy it
            // exactly" has something to copy.
            //
            // A promise and an end-of-session question are each told something different again, and have to
            // be: neither was checked against anything, and both of the branches below would have the model
            // either confirm or reject a claim no rule looked at. A commitment is about the next exercise
            // and a session question is about the day, so neither is given a verdict.
            var verdictLine = asked.Kind == ReflectionQuestionBank.NextAction
                // A promise is not a claim. Nothing about it is checked, and no chip of it is right or
                // wrong — it is settled tomorrow, by the exercise it is about. It used to be given the
                // "does not match" line, because a commitment has no verdict from this call, and the
                // model read that as a mark against something the student had just done.
                ? "This is a commitment about the next exercise, not a claim about this one: nothing here was checked, and no answer to it is right or wrong. Return aligned=false with an award number of 0, and write the reply about the thing they have chosen to do next."
                : item.ItemType == "session"
                ? "Nothing was checked here. This is an end-of-session question with no right answer, so " +
                    "there is no verdict to give: aligned=false, and the award number to return is 0. Reply " +
                    "to what they said about their day; do not say that it matched or did not, and do not say " +
                    "anything about what their answer was or was not worth."
                : !verdict.FromRecord
                ? "No quick answer was tapped, so what they wrote is judged against the facts above: set 'match' first, as the instructions describe, and write a reply that fits it. The student cannot see the verdict, so the reply has to say which way it went."
                : verdict.Status == "partial"
                    ? $"They tapped a quick answer, and the facts above cannot single out one right answer for this question, so what they tapped is a fair reading and is not marked either way: aligned=false, and the award number to return is {verdict.InsightXp}. Copy this exactly. Reply by saying what the facts above show about their pick, using only the figures stated there. Never say it was the most common, the only one, or true of all the exercises unless the facts say so."
                : asked.Id == "goal-q1-went-well" && verdict.InsightXp == 0
                    ? "They tapped an option, and the facts above do not back it as something that happened across this goal: aligned=false, and the award number to return is 0. Copy this exactly. Do not repeat the option back as if it happened, and do not say that it did not. Reply by telling them warmly what the facts above show went well in this goal, using only what they state. Do not mention or paraphrase the option they tapped, and do not use any stronger word than the facts do (nothing like perfectly, always, every, first try or on your own unless the facts say so)."
                : verdict.InsightXp > 0
                    ? $"They tapped a quick answer and the facts above CONFIRM it: aligned=true, and the award number to return is {verdict.InsightXp}. Copy this exactly. The reply must read as a clear confirmation: one or two warm sentences that name what they picked and say it is what happened. Do not hedge, do not call it interesting, and NEVER sound doubtful about it — the reply is confirming something that is right, and a reply that hedges while the badge shows a positive number is the one thing they will notice."
                    : "They tapped a quick answer and the facts above say it does NOT match what happened: " +
                      "aligned=false, and the award number to return is 0. Copy this exactly. The reply must " +
                      "still let them see which way it went: name what they actually chose as the sensible " +
                      "thing it was, warmly and without judging it, so the difference is theirs to notice. " +
                      "Do not agree with their version, do not invent a reason why it was right, and do not " +
                      "deliver a verdict on it either — no 'but', no 'actually', no 'in reality', no " +
                      "'to be honest', no 'you didn't' and no 'the record shows'.";

            Console.WriteLine($"[Reflection] Question {asked.Id} ({asked.Kind}) — choice=\"{request.Choice}\"{(string.IsNullOrWhiteSpace(request.ChoiceLabel) ? "" : $" (\"{request.ChoiceLabel}\")")} => {verdict.Status} ({verdict.InsightXp} XP){(verdict.FromRecord ? "" : ", the text has to decide")}");

            // A commitment pays a little Choice, straight away.
            //
            // Choosing what to do next IS the skill Choice is for, so it is worth something the moment
            // they commit, whether or not the next exercise bears it out. Following through is a
            // different thing and pays Resolve later, from the exercise itself. Paying nothing until the
            // promise is kept would punish a student whose next exercise simply did not offer the moment
            // they had picked.
            if (asked.Kind == ReflectionQuestionBank.NextAction && !string.IsNullOrWhiteSpace(request.Choice))
                AwardCommitmentChoice(conn, request.StudentId, request.QueueItemId);

            if (verdict.FromRecord)
            {
                fallback.Aligned = verdict.Status == "aligned";
                fallback.InsightXp = verdict.InsightXp;

                // The badge and the reply have to agree. The fallback's own wording is a keyword guess at
                // the free text and knows nothing about which question was asked; once the record's
                // verdict replaced its own, a student could be paid three Insight next to "the data tells
                // a slightly different story". This is the path a student sees whenever the AI provider
                // is unavailable, which is often, so it is not a rare branch.
                //
                // The second-person record line goes with it, so the reply says what happened on the thing
                // this question asked about rather than a remark that would fit any answer.
                fallback.Feedback = VerdictFeedback(
                    asked, verdict, request.ChoiceLabel,
                    ReflectionQuestionBank.DescribeRecordToStudent(evidence, asked, request.Choice ?? ""));
            }

            Console.WriteLine($"[Reflection] Fallback ready — errors={item.Errors}, hints={item.Hints} (fallback: aligned={fallback.Aligned}, insight={fallback.InsightXp})");

            var apiKey = _configuration["OpenAI:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
                return Ok(fallback);

            try
            {
                // The signals only steer the wording of the feedback when the flag is on. The
                // off-topic gate above must NOT depend on this switch — it is a safety check, so it
                // always runs.
                var promptFeatures = _configuration.GetValue("AiFeatures:NlpInformedFeedback", false)
                    ? answerFeatures
                    : null;

                if (promptFeatures is not null)
                {
                    Console.WriteLine(
                        $"[Reflection] NLP signals — lang={promptFeatures.Language}, unit={promptFeatures.TokenUnit}, " +
                        $"chars={promptFeatures.CharacterCount}, givesReason={promptFeatures.GivesReason}, " +
                        $"mentionsMethod={promptFeatures.MentionsMethod}, methods=[{string.Join(", ", promptFeatures.MethodsMentioned)}], " +
                        $"uncertainty={promptFeatures.UncertaintyMarkers.Count}, affect={promptFeatures.AffectMarkers.Count}");
                }

                var studentLine = ReflectionQuestionBank.DescribeRecordToStudent(evidence, asked, request.Choice ?? "");

                // A written answer to a question the record can check is judged by a SEPARATE, narrow
                // call that sees only the question's facts and the answer, and the award follows its
                // verdict. The writer is then told that verdict, exactly as it is for a tapped chip, so
                // one answer gets one verdict and the badge and the sentence beside it cannot disagree.
                // Judging and writing in one call let a long prompt pull the two apart.
                var judgesWriting = !verdict.FromRecord
                    && request.Mode != "pippin"
                    && !string.IsNullOrWhiteSpace(request.Answer)
                    && item.ItemType != "session"
                    && asked.Kind is ReflectionQuestionBank.Observation or ReflectionQuestionBank.Judgement;

                var writtenMatch = "";
                if (judgesWriting)
                {
                    writtenMatch = await JudgeWrittenAnswer(
                        apiKey, asked, ReflectionQuestionBank.JudgeFacts(evidence, asked, studentLine), request.Answer ?? "");

                    // No judgement, no award: the offline reply is built from the record and pays nothing.
                    if (writtenMatch.Length == 0) return Ok(fallback);

                    Console.WriteLine($"[Reflection] Written answer judged: {writtenMatch}");

                    verdictLine = writtenMatch == "yes"
                        ? "Their written answer is CONFIRMED by the facts above: aligned=true, and the award number to return is 3. The reply must read as a clear confirmation: one or two warm sentences saying it is what happened and naming the fact that shows it. Do not hedge, and never sound doubtful about it."
                        : "Their written answer is NOT confirmed by the facts above: aligned=false, and the award number to return is 0. The reply must not say or suggest that it matched. State what the facts above say about this question as a plain, warm fact, starting with the fact itself, using only the figures stated there.";
                }

                var prompt = BuildReflectionPrompt(request, item, promptFeatures, questionLine, recordLine, verdictLine, studentLine);

                string? rejected = null;

                // Two tries: the second one is told exactly what was wrong with the first. A reply that
                // still breaks the rules is replaced by the offline one, whose verdict is its own, so
                // what is shown is always internally consistent.
                for (var pass = 0; ; pass++)
                {
                var raw = await CallOpenAI(apiKey,
                    "You are Pippin, a warm encouraging study coach chatting with a student. Write a short reply to their reflection answer from the facts you are given about THIS question, but keep it conversational and kind — like a friend checking in. Always output valid JSON with exactly these keys: feedback (string), aligned (boolean), insightXp (integer 0-3), offTopic (boolean), nextStep (string, filled only for the final question otherwise empty).",
                    rejected is null
                        ? prompt
                        : prompt + $"\n\nYOUR PREVIOUS REPLY WAS REJECTED because {rejected}. Write the whole JSON again and fix exactly that.");

                if (raw == null) return Ok(fallback);

                var jsonStart = raw.IndexOf('{');
                var jsonEnd = raw.LastIndexOf('}');
                if (jsonStart < 0 || jsonEnd <= jsonStart) return Ok(fallback);

                using var doc = JsonDocument.Parse(raw.Substring(jsonStart, jsonEnd - jsonStart + 1));
                var root = doc.RootElement;
                var match = writtenMatch;
                var feedback = root.TryGetProperty("feedback", out var fb) ? fb.GetString() ?? "" : fallback.Feedback;

                // GPT occasionally returns booleans/integers as strings — parse leniently.
                bool aligned = false;
                if (root.TryGetProperty("aligned", out var al))
                {
                    if (al.ValueKind == JsonValueKind.True) aligned = true;
                    else if (al.ValueKind == JsonValueKind.False) aligned = false;
                    else if (al.ValueKind == JsonValueKind.String) bool.TryParse(al.GetString(), out aligned);
                }

                int insightXp = 0;
                if (root.TryGetProperty("insightXp", out var xp))
                {
                    if (xp.ValueKind == JsonValueKind.Number && xp.TryGetInt32(out var xpNum)) insightXp = xpNum;
                    else if (xp.ValueKind == JsonValueKind.String && int.TryParse(xp.GetString(), out var xpStr)) insightXp = xpStr;
                }
                insightXp = Math.Clamp(insightXp, 0, 3);

                var nextStep = root.TryGetProperty("nextStep", out var ns) ? ns.GetString() ?? "" : "";

                // Second, semantic off-topic catch, for unrelated answers the deterministic gate let
                // through (for example a topic that happens to contain a maths word).
                bool offTopic = false;
                if (root.TryGetProperty("offTopic", out var ot))
                {
                    if (ot.ValueKind == JsonValueKind.True) offTopic = true;
                    else if (ot.ValueKind == JsonValueKind.False) offTopic = false;
                    else if (ot.ValueKind == JsonValueKind.String) bool.TryParse(ot.GetString(), out offTopic);
                }

                if (offTopic && request.Mode != "pippin")
                {
                    Console.WriteLine($"[Reflection] Off-topic (model) — rejected answer=\"{request.Answer}\"");
                    return Ok(new ReflectionEvaluateResponse
                    {
                        Feedback = OffTopicDetector.RetryMessage(request.Language),
                        Aligned = false,
                        InsightXp = 0,
                        NextStep = "",
                        NeedsRetry = true
                    });
                }

                // Asking Pippin for a model answer is not the student's own reflection, so it can
                // never be "aligned" and never earns XP. The prompt already says this, but the model
                // still congratulated the student and handed out Insight XP — so it is enforced here
                // as well. Prompt for behaviour, code for guarantees.
                if (request.Mode == "pippin")
                {
                    aligned = false;
                    insightXp = 0;
                }

                // Q3 asks for something concrete to work on next, not for a self-assessment, so
                // there is nothing to be aligned with and nothing to earn. Same reasoning as the
                // pippin case above: the fallback already returns 0 here, but the model handed out
                // full marks anyway, so the rule is enforced in code rather than requested.
                //
                // Keyed on the QUESTION rather than on its number, which it used to be. That held only
                // while every item had three questions; the end-of-session reflection has two, and its
                // first one would have been graded by a rule written for a third question it does not
                // have.
                if (asked.Kind is ReflectionQuestionBank.NextAction or ReflectionQuestionBank.Session)
                {
                    aligned = false;
                    insightXp = 0;
                }

                // A chip answer was already settled against the record before the model was ever
                // called, so its verdict is restored here. The prompt asks the model not to change
                // these, and it does anyway often enough that asking is not enough.
                if (verdict.FromRecord)
                {
                    aligned = verdict.Status == "aligned";
                    insightXp = verdict.InsightXp;
                }
                else if (judgesWriting)
                {
                    // The award follows the separate judgement and nothing else: "yes" is the only way a
                    // written answer pays, and the amount is fixed rather than whatever number the writer chose.
                    aligned = match == "yes";
                    insightXp = aligned ? 3 : 0;
                }

                Console.WriteLine($"[Reflection] AI result (pass {pass + 1}) — match={match}, aligned={aligned}, insightXp={insightXp}, feedback=\"{feedback}\", nextStep=\"{nextStep}\"");

                // The prompt forbids these and the model still produces them now and then. A reply that
                // talks about the score, the button or what they did not do, or that says the opposite
                // of the verdict above it, is sent back once with the reason; if it comes back wrong
                // again the offline reply goes out instead, together with ITS verdict.
                rejected = ReplyProblem(feedback, aligned, request.Language, request.Mode, asked.Kind);
                if (rejected is not null)
                {
                    Console.WriteLine($"[Reflection] AI reply rejected (pass {pass + 1}): {rejected}");
                    if (pass >= 1) return Ok(fallback);
                    continue;
                }
                return Ok(new ReflectionEvaluateResponse
                {
                    Feedback = AiTextFormatter.StripMathDelimiters(
                        string.IsNullOrWhiteSpace(feedback) ? fallback.Feedback : feedback),
                    Aligned = aligned,
                    InsightXp = insightXp,
                    // Q3 exists to produce this line, and the model left it empty while still writing
                    // warm feedback about the answer — so the student saw praise and no next step at
                    // all. The rule-based plan already computes a concrete one, so use it rather than
                    // show nothing. For Q1 and Q2 the fallback's value is empty, so this is a no-op.
                    NextStep = AiTextFormatter.StripMathDelimiters(
                        string.IsNullOrWhiteSpace(nextStep) ? fallback.NextStep : nextStep)
                });
                }
            }
            catch
            {
                return Ok(fallback);
            }
        }

        /// <summary>Marks a reflection item done and persists its conversation history.</summary>
        [HttpPost("reflection/complete")]
        public ActionResult CompleteReflection([FromBody] ReflectionCompleteRequest request)
        {
            if (request.StudentId <= 0 || request.QueueItemId <= 0)
                return BadRequest("Invalid request.");

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            conn.Execute(
                $"UPDATE {StudentProgressDBSettings.ReflectionQueueTable} SET Status = @Status " +
                "WHERE Id = @Id AND StudentId = @StudentId",
                new { Id = request.QueueItemId, StudentId = request.StudentId, Status = request.Skip ? "skipped" : "done" });

            if (request.Skip)
                return Ok();

            foreach (var h in request.History)
            {
                conn.Execute(
                    $"INSERT INTO {StudentProgressDBSettings.ReflectionHistoryTable} " +
                    "(StudentId, ItemType, ItemId, Role, Text, InsightXp, QuestionId, Choice, CreatedAt) " +
                    "VALUES (@StudentId, @ItemType, @ItemId, @Role, @Text, @InsightXp, @QuestionId, @Choice, @CreatedAt)",
                    new
                    {
                        StudentId = request.StudentId,
                        h.ItemType,
                        h.ItemId,
                        h.Role,
                        h.Text,
                        h.InsightXp,
                        h.QuestionId,
                        h.Choice,
                        CreatedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss")
                    });
            }

            return Ok();
        }

        /// <summary>
        /// Today's exercises, as the end-of-session reflection's window.
        ///
        /// Read when the reflection is opened rather than stored when something completes: a session is
        /// not an event, it is the day so far. The row keeps this snapshot so the questions are built from
        /// the same window every time they are asked, including on the evaluate call — otherwise a student
        /// who did one more exercise between opening and answering would be asked about a different day.
        /// </summary>
        private static string BuildSessionEvidence(Microsoft.Data.Sqlite.SqliteConnection conn, long studentId)
        {
            // The app writes its timestamps in UTC, and the client keys the daily intention by the same
            // UTC date, so "today" here is the day the rest of the app means by it.
            var since = DateTime.UtcNow.ToString("yyyy-MM-ddT00:00:00");

            // The newest twenty of the day, then turned oldest-first below: every option on the menu reads
            // the session in order, and a session cannot reasonably be longer than this.
            var attempts = conn.Query<GoalAttemptRow>(
                $"SELECT Id, ExerciseType, ExerciseId, TotalErrors, TotalHints, TotalTime, SelectedMethod " +
                $"FROM {AnchorStoreSettings.Table} " +
                "WHERE StudentId = @StudentId AND CompletedAt <> '' AND CompletedAt >= @Since " +
                "ORDER BY Id DESC LIMIT 20",
                new { StudentId = studentId, Since = since }).ToList();

            var window = new ReflectionGoalWindow();
            if (attempts.Count == 0) return System.Text.Json.JsonSerializer.Serialize(window);

            var ids = attempts.Select(attempt => attempt.Id).ToList();
            var records = conn.Query<DecisionRecordRow>(
                $"SELECT AttemptId, Name, Choice FROM {AnchorStoreSettings.RecordTable} WHERE AttemptId IN @Ids",
                new { Ids = ids }).ToList();
            var allowed = AllowedMethodsByExercise(attempts);

            foreach (var attempt in attempts.OrderBy(a => a.Id))
                window.Exercises.Add(ToGoalExercise(attempt, records, allowed));

            return System.Text.Json.JsonSerializer.Serialize(window);
        }

        /// <summary>
        /// A queue row as the client receives it: the row itself, plus the questions built for it.
        ///
        /// The properties are copied across by reflection rather than by hand so that a column added to
        /// the row does not have to be remembered here as well.
        /// </summary>
        private static ReflectionQueueItemResponse ToQueueResponse(
            Microsoft.Data.Sqlite.SqliteConnection conn, ReflectionQueueRecord item)
        {
            var response = new ReflectionQueueItemResponse();
            foreach (var property in typeof(ReflectionQueueRecord).GetProperties())
                property.SetValue(response, property.GetValue(item));

            response.Questions = ReflectionQuestionBank.Build(BuildEvidence(conn, item));

            return response;
        }

        /// <summary>
        /// Builds the end-of-session reflection: two questions about the day as a whole, ready to answer.
        ///
        /// Opened from the end-session dialog rather than earned by finishing one exercise, which is why
        /// this is a call of its own rather than something the completion route queues. There is at most
        /// one live session reflection at a time: an earlier one that was opened and left unanswered is
        /// retired here, because it describes a day that has since moved on.
        /// </summary>
        [HttpPost("session-reflection/{studentId}")]
        public ActionResult<ReflectionQueueItemResponse> StartSessionReflection(long studentId, [FromQuery] string? label = null)
        {
            if (studentId <= 0) return BadRequest("Invalid student.");

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            conn.Execute(
                $"UPDATE {StudentProgressDBSettings.ReflectionQueueTable} SET Status = 'skipped' " +
                "WHERE StudentId = @StudentId AND ItemType = 'session' AND Status = 'pending'",
                new { StudentId = studentId });

            var evidence = BuildSessionEvidence(conn, studentId);
            var window = ParseGoalWindow(evidence);
            var exercises = window?.Exercises ?? [];

            // The item id is what the promise is filed under later. It has to be unique per session,
            // because the settlement reads a promise back as the group of turns that share one, and
            // "session" would make two sessions' promises look like one.
            var itemId = $"session-{DateTime.UtcNow.Ticks}";

            EnqueueReflection(conn, studentId, "session", itemId,
                string.IsNullOrWhiteSpace(label) ? "Today's session" : label,
                errors: exercises.Sum(e => e.Errors),
                hints: exercises.Sum(e => e.Hints),
                pippinMessages: 0,
                method: "",
                decisions: "",
                focus: "",
                evidence: evidence,
                attemptId: 0);

            var row = conn.QueryFirst<ReflectionQueueRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ReflectionQueueTable} " +
                "WHERE StudentId = @StudentId AND ItemType = 'session' ORDER BY Id DESC LIMIT 1",
                new { StudentId = studentId });

            Console.WriteLine($"[Reflection] Session reflection {row.Id} opened — student={studentId}, exercises={exercises.Count}");

            return Ok(ToQueueResponse(conn, row));
        }

        /// <summary>
        /// Judges the promise the student made at the end of their last session against the intention they
        /// have just set for today.
        ///
        /// Called when the daily intention is chosen, which is the one moment both halves exist: the
        /// intention is a note the client keeps for its own display, and the promise is a row written at
        /// the end of the previous session. Checking them against each other is what makes a session
        /// commitment worth Resolve at all — a promise nobody ever reads back is not a promise.
        ///
        /// Settled once. The rows are marked followed up when the promise is judged, whether or not it was
        /// kept, so changing today's intention cannot have the same promise judged twice or paid twice.
        /// The two cases where nothing is judged — no intention set, or a provider that cannot be reached —
        /// leave it open instead, because neither of them is evidence about the promise.
        /// </summary>
        [HttpPost("session-reflection/settle")]
        public async Task<ActionResult<SettleSessionPromiseResponse>> SettleSessionPromise(
            [FromBody] SettleSessionPromiseRequest request)
        {
            if (request.StudentId <= 0) return BadRequest("Invalid student.");

            // No intention, so there is nothing to judge the promise against. Left open rather than
            // closed: skipping the check-in is not the same as breaking a commitment, and the next
            // intention the student does set is still the next session's.
            if (request.IntentionChoice.Length == 0 || request.IntentionChoice == "skip")
                return Ok(new SettleSessionPromiseResponse());

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            // The promise, as the GROUP of turns one session recorded it in.
            //
            // Not "the newest two rows": a promise answered with a chip writes one row, and one that was
            // written out writes two, so a fixed pair would attach a stranger's words to the chip. The
            // item id makes the group exact.
            //
            // And not one made today. The intention for a session is set at its start and the promise is
            // made at the end of one, so judging them on the same date would pay a student for promising
            // what they are already in the middle of doing.
            var promiseItem = conn.ExecuteScalar<string?>(
                $"SELECT ItemId FROM {StudentProgressDBSettings.ReflectionHistoryTable} " +
                "WHERE StudentId = @StudentId AND ItemType = 'session' AND QuestionId = 'session-q2-next' " +
                "  AND FollowedUp = 0 AND CreatedAt < @Today " +
                "GROUP BY ItemId ORDER BY MAX(Id) DESC LIMIT 1",
                new { StudentId = request.StudentId, Today = DateTime.UtcNow.ToString("yyyy-MM-dd") });

            if (string.IsNullOrEmpty(promiseItem)) return Ok(new SettleSessionPromiseResponse());

            var promiseRows = conn.Query<SessionPromiseRow>(
                $"SELECT Id, Role, Choice, Text FROM {StudentProgressDBSettings.ReflectionHistoryTable} " +
                "WHERE StudentId = @StudentId AND ItemType = 'session' AND QuestionId = 'session-q2-next' " +
                "  AND ItemId = @ItemId ORDER BY Id",
                new { StudentId = request.StudentId, ItemId = promiseItem }).ToList();

            var promiseChoice = promiseRows.FirstOrDefault(row => row.Choice.Length > 0)?.Choice ?? "";
            var promiseText = promiseRows.FirstOrDefault(row => row.Role == "student")?.Text ?? "";

            var named = ChipsForIntention(request.IntentionChoice, request.DetectedCategory);

            bool kept;
            if (promiseChoice.Length > 0 && named is not null)
            {
                // Both halves are ids the server itself chose, so the match is settled by the record and
                // the model is never asked. This is the path a student takes by choosing an option on
                // either side, which is most of them.
                kept = named.Contains(promiseChoice);
            }
            else
            {
                // At least one half was written rather than chosen, and there is nothing to compare ids
                // with — only the model can read it.
                var judged = await JudgeSessionPromise(request, promiseChoice, promiseText);

                // A provider that cannot be reached leaves the promise OPEN rather than closing it
                // unpaid. "The model said no" and "the model was never asked" are different facts, and
                // only one of them is a promise that was not kept; the next intention the student sets is
                // still a fair chance to have kept this one.
                if (judged is null) return Ok(new SettleSessionPromiseResponse());

                kept = judged.Value;
            }

            conn.Execute(
                $"UPDATE {StudentProgressDBSettings.ReflectionHistoryTable} SET FollowedUp = 1 WHERE Id IN @Ids",
                new { Ids = promiseRows.Select(row => row.Id).ToList() });

            Console.WriteLine($"[Reflection] Session promise settled — student={request.StudentId}, promise=\"{promiseChoice}\", " +
                              $"intention={request.IntentionChoice}/{request.DetectedCategory}, kept={kept}");

            if (!kept) return Ok(new SettleSessionPromiseResponse());

            var now = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss");

            conn.Execute(
                $"INSERT INTO {StudentProgressDBSettings.AgencyLogTable} (StudentId, XpType, Amount, Source, LoggedAt) " +
                "VALUES (@StudentId, 'resolve', @Amount, 'session-promise-kept', @Now)",
                new { request.StudentId, Amount = FollowThroughResolveXp, Now = now });

            conn.Execute(
                $"UPDATE {StudentProgressDBSettings.ProgressTable} " +
                "SET ResolveXP = ResolveXP + @Amount, LifetimeAgencyXP = LifetimeAgencyXP + @Amount " +
                "WHERE StudentId = @StudentId",
                new { request.StudentId, Amount = FollowThroughResolveXp });

            return Ok(new SettleSessionPromiseResponse { ResolveAwarded = FollowThroughResolveXp });
        }

        /// <summary>
        /// The promise chips today's intention names, or null when it names none.
        ///
        /// The intention and the session promise were given the same three options on purpose, so a chosen
        /// intention can be matched against a chosen promise without reading either. A written intention
        /// has no id of its own; the category the AI put it in stands in for one, and only where that
        /// category is decisive.
        /// </summary>
        private static HashSet<string>? ChipsForIntention(string intentionChoice, string detectedCategory)
        {
            var wanted = new List<string>();

            switch (intentionChoice)
            {
                case "practice":
                    wanted.Add("session-next-practice");
                    break;
                case "goal":
                    wanted.Add("session-next-goal");
                    break;
                case "review":
                    wanted.Add("session-next-review");
                    break;

                // "Both" intends each of the two things it names, so a promise of either one has been kept.
                // "unclear" and "no_xp" name nothing at all and are left to the model, which can at least
                // read the words the student wrote rather than the category a classifier guessed.
                case "custom" when detectedCategory == "practice":
                    wanted.Add("session-next-practice");
                    break;
                case "custom" when detectedCategory == "goal":
                    wanted.Add("session-next-goal");
                    break;
                case "custom" when detectedCategory == "both":
                    wanted.Add("session-next-practice");
                    wanted.Add("session-next-goal");
                    break;
            }

            return wanted.Count == 0 ? null : [.. wanted];
        }

        /// <summary>What a session promise chip asks the student to do, in words, for the model to read.</summary>
        private static string SessionPromiseMeaning(string choice) => choice switch
        {
            "session-next-practice" => "spend their next session doing more exercises",
            "session-next-goal" => "work on finishing a goal in their next session",
            "session-next-review" => "look at their progress before deciding what to work on",
            _ => "",
        };

        /// <summary>
        /// Whether today's intention is the thing they promised to work on, for the promises and intentions
        /// that carry no comparable ids. Null when the provider could not be reached, which is NOT the same
        /// answer as "no".
        ///
        /// One question, answered with one word. The alternative — a rule over keywords — is what the
        /// reflection used to do to free text, and it is why "it was good" used to pass: there is no
        /// keyword for "the same thing I meant".
        /// </summary>
        private async Task<bool?> JudgeSessionPromise(
            SettleSessionPromiseRequest request, string promiseChoice, string promiseText)
        {
            var apiKey = _configuration["OpenAI:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey)) return null;

            var promised = SessionPromiseMeaning(promiseChoice);
            var promiseLine = promised.Length > 0
                ? $"They promised to {promised}."
                : "They did not choose one of the offered commitments, so what they promised is only in their own words.";

            var intentionLine = request.IntentionChoice switch
            {
                "practice" => "Today they set their intention to doing more exercises.",
                "goal" => "Today they set their intention to finishing a goal.",
                "review" => "Today they set their intention to looking at their progress first.",
                _ => "Today they wrote their intention in their own words.",
            };

            var prompt =
                $"""
                 At the end of their last session the student made a commitment about what to work on next.
                 {promiseLine}
                 Their words: {(promiseText.Length > 0 ? promiseText : "(none)")}

                 {intentionLine}
                 Their words: {(string.IsNullOrWhiteSpace(request.IntentionText) ? "(none)" : request.IntentionText)}

                 Is today's intention the same thing they promised to work on? Answer with exactly one word:
                 YES or NO.
                 """;

            var raw = await CallOpenAI(apiKey, "You compare one commitment with one intention and answer with one word.", prompt);
            if (string.IsNullOrWhiteSpace(raw)) return null;

            var verdict = raw.Trim().Trim('"', '.', '!').ToUpperInvariant();
            Console.WriteLine($"[Reflection] Session promise read by the model — \"{verdict}\"");

            return verdict.StartsWith("YES", StringComparison.Ordinal);
        }

        /// <summary>One turn of a session reflection's promise, as stored in the history.</summary>
        private sealed class SessionPromiseRow
        {
            public long Id { get; set; }
            public string Role { get; set; } = "";
            public string Choice { get; set; } = "";
            public string Text { get; set; } = "";
        }

        /// <summary>Computes the 6 weakness dimensions from the DB (shared by weakness + reflection).</summary>
        private static WeaknessResponse ComputeWeakness(Microsoft.Data.Sqlite.SqliteConnection conn, long studentId)
        {
            var progress = conn.QueryFirstOrDefault<StudentProgressRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ProgressTable} WHERE StudentId = @StudentId",
                new { StudentId = studentId });

            var typeCounts = conn.Query<MethodCount>(
                $"SELECT ExerciseType AS Method, COUNT(*) AS Value " +
                $"FROM {StudentProgressDBSettings.ExerciseLogTable} " +
                "WHERE StudentId = @StudentId GROUP BY ExerciseType",
                new { StudentId = studentId })
                .ToDictionary(m => m.Method, m => m.Value);

            var goalStats = conn.QueryFirstOrDefault<GoalCompletionStats>(
                $"SELECT COUNT(*) AS TotalGoalCompletions, " +
                $"COALESCE(AVG(TotalErrors), 0) AS AvgErrors, " +
                $"COALESCE(AVG(TotalHints), 0) AS AvgHints, " +
                $"COALESCE(AVG(PippinMessages), 0) AS AvgPippin " +
                $"FROM {StudentProgressDBSettings.GoalsTable} WHERE StudentId = @StudentId",
                new { StudentId = studentId });

            int total = typeCounts.Values.Sum();
            int suit = typeCounts.GetValueOrDefault("Suitability", 0);
            int eff = typeCounts.GetValueOrDefault("Efficiency", 0);
            int match = typeCounts.GetValueOrDefault("Matching", 0);
            int streak = progress?.StreakDays ?? 0;
            double avgErrors = goalStats?.AvgErrors ?? 0;
            double avgHints = goalStats?.AvgHints ?? 0;
            double avgPippin = goalStats?.AvgPippin ?? 0;

            int decisionScore = total > 0 ? (int)Math.Round((double)suit / total * 100) : 0;
            int efficiencyScore = total > 0 ? (int)Math.Round((double)eff / total * 100) : 0;
            int methodScore = total > 0 ? (int)Math.Round((double)match / total * 100) : 0;
            int compScore = total > 0 ? Math.Max(0, 100 - (int)Math.Round(avgErrors * 20)) : 50;
            double depPenalty = avgHints + avgPippin;
            int indepScore = total > 0 ? Math.Max(0, 100 - (int)Math.Round(depPenalty * 33)) : 50;
            int consistencyScore = Math.Min(100, (int)Math.Round((double)streak / 7 * 100));

            var dimensions = new List<WeaknessDimension>
            {
                new() { Key = "decision-accuracy", Label = "Decision Accuracy", Score = decisionScore, RecommendedExercise = "Suitability" },
                new() { Key = "efficiency-judgment", Label = "Efficiency Judgment", Score = efficiencyScore, RecommendedExercise = "Efficiency" },
                new() { Key = "method-recognition", Label = "Method Recognition", Score = methodScore, RecommendedExercise = "Matching" },
                new() { Key = "computational-skill", Label = "Computational Skill", Score = compScore, RecommendedExercise = "Suitability" },
                new() { Key = "independence", Label = "Independence", Score = indepScore, RecommendedExercise = "Suitability" },
                new() { Key = "consistency", Label = "Consistency", Score = consistencyScore, RecommendedExercise = "Suitability" },
            };

            var weakest = dimensions.OrderBy(d => d.Score).First();

            return new WeaknessResponse { Dimensions = dimensions, Weakest = weakest };
        }

        private static string BuildReflectionPrompt(
            ReflectionEvaluateRequest request,
            ReflectionQueueRecord item,
            NlpFeatures? features = null,
            string questionLine = "",
            string recordLine = "",
            string verdictLine = "",
            string studentLine = "")
        {
            var signalBlock = features is null ? string.Empty : BuildSignalBlock(features);

            // The end-of-session rule is a clause of its own rather than a sentence inside the shared
            // instruction below, so that the prompt an exercise or a goal is given is exactly the prompt it
            // was given before this existed — character for character.
            var sessionOnlyRule = item.ItemType == "session"
                ? " THIS IS THE END-OF-SESSION REFLECTION, SO NONE OF THAT APPLIES: it has no right answer "
                  + "and nothing was checked, so never judge it, never say it matched or did not, and simply "
                  + "reply to what they said about their day."
                : string.Empty;

            var questionLabel = item.ItemType == "session"
                ? request.QuestionNumber == 1
                    ? "Q1 - what went well today"
                    : "Q2 - what to work on next session"
                : request.QuestionNumber switch
                {
                    1 => "Q1 - what went well",
                    2 => "Q2 - the question this goal or exercise is actually about",
                    _ => "Q3 - one concrete next step"
                };
            // WHAT THE HELP BUTTON MEANS.
            //
            // Not "model answer requested": that label was put in front of the model on every help-button
            // call and came straight back in the reply as "You asked for the model answer...", which is
            // off-topic and mildly shaming.
            //
            // Not "nothing about them to say" either, which is what replaced it. That contradicted the
            // rule further down that tells the model to say what the record shows they did, and two
            // instructions pulling opposite ways is how a help-button reply ends up vague or about the
            // wrong question. The student pressed the button ASKING this question, so the companion
            // answers it: for Q1 and Q2 with what the student actually did, for Q3 with what to do next.
            var mode = request.Mode == "pippin"
                ? "The student pressed the help button instead of answering, so they are asking you to answer this question for them, from the facts below. For Q1 and Q2 that means stating what they actually did on the one thing this question asks about. For Q3 it means naming what to do next. There is no student answer to grade."
                : "They answered themselves";
            var langInstruction = request.Language switch
            {
                "de" => "You must respond ONLY in German.",
                "ja" => "You must respond ONLY in Japanese.",
                _ => "Respond in English."
            };

            // The same fact, said TO the student instead of about them.
            //
            // Q1 and Q2 are answered with this: the help button asks for it outright, and a written answer
            // is judged and then confirmed or told which way it went. The model is handed the sentence to
            // convey rather than left to build one from the error and hint totals — which is how a reply
            // comes back vague, or reaches for "you didn't", the exact shape the ban below forbids. Empty
            // for the questions where the past is not the answer at all.
            var studentLineBlock = string.IsNullOrWhiteSpace(studentLine)
                ? ""
                : $"\nWhat they did, said to them rather than about them (state this, in your own warm words, adding no contrast and no \"didn't\", and nothing beyond it: no stronger word than it uses and no extra achievement it does not state): {studentLine}.";

            return $@"Student completed: {item.ItemLabel} (item type: {item.ItemType}).
The ONLY facts about this student that you may use are the ones on the lines below. Nothing else about them is known to you, and nothing about any other exercise, goal or question may appear in the reply.

Current question: {questionLabel}
{questionLine}
What they actually did, as far as we know it: {recordLine}{studentLineBlock}
The decision on their answer: {verdictLine}
Quick answer they tapped (empty when they wrote instead; when one is named it settles the verdict on its own, whatever the box also holds): {(string.IsNullOrWhiteSpace(request.Choice) ? "(none)" : string.IsNullOrWhiteSpace(request.ChoiceLabel) ? request.Choice : request.ChoiceLabel)}
Mode: {mode}
Student answer: {(string.IsNullOrWhiteSpace(request.Answer) ? "(empty)" : request.Answer)}
{signalBlock}
Instructions:
{langInstruction}
TONE (very important): Be warm, brief and conversational — like a friend, not a report. Write as the companion who was there with them, in the second person (""you compared the two methods""), never as something that looked them up or checked them, and never list their exact error or hint numbers back at them. If their self-assessment matches their performance, just celebrate it and stop there — do NOT add any suggestion or correction.
NEVER TALK ABOUT AWARDS OR SCORES (very important): the app's own scoreboard must not appear in the reply in any form — no name for it, no number, no abbreviation, and nothing about whether something counted, paid, was earned, or did not. That includes the empty-handed version of it: never tell them there is nothing here to earn, because a student who got little out of an exercise still did the exercise, and that line only lands as a mark against them. Whatever there is to show sits on the badge beside your reply, and talking about it turns a reflection into a scoreboard. The JSON at the end carries an award number and the machine's names for its fields: those are for the machine, and neither the number nor those names may appear in the feedback text.
ANSWER THE QUESTION WITH SOMETHING REAL ABOUT IT (very important): every reply answers the ONE question above with something real about it — for a question about a decision, what they did at that step; for a counting question, the number; for a question about the next exercise, the one thing to do next. A remark that would fit any question at all (""that's interesting"", ""worth another look"", ""sometimes the tricky spots sneak up on us"") does not answer it, and must never be the whole reply. If their answer was too vague to tell you anything, do not comment on how vague it was: give them what the facts line states about this question, warmly, and stop.
SAY WHICH WAY IT WENT (very important): the student cannot see the verdict, so the reply is the only place they learn whether their answer matched. A reply that only says ""interesting, take a look"" tells them nothing and reads as a brush-off. When it matches, say so plainly and warmly. When it does not, name what they actually did so the difference is visible to them — without ever framing it as a mistake.
STAY INSIDE THE QUESTION (very important): the reply answers the ONE question above and nothing else. Do not bring in errors, hints, other decisions, or any other question from this reflection. If the question asked whether they compared two methods, the whole reply is about comparing two methods — a sentence about the solution, the method choice or their mistake count does not belong in it, however true it is. The facts line above states only what this question is about; treat anything it does not mention as unknown to you and do not guess at it.
NEVER TELL THEM THEY DID NOT DO SOMETHING (very important): every sentence is about what they DID. Write the fact affirmatively, and never build a sentence on a gap — nothing about what their answer left out, what they missed, what did not happen, or what their choice was not. Put no contrast in front of the fact either, and no word that turns it into a correction of their answer. Those sentences read as a telling-off even when they are accurate, and they make a student write what sounds right rather than look at their own work. Where they took the offered help, state what they did plainly and without judgement (""you skipped the comparison here""), then say that asking for help is a real, sensible thing to do — and if there is something genuinely good to name, name it. Use their own words for their choice, never a verdict on it. If the answer was too short or too vague to match against anything, do not point at the gap — state what the facts line says about this question, warmly, and invite them to have a go at the next one. When the answer was vague, or said outright that they ignored the step, this rule matters most of all: state what the facts say as a plain fact, with nothing in front of it, and stop.
NEVER INVENT WHAT THEY DID (very important): the facts line is the only thing you know about their choices, and it says what it says. Never credit them with something it does not state — do not write that they read, opened, saw, studied or took the time to look at an explanation unless the facts line says they did. If it says only that they did not explain their reasoning, then that is all that happened and the reply says nothing more about it. Where the facts say nothing, you know nothing about that step: never guess, and never fill the gap with something flattering or otherwise.
NO FOLLOW-UP QUESTIONS (very important): This reflection is ONE question and ONE answer. The student cannot reply again. Never ask them anything, never probe for more detail, never invite them to explain further, and never end your feedback with a question mark. Deliver your feedback as a complete statement and stop.
- If mode is 'Pippin told them': the student pressed ""Pippin, tell me"" instead of writing an answer, so there is nothing to grade, and requesting help pays nothing: return aligned=false with an award number of 0, never say they answered correctly, and never praise an answer there is none of. Never remark on the empty box either, or on there being no answer, or on what they did not write: they asked for help, which is a thing they did, and the reply says nothing about the shape of their turn.
  * On Q1 and Q2 the student is asking YOU for this question's answer, so ANSWER IT: one or two sentences stating plainly what the facts line above says they did with the one thing this question asks about — the decision they took at that step, or the part of the working the question names. That statement IS the reply. Never replace it with a general tip, and never write that they asked for the model answer, that you are explaining their work, or anything else about the button they pressed.
  * On Q3 the question is about the NEXT exercise, so the reply is ONE concrete thing to try next, taken from this question's own answers, with a few words on why it will help. Say nothing about what they did earlier: a question about the future is not answered by the past.
  * Speak directly to the student as Pippin, warmly, without judging either choice. Everything the facts line does not mention is unknown to you — do not guess at it and do not credit them with it.
- If Q1 or Q2 and they answered themselves (no quick answer tapped): whether what they wrote matched the facts is ALREADY DECIDED, and is stated above as the decision on their answer. Copy it, and write the reply to fit it: when it is confirmed, say plainly and warmly that it is what happened, naming the fact that shows it, with no hedge of any kind; when it is not, state what the facts say about this question as a plain, warm fact, and never say or hint that their answer matched. Use only the figures and wording the facts line gives: no stronger word, no extra achievement, and no count it does not state.{sessionOnlyRule}
- When they tapped a quick answer, ALIGNMENT IS ALREADY DECIDED, and it is stated above as the decision on their answer. Copy it exactly: do not change it, do not second-guess it, and do not decide the award yourself. Write only the reply. Where the tap and the facts differ, say what they actually chose the way the facts line states it, and make it sound like the reasonable thing it was — no ""but"", no ""actually"", no ""in reality"", no comparing it against what they tapped, and no sentence that could be read as marking them down. They do not need to be told the tap was wrong; the reply is there to end the reflection on something true and warm. Do not repeat their version either, and never write that their answer was right, close, or matches when the facts say it does not.
- ALWAYS FIND SOMETHING GENUINELY GOOD, AND ESPECIALLY ON Q1. Q1 asks what was good, so the reply LEADS with something real and good that the facts line supports — they worked it out themselves, they got through a part without a mistake, they took no hints, they explained their reasoning, they compared the methods, they asked for help rather than giving up, or they finished an exercise that cost them. Name it first, in their own terms, and let the reply stand on it: every exercise has one, even a rough one. If their answer does not match, state what the facts say warmly and matter-of-factly and then name that good thing. Do not scold, and do not point out that they were wrong.
- NEVER AGREE WITH SOMETHING THE FACTS CONTRADICT. If they say they worked it out themselves but the facts say they skipped it, do not congratulate them for working it out and never state their claim as fact: that teaches them the reflection is a box to type anything into. Say what they did in a warm, matter-of-fact way, and celebrate the thing that is actually true instead — taking the help on offer is a real, sensible thing to do.
- A TAPPED QUICK ANSWER IS A COMPLETE ANSWER. If the answer text is empty but a quick answer is stated above, they answered: quote or refer to what they chose. NEVER say they did not answer, did not share their thoughts, or missed the question, and never remark on the empty box. There is nothing missing.
  * If they DID NOT tap a quick answer AND wrote nothing usable, then there is genuinely no answer, and the reply should simply invite them to have a go at the next one. Never remark on the empty box or on what they did not write, and never say they did not share, did not answer or missed the question — there is simply nothing there, and the invitation is the whole reply.
  * Where they SKIPPED the thing this question is about, that is what the facts say and it decides the verdict. Say it plainly and warmly, without ranking it as a failure, and never carry it into a question it does not belong to. A decision here is a yes or a no: no means they skipped it, not that they asked for the answer to be revealed.
  If aligned (match is yes, or the tap was confirmed) → aligned=true with an award number of 3, and one or two warm sentences that name the thing they got right. If not → aligned=false, award number 0: give them the one thing the facts line above says about this question, as a plain fact with nothing in front of it — start the sentence with the fact itself, with no phrase about a source, a check, or where the fact came from (for example ""you went straight on without comparing the two methods here"") — and then say warmly why that step is the one worth taking. Never settle for a general observation instead of that fact, never quote their own words back as the thing that went wrong, never quote totals of mistakes or hints (the number of exercises a fact mentions is fine), and never ask them anything. A vague answer gets exactly the same treatment: what the facts line says about this question, and stop.
- If Q3: ignore alignment. The FEEDBACK must ANSWER the question on screen: name ONE concrete thing to do in the next exercise, taken from this question's own quick answers, and say in a few words why it will help. It must be about the subject THIS question is about (comparing, explaining, working it out, hints, the method) and never a general study tip. Put the same thing, one line and phrased as an offer, in nextStep. NEVER open by describing what the student did, what they pressed, or that they asked for anything. Set aligned=false with an award number of 0. The feedback must not end with a question mark — the audit catches that here more than anywhere else, so end on a full stop.
- OFF-TOPIC: if the answer is clearly unrelated to maths and to this exercise (a random word, a different topic entirely, keyboard mashing), set offTopic=true, aligned=false, insightXp=0, and leave feedback empty — the app shows its own message asking the student to write the reflection again. A reply must be to words that mean something, so placeholder and nonsense text (""blah blah"", ""keyboard smash"", ""asdf"", ""test test"") is unrelated even when it is several words long: flag it rather than replying to it. Beyond that, use this ONLY when the answer is genuinely unrelated: a short, vague, unsure or partly incoherent answer that is still about the exercise is a valid reflection and is NOT off-topic.

IMPORTANT: always include the ""aligned"", ""insightXp"" and ""offTopic"" keys with their exact boolean/integer values — never omit them and never quote the numbers as strings.

Respond ONLY in this JSON: {{""feedback"":""..."",""aligned"":true|false,""insightXp"":0-3,""offTopic"":true|false,""nextStep"":""...""}}";
        }

        /// <summary>
        /// Renders deterministic NLP signals as prompt guidance.
        ///
        /// Two deliberate choices: the block is explicitly subordinate to the TONE/ALIGNMENT rules
        /// above (otherwise it would fight the "just celebrate and stop there" rule), and only
        /// actionable signals are included — raw counts stay out so the tutor cannot quote numbers
        /// back at the student.
        ///
        /// Nothing here may invite a question. The reflection is one question and one answer, so
        /// signals are used only to choose wording, never to ask the student for more.
        /// </summary>
        private static string BuildSignalBlock(NlpFeatures f)
        {
            var points = new List<string>
            {
                f.MentionsMethod && f.MethodsMentioned.Count > 0
                    ? $"- they named a solving method ({string.Join(", ", f.MethodsMentioned)}) — referring to it by name is welcome"
                    : "- they did not name a specific solving method — do not ask which one; just work with what they did say",
                f.GivesReason
                    ? "- they gave a reason (a causal word was used) — acknowledge it, that is worth praising"
                    : "- they gave no reason — completely fine; NEVER ask why and never ask them to explain further",
            };

            if (f.UncertaintyMarkers.Count > 0)
                points.Add("- they sounded unsure or hedged — be extra reassuring");

            if (f.AffectMarkers.Count > 0)
                points.Add("- they expressed a feeling about the task (difficulty or ease) — acknowledge the feeling");

            if (f.CharacterCount > 0 && f.CharacterCount <= 12)
                points.Add("- the answer is very short — keep your reply short and warm as well; do not ask for more detail");

            return $@"
Signals detected in their answer (machine-extracted and imperfect — treat as hints only):
{string.Join("\n", points)}

How to use these: they exist ONLY to help you choose wording. Never mention that anything was detected, never turn them into claims about the student, never quote them, and never ask the student a question because of them. The TONE and ALIGNMENT rules below always take precedence — if those say to simply celebrate and stop, do exactly that and ignore these hints.
";
        }

        private static readonly System.Text.RegularExpressions.Regex ForbiddenReplyShape = new(
            @"\b(insight|xp|award(ed)?|you (just )?(asked|tapped|pressed|clicked|selected)|asked for (help|the answer)|the (help )?button|didn'?t|did not|you (missed|forgot))\b",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Compiled);

        /// <summary>
        /// Whether what a student WROTE agrees with the facts about the one question asked: "yes", "no" or
        /// "unclear", or empty when no judgement could be made.
        ///
        /// A call of its own, with nothing in it but the topic, the facts and the answer. Judging used to
        /// happen inside the call that also wrote the reply, and a long prompt full of tone rules pulled
        /// the two apart: a true claim was marked as not matching, and a reply that confirmed was paid
        /// nothing. A narrow question gets a reliable answer, and the reply is then written to it.
        /// </summary>
        private async Task<string> JudgeWrittenAnswer(
            string apiKey, ReflectionQuestion asked, string facts, string answer)
        {
            var prompt = $@"A student answered a reflection question about their own work. Decide whether what they wrote agrees with the facts.

What the question asks about: {asked.Expectation}
Facts (these are true): {facts}
What the student wrote: ""{answer}""

Choose exactly one outcome:
- ""agrees"": they make a claim about what the question asks about, and the facts confirm every part of it. A claim that says the same thing as a fact in different words agrees.
- ""contradicts"": they make a claim about it that the facts contradict, including a count, a method, or a word like all, every, always, never or none that the facts do not support.
- ""no_claim"": they make no claim about it that could be checked: a general verdict such as ""it was fine"" or ""I don't know"", or something about a different question.
Read the claim literally and compare it with the facts, claim by claim. Count the exercises the facts mention; do not guess. First write what they claim and what the facts say about the same thing, then choose.

Respond ONLY with JSON, keys in this order: {{""claim"":""what the student claims, in a few words"",""facts"":""what the facts say about that same thing"",""outcome"":""agrees|contradicts|no_claim""}}";

            var raw = await CallOpenAI(apiKey,
                "You check a student's written answer against facts and reply with one JSON object only.", prompt, temperature: 0);
            if (raw == null) return "";

            Console.WriteLine($"[Reflection] Judge raw: {raw.Replace("\n", " ")[..Math.Min(400, raw.Replace("\n", " ").Length)]}");

            var start = raw.IndexOf('{');
            var end = raw.LastIndexOf('}');
            if (start < 0 || end <= start) return "";

            try
            {
                using var doc = JsonDocument.Parse(raw.Substring(start, end - start + 1));
                var outcome = doc.RootElement.TryGetProperty("outcome", out var m) && m.ValueKind == JsonValueKind.String
                    ? (m.GetString() ?? "").Trim().ToLowerInvariant()
                    : "";
                return outcome switch
                {
                    "agrees" => "yes",
                    "contradicts" => "no",
                    "no_claim" => "unclear",
                    _ => "",
                };
            }
            catch
            {
                return "";
            }
        }

        // A reply that hedges or points at a difference. It may not sit next to a confirmed answer.
        private static readonly System.Text.RegularExpressions.Regex HedgesAConfirmation = new(
            @"differently|different from|(a |the )?(little|bit|touch|slightly)( bit)? different|not (quite|exactly)|(does|did|do)(n'?t| not)( quite)? (match|line up)|second (glance|look)|however|in reality|but actually|to be honest",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Compiled);

        // A reply that confirms. It may not sit next to an answer that was not confirmed.
        private static readonly System.Text.RegularExpressions.Regex ConfirmsTheAnswer = new(
            @"spot on|exactly (what|right|as)|that matches|matches what|you'?re (absolutely |completely )?right|you are (absolutely |completely )?right|that'?s (absolutely |completely )?(right|correct)|is correct\b|nailed it",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Compiled);

        /// <summary>
        /// Why a model reply cannot be shown, or null when it can.
        ///
        /// Three things are checked, all of them mistakes the model keeps making in spite of the prompt:
        /// talking about the score, the button or what they did not do; confirming an answer that was not
        /// confirmed; and hedging an answer that was. The last two matter most — the badge says one thing
        /// and the sentence beside it says the other, which is the one inconsistency a student will see.
        /// English only, because these are words.
        /// </summary>
        private static string? ReplyProblem(string reply, bool aligned, string? language, string? mode, string questionKind)
        {
            if (string.IsNullOrWhiteSpace(reply)) return null;
            if (!string.IsNullOrWhiteSpace(language) && !language.StartsWith("en", StringComparison.OrdinalIgnoreCase))
                return null;

            if (ForbiddenReplyShape.IsMatch(reply))
                return "it mentions the score or the button, or says what they did not do — write only what they did";

            var judged = questionKind is ReflectionQuestionBank.Observation or ReflectionQuestionBank.Judgement;
            if (!judged) return null;

            if (aligned && HedgesAConfirmation.IsMatch(reply))
                return "their answer matched the facts but the reply hedges or points at a difference — confirm it plainly, with no hedge";
            if (!aligned && mode != "pippin" && ConfirmsTheAnswer.IsMatch(reply))
                return "their answer did not match the facts but the reply confirms it — state what the facts say instead, without saying it matched";

            return null;
        }

        /// <summary>
        /// <summary>
        /// The reply, when the AI provider cannot be reached, for an answer the record settled itself.
        ///
        /// It has to say the same thing as the Insight badge, because the badge is computed from the
        /// record and this text is shown next to it. Nothing here names a decision the question was not
        /// about, so a question about comparing two methods cannot come back talking about the solution.
        ///
        /// This text is the whole of what the student reads on this path, and two more things shape every
        /// line: it never talks about what their answer was worth (the badge is the only place that
        /// belongs), and it says what actually happened on the thing this question asked about instead of
        /// a remark that would fit any answer. <paramref name="whatTheyDid"/> is that fact — the record's
        /// own words, second person — and it is empty when the record holds nothing about this question.
        /// </summary>
        private static string VerdictFeedback(
            ReflectionQuestion question, ReflectionVerdict verdict, string choiceLabel, string whatTheyDid)
        {
            var promise = question.Kind == ReflectionQuestionBank.NextAction;
            var picked = string.IsNullOrWhiteSpace(choiceLabel) ? "that" : $"\"{choiceLabel}\"";

            // A session question is ungraded and has no expectation to check a claim against, so neither
            // a confirmation nor a mark-down would be true. What the student read of their own day is the
            // only answer there is, and the reply says only that.
            if (question.Kind == ReflectionQuestionBank.Session)
                return "Thanks for taking a look at your day. Your own reading of it is the one that counts "
                     + "here, and naming what went well is what makes it something to build on.";

            // A commitment is settled tomorrow by the exercise it is about, so the reply is about the
            // choice just made rather than about how anything went.
            if (promise)
                return $"Good — {picked} next time. Choosing it now, before the exercise starts, is what makes "
                     + "it happen rather than being one more thing to remember.";

            if (verdict.Status == "aligned")
                return string.IsNullOrWhiteSpace(whatTheyDid)
                    ? $"Spot on — {picked} is exactly what happened here, and noticing that about your own "
                      + "work is the whole point of looking back."
                    : $"Spot on — {whatTheyDid}, which is exactly what happened here. Noticing that about your "
                      + "own work is the whole point of looking back.";

            // The one case the record cannot settle: it has nothing to hold a claim against, so the
            // student's own reading stands and the reply does not pretend to confirm or correct it.
            if (verdict.Status == "partial")
                return $"{picked} — this one is yours to call, and that is a fair reading to take from it. "
                     + "Worth holding on to for the next exercise.";

            return string.IsNullOrWhiteSpace(whatTheyDid)
                ? "Thanks for looking at that one. It is worth a second glance before the next exercise, and "
                  + "the moment this question asks about is the place to look."
                : $"Here is the bit this question was about: {whatTheyDid}. That is worth knowing about how "
                  + "you work through an exercise, and it is the part the next one will ask about again.";
        }

        private static ReflectionEvaluateResponse BuildReflectionFallback(
            ReflectionEvaluateRequest request,
            ReflectionQueueRecord item,
            ReflectionEvidence evidence,
            ReflectionQuestion asked)
        {
            // The end-of-session reflection is ungraded, so none of the rules below fit it: the keyword
            // guess reads a claim nothing checked, and the next-step plan belongs to the third question of
            // an item that has only two. This text goes out whenever the provider is unavailable, which is
            // often, so it is not a rare branch — and it is the only thing the student will read.
            if (item.ItemType == "session")
            {
                return new ReflectionEvaluateResponse
                {
                    Feedback = request.QuestionNumber == 1
                        ? "Thanks for taking a moment over today. However it went, stopping to look back at "
                          + "it is what turns a session into progress."
                        : "Thanks for choosing something to work on. That is exactly what the next session "
                          + "is for.",
                    Aligned = false,
                    InsightXp = 0,
                    NextStep = ""
                };
            }

            if (request.QuestionNumber == 3)
            {
                // Q3 asks the student what they will do next, so the reply is about their promise and
                // nothing else. It used to hand over the weakest area's own recommendation, which answers
                // a different question than the one on screen — and that line reached the student on the
                // normal path as well, whenever the model returned no nextStep.
                //
                // A tapped chip IS their answer, and its words arrived with the request, so a tap can be
                // named back to them. A written promise cannot: the wording of that copy lives in the
                // client's locale files, so the reply works with what they wrote instead of inventing a
                // plan of its own.
                var promise = request.ChoiceLabel?.Trim() ?? "";
                return new ReflectionEvaluateResponse
                {
                    Feedback = string.IsNullOrWhiteSpace(promise)
                        ? "Good — you have named something to work on next time."
                        : $"Good — you have picked \"{promise}\" for next time.",
                    Aligned = false,
                    InsightXp = 0,
                    NextStep = string.IsNullOrWhiteSpace(promise)
                        ? "Take the thing you just named and try it in your next exercise."
                        : $"Next time: {promise}."
                };
            }

            if (request.Mode == "pippin")
            {
                // The help button is a request for THIS question's answer, so the reply gives one: what
                // the record says they did with the one thing the question asks about. It used to be a
                // generic "look at the part that felt least certain", which answers no question at all —
                // and this is the only text the student reads on this path.
                var did = ReflectionQuestionBank.DescribeRecordToStudent(evidence, asked);
                return new ReflectionEvaluateResponse
                {
                    Feedback = string.IsNullOrWhiteSpace(did)
                        ? "Happy to help with this one. Nothing is known about that step here, so the "
                          + "best I can say is to take the moment this question is about and give it a go "
                          + "on the next exercise."
                        : $"Here is what this one came down to: {did}. That is the bit this question was "
                          + "asking about.",
                    Aligned = false,
                    InsightXp = 0,
                    NextStep = ""
                };
            }

            // The question is named on the request, and the decision is on the item's own summary, so
            // this needs nothing that is built later in the caller.
            var aboutADecision = request.QuestionId is "q2-compared" or "q2-explained";

            if (aboutADecision)
            {
                // The record holds the decision this question asked about, so the offline reply states it
                // rather than explaining that there would normally be a comparison to make. This branch is
                // only reached for a written answer: a tapped chip is settled by the record and answered
                // by VerdictFeedback, which overwrites this.
                var did = ReflectionQuestionBank.DescribeRecordToStudent(evidence, asked);

                return new ReflectionEvaluateResponse
                {
                    // No mention of an award. The badge already says what the badge says, and telling a
                    // student that something did not count is the one way this reply could still sting.
                    Feedback = string.IsNullOrWhiteSpace(did)
                        ? "Thanks for writing that down. Nothing is known about that step on this one, so "
                          + "it is worth another look before the next exercise asks for it."
                        : $"Thanks for writing that down. On this one, {did} — and that is the bit this "
                          + "question was asking about.",
                    Aligned = false,
                    InsightXp = 0,
                    NextStep = ""
                };
            }

            // A WRITTEN ANSWER IS NEVER PAID OFFLINE.
            //
            // This used to guess from keywords ("hint", "easy", "good") whether the answer matched, and
            // paid Insight on the guess — which is how a student writing "I didn't use hints" on a goal
            // with no hints at all was shown "this reads a little differently" next to +3. Nothing here can
            // read what they wrote against what happened, so no judgement is made: the reply says what the
            // record shows about THIS question, as a plain fact, and the badge stays empty. A tapped chip
            // never reaches this point; the record settles it and VerdictFeedback answers it.
            var shown = ReflectionQuestionBank.DescribeRecordToStudent(evidence, asked);

            return new ReflectionEvaluateResponse
            {
                Feedback = string.IsNullOrWhiteSpace(shown)
                    ? "Thanks for writing that down. Looking back at your own work like this is what makes the "
                      + "next exercise easier to plan."
                    : $"Thanks for writing that down. On this question, {shown}.",
                Aligned = false,
                InsightXp = 0,
                NextStep = ""
            };
        }

        // ── Demo data generator ────────────────────────────────────────────────

        private static List<ExerciseLogRecord> GenerateDemoData()
        {
            var rng = new Random(42);
            var types = new[] { "Suitability", "Efficiency", "Matching" };
            var logs = new List<ExerciseLogRecord>();
            var baseDate = DateTime.UtcNow.AddDays(-5);

            // Generate 8 exercises over the past 5 days
            // Deliberately make Suitability the weakest (more exercises but also more errors implied)
            // Matching = strongest (few exercises, all recent)
            for (int i = 0; i < 8; i++)
            {
                var daysAgo = rng.Next(0, 5);
                string type;
                if (i < 4) type = "Suitability";       // 4 attempts, lots of practice
                else if (i < 6) type = "Efficiency";    // 2 attempts
                else type = "Matching";                  // 2 attempts, least practice

                logs.Add(new ExerciseLogRecord
                {
                    StudentId = 1,
                    ExerciseType = type,
                    CompletedAt = baseDate.AddDays(daysAgo).AddHours(rng.Next(8, 20)).ToString("yyyy-MM-ddTHH:mm:ss")
                });
            }

            return logs.OrderBy(l => l.CompletedAt).ToList();
        }

        // ── OpenAI Helper ────────────────────────────────────────────────────

        private async Task<string?> CallOpenAI(string apiKey, string systemPrompt, string userPrompt, double temperature = 0.3)
        {
            var payload = new Dictionary<string, object>
            {
                ["model"] = AiProvider.Model(_configuration),
                ["messages"] = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = userPrompt }
                },
                ["temperature"] = temperature,
                ["max_tokens"] = 500
            };
            AiProvider.ApplyThinkingFlag(payload, _configuration);

            var json = JsonSerializer.Serialize(payload);
            var httpClient = _httpClientFactory.CreateClient();
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            // ASK AGAIN BEFORE GIVING UP. This used to make one attempt, so a single blip at the provider
            // cost the student their reply and sent them the offline text instead. The failures we see are
            // HTTP 500 with an EMPTY body, arriving in tens of milliseconds, while a good call takes about
            // a second: that is the shape of a hiccup at their end, not of a bad request from ours. A bad
            // request would fail every time and would say so in the body.
            HttpResponseMessage? response = null;
            var responseBody = "";

            for (var attempt = 1; attempt <= 3; attempt++)
            {
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                response = await httpClient.PostAsync(AiProvider.ChatCompletionsUrl(_configuration), content);
                responseBody = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode) break;

                Console.WriteLine(
                    $"[AI] attempt {attempt}/3: {(int)response.StatusCode} from {AiProvider.BaseUrl(_configuration)} " +
                    $"(model={AiProvider.Model(_configuration)}) — {responseBody[..Math.Min(300, responseBody.Length)]}");

                // A 4xx is about this request and will fail identically, so only 5xx is worth asking twice
                // — except 429, which is the provider asking us to slow down. Giving up on it sent the
                // student the offline text, which pays nothing, over a limit that lifts within seconds.
                var tooManyRequests = (int)response.StatusCode == 429;
                if ((int)response.StatusCode < 500 && !tooManyRequests) return null;
                if (attempt < 3) await Task.Delay((tooManyRequests ? 2500 : 250) * attempt);
            }

            // Log the failure rather than silently returning null. A null here is indistinguishable at
            // the call site from "the model had nothing to say", and that ambiguity is exactly what made
            // a provider swap look like an unreachable server: the request had succeeded with 200, but
            // an empty `content` (a reasoning model that ran out of budget while thinking) came back as
            // a null and every caller quietly used its fallback.
            if (response is null || !response.IsSuccessStatusCode) return null;

            using var doc = JsonDocument.Parse(responseBody);

            var message = doc.RootElement.GetProperty("choices")[0].GetProperty("message");
            var text = message.GetProperty("content").GetString();

            if (string.IsNullOrWhiteSpace(text))
            {
                var finish = doc.RootElement.GetProperty("choices")[0].TryGetProperty("finish_reason", out var f)
                    ? f.GetString()
                    : "?";
                var reasoningChars = message.TryGetProperty("reasoning", out var reasoning)
                                     && reasoning.ValueKind == JsonValueKind.String
                    ? reasoning.GetString()!.Length
                    : 0;

                Console.WriteLine(
                    $"[AI] empty content — finish_reason={finish}, reasoning={reasoningChars} chars. " +
                    (reasoningChars > 0
                        ? "The model is a reasoning model and spent the whole token budget thinking; " +
                          "set OpenAI:DisableThinking=true or raise max_tokens."
                        : "The model returned no text."));
            }

            return text;
        }

        /// <summary>
        /// One suggested goal, in the same shape the picker builds a goal from.
        ///
        /// The model returns this and the server normalises it (see <see cref="GoalCatalogue"/>), so
        /// a suggestion is always a goal that actually exists with legal values. The model cannot
        /// invent a category or a target size that the picker would then refuse — and it cannot
        /// quietly suggest a goal the student is unable to complete.
        /// </summary>
        public class GoalSuggestion
        {
            /// <summary>One of the six categories. A suggestion with anything else is discarded.</summary>
            public string Category { get; set; } = "";

            /// <summary>Method or exercise type to narrow to. Empty means "any".</summary>
            public string Focus { get; set; } = "";

            /// <summary>"exercises" | "minutes".</summary>
            public string Metric { get; set; } = GoalCatalogue.ExercisesMetric;

            public int Target { get; set; }

            /// <summary>hintsAndErrors only: "hints" | "errors".</summary>
            public string Quality { get; set; } = "";

            /// <summary>hintsAndErrors only: the per-exercise limit.</summary>
            public int MaxPerExercise { get; set; }

            /// <summary>Why this goal, for this student. Shown verbatim under the suggestion.</summary>
            public string Reason { get; set; } = "";
        }

        /// <summary>Wraps AI-suggested goals with a coherent mini-plan narrative.</summary>
        public class GoalPlanResponse
        {
            public string PlanTitle { get; set; } = "";
            public string PlanNarrative { get; set; } = "";
            public List<GoalSuggestion> Goals { get; set; } = new();
        }

        /// <summary>Simple keyword-based category detection for when AI is unavailable.</summary>
        internal static class CategoryDetector
        {
            public static string DetectCategoryFromText(string text)
        {
            var lower = text.ToLowerInvariant();

            // Check for off-topic / gibberish first
            var mathWords = new[] { "math", "exercise", "practice", "solve", "equation", "goal", "mission",
                "learn", "study", "improve", "try", "work", "complete", "finish", "achieve", "streak",
                "hint", "pippin", "solo", "method", "substitution", "elimination", "equalization",
                "suitability", "efficiency", "matching", "help", "struggle", "better", "progress", "plan" };
            bool hasMathContext = mathWords.Any(w => lower.Contains(w));
            if (!hasMathContext && lower.Length < 5)
                return "no_xp";  // very short, no math words = likely gibberish

            bool hasGoal = lower.Contains("goal") || lower.Contains("mission") || lower.Contains("achieve")
                || lower.Contains("finish the") || lower.Contains("complete the goal")
                || lower.Contains("earn the") || lower.Contains("streak");

            bool hasPractice = lower.Contains("practice") || lower.Contains("exercise") || lower.Contains("try")
                || lower.Contains("work on") || lower.Contains("do some") || lower.Contains("solve")
                || lower.Contains("complete the exercise");

            if (hasGoal && hasPractice) return "both";
            if (hasGoal) return "goal";
            if (hasPractice) return "practice";
            if (hasMathContext) return "unclear";
            return "no_xp";
        }
    }
}
}
