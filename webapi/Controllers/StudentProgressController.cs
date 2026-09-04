using Dapper;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using webapi.Models.Database;
using webapi.Models.Student;

namespace webapi.Controllers
{
    [ApiController]
    [Route("student-progress")]
    public class StudentProgressController(IConfiguration configuration, IHttpClientFactory httpClientFactory) : ControllerBase
    {
        private readonly IConfiguration _configuration = configuration;
        private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;
        // ── Ensure tables exist ───────────────────────────────────────────────

        private static void EnsureTables(Microsoft.Data.Sqlite.SqliteConnection conn)
        {
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

            conn.Execute(
                $"CREATE TABLE IF NOT EXISTS {StudentProgressDBSettings.ReflectionHistoryTable} " +
                $"({StudentProgressDBSettings.ReflectionHistoryScheme})");
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
            string method)
        {
            conn.Execute(
                $"INSERT INTO {StudentProgressDBSettings.ReflectionQueueTable} " +
                "(StudentId, ItemType, ItemId, ItemLabel, Status, Errors, Hints, PippinMessages, Method, CompletedAt) " +
                "VALUES (@StudentId, @ItemType, @ItemId, @ItemLabel, 'pending', @Errors, @Hints, @PippinMessages, @Method, @CompletedAt)",
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

        // ── POST /student-progress/log-goal ──────────────────────────────────
        /// <summary>
        /// Logs a goal completion, appends XP, and returns the new total XP.
        /// </summary>
        [HttpPost("log-goal")]
        public ActionResult<int> LogGoal([FromBody] LogGoalRequest request)
        {
            if (request.StudentId <= 0 || string.IsNullOrWhiteSpace(request.GoalId))
                return BadRequest("Invalid request.");

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            // Insert goal completion log
            conn.Execute(
                $"INSERT INTO {StudentProgressDBSettings.GoalsTable} " +
                "(StudentId, GoalId, GoalLabel, XpEarned, ExerciseType, TotalErrors, TotalHints, PippinMessages, CompletedAt) " +
                "VALUES (@StudentId, @GoalId, @GoalLabel, @XpEarned, @ExerciseType, @TotalErrors, @TotalHints, @PippinMessages, @CompletedAt)",
                new
                {
                    request.StudentId,
                    request.GoalId,
                    request.GoalLabel,
                    request.XpEarned,
                    request.ExerciseType,
                    request.TotalErrors,
                    request.TotalHints,
                    request.PippinMessages,
                    CompletedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss")
                });

            // Upsert XP total
            conn.Execute(
                $"INSERT INTO {StudentProgressDBSettings.ProgressTable} (StudentId, TotalXP) VALUES (@StudentId, @Xp) " +
                "ON CONFLICT(StudentId) DO UPDATE SET TotalXP = TotalXP + @Xp",
                new { StudentId = request.StudentId, Xp = request.XpEarned });

            // Queue a reflection for this completed goal
            EnqueueReflection(conn, request.StudentId, "goal", request.GoalId, request.GoalLabel,
                request.TotalErrors, request.TotalHints, request.PippinMessages, request.ExerciseType);

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
                    request.Errors, request.Hints, 0, request.ExerciseType);
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
        /// Used by Anchor 5.1 End-Session Reflection.
        /// </summary>
        [HttpGet("analyze-session/{studentId}")]
        public async Task<ActionResult<SessionAnalysisResponse>> AnalyzeSession(long studentId)
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

            int soloPicks = agencyLog.Count(a => a.Source == "picked-solo");
            int pippinPicks = agencyLog.Count(a => a.Source == "picked-pippin");
            int choiceXpToday = agencyLog.Where(a => a.XpType == "choice").Sum(a => a.Amount);
            int insightXpToday = agencyLog.Where(a => a.XpType == "insight").Sum(a => a.Amount);
            int resolveXpToday = agencyLog.Where(a => a.XpType == "resolve").Sum(a => a.Amount);
            var exerciseTypes = todayExercises.GroupBy(e => e.ExerciseType).ToDictionary(g => g.Key, g => g.Count());

            var stats = new StringBuilder();
            stats.AppendLine($"Today's session ({today}):");
            stats.AppendLine($"- Exercises completed: {todayExercises.Count}");
            stats.AppendLine($"- Goals achieved: {todayGoals.Count}");
            if (todayGoals.Count > 0)
                stats.AppendLine($"- Goals: {string.Join(", ", todayGoals.Select(g => g.GoalLabel))}");
            stats.AppendLine($"- Solo vs Pippin: {soloPicks} solo / {pippinPicks} with AI");
            stats.AppendLine($"- Choice XP: {choiceXpToday}, Insight XP: {insightXpToday}, Resolve XP: {resolveXpToday}");
            stats.AppendLine($"- Exercise types: {string.Join(", ", exerciseTypes.Select(kv => $"{kv.Key}×{kv.Value}"))}");
            stats.AppendLine($"- Total streak: {progress?.StreakDays ?? 0} days");

            var apiKey = _configuration["OpenAI:ApiKey"];
            if (!string.IsNullOrWhiteSpace(apiKey))
            {
                try
                {
                    var prompt = $@"You are a supportive math tutor. Analyze this student's session and provide:

1. STRENGTHS: What did they do well today? Be specific and encouraging. (1-2 sentences)
2. IMPROVEMENT: What's one area they could grow? Frame it positively. (1 sentence)
3. ACTION STEPS: 2-3 concrete, actionable things they can try next session.

Rules:
- Use plain English, warm tone (like a coach, not a robot).
- Don't mention XP numbers directly — talk about what the XP represents (e.g. 'stuck with solo mode' instead of 'earned 15 resolve XP').
- If they used mostly Pippin, encourage trying solo next time — gently.
- If they did all solo, celebrate that independence!

Session data:
{stats}

Respond ONLY in this JSON:
{{""strengths"":""..."",""improvement"":""..."",""actionSteps"":[""step 1"",""step 2"",""step 3""]}}";

                    var raw = await CallOpenAI(apiKey,
                        "You are a supportive math coach. Analyze student sessions and give encouraging, actionable feedback. Always output valid JSON.",
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

            // Rule-based fallback
            var fallback = new SessionAnalysisResponse
            {
                Summary = $"Today you completed {todayExercises.Count} exercise(s) and achieved {todayGoals.Count} goal(s).",
                IsAiGenerated = false
            };

            if (soloPicks > pippinPicks)
                fallback.Strengths = "You showed great independence today by choosing to solve on your own! That takes courage and builds real skill.";
            else if (todayExercises.Count > 0)
                fallback.Strengths = "You showed up and put in the work today — consistency is the foundation of growth!";

            if (resolveXpToday > 0)
                fallback.ImprovementArea = "You're building follow-through muscle. Next time, try sticking with solo mode for the full session — you might surprise yourself!";
            else
                fallback.ImprovementArea = "Try setting a specific goal next session — having a target helps you stay focused and see your progress clearly.";

            fallback.ActionSteps = new List<string>
            {
                soloPicks <= pippinPicks ? "Try one exercise completely on your own — no hints, just you!" : "Keep up the solo streak — you're building real independence!",
                todayGoals.Count == 0 ? "Set at least one concrete goal before starting your next session." : "Review which goal challenged you most and try a similar one next time.",
                "Take 30 seconds after each exercise to think: 'What did I learn just now?'"
            };

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

            // Solo vs Pippin stats — approximate from agency log
            int soloCount = agencyLog.Count(a => a.Source == "solo-followed-through" || a.Source == "solo-partial-effort" || a.Source == "solo-quick-surrender");
            int pippinCount = agencyLog.Count(a => a.Source == "pippin-unused-help") + todayExercises.Count - soloCount;
            if (pippinCount < 0) pippinCount = 0;
            result.SoloCount = soloCount;
            result.PippinCount = pippinCount;

            // Solo avg errors/hints from goal completions
            var soloGoals = todayGoals.Where(g => g.PippinMessages == 0).ToList();
            result.SoloAvgErrors = soloGoals.Count > 0 ? Math.Round(soloGoals.Average(g => g.TotalErrors), 1) : 0;
            result.SoloAvgHints = soloGoals.Count > 0 ? Math.Round(soloGoals.Average(g => g.TotalHints), 1) : 0;

            var pippinGoals = todayGoals.Where(g => g.PippinMessages > 0).ToList();
            result.PippinAvgErrors = pippinGoals.Count > 0 ? Math.Round(pippinGoals.Average(g => g.TotalErrors), 1) : 0;
            result.PippinAvgHints = pippinGoals.Count > 0 ? Math.Round(pippinGoals.Average(g => g.TotalHints), 1) : 0;
        }

        // ── POST /student-progress/reflect-on-stats/{studentId} ──────────────
        /// <summary>
        /// Student writes a free-text reflection about their performance.
        /// Gemini compares it against their actual data and gives honest feedback.
        /// NO XP is awarded — this is purely informational feedback.
        /// For demo user "demo1", synthetic data is generated if no real data exists.
        /// </summary>
        [HttpPost("reflect-on-stats/{studentId}")]
        public async Task<ActionResult<ReflectOnStatsResponse>> ReflectOnStats(
            long studentId, [FromBody] ReflectOnStatsRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.StudentReflection))
                return BadRequest("Reflection text is required.");

            var apiKey = _configuration["OpenAI:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
                return Ok(new ReflectOnStatsResponse
                {
                    Feedback = "Self-reflection is a powerful habit! 💭 Right now I can't compare your thoughts to your stats, but take a look at your dashboard — do the numbers match how you feel about your weak areas?",
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

            // Build stats summary for Gemini
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

            var prompt = $@"You are a supportive study coach. A student has written a reflection about what they think their weak area is. Your job:

1. FIRST, AFFIRM the student. Always validate what they say — never bluntly correct or dismiss them. Even if the data doesn't perfectly match, find something to agree with. Start your feedback with acknowledgement.

2. THEN, gently compare their self-assessment to the actual stats below. If the data suggests additional weak areas, frame them as ""You might also want to keep an eye on..."" or ""One area you might not have noticed..."" — NEVER say ""You're wrong"" or ""Actually..."".

3. If the student's text is complete gibberish, off-topic, or totally unrelated to math/learning/this platform, respond warmly: ""Hmm, I didn't quite catch that! 😊 Could you tell me again — what do you think is your weakest area right now?"" and set category to ""no_xp"".

4. Keep feedback to 2-3 friendly sentences. Use emojis sparingly (max 1).

CATEGORY RULES (pick exactly one):
- 'goal' — text is about goals, missions, achievements (e.g. ""I want to finish Master Suitability"", ""my weak area is completing goals"")
- 'practice' — text is about doing exercises, practicing methods (e.g. ""I'm bad at elimination"", ""I struggle with matching exercises"", ""I need more practice with substitution"")
- 'both' — text mentions BOTH goal-related AND practice-related things
- 'no_xp' — gibberish, off-topic, not related to math/learning/motivation/this platform at all (use rarely)
- 'unclear' — learning-related but too vague to classify (last resort only)

STUDENT STATS:
{stats}

STUDENT REFLECTION:
{request.StudentReflection}

Respond ONLY in this JSON: {{""category"":""goal|practice|both|unclear|no_xp"",""feedback"":""2-3 sentences, affirmation first, gentle suggestion second""}}";

            try
            {
                var rawText = await CallOpenAI(apiKey,
                    "You are a supportive study coach. Always affirm the student's self-assessment first, then gently suggest additional areas from their stats. Never bluntly correct them. For gibberish/off-topic, warmly ask them to try again. Classify into: goal, practice, both, unclear, or no_xp. Always output valid JSON.",
                    prompt);

                if (rawText == null)
                {
                    return Ok(new ReflectOnStatsResponse
                    {
                        Feedback = "Hmm, I couldn't reach my thinking partner right now! 😅 But don't let that stop you — take a look at your dashboard stats and see if they match how you feel. Want to try again in a moment?",
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

                        return Ok(new ReflectOnStatsResponse { Feedback = feedback.Trim(), Category = category });
                    }
                }
                catch { /* fall through to raw text */ }

                return Ok(new ReflectOnStatsResponse { Feedback = rawText.Trim(), Category = "unclear" });
            }
            catch
            {
                return Ok(new ReflectOnStatsResponse
                {
                    Feedback = "I couldn't analyze your reflection right now. But keep at it — comparing your thoughts to your actual stats is a great way to grow!",
                    Category = CategoryDetector.DetectCategoryFromText(request.StudentReflection)
                });
            }
        }

        // ── POST /student-progress/suggest-goals/{studentId} ─────────────────
        /// <summary>
        /// Uses Gemini to suggest 3 goals from the predefined catalogue based on
        /// the student's performance data. Each suggestion includes a one-line reason.
        /// For demo user "demo1", synthetic data is generated if no real data exists.
        /// </summary>
        [HttpPost("suggest-goals/{studentId}")]
        public async Task<ActionResult<GoalPlanResponse>> SuggestGoals(long studentId)
        {
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
                    PlanNarrative = "I don't have enough data yet to make personalized suggestions. Complete a few exercises first — any type you like!"
                });
            }

            var typeCounts = exerciseLog
                .GroupBy(e => e.ExerciseType)
                .ToDictionary(g => g.Key, g => g.Count());

            // Try OpenAI first, fall back to rules if it fails
            var apiKey = _configuration["OpenAI:ApiKey"];
            if (!string.IsNullOrWhiteSpace(apiKey))
            {
                try
                {
                    var aiResult = await TryAISuggestions(apiKey, studentId, isDemo, progress, typeCounts);
                    if (aiResult != null)
                        return Ok(aiResult);
                }
                catch
                {
                    // AI failed — fall through to rule-based fallback
                }
            }

            // Rule-based fallback (always works, no AI needed)
            return Ok(GenerateFallbackPlan(progress, typeCounts));
        }

        // ── AI suggestion helper ───────────────────────────────────────────────

        private async Task<GoalPlanResponse?> TryAISuggestions(
            string apiKey, long studentId, bool isDemo,
            StudentProgressRecord progress, Dictionary<string, int> typeCounts)
        {
            var statsSummary = new StringBuilder();
            statsSummary.AppendLine($"Student ID: {studentId}" + (isDemo ? " (demo user)" : ""));
            statsSummary.AppendLine($"Exercises completed: {progress.ExercisesCompleted}");
            statsSummary.AppendLine($"Streak: {progress.StreakDays} days");
            statsSummary.AppendLine($"Agency XP — Choice: {progress.ChoiceXP}, Insight: {progress.InsightXP}, Resolve: {progress.ResolveXP}");
            statsSummary.AppendLine("Exercise breakdown:");
            foreach (var kv in typeCounts)
                statsSummary.AppendLine($"  - {kv.Key}: {kv.Value} exercises");
            if (typeCounts.Count == 0)
                statsSummary.AppendLine("  (No exercises completed yet)");

            // ── Compute weak area for personalized suggestions ──────────
            int total = typeCounts.Values.Sum();
            int suit = typeCounts.GetValueOrDefault("Suitability", 0);
            int eff = typeCounts.GetValueOrDefault("Efficiency", 0);
            int match = typeCounts.GetValueOrDefault("Matching", 0);

            // Fetch average errors/hints/pippin from goal completions
            double avgErrors = 0, avgHints = 0, avgPippin = 0;
            if (total > 0)
            {
                using var conn2 = DBSettings.GetSQLiteConnectionForStudentsDB();
                conn2.Open();
                var goalStats = conn2.QueryFirstOrDefault<GoalCompletionStats>(
                    $"SELECT COUNT(*) AS TotalGoalCompletions, " +
                    $"COALESCE(AVG(TotalErrors), 0) AS AvgErrors, " +
                    $"COALESCE(AVG(TotalHints), 0) AS AvgHints, " +
                    $"COALESCE(AVG(PippinMessages), 0) AS AvgPippin " +
                    $"FROM {StudentProgressDBSettings.GoalsTable} " +
                    "WHERE StudentId = @StudentId", new { StudentId = studentId });
                avgErrors = goalStats?.AvgErrors ?? 0;
                avgHints = goalStats?.AvgHints ?? 0;
                avgPippin = goalStats?.AvgPippin ?? 0;
            }

            int decisionScore = total > 0 ? (int)Math.Round((double)suit / total * 100) : 0;
            int efficiencyScore = total > 0 ? (int)Math.Round((double)eff / total * 100) : 0;
            int methodScore = total > 0 ? (int)Math.Round((double)match / total * 100) : 0;
            int compScore = total > 0 ? Math.Max(0, 100 - (int)Math.Round(avgErrors * 20)) : 50;
            int indepScore = total > 0 ? Math.Max(0, 100 - (int)Math.Round((avgHints + avgPippin) * 33)) : 50;
            int consistencyScore = Math.Min(100, (int)Math.Round((double)(progress.StreakDays) / 7 * 100));

            // Find weakest area (simple approach: lowest-scoring dimension)
            string weakestArea;
            int weakestScore;
            if (decisionScore <= efficiencyScore && decisionScore <= methodScore && decisionScore <= compScore && decisionScore <= indepScore && decisionScore <= consistencyScore)
                { weakestArea = "Decision Accuracy"; weakestScore = decisionScore; }
            else if (efficiencyScore <= methodScore && efficiencyScore <= compScore && efficiencyScore <= indepScore && efficiencyScore <= consistencyScore)
                { weakestArea = "Efficiency Judgment"; weakestScore = efficiencyScore; }
            else if (methodScore <= compScore && methodScore <= indepScore && methodScore <= consistencyScore)
                { weakestArea = "Method Recognition"; weakestScore = methodScore; }
            else if (compScore <= indepScore && compScore <= consistencyScore)
                { weakestArea = "Computational Skill"; weakestScore = compScore; }
            else if (indepScore <= consistencyScore)
                { weakestArea = "Independence"; weakestScore = indepScore; }
            else
                { weakestArea = "Consistency"; weakestScore = consistencyScore; }

            statsSummary.AppendLine();
            statsSummary.AppendLine($"AREA TO IMPROVE: {weakestArea} (score: {weakestScore}/100).");
            statsSummary.AppendLine("IMPORTANT: At least 1 of your 3 suggestions should help the student improve in this area.");

            var goalCatalogue = @"
AVAILABLE GOALS (you MUST only suggest from this list, using the exact IDs):

TIER 1 — First Steps (EASY):
  - try-suitability (Try a Suitability Exercise): Complete 1 Suitability exercise — decide which method fits best.
  - try-efficiency (Try an Efficiency Exercise): Complete 1 Efficiency exercise — choose the fastest method.
  - try-matching (Try a Matching Exercise): Complete 1 Matching exercise — pair equations to methods.
  - choose-solo-once (Go Solo Once): Complete 1 exercise choosing ""Solve on my own"" without unlocking Pippin.

TIER 2 — Growing Independence (MEDIUM):
  - hint-free-run (Hint-Free Run): Complete an exercise using 0 hints and 0 Pippin messages.
  - no-ai-day (Pippin-Free Day): Complete 2 exercises today without using Pippin at all.
  - method-explorer (Method Explorer): Use all 3 solving methods (Substitution, Elimination, Equalization) in one session.
  - three-day-streak (3-Day Practice Streak): Complete at least one exercise on 3 consecutive days.

TIER 3 — Decision Mastery (HARD):
  - master-suitability (Master Suitability): Correctly identify the best method in 3 Suitability exercises.
  - master-efficiency (Master Efficiency): Identify the most efficient method and explain why in 3 Efficiency exercises.
  - master-matching (Master Matching): Correctly match 3 equation systems to their optimal methods.
  - perfect-solo-session (Perfect Solo Session): Complete 3 consecutive solo exercises with 0 errors and 0 hints.
  - accuracy-sharp (Sharp Shooter): Maintain over 80% accuracy across 5 consecutive exercises.

TIER 4 — Self-Directed Growth (HARD):
  - set-and-complete-plan (Plan Fulfilled): Set 3+ goals and complete ALL of them within the same week.
  - face-your-weakness (Face Your Weakness): Identify your weakest exercise type, then complete 3 exercises of that type.
  - seven-day-streak (7-Day Practice Streak): Complete at least one exercise on 7 consecutive days.
  - reflect-and-improve (Reflect & Improve): Write a reflection after a session, then complete an exercise applying what you learned.
  - independence-champion (Independence Champion): Complete 10 exercises total in solo mode without ever unlocking Pippin.
";

            var prompt = $@"You are a helpful study planner. Create a coherent mini-plan of 3 goals for this student.

Student data:
{statsSummary}

{goalCatalogue}

RULES:
1. First, write a SHORT plan title (max 6 words) that captures the theme — e.g. ""Build Your Elimination Confidence"" or ""Strengthen Your Independence"".
2. Write a 2-sentence plan narrative explaining WHY these 3 goals work together for this student. Mention their weakest area and reference specific stats (e.g. streak days, accuracy, method counts).
3. Suggest EXACTLY 3 goals using the EXACT IDs above.
4. At least 1 goal MUST target the student's ""Area to Improve"".
5. For EACH goal, write a specific, data-aware reason (max 20 words). Be concrete — reference the student's actual numbers (e.g. ""You've done 0 Matching exercises — start here to build method awareness"" or ""Your 2-day streak is close to the 3-day goal — keep going!""). Never use generic phrases like ""great area to grow"" without data backing.
6. Respond ONLY in this JSON format:
{{""planTitle"":""short title"",""planNarrative"":""2-sentence narrative"",""goals"":[{{""id"":""goal-id"",""reason"":""reason text""}},{{""id"":""goal-id"",""reason"":""reason text""}},{{""id"":""goal-id"",""reason"":""reason text""}}]}}";

            var text = await CallOpenAI(apiKey,
                "You are a study planner. Only suggest goals from the provided catalogue. Always output valid JSON with planTitle, planNarrative, and goals array.",
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

            var validIds = new HashSet<string>
            { "try-suitability", "try-efficiency", "try-matching", "choose-solo-once",
              "hint-free-run", "no-ai-day", "method-explorer", "three-day-streak",
              "master-suitability", "master-efficiency", "master-matching", "perfect-solo-session", "accuracy-sharp",
              "set-and-complete-plan", "face-your-weakness", "seven-day-streak", "reflect-and-improve", "independence-champion" };

            plan.Goals = plan.Goals.Where(s => validIds.Contains(s.Id ?? "")).Take(3).ToList();
            return plan.Goals.Count > 0 ? plan : null;
        }

        // ── Fallback suggestion generator (rule-based, no AI) ──────────────────

        private static GoalPlanResponse GenerateFallbackPlan(
            StudentProgressRecord progress,
            Dictionary<string, int> typeCounts)
        {
            var suggestions = new List<GoalSuggestion>();

            // ── Detect weakest area (simple heuristic) ────────────────────
            int total = typeCounts.Values.Sum();
            int suit = typeCounts.GetValueOrDefault("Suitability", 0);
            int eff = typeCounts.GetValueOrDefault("Efficiency", 0);
            int match = typeCounts.GetValueOrDefault("Matching", 0);

            // Lowest exercise-type count = weakest among the three
            string weakestType;
            int minCount;
            if (total == 0) { weakestType = "Suitability"; minCount = 0; }
            else if (suit <= eff && suit <= match) { weakestType = "Suitability"; minCount = suit; }
            else if (eff <= suit && eff <= match) { weakestType = "Efficiency"; minCount = eff; }
            else { weakestType = "Matching"; minCount = match; }

            // Map weakest type → goal IDs that target it
            var weaknessGoalMap = new Dictionary<string, string[]>
            {
                ["Suitability"] = new[] { "try-suitability", "master-suitability" },
                ["Efficiency"] = new[] { "try-efficiency", "master-efficiency" },
                ["Matching"] = new[] { "try-matching", "master-matching" },
            };
            var weaknessGoals = weaknessGoalMap.GetValueOrDefault(weakestType, new[] { "try-suitability" });

            // Always include at least one weakness-targeting goal
            string weaknessGoal = total > 5 ? weaknessGoals.Last() : weaknessGoals.First();

            // If very new (≤2 exercises), suggest Tier 1 goals
            if (progress.ExercisesCompleted <= 2)
            {
                suggestions.Add(new GoalSuggestion { Id = weaknessGoal, Reason = $"You've only tried {total} exercise(s) so far — a {weakestType} one is a great next step!" });
                suggestions.Add(new GoalSuggestion { Id = "try-efficiency", Reason = "Learn to pick the fastest method — a key skill for harder problems." });
                suggestions.Add(new GoalSuggestion { Id = "three-day-streak", Reason = $"Start a daily habit — you're at {progress.StreakDays} day(s), just a few more!" });
                // Prevent duplicates
                suggestions = suggestions.GroupBy(s => s.Id).Select(g => g.First()).Take(3).ToList();
                return new GoalPlanResponse
                {
                    PlanTitle = "Get Started Strong",
                    PlanNarrative = $"You're just beginning with {progress.ExercisesCompleted} exercise(s) completed! Start with a {weakestType} exercise to explore different methods, then build consistency with a daily streak.",
                    Goals = suggestions
                };
            }

            // Intermediate (3-5 exercises): suggest Tier 2 goals + weakness
            if (progress.ExercisesCompleted <= 5)
            {
                suggestions.Add(new GoalSuggestion { Id = weaknessGoal, Reason = $"You've done {total} total exercises but only {minCount} {weakestType} — time to balance your skills!" });
                suggestions.Add(new GoalSuggestion { Id = "hint-free-run", Reason = "Challenge yourself to solve without hints — you might surprise yourself!" });
                suggestions.Add(new GoalSuggestion { Id = "no-ai-day", Reason = "Try a full session without Pippin — 2 exercises on your own builds real confidence." });

                if (progress.StreakDays >= 2)
                    suggestions.Add(new GoalSuggestion { Id = "three-day-streak", Reason = $"You're at {progress.StreakDays} days — just {3 - progress.StreakDays} more to hit the 3-day streak!" });
                else
                    suggestions.Add(new GoalSuggestion { Id = "method-explorer", Reason = "Use all 3 methods (Substitution, Elimination, Equalization) — become versatile." });

                suggestions = suggestions.GroupBy(s => s.Id).Select(g => g.First()).Take(3).ToList();
                return new GoalPlanResponse
                {
                    PlanTitle = "Build Your Independence",
                    PlanNarrative = $"You've completed {progress.ExercisesCompleted} exercises — building momentum! Your {weakestType} skills (only {minCount} attempts) need attention. Pair that with a hint-free or Pippin-free challenge to grow both math and independence.",
                    Goals = suggestions
                };
            }

            // Advanced (6+ exercises): suggest Tier 3/4 goals + weakness
            suggestions.Add(new GoalSuggestion { Id = weaknessGoal, Reason = $"You've done {total} exercises but {weakestType} is your least-practiced area ({minCount} attempts) — let's change that!" });

            if (progress.StreakDays >= 3)
                suggestions.Add(new GoalSuggestion { Id = "seven-day-streak", Reason = $"You're at {progress.StreakDays} straight days — push for the full 7-day streak!" });
            else
                suggestions.Add(new GoalSuggestion { Id = "three-day-streak", Reason = $"Rebuild your momentum — you're at {progress.StreakDays} day(s), aim for 3!" });

            suggestions.Add(new GoalSuggestion { Id = "face-your-weakness", Reason = $"Check your dashboard stats — your {weakestType} area needs 3 focused exercises." });

            if (progress.ResolveXP >= 50)
                suggestions.Add(new GoalSuggestion { Id = "independence-champion", Reason = $"You've earned {progress.ResolveXP} Resolve XP — shoot for 10 solo exercises to become an Independence Champion!" });
            else if (progress.ChoiceXP >= 30)
                suggestions.Add(new GoalSuggestion { Id = "set-and-complete-plan", Reason = $"With {progress.ChoiceXP} Choice XP, you're ready to plan your own week — set 3 goals and crush them." });

            // Ensure variety
            if (suggestions.Count < 3)
            {
                suggestions.Add(new GoalSuggestion { Id = "accuracy-sharp", Reason = $"Level up your precision — maintain 80%+ accuracy across your next 5 exercises." });
                suggestions.Add(new GoalSuggestion { Id = "perfect-solo-session", Reason = "Challenge yourself: 3 solo exercises in a row with zero mistakes and zero hints." });
            }

            suggestions = suggestions.GroupBy(s => s.Id).Select(g => g.First()).Take(3).ToList();
            return new GoalPlanResponse
            {
                PlanTitle = "Level Up Your Skills",
                PlanNarrative = $"You've completed {progress.ExercisesCompleted} exercises — great work! Now it's time to target your {weakestType} weak spot while pushing toward mastery-level goals. Consistency + challenge = growth.",
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
                var prompt = BuildReflectionPrompt(request, item, weakness, historyText);

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

                Console.WriteLine($"[Reflection] AI result — aligned={aligned}, insightXp={insightXp}, feedback=\"{feedback}\", nextStep=\"{nextStep}\"");

                return Ok(new ReflectionEvaluateResponse
                {
                    Feedback = string.IsNullOrWhiteSpace(feedback) ? fallback.Feedback : feedback.Trim(),
                    Aligned = aligned,
                    InsightXp = insightXp,
                    NextStep = nextStep.Trim()
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
            string historyText)
        {
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
Weakest area: {weakestText}.

Previous reflection turns (for context):
{historyText}

Current question: {questionLabel}
Mode: {mode}
Student answer: {(string.IsNullOrWhiteSpace(request.Answer) ? "(empty)" : request.Answer)}

Instructions:
{langInstruction}
TONE (very important): Be warm, brief and conversational — like a friend, not a report. NEVER say things like ""I saw on your performance..."", ""according to your data..."", or list their exact error/hint numbers back at them. If their self-assessment matches their performance, just celebrate it and stop there — do NOT add any suggestion or correction.
- If mode is 'Pippin told them': write a short friendly model answer AS Pippin, in your own words (no numbers), set aligned=false and insightXp=0.
- If Q1 or Q2 and they answered themselves: judge ALIGNMENT by whether their answer honestly acknowledges their actual performance:
  * If errors+hints are 2 or more: they are ALIGNED whenever they mention making any mistakes/errors or difficulty (for example 'I made 2 errors' or 'it was a bit hard'). Even if they also say it felt 'fine' or 'good', mentioning the mistakes means they are ALIGNED → aligned=true, insightXp=3. Only mark NOT aligned if they clearly claim it was easy/perfect and mention no mistakes at all.
  * If errors+hints are 0: they are ALIGNED if they say it felt easy/good/confident.
  * For Q2 (method/decision): they are ALIGNED if their answer is specific and thoughtful — names the method they chose and reflects on it (e.g. 'I chose substitution and it felt right') — even though you cannot verify the correct method → aligned=true, insightXp=3.
  If aligned → aligned=true, insightXp=3, with 1-2 warm celebrating sentences. If not → aligned=false, insightXp=0, and gently wonder with them (e.g. ""It felt easy to you? That's interesting — sometimes the tricky spots sneak up on us."") without quoting stats or scolding.
- If Q3: ignore alignment. Generate ONE concrete, friendly next step targeting the weakest area and put it in nextStep. Set aligned=false, insightXp=0.
- If the answer is gibberish/off-topic: warmly ask them to try again. aligned=false, insightXp=0.

IMPORTANT: always include the ""aligned"" and ""insightXp"" keys with their exact boolean/integer values — never omit them and never quote the numbers as strings.

Respond ONLY in this JSON: {{""feedback"":""..."",""aligned"":true|false,""insightXp"":0-3,""nextStep"":""...""}}";
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
            bool actuallyStruggled = (item.Errors + item.Hints) >= 2;
            bool aligned = (claimsStruggle && actuallyStruggled) || (claimsEasy && !actuallyStruggled);

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
            var payload = new
            {
                model = "gpt-4o-mini",
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = userPrompt }
                },
                temperature = 0.3,
                max_tokens = 500
            };

            var json = JsonSerializer.Serialize(payload);
            var httpClient = _httpClientFactory.CreateClient();
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await httpClient.PostAsync("https://api.openai.com/v1/chat/completions", content);

            if (!response.IsSuccessStatusCode) return null;

            var responseBody = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseBody);
            return doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();
        }

        /// <summary>AI goal suggestion response item.</summary>
        public class GoalSuggestion
        {
            public string Id { get; set; } = "";
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
