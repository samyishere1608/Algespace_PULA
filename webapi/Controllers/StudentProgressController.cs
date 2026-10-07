using Dapper;
using Microsoft.AspNetCore.Mvc;
using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using webapi.Models.Analytics;
using webapi.Models.Anchors;
using webapi.Models.Database;
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

            conn.Execute(
                $"CREATE TABLE IF NOT EXISTS {StudentProgressDBSettings.ReflectionHistoryTable} " +
                $"({StudentProgressDBSettings.ReflectionHistoryScheme})");

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
            string decisions = "")
        {
            conn.Execute(
                $"INSERT INTO {StudentProgressDBSettings.ReflectionQueueTable} " +
                "(StudentId, ItemType, ItemId, ItemLabel, Status, Errors, Hints, PippinMessages, Method, Decisions, CompletedAt) " +
                "VALUES (@StudentId, @ItemType, @ItemId, @ItemLabel, 'pending', @Errors, @Hints, @PippinMessages, @Method, @Decisions, @CompletedAt)",
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
                    CompletedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss")
                });

            // Cap at 3 pending: keep the latest 3, skip the rest
            conn.Execute(
                $@"UPDATE {StudentProgressDBSettings.ReflectionQueueTable}
                   SET Status = 'skipped'
                   WHERE StudentId = @StudentId
                     AND Status = 'pending'
                     AND Id NOT IN (
                         SELECT Id FROM {StudentProgressDBSettings.ReflectionQueueTable}
                         WHERE StudentId = @StudentId AND Status = 'pending'
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

            // Queue a reflection for this completed goal
            EnqueueReflection(conn, request.StudentId, "goal", request.GoalId, request.GoalLabel,
                request.TotalErrors, request.TotalHints, 0, request.ExerciseType);

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
                    request.Errors, request.Hints, 0, request.ExerciseType, request.Decisions);
            }

            return Ok();
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

        /// <summary>Returns up to 3 pending reflection items for the student.</summary>
        [HttpGet("reflection-queue/{studentId}")]
        public ActionResult<List<ReflectionQueueRecord>> GetReflectionQueue(long studentId)
        {
            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            var items = conn.Query<ReflectionQueueRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ReflectionQueueTable} " +
                "WHERE StudentId = @StudentId AND Status = 'pending' " +
                "ORDER BY Id DESC LIMIT 3",
                new { StudentId = studentId }).ToList();

            return Ok(items);
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

            var weakness = ComputeWeakness(conn, request.StudentId);
            Console.WriteLine($"[Reflection] Evaluate — student={request.StudentId}, itemId={request.QueueItemId}, label=\"{item.ItemLabel}\", type={item.ItemType}, method={item.Method}, errors={item.Errors}, hints={item.Hints}, pippin={item.PippinMessages}, Q={request.QuestionNumber}, mode={request.Mode}, answer=\"{request.Answer}\"");

            // Deterministic features of the student's own words, extracted once and used for two
            // purposes: the off-topic gate below (always) and the feedback prompt (only when the
            // AiFeatures:NlpInformedFeedback flag is on).
            var answerFeatures = string.IsNullOrWhiteSpace(request.Answer)
                ? null
                : NlpFeatureExtractor.Extract(request.Answer, request.Language);

            // Off-topic gate. Runs before the model so that an unrelated answer is never graded,
            // never praised and never earns XP — the student is asked to write it again instead.
            // Asking Pippin for a model answer is exempt: there is no student answer to judge.
            if (request.Mode != "pippin" && OffTopicDetector.IsOffTopic(request.Answer, answerFeatures))
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

            // Last 2 history turns for context (oldest → newest)
            var history = conn.Query<ReflectionHistoryRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ReflectionHistoryTable} " +
                "WHERE StudentId = @StudentId ORDER BY Id DESC LIMIT 2",
                new { StudentId = request.StudentId }).ToList();
            history.Reverse();
            var historyText = history.Count > 0
                ? string.Join("\n", history.Select(h => $"{h.Role}: {h.Text}"))
                : "(none)";

            var fallback = BuildReflectionFallback(request, item, weakness);
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

                var prompt = BuildReflectionPrompt(request, item, weakness, historyText, promptFeatures);

                var raw = await CallOpenAI(apiKey,
                    "You are Pippin, a warm encouraging study coach chatting with a student. Compare their reflection answer to their real performance, but keep it conversational and kind — like a friend checking in. Always output valid JSON with exactly these keys: feedback (string), aligned (boolean), insightXp (integer 0-3), nextStep (string, filled only for the final question otherwise empty).",
                    prompt);

                if (raw == null) return Ok(fallback);

                var jsonStart = raw.IndexOf('{');
                var jsonEnd = raw.LastIndexOf('}');
                if (jsonStart < 0 || jsonEnd <= jsonStart) return Ok(fallback);

                using var doc = JsonDocument.Parse(raw.Substring(jsonStart, jsonEnd - jsonStart + 1));
                var root = doc.RootElement;
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
                if (request.QuestionNumber == 3)
                {
                    aligned = false;
                    insightXp = 0;
                }

                Console.WriteLine($"[Reflection] AI result — aligned={aligned}, insightXp={insightXp}, feedback=\"{feedback}\", nextStep=\"{nextStep}\"");

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
                    "(StudentId, ItemType, ItemId, Role, Text, InsightXp, CreatedAt) " +
                    "VALUES (@StudentId, @ItemType, @ItemId, @Role, @Text, @InsightXp, @CreatedAt)",
                    new
                    {
                        StudentId = request.StudentId,
                        h.ItemType,
                        h.ItemId,
                        h.Role,
                        h.Text,
                        h.InsightXp,
                        CreatedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss")
                    });
            }

            return Ok();
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
            WeaknessResponse weakness,
            string historyText,
            NlpFeatures? features = null)
        {
            var signalBlock = features is null ? string.Empty : BuildSignalBlock(features);

            var questionLabel = request.QuestionNumber switch
            {
                1 => "Q1 - overall self-assessment",
                2 => "Q2 - method/decision reflection",
                _ => "Q3 - concrete next step"
            };
            var mode = request.Mode == "pippin" ? "Pippin told them (model answer requested)" : "They answered themselves";
            var weakest = weakness.Weakest;
            var weakestText = weakest != null
                ? $"{weakest.Label} (score {weakest.Score}/100, recommended exercise: {weakest.RecommendedExercise})"
                : "(not computed yet)";
            var langInstruction = request.Language switch
            {
                "de" => "You must respond ONLY in German.",
                "ja" => "You must respond ONLY in Japanese.",
                _ => "Respond in English."
            };

            return $@"Student completed: {item.ItemLabel} (item type: {item.ItemType}, method/exercise type: {item.Method}).
Actual performance on it: {item.Errors} errors, {item.Hints} hints, {item.PippinMessages} Pippin messages.
What they decided during it: {DescribeDecisions(item.Decisions)}.
Weakest area: {weakestText}.

Previous reflection turns (for context):
{historyText}

Current question: {questionLabel}
Mode: {mode}
Student answer: {(string.IsNullOrWhiteSpace(request.Answer) ? "(empty)" : request.Answer)}
{signalBlock}
Instructions:
{langInstruction}
TONE (very important): Be warm, brief and conversational — like a friend, not a report. NEVER say things like ""I saw on your performance..."", ""according to your data..."", or list their exact error/hint numbers back at them. If their self-assessment matches their performance, just celebrate it and stop there — do NOT add any suggestion or correction.
NO FOLLOW-UP QUESTIONS (very important): This reflection is ONE question and ONE answer. The student cannot reply again. Never ask them anything, never probe for more detail, never invite them to explain further, and never end your feedback with a question mark. Deliver your feedback as a complete statement and stop.
- If mode is 'Pippin told them': the student pressed ""Pippin, tell me"" instead of writing an answer, so there is no answer to judge. NEVER grade them, never say they answered correctly, and never praise their answer — there is nothing to praise, and doing so would be dishonest. Instead, use what actually happened on this exercise (the errors, hints and Pippin messages stated above) to give ONE concrete piece of guidance: what their pattern suggests about where they got stuck, and what specifically to try differently next time. Speak directly to the student as Pippin. Set aligned=false and insightXp=0 — requesting help never earns XP.
- If Q1 or Q2 and they answered themselves: judge ALIGNMENT by whether their answer honestly acknowledges their actual performance:
  * If they were SHOWN the answer — check ""what they decided"" above and look for them choosing to be shown instead of working it out — then a low error count is NOT evidence that it was easy. They did not solve it, they were handed it. So if they say it felt easy or they found it simple, they are NOT aligned (aligned=false, insightXp=0). Acknowledge that this was one where the solution was shown, warmly and without scolding, and keep it brief.
  * If errors+hints are 2 or more: they are ALIGNED whenever they mention making any mistakes/errors or difficulty (for example 'I made 2 errors' or 'it was a bit hard'). Even if they also say it felt 'fine' or 'good', mentioning the mistakes means they are ALIGNED → aligned=true, insightXp=3. Only mark NOT aligned if they clearly claim it was easy/perfect and mention no mistakes at all.
  * If errors+hints are 0 AND they were not shown the answer: they are ALIGNED if they say it felt easy/good/confident.
  * If they declined to explain their own reasoning (see ""what they decided""), treat a confident claim about how they reasoned with more caution, but do not punish it merely for that.
  * For Q2 (method/decision): they are ALIGNED if their answer is specific and thoughtful — names the method they chose and reflects on it (e.g. 'I chose substitution and it felt right') — even though you cannot verify the correct method → aligned=true, insightXp=3.
  If aligned → aligned=true, insightXp=3, with 1-2 warm celebrating sentences. If not → aligned=false, insightXp=0, and gently offer a warm observation instead (e.g. ""That's interesting — sometimes the tricky spots sneak up on us."") without quoting stats, without scolding, and without asking the student anything.
- If Q3: ignore alignment. Generate ONE concrete, friendly next step targeting the weakest area and put it in nextStep. Set aligned=false, insightXp=0.
- OFF-TOPIC: if the answer is clearly unrelated to maths and to this exercise (a random word, a different topic entirely, keyboard mashing), set offTopic=true, aligned=false, insightXp=0, and leave feedback empty — the app shows its own message asking the student to write the reflection again. Use this ONLY when the answer is genuinely unrelated: a short, vague, unsure or partly incoherent answer that is still about the exercise is a valid reflection and is NOT off-topic. When in doubt, do not flag it.

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

        /// <summary>
        /// Turns the stored decision summary into a phrase the tutor can reason about.
        ///
        /// The stored form is machine-shaped ("SolveOnOwn=Declined") precisely so it is cheap to
        /// write from the exercise. Saying "not recorded" rather than nothing matters: an exercise
        /// with no decision points is not the same as one where the student engaged, and an absent
        /// field would let the model read silence as a clean run.
        /// </summary>
        private static string DescribeDecisions(string decisions)
        {
            if (string.IsNullOrWhiteSpace(decisions)) return "not recorded for this exercise";

            var parts = new List<string>();

            foreach (var chunk in decisions.Split(';', StringSplitOptions.RemoveEmptyEntries))
            {
                var bits = chunk.Split('=');
                if (bits.Length != 2) continue;

                var what = bits[0] switch
                {
                    "SelfExplanation" => "explaining their own reasoning",
                    "MethodComparison" => "comparing two methods",
                    "SolveOnOwn" => "working the solution out themselves",
                    _ => bits[0]
                };

                parts.Add(bits[1] == "Declined"
                    ? $"chose to be shown instead of {what}"
                    : $"took up {what}");
            }

            return parts.Count == 0 ? "not recorded for this exercise" : string.Join("; ", parts);
        }

        private static ReflectionEvaluateResponse BuildReflectionFallback(
            ReflectionEvaluateRequest request,
            ReflectionQueueRecord item,
            WeaknessResponse weakness)
        {
            if (request.QuestionNumber == 3)
            {
                var weakest = weakness.Weakest;
                var rec = weakest?.RecommendedExercise ?? "Suitability";
                var label = weakest?.Label ?? "weak area";
                return new ReflectionEvaluateResponse
                {
                    Feedback = "Let's pick one concrete step to work on next!",
                    Aligned = false,
                    InsightXp = 0,
                    NextStep = $"Try 2 more {rec} exercises and watch your {label} improve."
                };
            }

            if (request.Mode == "pippin")
            {
                return new ReflectionEvaluateResponse
                {
                    Feedback = $"Here's what the data shows: {item.Errors} errors and {item.Hints} hints on this one. That's a useful signal for what to focus on next.",
                    Aligned = false,
                    InsightXp = 0,
                    NextStep = ""
                };
            }

            var answer = request.Answer?.ToLowerInvariant() ?? "";
            bool claimsStruggle = answer.Contains("hard") || answer.Contains("struggl") || answer.Contains("difficult")
                || answer.Contains("mistake") || answer.Contains("error") || answer.Contains("wrong") || answer.Contains("hint");
            bool claimsEasy = answer.Contains("easy") || answer.Contains("good") || answer.Contains("great")
                || answer.Contains("well") || answer.Contains("perfect") || answer.Contains("fine");

            // Help taken means a low error count is not evidence of anything: the help produced it. A
            // student who asked to be shown the answer and then said it felt easy has not read their
            // own performance accurately, and counting that as good self-assessment would reward
            // exactly the students who did the least of the work.
            bool tookHelp = item.Decisions.Contains("=Declined", StringComparison.Ordinal);
            bool lowErrors = (item.Errors + item.Hints) < 2;
            bool easyClaimIsBackedByEvidence = lowErrors && !tookHelp;

            bool aligned = (claimsStruggle && !lowErrors) || (claimsEasy && easyClaimIsBackedByEvidence);

            return new ReflectionEvaluateResponse
            {
                Feedback = aligned
                    ? "That matches what the data shows — great self-awareness!"
                    : "Interesting! The data tells a slightly different story — take a look and see what you notice.",
                Aligned = aligned,
                InsightXp = aligned ? 3 : 0,
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

        private async Task<string?> CallOpenAI(string apiKey, string systemPrompt, string userPrompt)
        {
            var payload = new Dictionary<string, object>
            {
                ["model"] = AiProvider.Model(_configuration),
                ["messages"] = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = userPrompt }
                },
                ["temperature"] = 0.3,
                ["max_tokens"] = 500
            };
            AiProvider.ApplyThinkingFlag(payload, _configuration);

            var json = JsonSerializer.Serialize(payload);
            var httpClient = _httpClientFactory.CreateClient();
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await httpClient.PostAsync(AiProvider.ChatCompletionsUrl(_configuration), content);

            // Log the failure rather than silently returning null. A null here is indistinguishable at
            // the call site from "the model had nothing to say", and that ambiguity is exactly what made
            // a provider swap look like an unreachable server: the request had succeeded with 200, but
            // an empty `content` (a reasoning model that ran out of budget while thinking) came back as
            // a null and every caller quietly used its fallback.
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                Console.WriteLine(
                    $"[AI] {(int)response.StatusCode} from {AiProvider.BaseUrl(_configuration)} " +
                    $"(model={AiProvider.Model(_configuration)}) — {errorBody[..Math.Min(300, errorBody.Length)]}");
                return null;
            }

            var responseBody = await response.Content.ReadAsStringAsync();
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
