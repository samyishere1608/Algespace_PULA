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

            // One row per section already offered, so the upsert below is idempotent.
            conn.Execute(
                $"CREATE TABLE IF NOT EXISTS {StudentProgressDBSettings.TourStateTable} " +
                $"({StudentProgressDBSettings.TourStateScheme})");
            conn.Execute(
                $"CREATE UNIQUE INDEX IF NOT EXISTS IX_{StudentProgressDBSettings.TourStateTable}_StudentSection " +
                $"ON {StudentProgressDBSettings.TourStateTable} (StudentId, Section)");

            // The agency log's idempotency key and its element, in a column rather than glued into the
            // source string. See AwardCommitmentChoice: the row id used to be appended to the source,
            // which is what made one of these categories 25 categories.
            try { conn.Execute($"ALTER TABLE {StudentProgressDBSettings.AgencyLogTable} ADD COLUMN RefId TEXT NOT NULL DEFAULT ''"); } catch { }
            conn.Execute(
                $"CREATE UNIQUE INDEX IF NOT EXISTS IX_{StudentProgressDBSettings.AgencyLogTable}_CommitGuard " +
                $"ON {StudentProgressDBSettings.AgencyLogTable} (StudentId, XpType, RefId) " +
                $"WHERE RefId <> '' AND Source = '{LogAgencySource.ReflectionCommit}'");

            // The timeline and the sessions it is grouped into.
            StudentEventLog.EnsureTables(conn);

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
        /// Queues a completed goal/exercise for reflection. Only ever ONE pending item per student: a
        /// second one would stack, and a reflection the student said no to would come straight back.
        /// </summary>
        internal static void EnqueueReflection(
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
            // AN EXERCISE IS ONLY EVER ASKED ABOUT ONCE.
            //
            // The completion call can arrive twice (a retry, a double log, the tab reloaded on the results
            // screen), and each one used to add another row — so the student was asked about the same
            // attempt again after they had answered it, or after they had declined it. Every status
            // counts here, which is what makes a "no" final: the row still exists, marked skipped, and no
            // later call can put that same exercise back in front of them.
            if (attemptId > 0 && conn.ExecuteScalar<int>(
                    $"SELECT COUNT(1) FROM {StudentProgressDBSettings.ReflectionQueueTable} " +
                    "WHERE StudentId = @StudentId AND ItemType = @ItemType AND AttemptId = @AttemptId",
                    new { StudentId = studentId, ItemType = itemType, AttemptId = attemptId }) > 0)
                return;

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

            // A reflection was put in front of the student. Whether they then answered it or skipped it
            // is the next two events, so "did they reflect" is three rows rather than an inference.
            StudentEventLog.Write(conn, studentId, LogEventType.ReflectionAsked, attemptId: attemptId,
                refId: itemId, value: itemType,
                data: new { label = itemLabel, errors, hints, method, focus });

            // ONE PENDING, NOT THREE.
            //
            // This kept the latest three and skipped the rest, which meant a student who finished three
            // exercises before looking could be shown three reflections one after another — each answer
            // opening the next, which reads as the app refusing to take no for an answer. One is the whole
            // point: they reflect on the work they just did, once.
            //
            // Session reflections are left out of both halves of this. They are not queued by the work the
            // student does, they are opened from the end-of-session dialog, and letting them into the
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
                         ORDER BY Id DESC LIMIT 1
                     )",
                new { StudentId = studentId });
        }

        // ── GET /student-progress/leaderboard/{studentId} ─────────────────────
        /// <summary>
        /// The class as a ranked list, by the XP a student can see in their own header.
        ///
        /// WHICH XP. Choice + Insight + Resolve, not `TotalXP`. The header shows those three wallets and
        /// the level is derived from their sum, so a board built on any other number could tell a student
        /// they are 40th while their own screen says they have 300 XP and everyone above them has none.
        /// The database column `TotalXP` is goal XP, which is never displayed anywhere.
        ///
        /// WHO IS ON IT. Only students who have earned something. A class on its first morning is 120
        /// students on zero, and listing the first ten of those alphabetically would look like a result.
        /// The asking student is returned separately, ranked or not, so the tab can always show where they
        /// stand — including "not on the board yet".
        ///
        /// The class is read in one query and ranked in memory: 120 rows is not worth a window function,
        /// and doing it here keeps the tie rule (equal XP shares a rank) visible in one place.
        /// </summary>
        [HttpGet("leaderboard/{studentId}")]
        public ActionResult<LeaderboardResponse> GetLeaderboard(long studentId, [FromQuery] int take = 10)
        {
            if (studentId <= 0) return BadRequest("Invalid request.");

            take = Math.Clamp(take, 1, 50);

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            // LEFT JOIN, so a student with no progress row at all is still a row on this list — at zero,
            // and therefore not on the board, but present to be found as "me".
            var standings = conn.Query<LeaderboardRow>(
                $"SELECT s.Id AS StudentId, s.Username AS Username, " +
                $"       COALESCE(p.ChoiceXP, 0) + COALESCE(p.InsightXP, 0) + COALESCE(p.ResolveXP, 0) AS Xp " +
                $"FROM {StudentDBSettings.TableName} s " +
                $"LEFT JOIN {StudentProgressDBSettings.ProgressTable} p ON p.StudentId = s.Id " +
                "ORDER BY Xp DESC, s.Username COLLATE NOCASE ASC")
                .ToList();

            // Ties share a rank; the next distinct score jumps to its own position in the list.
            var previousXp = int.MinValue;
            for (var index = 0; index < standings.Count; index++)
            {
                var row = standings[index];
                row.Rank = row.Xp == previousXp ? standings[index - 1].Rank : index + 1;
                previousXp = row.Xp;
            }

            foreach (var row in standings.Where(row => row.Xp == 0))
            {
                row.Rank = 0;
            }

            var ranked = standings.Where(row => row.Xp > 0).ToList();

            return Ok(new LeaderboardResponse
            {
                Top = ranked.Take(take).ToList(),
                Me = standings.FirstOrDefault(row => row.StudentId == studentId),
                RankedCount = ranked.Count,
            });
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

            // Exercises finished today, for the stat card's sub-line.
            var exercisesToday = conn.ExecuteScalar<int>(
                $"SELECT COUNT(*) FROM {StudentProgressDBSettings.ExerciseCompletionsTable} " +
                "WHERE StudentId = @StudentId " +
                "  AND date(CompletedAt) = date('now')",
                new { StudentId = studentId });

            return Ok(new StudentProgressResponse
            {
                TotalXP = progress?.TotalXP ?? 0,
                ExercisesCompleted = progress?.ExercisesCompleted ?? 0,
                ExercisesToday = exercisesToday,
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

            // Read the weakness profile BEFORE opening the connection below. It opens one of its own,
            // and a reader and a writer open at the same time is the lock contention this project has
            // already had to fix once.
            var aimsAtWeakness = request.Origin == "student"
                && AimsAtWeakness(request.StudentId, request.Category);

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

            // The goal itself, not just the XP for setting it. This is the row that survives the goal
            // being deleted, which is what makes "what did this student set out to do" answerable at all.
            StudentEventLog.Write(conn, request.StudentId, LogEventType.GoalSet, refId: request.Id,
                value: request.Category,
                data: new
                {
                    focus = request.Focus ?? "",
                    metric = string.IsNullOrWhiteSpace(request.Metric) ? "exercises" : request.Metric,
                    target = request.Target,
                    quality = request.Quality ?? "",
                    maxPerExercise = request.MaxPerExercise,
                });

            // Insight when a student aims a goal at something they currently avoid.
            //
            // The counterpart of the Choice award, in a different currency on purpose: Choice is for
            // deciding at all, Insight is for deciding to face the thing they have been steering
            // around. A goal taken from a suggestion pays neither, and for the same reason —
            // accepting the system's proposal is not the student noticing anything.
            //
            // It used to live on the client, where it paid on every save of the plan. Here the goal id
            // is the idempotency key and the day is the bound.
            if (aimsAtWeakness)
                AwardInsightForTargetedWeakness(conn, request.StudentId, request.Category, request.Id);

            return Ok(ReadActiveGoals(conn, request.StudentId));
        }

        /// <summary>Insight for aiming a goal at a weakness the profile still reports.</summary>
        private const int InsightForTargetedWeaknessXp = 8;

        /// <summary>
        /// The most goals this can pay for in one day.
        ///
        /// A student setting goals for more than one weakness in a sitting is doing the thing being
        /// rewarded and should be paid for each. Beyond three it stops being that and becomes a
        /// student adding goals to collect, which is the same ceiling the award had when it lived on
        /// the client — where a plan save paid 8 per goal, up to 24.
        /// </summary>
        private const int MaxTargetedWeaknessGoalsPerDay = 3;

        /// <summary>
        /// Whether a goal category aims at a weakness this student currently has.
        ///
        /// "A weakness" means one of the tracked avoidance dimensions — the same five the nudge and
        /// the Insight-for-facing-a-gap award read — so those three agree on what a weakness is.
        /// Hints and errors is deliberately NOT one of them. It is a measurement rather than a
        /// decision, so a goal about it is not a goal about something the student has been avoiding.
        /// </summary>
        private bool AimsAtWeakness(long studentId, string category) =>
            _anchors.GetProfile(studentId).Gaps
                .Any(gap => GoalCatalogue.CategoryForElement(gap.Element) == category);

        /// <summary>
        /// Pays the Insight for a goal that aims at a weakness, and writes the ledger row that makes
        /// the award auditable and idempotent.
        ///
        /// TWO BOUNDS, because the act is a click. The goal id stops the same goal being paid twice
        /// when a student re-saves it — which the client-side version it replaces did not, so a goal
        /// could be saved repeatedly for the same eight points. The daily ceiling stops goals being
        /// added and removed in a loop.
        /// </summary>
        private static void AwardInsightForTargetedWeakness(
            Microsoft.Data.Sqlite.SqliteConnection conn, long studentId, string category, string goalId)
        {
            var alreadyForThisGoal = conn.ExecuteScalar<int>(
                $"SELECT COUNT(1) FROM {StudentProgressDBSettings.AgencyLogTable} " +
                "WHERE StudentId = @StudentId AND Source = @Source AND RefId = @RefId",
                new { StudentId = studentId, Source = LogAgencySource.TargetedWeakArea, RefId = goalId });

            if (alreadyForThisGoal > 0) return;

            var alreadyToday = conn.ExecuteScalar<int>(
                $"SELECT COUNT(1) FROM {StudentProgressDBSettings.AgencyLogTable} " +
                "WHERE StudentId = @StudentId AND Source = @Source AND date(LoggedAt) = date('now')",
                new { StudentId = studentId, Source = LogAgencySource.TargetedWeakArea });

            if (alreadyToday >= MaxTargetedWeaknessGoalsPerDay) return;

            conn.Execute(
                $"INSERT INTO {StudentProgressDBSettings.AgencyLogTable} (StudentId, XpType, Amount, Source, RefId, LoggedAt) " +
                "VALUES (@StudentId, 'insight', @Amount, @Source, @RefId, @Now)",
                new
                {
                    StudentId = studentId,
                    Amount = InsightForTargetedWeaknessXp,
                    Source = LogAgencySource.TargetedWeakArea,
                    RefId = goalId,
                    Now = LogStamp.Now()
                });

            conn.Execute(
                $"UPDATE {StudentProgressDBSettings.ProgressTable} " +
                "SET InsightXP = InsightXP + @Amount, LifetimeAgencyXP = LifetimeAgencyXP + @Amount " +
                "WHERE StudentId = @StudentId",
                new { StudentId = studentId, Amount = InsightForTargetedWeaknessXp });

            StudentEventLog.Write(conn, studentId, LogEventType.XpAwarded, refId: goalId,
                value: "insight", amount: InsightForTargetedWeaknessXp,
                data: new { source = LogAgencySource.TargetedWeakArea, category });

            Console.WriteLine($"[Goals] Insight +{InsightForTargetedWeaknessXp} for aiming a {category} goal at a weakness");
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

            // Read them BEFORE deleting. Until now a removed goal simply vanished, which meant the
            // research-relevant behaviour - choosing something and then dropping it - left no trace
            // anywhere. One event per goal, so a goal removed after real work is distinguishable from
            // one removed a minute after it was set.
            var removed = conn.Query<ActiveGoalRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ActiveGoalsTable} " +
                "WHERE StudentId = @StudentId AND Id IN @Ids",
                new { request.StudentId, Ids = request.GoalIds }).ToList();

            conn.Execute(
                $"DELETE FROM {StudentProgressDBSettings.ActiveGoalsTable} " +
                "WHERE StudentId = @StudentId AND Id IN @Ids",
                new { request.StudentId, Ids = request.GoalIds });

            foreach (var goal in removed)
                StudentEventLog.Write(conn, request.StudentId, LogEventType.GoalDeleted, refId: goal.Id,
                    value: goal.Category,
                    data: new
                    {
                        target = goal.Target,
                        focus = goal.Focus,
                        metric = goal.Metric,
                        quality = goal.Quality,
                        maxPerExercise = goal.MaxPerExercise,
                        setAt = goal.CreatedAt,
                    });

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

            StudentEventLog.Write(conn, request.StudentId, LogEventType.GoalCompleted, refId: request.GoalId,
                value: request.ExerciseType, amount: request.XpEarned,
                data: new { label = request.GoalLabel, focus = request.Focus, errors = request.TotalErrors, hints = request.TotalHints, xpEarned = request.XpEarned });

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
        /// Writes the Insight an answer earned, in the same request that decided it.
        ///
        /// IDEMPOTENT ON THE QUESTION, not on the request. The queue item and the question id together name
        /// one answer, and a student gives each question exactly one — so a retried evaluate call for the
        /// same question finds the row and pays nothing. The commitment award next door keys on the queue
        /// item alone, which is right for it because a commitment is one per reflection; this one needs the
        /// question as well, because a reflection has three of them and each can be worth something.
        ///
        /// The ledger row is the award. Nothing else records that this answer was paid, which is what makes
        /// the log the authority rather than a copy of something.
        /// </summary>
        private static void AwardReflectionInsight(
            Microsoft.Data.Sqlite.SqliteConnection conn, long studentId, long queueItemId, string questionId, int amount)
        {
            var refId = $"{queueItemId}:{questionId}";

            var already = conn.ExecuteScalar<int>(
                $"SELECT COUNT(1) FROM {StudentProgressDBSettings.AgencyLogTable} " +
                "WHERE StudentId = @StudentId AND Source = @Source AND RefId = @RefId",
                new { StudentId = studentId, Source = LogAgencySource.ReflectionAligned, RefId = refId });

            if (already > 0) return;

            conn.Execute(
                $"INSERT INTO {StudentProgressDBSettings.AgencyLogTable} (StudentId, XpType, Amount, Source, RefId, LoggedAt) " +
                "VALUES (@StudentId, 'insight', @Amount, @Source, @RefId, @Now)",
                new
                {
                    StudentId = studentId,
                    Amount = amount,
                    Source = LogAgencySource.ReflectionAligned,
                    RefId = refId,
                    Now = LogStamp.Now()
                });

            conn.Execute(
                $"UPDATE {StudentProgressDBSettings.ProgressTable} " +
                "SET InsightXP = InsightXP + @Amount, LifetimeAgencyXP = LifetimeAgencyXP + @Amount " +
                "WHERE StudentId = @StudentId",
                new { StudentId = studentId, Amount = amount });

            StudentEventLog.Write(conn, studentId, LogEventType.XpAwarded, refId: questionId,
                value: "insight", amount: amount,
                data: new { source = LogAgencySource.ReflectionAligned, queueItemId });
        }

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
            // The queue item id is the idempotency key, and it lives in its own column with a unique
            // index behind it. It used to be pasted onto the end of the source string, which stopped
            // the double payment correctly but made the source ungroupable - it was 25 of the 45
            // distinct sources in the log. Moving it here keeps the guard and fixes the category.
            var already = conn.ExecuteScalar<int>(
                $"SELECT COUNT(*) FROM {StudentProgressDBSettings.AgencyLogTable} " +
                "WHERE StudentId = @StudentId AND XpType = 'choice' AND RefId = @RefId AND Source = @Source",
                new { StudentId = studentId, RefId = queueItemId.ToString(), Source = LogAgencySource.ReflectionCommit });

            if (already > 0) return;

            conn.Execute(
                $"INSERT INTO {StudentProgressDBSettings.AgencyLogTable} (StudentId, XpType, Amount, Source, RefId, LoggedAt) " +
                "VALUES (@StudentId, 'choice', @Amount, @Source, @RefId, @Now)",
                new
                {
                    StudentId = studentId,
                    Amount = CommitmentChoiceXp,
                    Source = LogAgencySource.ReflectionCommit,
                    RefId = queueItemId.ToString(),
                    Now = LogStamp.Now()
                });

            conn.Execute(
                $"UPDATE {StudentProgressDBSettings.ProgressTable} " +
                "SET ChoiceXP = ChoiceXP + @Amount, LifetimeAgencyXP = LifetimeAgencyXP + @Amount " +
                "WHERE StudentId = @StudentId",
                new { StudentId = studentId, Amount = CommitmentChoiceXp });

            StudentEventLog.Write(conn, studentId, LogEventType.XpAwarded, refId: queueItemId.ToString(),
                value: "choice", amount: CommitmentChoiceXp,
                data: new { source = LogAgencySource.ReflectionCommit });

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

            StudentEventLog.Write(conn, request.StudentId, LogEventType.XpAwarded,
                value: request.XpType, amount: request.Amount,
                data: new { source = request.Source ?? "" });

            return Ok(newValue);
        }

        // ── Sessions ─────────────────────────────────────────────────────────
        //
        // A sitting starts when the student opens the dashboard and ends when they press End Session.
        // The client asks once per browser sitting and the server resumes rather than replacing, so
        // coming back from an exercise - which remounts the dashboard - does not split the sitting.

        /// <summary>Opens the sitting, or returns the one already open.</summary>
        [HttpPost("session/start")]
        public ActionResult<StartSessionResponse> StartSession([FromBody] StartSessionRequest request)
        {
            if (request.StudentId <= 0) return BadRequest("Invalid student.");

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            return Ok(StudentEventLog.StartSession(conn, request.StudentId, request.Language));
        }

        /// <summary>
        /// Closes the sitting and records what it was made of, including the exercises opened in it that
        /// were never finished.
        /// </summary>
        [HttpPost("session/end")]
        public ActionResult<EndSessionResponse> EndSession([FromBody] StartSessionRequest request)
        {
            if (request.StudentId <= 0) return BadRequest("Invalid student.");

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            return Ok(StudentEventLog.EndSession(conn, request.StudentId, string.IsNullOrWhiteSpace(request.Reason) ? "end-session-button" : request.Reason));
        }

        /// <summary>
        /// Records the plan the student chose for today.
        ///
        /// The check-in only ever lived in the browser, so the decision - which is the point of asking -
        /// was invisible to any analysis. We could see that a plan had been made (an XP row) but never
        /// what it was.
        /// </summary>
        [HttpPost("session/intention")]
        public ActionResult SetIntention([FromBody] SetIntentionRequest request)
        {
            if (request.StudentId <= 0) return BadRequest("Invalid student.");
            if (request.Plan != "practice" && request.Plan != "goal" && request.Plan != "review")
                return BadRequest("Plan must be 'practice', 'goal' or 'review'.");

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            StudentEventLog.Write(conn, request.StudentId, LogEventType.IntentionSet, value: request.Plan,
                data: new { followUp = request.FollowUp }, language: request.Language);

            return Ok();
        }

        private const string InsightGapAwardTable = AnchorStoreSettings.InsightAwardTable;

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
        /// THE RULE, the same one the nudge follows (both read the profile's gap):
        ///   1. The element is a gap over the whole record before this exercise (at least three
        ///      opportunities, at most a fifth engaged).
        ///   2. And it is not in its GRACE PERIOD: once it has been paid, the next three opportunities are
        ///      not counted as a deficit however large the history still is. After those three it can be
        ///      paid, and nudged about, again.
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
            var opportunities = new List<(long Id, bool Engaged)>();
            foreach (var id in attemptIds)
            {
                var answers = Answers(id, names, records).ToList();
                if (answers.Count == 0) continue;

                opportunities.Add((id, AnchorDimension.Engaged(answers)));
            }

            var isGap = opportunities.Count >= GapThresholds.MinOpportunities
                && (double)opportunities.Count(o => o.Engaged) / opportunities.Count <= GapThresholds.MaxEngagementRate;

            var inGrace = lastAwardedAttempt > 0
                && opportunities.Count(o => o.Id > lastAwardedAttempt) < GapThresholds.GraceOpportunities;

            if (!isGap || inGrace) return Ok(new InsightGapAwardResponse());

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

        // ── GET /student-progress/tour-state/{studentId} ─────────────────────
        /// <summary>
        /// Which tutorial sections this student has already been offered.
        ///
        /// The client keeps its own copy so the first paint never waits on the network, and asks this
        /// to reconcile — a student who changed device has the sections here and nowhere local.
        /// </summary>
        [HttpGet("tour-state/{studentId}")]
        public ActionResult<TourStateResponse> GetTourState(long studentId)
        {
            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            var sections = conn.Query<string>(
                $"SELECT Section FROM {StudentProgressDBSettings.TourStateTable} WHERE StudentId = @StudentId",
                new { StudentId = studentId }).ToList();

            return Ok(new TourStateResponse { Sections = sections });
        }

        // ── POST /student-progress/tour-state ────────────────────────────────
        /// <summary>
        /// Records that a section has been OFFERED — whether the student then watched it or said
        /// "not now". That is what makes the offer a one-off; the section itself stays replayable from
        /// its own button, which does not need to write anything.
        ///
        /// Idempotent on (StudentId, Section), so a double tap cannot produce a second row.
        /// </summary>
        [HttpPost("tour-state")]
        public ActionResult RecordTourSection([FromBody] TourSectionRequest request)
        {
            if (request.StudentId <= 0 || string.IsNullOrWhiteSpace(request.Section))
                return BadRequest("Invalid request.");

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            conn.Execute(
                $"INSERT INTO {StudentProgressDBSettings.TourStateTable} (StudentId, Section, OfferedAt) " +
                "VALUES (@StudentId, @Section, @OfferedAt) " +
                "ON CONFLICT(StudentId, Section) DO NOTHING",
                new
                {
                    request.StudentId,
                    request.Section,
                    OfferedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss")
                });

            return Ok();
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

            // Demo data, for the demonstration accounts only.
            //
            // This used to key on `studentId == 1`, which is a property of insertion order rather than of
            // the account: after a database reset the ids start again at 1, so whichever student was
            // created first would be handed invented exercise numbers in their end-of-session analysis,
            // and a study would record them as real. The name is the thing the demo accounts actually
            // have in common.
            var isDemoAccount = conn.ExecuteScalar<int>(
                $"SELECT COUNT(1) FROM {StudentDBSettings.TableName} WHERE Id = @Id AND Username LIKE 'userdemo%'",
                new { Id = studentId }) > 0;

            if (isDemoAccount && todayExercises.Count == 0)
            {
                todayExercises = GenerateDemoData().Where(e => e.CompletedAt?.CompareTo(today) >= 0).ToList();
                if (progress == null)
                    progress = new StudentProgressRecord { StudentId = studentId, ExercisesCompleted = 3, StreakDays = 2, ChoiceXP = 10, InsightXP = 15, ResolveXP = 20 };
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

        /// <summary>Returns the one pending reflection item for the student, with its questions.</summary>
        [HttpGet("reflection-queue/{studentId}")]
        public ActionResult<List<ReflectionQueueItemResponse>> GetReflectionQueue(long studentId)
        {
            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            // THE session reflection is deliberately absent. This list is what the dashboard badges and
            // what its prompt bubble offers, and that prompt is about work the student has just finished;
            // the session reflection is opened from the end-of-session dialog, on purpose and at the end
            // of the session. Warning about it in the middle of one would be asking them to summarise a
            // day that is not over.
            //
            // ONE, not three. EnqueueReflection already retires anything older, so this is a second guard
            // rather than the rule itself — but it is the guard that decides what the student is shown, and
            // showing a list is what let one refusal open the next reflection behind it.
            var items = conn.Query<ReflectionQueueRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ReflectionQueueTable} " +
                "WHERE StudentId = @StudentId AND Status = 'pending' AND ItemType <> 'session' " +
                "ORDER BY Id DESC LIMIT 1",
                new { StudentId = studentId }).ToList();

            return Ok(items.Select(item => ToQueueResponse(conn, item)).ToList());
        }

        /// <summary>
        /// The counts a goal's questions are built from, as one compact line.
        ///
        /// Worked out when the goal completes, because the set it describes is "the completed exercises
        /// since the goal was set" and that window closes the moment the goal is claimed.
        ///
        /// THE CAP OF FIVE IS NOT THE WINDOW THE GOAL USED. The goal counts every exercise that matched
        /// it, with no limit at all; the reflection takes the five most recent so it stays readable, since
        /// the plate draws a row per exercise and the questions compare runs rather than aggregate them.
        /// On a minutes goal that difference is the rule rather than the exception — a thirty-minute goal
        /// runs to however many exercises it takes — so the full count travels with the window in
        /// <see cref="ReflectionGoalWindow.TotalExercises"/> and the panel says "your last 5 of 9"
        /// instead of leaving the student to notice the missing four.
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

            // Everything the goal counted, which the five above may be only the end of. Asked with the
            // same filters, so the two numbers describe the same set.
            var counted = conn.ExecuteScalar<int>(
                $"SELECT COUNT(*) FROM {AnchorStoreSettings.Table} " +
                "WHERE StudentId = @StudentId AND CompletedAt <> '' " +
                (string.IsNullOrWhiteSpace(since) ? "" : "AND CompletedAt >= @Since ") +
                narrowing,
                windowArgs);

            var ids = attempts.Select(attempt => attempt.Id).ToList();
            var records = conn.Query<DecisionRecordRow>(
                $"SELECT AttemptId, Name, Choice FROM {AnchorStoreSettings.RecordTable} WHERE AttemptId IN @Ids",
                new { Ids = ids }).ToList();

            // Which methods each exercise allowed, so "was their choice a good one" can be answered. Read
            // from the exercises database, which is a different file from the attempts.
            var allowed = AllowedMethodsByExercise(attempts);

            var window = new ReflectionGoalWindow { Quality = quality ?? "", Limit = limit, TotalExercises = counted };

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
                Own = SolvedOnOwn(attempt.Id, records),
                Explained = Engaged(attempt.Id, AnchorDimension.SelfExplanation, records),
                Compared = Engaged(attempt.Id, AnchorDimension.MethodComparison, records),
                // "Shown" covers both ways the answer was handed to them: they turned the offer down, or
                // they took it and were then shown the solution.
                WasShown = Declined(attempt.Id, AnchorDimension.SolveOnOwn, records)
                           || ShownSolution(attempt.Id, records),
                Correct = allowed.TryGetValue((type, attempt.ExerciseId), out var ok) && ok.Contains(method),
            };
        }

        private static bool Engaged(long attemptId, string[] names, List<DecisionRecordRow> records) =>
            AnchorDimension.Engaged(Answers(attemptId, names, records));

        /// <summary>
        /// The method name a goal is narrowed by, from the reflection's own label key.
        ///
        /// The bank holds "flexibility:equalization-method" because that is the client's wording for it,
        /// while a goal records the method as "Equalization". Both spellings exist for good reasons —
        /// one is copy, the other is stored data — so the translation between them lives here, in one
        /// place, rather than at each use.
        /// </summary>
        private static string MethodFocusFromLabelKey(string focusLabelKey) =>
            focusLabelKey.Length == 0
                ? ""
                : GoalCatalogue.Methods.FirstOrDefault(
                    method => focusLabelKey.Contains(method, StringComparison.OrdinalIgnoreCase)) ?? "";

        /// <summary>
        /// Whether the solution was actually worked out, as opposed to being handed over or shown.
        ///
        /// This is the reader to use wherever the question is "did they do the calculation" — the goal,
        /// the reflection's own fact, and the promise they made at the end of a session. Plain
        /// engagement is not enough: saying yes and then pressing "Show solution" is a help taken, and
        /// nothing else on the row records it.
        /// </summary>
        private static bool SolvedOnOwn(long attemptId, List<DecisionRecordRow> records) =>
            AnchorDimension.SolvedOnOwn(
                records
                    .Where(record => record.AttemptId == attemptId
                                     && (AnchorDimension.SolveOnOwn.Contains(record.Name, StringComparer.Ordinal)
                                         || AnchorDimension.SolutionShown.Contains(record.Name, StringComparer.Ordinal)))
                    .Select(record => (record.Name, record.Choice)));

        /// <summary>Whether the solution was shown to them at a point they had opted in at.</summary>
        private static bool ShownSolution(long attemptId, List<DecisionRecordRow> records) =>
            Answers(attemptId, AnchorDimension.SolutionShown, records)
                .Any(choice => choice.StartsWith("Yes", StringComparison.OrdinalIgnoreCase));

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
                    // How many the goal counted in all, which the window above may be the tail of.
                    evidence.CountedExercises = window.TotalExercises;
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
                // A goal's window now carries the runs it was made of, so the steps are read from those.
                // The previous behaviour — "the newest N completed attempts" — is an assumption that the
                // window happens to be the most recent work, which is false as soon as the student does
                // anything else before answering, and plainly wrong for a narrowed goal: that fallback has
                // no method filter, so a goal about Elimination could be graded on a Substitution run.
                // Windows stored before the ids were kept have none, and keep the old fallback for now so
                // their answers are judged exactly as they would have been.
                var windowAttempts = isGoal ? ParseGoalWindow(item.Evidence)?.AttemptIds ?? [] : [];

                attemptIds = item.AttemptId > 0
                    ? [item.AttemptId]
                    : windowAttempts.Count > 0
                        ? windowAttempts
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

                // A PART CANNOT TAKE LONGER THAN THE WHOLE ATTEMPT.
                //
                // The first phase timer used to be able to read a start time of zero, and getTime(0) is
                // not "no time" but seconds since the tab was opened — so one part of a run that lasted
                // 17 seconds is stored as 8 minutes. That is a tracking bug and it is fixed, but the rows
                // it already wrote are still there, and the reflection is where they surface: the panel
                // showed "choosing the method 8m 12s" beside "your usual 12s", and the question about
                // being quicker than usual was answered against the sum.
                //
                // The attempt's own total comes from a different clock and is trustworthy, so a part larger
                // than the whole run gets whatever the plausible parts leave of it. Nothing is invented
                // and nothing is silently dropped: the parts still add up to the attempt.
                var singleAttempt = !isGoal && !isSession && attemptIds.Count == 1;
                if (singleAttempt)
                {
                    var attemptTotal = conn.ExecuteScalar<double?>(
                        $"SELECT TotalTime FROM {AnchorStoreSettings.Table} WHERE Id = @Id",
                        new { Id = attemptIds[0] }) ?? 0;

                    if (attemptTotal > 0 && evidence.Steps.Sum(step => step.Time) > attemptTotal + 1)
                    {
                        var plausible = evidence.Steps.Where(step => step.Time <= attemptTotal).Sum(step => step.Time);
                        foreach (var step in evidence.Steps.Where(step => step.Time > attemptTotal))
                            step.Time = Math.Max(0, attemptTotal - plausible);
                    }
                }

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

            // How long this student usually takes on this kind of exercise, for the "I was in a hurry"
            // chip. On a single exercise that claim has nothing else to stand on: the only times on the
            // panel are the steps being explained, so without this the chip would be the one thing the
            // student could not check before choosing it.
            //
            // The last few attempts of the SAME exercise type, because a Matching run is not a fair
            // baseline for a Suitability one. A goal needs none of it - its own exercises sit side by
            // side on the panel - and a session has no single type to compare with.
            if (!isGoal && !isSession && item.AttemptId > 0)
            {
                var priorIds = conn.Query<long>(
                    $"SELECT Id FROM {AnchorStoreSettings.Table} " +
                    "WHERE StudentId = @StudentId AND CompletedAt <> '' AND Id <> @Id " +
                    $"AND ExerciseType = (SELECT ExerciseType FROM {AnchorStoreSettings.Table} WHERE Id = @Id) " +
                    "ORDER BY Id DESC LIMIT 5",
                    new { StudentId = item.StudentId, Id = item.AttemptId }).ToList();

                evidence.UsualSeconds = conn.ExecuteScalar<double?>(
                    $"SELECT AVG(TotalTime) FROM {AnchorStoreSettings.Table} WHERE Id IN @Ids",
                    new { Ids = priorIds }) ?? 0;

                // The same comparison, one step at a time. "I made fewer mistakes than usual" is about
                // the part they picked, not the run, so it needs what that part usually costs them - and
                // the parts are summed per attempt first, so one attempt with two rows for a step is one
                // attempt and not two.
                if (priorIds.Count > 0)
                {
                    var priorRows = conn.Query<StepRow>(
                        $"SELECT AttemptId, Name, Time, Errors, Hints FROM {AnchorStoreSettings.RecordTable} WHERE AttemptId IN @Ids",
                        new { Ids = priorIds });

                    evidence.UsualSteps =
                    [
                        .. priorRows
                            .Select(row => (row.AttemptId, Step: ReflectionQuestionBank.StepIdFor(row.Name), row))
                            .Where(pair => pair.Step.Length > 0)
                            .GroupBy(pair => (pair.AttemptId, pair.Step))
                            .Select(group => new
                            {
                                group.Key.Step,
                                Errors = group.Sum(pair => pair.row.Errors),
                                Hints = group.Sum(pair => pair.row.Hints),
                                Time = group.Sum(pair => pair.row.Time),
                            })
                            .GroupBy(step => step.Step)
                            .Select(group => new ReflectionStepStat
                            {
                                Id = group.Key,
                                LabelKey = ReflectionQuestionBank.StepLabelKey(group.Key),
                                // Rounded up: a part that usually costs half a mistake still counts as one,
                                // so "fewer mistakes than usual" means none rather than never being true.
                                Errors = (int)Math.Ceiling(group.Average(step => step.Errors)),
                                Hints = (int)Math.Ceiling(group.Average(step => step.Hints)),
                                Time = group.Average(step => step.Time),
                            }),
                    ];
                }
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
                    evidence.SelectedMethod = attempt.SelectedMethod;

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
            /// <summary>Set only by the queries that read several attempts at once, for the usual steps.</summary>
            public long AttemptId { get; set; }
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
            {
                // The queue item was deleted between the question being asked and the answer arriving
                // (the goal was removed, or the session ended). Nothing could be judged, but the
                // student did answer, so the attempt is still worth a line in the timeline rather than
                // vanishing silently.
                StudentEventLog.Write(conn, request.StudentId, LogEventType.ReflectionVerdict,
                    refId: request.QuestionId, value: "item-unavailable",
                    data: new { writer = "none", queueItemId = request.QueueItemId });
                return Ok(new ReflectionEvaluateResponse
                {
                    Feedback = "That reflection item is no longer available.",
                    Aligned = false,
                    InsightXp = 0,
                    NextStep = ""
                });
            }

            Console.WriteLine($"[Reflection] Evaluate — student={request.StudentId}, itemId={request.QueueItemId}, label=\"{item.ItemLabel}\", type={item.ItemType}, method={item.Method}, errors={item.Errors}, hints={item.Hints}, pippin={item.PippinMessages}, Q={request.QuestionNumber}, mode={request.Mode}, choice=\"{request.Choice}\"");

            // THERE IS NO FREE TEXT ANY MORE, AND FOUR CHECKPOINTS WENT WITH IT.
            //
            // A typed answer used to arrive here to be judged: an off-topic gate before the model, a
            // feature extraction feeding it, a second narrow call to decide whether the claim matched the
            // record, and a "write it again" loop when either said no. Every question the bank builds
            // always ships chips, so a chip is now the only way to answer and the record settles every
            // verdict on its own. What is left is one call to the model, to write the reply.

            // NOTHING ABOUT THE STUDENT BEYOND THIS QUESTION'S OWN FACTS reaches the model. It used to be
            // handed the last two reflection turns (from whichever item was answered last), the student's
            // weakest area across everything, and the item's raw error and hint totals — all of which are
            // about something other than the question on screen, and all of which turned up in replies.

            // ── The record decides ────────────────────────────────────────────
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

            // THE PLAN FOLLOWS THE REASON. "Why did that happen?" decides what "what next?" should say,
            // and the question list was sent long before this answer existed - so the tailored version
            // travels back with the verdict and replaces the one the queue carried.
            var planQuestion = questions.FirstOrDefault(candidate => candidate.Id == ReflectionSimpleQuestions.Next);
            var tailoredPlan = planQuestion is null
                ? null
                : ReflectionSimpleQuestions.RetargetPlan(planQuestion, evidence, request.Choice ?? "");
            if (tailoredPlan is not null)
                tailoredPlan.Panel = BuildPanel(conn, evidence, tailoredPlan, item);

            var questionLine = ReflectionQuestionBank.DescribeForPrompt(asked, request.SubjectTerms);

            // What the student answered, as one event: the chip, and the words they read on it.
            //
            // The label travels with it because the chip id alone ("band-most", "act-solo-myself") is a
            // key into the app's copy, and an analysis a year from now has no way to know what words the
            // student actually saw. The id stays the machine-readable answer; the label is what makes it
            // readable without the app.
            StudentEventLog.Write(conn, request.StudentId, LogEventType.ReflectionAnswered, attemptId: item.AttemptId,
                refId: asked.Id,
                value: request.Choice,
                data: new
                {
                    label = request.ChoiceLabel,
                    mode = request.Mode,
                    questionNumber = request.QuestionNumber,
                    itemType = item.ItemType,
                    itemId = item.ItemId,
                    questionKind = asked.Kind,
                    // Which queue row this answered. Without it a goal reflection (whose AttemptId is 0) can
                    // only be matched to its item by session and timestamp, so two reflections on the same
                    // goal type in one sitting look identical.
                    queueItemId = item.Id,
                },
                language: request.Language);

            // What the record says they actually did, in plain words, for the prompt.
            //
            // The question's OWN fact when it carries one: the simple questions each describe the one
            // thing they ask about ("choosing the method took you 3 s with no mistakes and no hints"), and
            // the wider account of the attempt is what the model used to reach for when the question was
            // about a part - a reply about choosing the method that talked about being shown the solution
            // came from exactly this. `DescribeRecord` remains for the questions that have no fact of
            // their own.
            var recordLine = string.IsNullOrWhiteSpace(asked.RecordFact)
                ? ReflectionQuestionBank.DescribeRecord(evidence, asked)
                : asked.RecordFact;

            // Built after the record is read, because the offline reply is not a generic one any more: it
            // says what the record says about the question the student was actually looking at, which is
            // what the help button asks for and what a chip answer needs to be answered with.
            var fallback = BuildReflectionFallback(request, item, evidence, asked);

            // THE RECORD SETTLES THE VERDICT; THE MODEL WRITES THE REPLY.
            //
            // These used to return the record's own sentence and never call the model at all, because a
            // model reply can disagree with the dashboard and that is the one thing a reflection must
            // never do. But it also made every reply read like a form: the same three sentences, in the
            // same order, whoever the student was. The verdict stays fixed here — the award is decided
            // from the chip and nothing the model says can change it — and the prompt carries only this
            // question's fact, which the reply guard checks against. What comes back is prose with a
            // voice; if it strays from the fact it is replaced by `fallback`, which is the record's own
            // sentence and is always safe.

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
            //
            // The branch for "no chip was tapped, so judge what they wrote" is gone with the text box. Every
            // answer now arrives as a chip the record has already graded, so the model is only ever told
            // which way it went, never asked to decide.
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
                : verdict.Status == "partial"
                    ? $"They chose an option, and what the lines above describe cannot single out one right answer for this question, so what they chose is a fair reading and is not marked either way: aligned=false, and the award number to return is {verdict.InsightXp}. Copy this exactly. Reply by saying what the facts above show about their choice, using only the figures stated there. Never say it was the most common, the only one, or true of all the exercises unless the facts say so."
                : asked.Id == "goal-q1-went-well" && verdict.InsightXp == 0
                    ? "They chose an option, and what the lines above describe does not back it as something that happened across this goal: aligned=false, and the award number to return is 0. Copy this exactly. THE REPLY HAS TWO BEATS. First, say back what they picked, in their terms and without judging it, so they can see that the answer they gave was read. Second, say plainly what the facts above DO show went well in this goal, using only what they state. A reply that gives only the second beat reads as a non-sequitur: they never claimed it, so they cannot tell why you are saying it. Do not assert that their option happened, and do not say that it did not — it is their reading of the goal and the facts name a different one. Never frame the difference as a fault: no 'but you', no 'wrong', no 'actually', no 'in reality', no 'you didn't', no 'you missed' and no 'the record shows'. Use no stronger word than the facts do (nothing like perfectly, always, every, first try or on your own unless the facts say so)."
                : verdict.InsightXp > 0
                    ? $"They chose an option and it is CONFIRMED by the lines above: aligned=true, and the award number to return is {verdict.InsightXp}. Copy this exactly. The reply must read as a clear confirmation: one short clause that says it is what happened (in different words from theirs), then the sentence on why it matters. Do not hedge, do not call it interesting, and NEVER sound doubtful about it — the reply is confirming something that is right, and a reply that hedges while the badge shows a positive number is the one thing they will notice."
                    : "They chose an option and it does NOT match what happened: " +
                      "aligned=false, and the award number to return is 0. Copy this exactly. " +
                      "THE REPLY HAS THREE BEATS AND THE FIRST TWO ARE BOTH REQUIRED. First, in one short " +
                      "clause, say back the reason they gave, in their own terms and without judging it, so " +
                      "they can see the answer they gave was read. Second, state what the facts line says " +
                      "about this question, in one plain warm sentence about their work, using the figures " +
                      "it gives and no others. Third, one sentence on why that thing matters. " +
                      "WRITE THOSE BEATS IN YOUR OWN WORDS, EVERY TIME. This used to be illustrated with a " +
                      "ready-made sentence, and the model reproduced it almost word for word for every " +
                      "answer - so a student who said three different things over three questions read the " +
                      "same reply three times and the reflection felt like a form. Do not reuse any wording " +
                      "from these instructions, and do not reuse the shape you gave the last reply: two " +
                      "students who said completely different things must not read the same sentences. " +
                      "THE FIRST BEAT IS NOT OPTIONAL AND ITS ABSENCE IS THE FAULT THIS RULE EXISTS FOR. " +
                      "Without it the reply is a bare fact about something the student never claimed, which " +
                      "reads as a non-sequitur and leaves the difference invisible - a student who says " +
                      "'I compared them myself' and is told only about not comparing has no way to know " +
                      "that sentence was a reply to what they said. " +
                      "Do not agree with their version and do not invent a reason why it was right. Never " +
                      "frame the difference as a fault: no 'but you', no 'wrong', no 'actually', no 'in " +
                      "reality', no 'to be honest', no 'you didn't', no 'you missed', no 'you forgot' and " +
                      "never 'the record shows', 'the facts show' or 'the data says' — a reply that narrates " +
                      "what something established is a report about the student, and the " +
                      "reply is a sentence about their work. " +
                      "It is a difference in what happened, not a mark " +
                      "against them, and the third beat is what makes that land.";

            Console.WriteLine($"[Reflection] Question {asked.Id} ({asked.Kind}) — choice=\"{request.Choice}\"{(string.IsNullOrWhiteSpace(request.ChoiceLabel) ? "" : $" (\"{request.ChoiceLabel}\")")} => {verdict.Status} ({verdict.InsightXp} XP)");

            // A commitment pays a little Choice, straight away.
            //
            // Choosing what to do next IS the skill Choice is for, so it is worth something the moment
            // they commit, whether or not the next exercise bears it out. Following through is a
            // different thing and pays Resolve later, from the exercise itself. Paying nothing until the
            // promise is kept would punish a student whose next exercise simply did not offer the moment
            // they had picked.
            if (asked.Kind == ReflectionQuestionBank.NextAction && !string.IsNullOrWhiteSpace(request.Choice))
                AwardCommitmentChoice(conn, request.StudentId, request.QueueItemId);

            // INSIGHT IS PAID HERE TOO, IN THE SAME REQUEST THAT DECIDES IT.
            //
            // It used to be paid by the client: this endpoint answered with the amount, the browser added
            // it to the student's running total, and then posted it back on a best-effort call that
            // swallowed its own failure. So an answer judged and worth three points could be shown to the
            // student and never recorded — and an audit of the real database found precisely that, six of
            // one student's sixteen aligned answers in a single day with no award behind them. The window
            // is whenever the server cannot be reached, which in a classroom is not a rare event.
            //
            // The award is not a second opinion here. `verdict` is the record's own decision, taken a few
            // lines above from the chip and the evidence, so writing it down where it is made is what
            // removes the failure rather than making it less likely.
            if (verdict.InsightXp > 0)
                AwardReflectionInsight(conn, request.StudentId, request.QueueItemId, asked.Id, verdict.InsightXp);

            // The record's verdict IS the verdict — there is no second opinion to reconcile with.
            //
            // The offline reply was built before the record was read, and its own wording used to be a
            // keyword guess at the free text. That guess is gone, so these two lines are not an override
            // any more: they are the only place the badge is set, and the sentence beside it is written
            // from the same record line, so the two cannot disagree. This is the path a student sees
            // whenever the AI provider is unavailable, which is often, so it is not a rare branch.
            fallback.Aligned = verdict.Status == "aligned";
            fallback.InsightXp = verdict.InsightXp;

            // ...EXCEPT WHEN THE STUDENT ASKED FOR GUIDANCE, WHERE THE SENTENCE IS BUILT DIFFERENTLY.
            //
            // The badge still comes from the record either way, but the wording does not: a help reply
            // is not a verdict on an answer, so it must not be phrased as one. This used to overwrite
            // the help button's own reply with a verdict sentence, which is why the help path could come
            // back sounding like a report on a choice the student never made — their help reply was
            // built, and then thrown away one line later.
            if (request.Mode != "pippin")
                fallback.Feedback = VerdictFeedback(
                    asked, verdict, request.ChoiceLabel,
                    ReflectionQuestionBank.DescribeRecordToStudent(evidence, asked, request.Choice ?? ""));

            Console.WriteLine($"[Reflection] Fallback ready — errors={item.Errors}, hints={item.Hints} (fallback: aligned={fallback.Aligned}, insight={fallback.InsightXp})");

            // EVERY WAY OUT OF THIS METHOD RECORDS A VERDICT.
            //
            // There are six exits - the provider unreachable, the reply guard rejecting twice, a model
            // reply that could not be read - and the first version of this wrote the verdict on only two
            // of them. The result was a timeline where some answers had no judgement recorded at all,
            // which is worse than no column, because it reads as "this answer was never judged" rather
            // than "we failed to note it". Writer is which text the student actually read: the model's,
            // or the offline reply built from the record.
            ReflectionEvaluateResponse Finish(
                ReflectionEvaluateResponse response, string writer, int guardRejections = 0, string outcome = "")
            {
                // THE LOCK OPENS HERE, ON EVERY WAY OUT.
                //
                // The facts this question withheld are the facts it was graded on, and the answer is now
                // in — so the panel travels back with the verdict rather than having been sent with the
                // question. Putting it on the exit that runs on all six paths, rather than on the happy
                // one, means a reply the guard rejected still opens the record: the student answered, and
                // what they answered about is theirs to see regardless of how the writing went.
                response.Panel = BuildOpenPanel(conn, evidence, item);

                // Same place, same reason: the student's answer decides what the plan question asks, so it
                // travels on every way out rather than only on the one where the writing went well.
                response.NextQuestion = tailoredPlan;

                // And the goal that would carry out what they just committed to. Read from the chosen
                // chip rather than from the model, so it cannot propose a goal the app cannot offer, and
                // set here rather than on the happy exit: a reply that failed to arrive is no reason for
                // the student to lose the suggestion their own answer earned.
                response.SuggestedGoal = asked.Kind == ReflectionQuestionBank.NextAction
                    ? GoalCatalogue.ForPromise(request.Choice ?? "", MethodFocusFromLabelKey(evidence.FocusLabelKey))
                    : null;

                // Every reply leaves through here, so a dash the model slipped in becomes the comma or
                // full stop it was standing in for, on the online and the offline text alike. The next
                // step is model-written too and was leaving them through: "as if teaching someone else —
                // it's a powerful way" is the kind of line a student reads out loud.
                response.Feedback = AiTextFormatter.StripDashes(response.Feedback);
                response.NextStep = AiTextFormatter.StripDashes(response.NextStep ?? "");

                StudentEventLog.Write(conn, request.StudentId, LogEventType.ReflectionVerdict, refId: asked.Id,
                    value: outcome.Length > 0 ? outcome : response.Aligned ? "aligned" : verdict.Status,
                    amount: response.InsightXp,
                    data: new { writer, questionId = asked.Id, guardRejections, status = verdict.Status });
                return response;
            }

            var apiKey = _configuration["OpenAI:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
                return Ok(Finish(fallback, "fallback", outcome: "no-provider-configured"));

            try
            {
                var studentLine = ReflectionQuestionBank.DescribeRecordToStudent(evidence, asked, request.Choice ?? "");

                // How many times the reply guard sent the model back. Recorded on the verdict event,
                // because "a third of replies needed a second attempt" is a fact about reply quality
                // and it used to live only in stdout.
                var guardRejections = 0;

                // The "why this matters" line used to be handed over as well, and the model copied it
                // almost verbatim into the reply's last sentence — a reflection that ends by telling a
                // child why reflection matters. The prompt already asks for one true sentence drawn from
                // the subject, so the line is dropped rather than repeated.
                var prompt = BuildReflectionPrompt(request, item, questionLine, recordLine, verdictLine, studentLine);

                string? rejected = null;

                // Two tries: the second one is told exactly what was wrong with the first. A reply that
                // still breaks the rules is replaced by the offline one, whose verdict is its own, so
                // what is shown is always internally consistent.
                for (var pass = 0; ; pass++)
                {
                var raw = await CallOpenAI(apiKey,
                    "You are Pippin, a warm encouraging study coach chatting with a student. Write a short reply to their reflection answer from what you are told about THIS question, but keep it conversational and kind — like a friend checking in. Always output valid JSON with exactly these keys: feedback (string), aligned (boolean), insightXp (integer 0-3), nextStep (string, filled only for the final question otherwise empty).",
                    rejected is null
                        ? prompt
                        : prompt + $"\n\nYOUR PREVIOUS REPLY WAS REJECTED because {rejected}. Write the whole JSON again and fix exactly that.");

                if (raw == null) return Ok(Finish(fallback, "fallback", outcome: "model-unreachable"));

                var jsonStart = raw.IndexOf('{');
                var jsonEnd = raw.LastIndexOf('}');
                if (jsonStart < 0 || jsonEnd <= jsonStart) return Ok(Finish(fallback, "fallback", outcome: "model-unreadable"));

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

                // THE RECORD DECIDES, ALWAYS. It graded the chip before the model was ever called, and
                // the model is asked to agree with it, not to weigh in. Prompt for behaviour, code for
                // guarantees: the prompt says so and the model contradicts it often enough that asking is
                // not enough — and now there is nothing else it could be, because a chip is the only way
                // an answer can arrive.
                //
                // This one assignment also covers the three cases that used to be separate rules here:
                // asking Pippin for a model answer (no chip arrives, so nothing is judged and nothing is
                // paid), a commitment (settled tomorrow by the exercise, so it is not a claim), and an
                // end-of-session question (no right answer, so there is nothing to be aligned with).
                // Grade already returns zero for all three.
                aligned = verdict.Status == "aligned";
                insightXp = verdict.InsightXp;

                Console.WriteLine($"[Reflection] AI result (pass {pass + 1}) — aligned={aligned}, insightXp={insightXp}, feedback=\"{feedback}\", nextStep=\"{nextStep}\"");

                // The prompt forbids these and the model still produces them now and then. A reply that
                // talks about the score, the button or what they did not do, or that says the opposite
                // of the verdict above it, is sent back once with the reason; if it comes back wrong
                // again the offline reply goes out instead, together with ITS verdict.
                rejected = ReplyProblem(feedback, aligned, request.Language, request.Mode, asked.Kind);
                if (rejected is not null)
                {
                    Console.WriteLine($"[Reflection] AI reply rejected (pass {pass + 1}): {rejected}");
                    guardRejections++;
                    if (pass >= 1) return Ok(Finish(fallback, "fallback", guardRejections, "reply-rejected-twice"));
                    continue;
                }
                // The verdict, who wrote the reply, and whether the guard had to intervene: the three
                // things an analysis of the reflection needs, previously visible only in a log file that
                // is overwritten on the next restart.
                return Ok(Finish(new ReflectionEvaluateResponse
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
                        string.IsNullOrWhiteSpace(nextStep) ? fallback.NextStep : nextStep),
                }, "model", guardRejections));
                }
            }
            catch
            {
                // The offline reply is written from the record, not the model, and the verdict it goes
                // out with is its own. Recording which writer produced the text is the difference
                // between analysing the model's replies and analysing its absence.
                return Ok(Finish(fallback, "fallback", outcome: "provider-error"));
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

            // A NO IS A NO FOR THE WHOLE QUEUE, not just this row.
            //
            // Declining used to close only the item that was on screen, so anything still pending behind it
            // arrived immediately afterwards — the student said no and the app asked again. There is only
            // ever one pending now, but rows written before that rule existed are still in the table, and a
            // refusal has to clear them too or the very next fetch brings one back.
            if (request.Skip)
                conn.Execute(
                    $"UPDATE {StudentProgressDBSettings.ReflectionQueueTable} SET Status = 'skipped' " +
                    "WHERE StudentId = @StudentId AND Status = 'pending' AND ItemType <> 'session' " +
                    "AND Id <> @Id",
                    new { StudentId = request.StudentId, Id = request.QueueItemId });

            // The answer to "did they reflect", and the end of this reflection's part of the session.
            StudentEventLog.Write(conn, request.StudentId, LogEventType.ReflectionCompleted,
                refId: request.QueueItemId.ToString(),
                value: request.Skip ? "skipped" : "answered",
                data: new { turns = request.History.Count });

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
                        CreatedAt = LogStamp.Now()
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

            // Which runs the window is made of, in the same order as the exercises above.
            //
            // Kept because nothing else can recover it: the queue row holds the window and no attempt id,
            // so without this a later reader can only guess "the newest N completed attempts" — which is
            // wrong for a narrowed goal as soon as the student does anything else afterwards. The ids are
            // in hand here, so they cost nothing to keep.
            window.AttemptIds = [.. attempts.OrderBy(a => a.Id).Select(attempt => attempt.Id)];

            return System.Text.Json.JsonSerializer.Serialize(window);
        }

        /// <summary>
        /// A queue row as the client receives it: the row itself, plus the questions built for it.
        ///
        /// The properties are copied across by reflection rather than by hand so that a column added to
        /// the row does not have to be remembered here as well.
        /// </summary>
        internal static ReflectionQueueItemResponse ToQueueResponse(
            Microsoft.Data.Sqlite.SqliteConnection conn, ReflectionQueueRecord item)
        {
            var response = new ReflectionQueueItemResponse();
            foreach (var property in typeof(ReflectionQueueRecord).GetProperties())
                property.SetValue(response, property.GetValue(item));

            var evidence = BuildEvidence(conn, item);
            response.Questions = ReflectionQuestionBank.Build(evidence);

            // The context panel, one per question, decided against the question and not against the item:
            // the same exercise withholds the mistake counts for "what went well" and shows them for the
            // next question, which is graded on the comparison instead.
            foreach (var question in response.Questions)
                question.Panel = BuildPanel(conn, evidence, question, item);

            return response;
        }

        /// <summary>
        /// The context panel for one question: what the student may see beside it.
        ///
        /// See <see cref="ReflectionPanel"/> for why this exists. The rule it enforces is that the panel
        /// shows a DIFFERENT slice of the record than the chips are about, so there is real evidence to
        /// reason with and nothing to read the answer off. Which facts that excludes is stated once, in
        /// <see cref="ReflectionQuestionBank.HiddenFacts"/>, next to the rules that grade the question.
        ///
        /// TWO THINGS ARE DECIDED HERE RATHER THAN THERE, because they are about the data rather than
        /// about the question:
        ///
        ///   * Phase bars are shown for ONE run only. Phase times sum to the run's total, and on a goal's
        ///     "what went well" the trend in those totals is one of the chips — so two runs side by side
        ///     would draw the answer even though no single number does.
        ///   * A goal's phases come from the attempt ids stored on its window. A window recorded before
        ///     those were kept has none, and gets no phase bars rather than the "newest N attempts" guess:
        ///     a narrowed goal can pick up a run of a different method from it, and the panel states what
        ///     it shows as fact to an eleven-year-old.
        /// </summary>
        private static ReflectionPanel BuildPanel(
            Microsoft.Data.Sqlite.SqliteConnection conn,
            ReflectionEvidence evidence,
            ReflectionQuestion question,
            ReflectionQueueRecord item) =>
            // NOTHING IS WITHHELD ANY MORE. The questions are about reading this dashboard, and the
            // dashboard names the thing each question asks about, so there is no answer to hide: what the
            // bars carry is the subject of the conversation rather than a hint at its answer.
            AssemblePanel(conn, evidence, item, []);

        /// <summary>
        /// The same panel with nothing held back.
        ///
        /// Used once the answer is in: the facts the question was graded on are exactly the facts that may
        /// now be shown, because they can no longer help the student answer it. This is what the lock opens
        /// into, and it is why the withheld numbers never travel on the question itself.
        /// </summary>
        private static ReflectionPanel BuildOpenPanel(
            Microsoft.Data.Sqlite.SqliteConnection conn,
            ReflectionEvidence evidence,
            ReflectionQueueRecord item) =>
            AssemblePanel(conn, evidence, item, []);

        /// <summary>
        /// The panel payload, given what is withheld.
        ///
        /// Two things are decided here rather than in the bank's table, because they are about the data
        /// rather than about the question:
        ///
        ///   * Phase bars are shown for ONE run only. Phase times sum to the run's total, and on a goal's
        ///     "what went well" the trend in those totals is one of the chips — so two runs side by side
        ///     would draw the answer even though no single number does.
        ///   * A goal's phases come from the attempt ids stored on its window. A window recorded before
        ///     those were kept has none, and gets no phase bars rather than the "newest N attempts" guess:
        ///     a narrowed goal can pick up a run of a different method from it, and the panel states what
        ///     it shows as fact to an eleven-year-old.
        /// </summary>
        private static ReflectionPanel AssemblePanel(
            Microsoft.Data.Sqlite.SqliteConnection conn,
            ReflectionEvidence evidence,
            ReflectionQueueRecord item,
            HashSet<string> hidden)
        {
            var panel = new ReflectionPanel { HeldBack = hidden.Count > 0 };

            if (!hidden.Contains(ReflectionQuestionBank.HideMethod))
            {
                // What the item was about, as the app's own translation key so the client renders it in the
                // student's language.
                //
                // A goal narrowed to one METHOD names the method; one narrowed to an exercise TYPE names
                // the type, which is not a method at all and needs its own wording. The other four goal
                // categories name neither, because they are about a decision any exercise can be part of.
                // An exercise names the method its own attempt recorded — not the type it happened to be,
                // since "Suitability" is an exercise rather than a method and has no method's wording.
                panel.MethodLabelKey = evidence.IsGoal
                    ? item.ItemId switch
                    {
                        "method" when item.Focus.Length > 0 => MethodLabelKeyFor(item.Focus),
                        "exerciseType" when item.Focus.Length > 0 => $"exercise-type-{item.Focus.ToLowerInvariant()}",
                        _ => "",
                    }
                    : MethodLabelKeyFor(evidence.SelectedMethod);
            }

            // The mistakes, in the two halves that can be withheld apart: the total, and the split across
            // runs. A single exercise has no split worth drawing and is said through the total.
            if (!hidden.Contains(ReflectionQuestionBank.HideMistakes))
            {
                var window = evidence.GoalExercises;
                var coversWindow = window.Count > 0;

                panel.RunCount = coversWindow ? window.Count : 1;
                // Stated only when the goal counted more than the window holds: the panel draws a row per
                // exercise, so a window of five out of nine has to say so rather than quietly show five.
                panel.CountedRuns = evidence.CountedExercises > panel.RunCount ? evidence.CountedExercises : 0;
                panel.Mistakes = coversWindow ? window.Sum(run => run.Errors) : evidence.Errors;

                if (window.Count > 1)
                    panel.Runs = [.. window.Select((run, index) => new ReflectionPanelRun
                    {
                        Position = index + 1,
                        Mistakes = run.Errors,
                        Hints = run.Hints,
                        Seconds = run.Time,
                    })];
            }

            if (!hidden.Contains(ReflectionQuestionBank.HideHints))
                panel.Hints = evidence.IsGoal || evidence.IsSession
                    ? evidence.GoalExercises.Sum(run => run.Hints)
                    : evidence.Hints;

            // Time only, and one run only. The step rows carry errors and hints as well; neither is copied.
            // The panel reads its phase bars from the window's own attempt ids, so a goal's bars are the
            // same runs its questions are about. A window recorded before those were kept has none, and
            // gets no bars rather than the guess.
            if (!hidden.Contains(ReflectionQuestionBank.HideSteps))
                panel.Phases = PhaseBarsFor(conn, evidence, item);

            // The figure the "I was in a hurry" chip is checked against. Without it the chip is the one
            // description of their own work the student cannot verify before choosing it.
            if (evidence.UsualSeconds > 0)
                panel.UsualSeconds = evidence.UsualSeconds;

            // The decisions, as two rows: who did the calculating, and what they did at the compare or
            // explain step. They are what half of the "why" options are checked against, so the student
            // has to be able to see them.
            //
            // A goal covers several exercises, and one row for all of them said "I skipped it" whether
            // that was once or every time — which is exactly the difference its compare question turns
            // on. So a goal's rows carry how many of its exercises they are true for, and the client says
            // "skipped in 2 of 3".
            var goalRuns = evidence.GoalExercises;
            var goalDimension = evidence.IsGoal && goalRuns.Count > 1
                ? GoalDecisionDimension(evidence)
                : "";

            if (goalDimension.Length > 0)
            {
                var own = goalRuns.Count(run => run.Own && !run.WasShown);
                var explained = goalDimension == "explain";
                var did = goalRuns.Count(run => explained ? run.Explained : run.Compared);

                // The row names whichever the student did MOST often, and its count is the count of that
                // same thing - so "skipped in 2 of 3" and "compared in 1 of 3" are both true statements
                // about the same three exercises, rather than one of them counting the other's runs.
                var ownMost = own * 2 >= goalRuns.Count;
                var didMost = did * 2 >= goalRuns.Count;

                panel.Decisions.Add(new ReflectionPanelDecision
                {
                    LabelKey = "reflection-decision-calculating",
                    Icon = ownMost ? "own" : "app",
                    ValueKey = ownMost ? "reflection-decision-did-myself" : "reflection-decision-app-did",
                    Count = ownMost ? own : goalRuns.Count - own,
                    Total = goalRuns.Count,
                });

                panel.Decisions.Add(new ReflectionPanelDecision
                {
                    LabelKey = explained ? "reflection-decision-explain" : "reflection-decision-compare",
                    Icon = didMost ? (explained ? "explained" : "compared") : "skipped",
                    ValueKey = didMost
                        ? (explained ? "reflection-decision-explained" : "reflection-decision-compared")
                        : "reflection-decision-skipped",
                    Count = didMost ? did : goalRuns.Count - did,
                    Total = goalRuns.Count,
                });

                return panel;
            }

            if (evidence.HasDecisions || evidence.DidSolveOnOwn || evidence.WasShownAnswer)
            {
                panel.Decisions.Add(new ReflectionPanelDecision
                {
                    LabelKey = "reflection-decision-calculating",
                    Icon = evidence.DidSolveOnOwn && !evidence.WasShownAnswer ? "own" : "app",
                    ValueKey = evidence.DidSolveOnOwn && !evidence.WasShownAnswer
                        ? "reflection-decision-did-myself"
                        : "reflection-decision-app-did",
                });
            }

            if (evidence.DecisionDimension.Length > 0)
            {
                var explained = evidence.DecisionDimension == "explain";
                var did = explained ? evidence.DidExplain : evidence.DidCompare;
                var shown = explained ? evidence.WasShownExplanation : evidence.WasShownComparison;

                // The app records a decision as Engaged or Declined, nothing finer, so "declined" is said
                // as "I skipped it" rather than guessed at as "the app did it for me".
                panel.Decisions.Add(new ReflectionPanelDecision
                {
                    LabelKey = explained ? "reflection-decision-explain" : "reflection-decision-compare",
                    Icon = did ? (explained ? "explained" : "compared") : "skipped",
                    ValueKey = did
                        ? (explained ? "reflection-decision-explained" : "reflection-decision-compared")
                        : "reflection-decision-skipped",
                });
            }

            return panel;
        }

        /// <summary>
        /// Which decision a GOAL's dashboard row should count, or empty when it has none to show.
        ///
        /// An exercise knows this from its own type (see <see cref="ReflectionEvidence.DecisionDimension"/>),
        /// but a goal names a category rather than an exercise, so the category is read instead — and when
        /// it names neither step, what its runs actually show decides.
        /// </summary>
        private static string GoalDecisionDimension(ReflectionEvidence evidence)
        {
            switch (evidence.Focus)
            {
                case "methodComparison":
                case "Suitability":
                    return "compare";
                case "selfExplanation":
                case "Efficiency":
                case "Matching":
                    return "explain";
            }

            if (evidence.GoalExercises.Any(run => run.Compared)) return "compare";
            return evidence.GoalExercises.Any(run => run.Explained) ? "explain" : "";
        }

        /// <summary>The translation key for a method name as the anchor store spells it, or empty.</summary>
        private static string MethodLabelKeyFor(string methodName) =>
            string.IsNullOrWhiteSpace(methodName)
                ? ""
                : $"flexibility:{methodName.Trim().ToLowerInvariant()}-method";

        /// <summary>
        /// The phase bars for one run, or nothing when no run can be vouched for.
        ///
        /// For an exercise the run is the item's own attempt, which the queue row carries. For a goal it is
        /// the last exercise in the window, read from the attempt ids stored with the window — chosen
        /// because the most recent run is the one the student remembers most clearly, so it is fair context
        /// rather than a nudge towards the improvement.
        /// </summary>
        private static List<ReflectionPanelPhase> PhaseBarsFor(
            Microsoft.Data.Sqlite.SqliteConnection conn, ReflectionEvidence evidence, ReflectionQueueRecord item)
        {
            // The evidence already carries the steps for an exercise, folded from that attempt's own rows.
            if (!evidence.IsGoal && !evidence.IsSession)
                return [.. evidence.Steps
                    .Where(step => step.Time > 0 || step.Errors > 0 || step.Hints > 0)
                    // The order the exercise is worked through, not alphabetical: the bars are one run and
                    // read as a sequence, the same way the chips on the opening question do.
                    .OrderBy(step => step.Id switch
                    {
                        "choose" => 0,
                        "setup" => 1,
                        "solve" => 2,
                        "explain" => 3,
                        _ => 4,
                    })
                    .Select(step => new ReflectionPanelPhase
                    {
                        LabelKey = step.LabelKey,
                        Seconds = step.Time,
                        Mistakes = step.Errors,
                        Hints = step.Hints,
                    })];

            var window = ParseGoalWindow(item.Evidence);
            var lastAttempt = window?.AttemptIds.Count > 0 ? window.AttemptIds[^1] : 0;
            if (lastAttempt <= 0) return [];

            return [.. conn.Query<StepRow>(
                    $"SELECT Name, Time, Errors, Hints FROM {AnchorStoreSettings.RecordTable} WHERE AttemptId = @Id",
                    new { Id = lastAttempt })
                .Select(row => (Row: row, StepId: ReflectionQuestionBank.StepIdFor(row.Name)))
                .Where(pair => pair.StepId.Length > 0)
                .GroupBy(pair => pair.StepId)
                .Select(group => new ReflectionPanelPhase
                {
                    LabelKey = ReflectionQuestionBank.StepLabelKey(group.Key),
                    Seconds = group.Sum(pair => pair.Row.Time),
                    Mistakes = group.Sum(pair => pair.Row.Errors),
                    Hints = group.Sum(pair => pair.Row.Hints),
                })
                .Where(phase => phase.Seconds > 0)
                .OrderByDescending(phase => phase.Seconds)];
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
        /// The promise the student made at the end of their last session, for showing back to them.
        ///
        /// Read at the moment the daily check-in opens, so it can say what they said they would do
        /// before they choose anything today. A promise already settled is not returned: it has been
        /// judged against an intention they have already set, and showing it again would ask them to
        /// answer a question they have answered.
        ///
        /// The wording travels as a translation KEY rather than as a sentence, because the client owns
        /// every word the student reads and this has to be the same wording as the chip they chose.
        /// </summary>
        [HttpGet("session-promise/{studentId}")]
        public ActionResult<SessionPromiseResponse> GetSessionPromise(long studentId)
        {
            if (studentId <= 0) return BadRequest("Invalid student.");

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();
            EnsureTables(conn);

            // The same selection the settlement uses: the newest unsettled session promise, and never one
            // made today. The intention is set at the start of a session and the promise at the end of
            // one, so a promise made this session is for the NEXT one.
            var promiseItem = conn.ExecuteScalar<string?>(
                $"SELECT ItemId FROM {StudentProgressDBSettings.ReflectionHistoryTable} " +
                "WHERE StudentId = @StudentId AND ItemType = 'session' AND QuestionId = 'session-q2-next' " +
                "  AND FollowedUp = 0 AND CreatedAt < @Today " +
                "  AND CreatedAt >= @Since " +
                "GROUP BY ItemId ORDER BY MAX(Id) DESC LIMIT 1",
                new
                {
                    StudentId = studentId,
                    Today = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                    // "Yesterday you said" is about the last session, so a promise left over from a week
                    // ago is not shown: it is a menu answer with nothing to check it against by then, and
                    // reading it back would only ask the student to remember a tap.
                    Since = DateTime.UtcNow.Date.AddDays(-3).ToString("yyyy-MM-dd"),
                });

            if (string.IsNullOrEmpty(promiseItem)) return Ok(new SessionPromiseResponse());

            // The promise is a chip, handed back as a KEY for the client to resolve in the student's own
            // language: the check-in has to word it exactly as the chip they tapped.
            var choice = conn.ExecuteScalar<string?>(
                $"SELECT Choice FROM {StudentProgressDBSettings.ReflectionHistoryTable} " +
                "WHERE StudentId = @StudentId AND ItemType = 'session' AND QuestionId = 'session-q2-next' " +
                "  AND ItemId = @ItemId AND Choice <> '' ORDER BY Id LIMIT 1",
                new { StudentId = studentId, ItemId = promiseItem }) ?? "";

            var textKey = ReflectionQuestionBank.SessionPromiseTextKey(choice);
            if (textKey.Length == 0) return Ok(new SessionPromiseResponse());

            return Ok(new SessionPromiseResponse { Choice = choice, TextKey = textKey });
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

            var named = ChipsForIntention(request.IntentionChoice, request.DetectedCategory);

            // BOTH HALVES ARE CHIPS, SO THE RECORD SETTLES IT AND THE MODEL IS NEVER ASKED.
            //
            // The daily intention lost its free text first, and the promise has now lost it too. A typed
            // promise used to be handed to the model to read, with a provider that could not be reached
            // leaving the promise open. There is nothing to read any more: every promise is a chip id the
            // server itself wrote, so the comparison is a set membership test.
            //
            // A commitment that carries NO chip — a row written before chips-only, or one the app could
            // not resolve — is left OPEN rather than closed unpaid. "The record cannot say" and "the
            // student did not do it" are different facts, and only one of them is a promise that was
            // broken. The next intention they set is still a fair chance to have kept this one.
            if (promiseChoice.Length == 0 || named is null)
                return Ok(new SettleSessionPromiseResponse());

            var kept = named.Contains(promiseChoice);

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
                    // The day-specific promises are all practice promises: a student who promised to
                    // compare two methods next time has promised to practise, and settling that against
                    // "I did some exercises" is what makes the promise mean something.
                    wanted.Add("session-next-fewer-hints");
                    wanted.Add("session-next-compare");
                    wanted.Add("session-next-explain");
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
            string questionLine = "",
            string recordLine = "",
            string verdictLine = "",
            string studentLine = "",
            string meaning = "")
        {
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
            //
            // "They did not choose an option" rather than "they pressed the help button", which is what
            // this said when it was written. The reply may not mention the button or the act of asking —
            // the guard rejects that outright, because a student who asked for help should read about
            // their work and not about the control they touched. Naming the button here put the very
            // phrase in front of the model that the guard then bans, so the prompt was asking for a reply
            // it was going to throw away.
            var mode = request.Mode == "pippin"
                ? "They did not choose an option, so they are asking you to answer this question for them, from what is below. For Q1 and Q2 that means stating what they actually did on the one thing this question asks about. For Q3 it means naming what to do next. There is no student answer to grade."
                : "They answered themselves";

            // WHAT THE HELP REPLY SOUNDS LIKE, which is not the same as a reply that grades an answer.
            //
            // The model kept opening these with "You chose the equalization method." — a true statement
            // about the student, handed to someone who had just asked for guidance. They pressed a
            // button asking for help with a question and got a report about themselves instead of an
            // answer. So this path is framed as the companion speaking: the observation is still there,
            // because it IS the answer, but it arrives as something you noticed.
            var helpVoice = request.Mode == "pippin"
                ? "\nTHIS IS A REQUEST FOR GUIDANCE, SO ANSWER IT AS THE COMPANION.\n"
                  + "- Open by speaking as yourself about what you can see, and then say it. "
                  + "\"Here is what I noticed about this one: ...\" and \"What I can see is ...\" are the "
                  + "shape. Do NOT open with a statement about them: no \"You chose ...\", no \"You picked "
                  + "..., no \"You went with ..., no \"Your answer ...\". They did not answer anything, so "
                  + "there is nothing of theirs to report back and a reply that opens that way reads as a "
                  + "verdict on a choice they never made.\n"
                  + "- Answer THIS question and nothing else. The subject of the first sentence is the "
                  + "thing this question asks about, not their exercise, their mistakes or another step.\n"
                  + "- Say what you can see, then what it means for the next exercise. Two or three "
                  + "sentences, warm, and no question at the end."
                : string.Empty;

            var langInstruction = request.Language switch
            {
                "de" => "You must respond ONLY in German.",
                "ja" => "You must respond ONLY in Japanese.",
                _ => "Respond in English."
            };

            // The same fact, said TO the student instead of about them.
            //
            // Q1 and Q2 are answered with this: the help button asks for it outright, and a chip answer is
            // graded from the record and the reply confirms it or says which way it went. The model is
            // handed the sentence to convey rather than left to build one from the error and hint totals —
            // which is how a reply comes back vague, or reaches for "you didn't", the exact shape the ban
            // below forbids. Empty for the questions where the past is not the answer at all.
            var studentLineBlock = string.IsNullOrWhiteSpace(studentLine)
                ? ""
                : $"\nWhat they did, said to them rather than about them (state this in your own warm words: no stronger word than it uses, and no extra achievement it does not state): {studentLine}.";

            var meaningBlock = string.IsNullOrWhiteSpace(meaning)
                ? ""
                : $"\nWhy this matters (the one thing your reply adds beyond their answer): {meaning}";

            return $@"Student completed: {item.ItemLabel} (item type: {item.ItemType}).
The ONLY things you know about this student are what the lines below say. Nothing else about them is known to you, and nothing about any other exercise, goal or question may appear in the reply.

Current question: {questionLabel}
{questionLine}
What they actually did, as far as we know it: {recordLine}{studentLineBlock}{meaningBlock}
The decision on their answer: {verdictLine}
The option they chose: {(string.IsNullOrWhiteSpace(request.Choice) ? "(none)" : string.IsNullOrWhiteSpace(request.ChoiceLabel) ? request.Choice : request.ChoiceLabel)}
Mode: {mode}{helpVoice}
Instructions:
{langInstruction}
TONE (very important): Be warm, brief and conversational — like a friend, not a report. Write as the companion who was there with them, in the second person (""you compared the two methods""), never as something that looked them up or checked them, and never list their exact error or hint numbers back at them. If their self-assessment matches their performance, just celebrate it and stop there — do NOT add any suggestion or correction.
NEVER TALK ABOUT AWARDS OR SCORES (very important): the app's own scoreboard must not appear in the reply in any form — no name for it, no number, no abbreviation, and nothing about whether something counted, paid, was earned, or did not. That includes the empty-handed version of it: never tell them there is nothing here to earn, because a student who got little out of an exercise still did the exercise, and that line only lands as a mark against them. Whatever there is to show sits on the badge beside your reply, and talking about it turns a reflection into a scoreboard. The JSON at the end carries an award number and the machine's names for its fields: those are for the machine, and neither the number nor those names may appear in the feedback text.
NEVER DESCRIBE THE CONTROLS OR THEIR GESTURES (very important): the reply is about their work, not about how the app was operated. Never write that they asked, tapped, pressed, clicked or selected anything, never mention a button, and never mention asking for help or for the answer. Say what they DID on the exercise itself. ""You asked to be shown the solution"" is exactly the sentence that is not allowed; ""you went on and let the system show you"" says the same fact about their work and is the shape to use instead.
ANSWER THE QUESTION WITH SOMETHING REAL ABOUT IT (very important): every reply answers the ONE question above with something real about it — for a question about a decision, what they did at that step; for a counting question, the number; for a question about the next exercise, the one thing to do next. A remark that would fit any question at all (""that's interesting"", ""worth another look"", ""sometimes the tricky spots sneak up on us"") does not answer it, and must never be the whole reply. If their answer was too vague to tell you anything, do not comment on how vague it was: give them what the facts line states about this question, warmly, and stop.
NEVER JUST HAND THEIR ANSWER BACK (very important): a reply that only repeats what they said or did (""you did exactly that"", ""that is exactly what happened"", ""you got through all three without hints"") tells them nothing new. Every reply for Q1 and Q2 has TWO parts: first, ONE short clause that states the fact, in different words from theirs; second, ONE sentence from the ""Why this matters"" line, put in your own words, saying what that thing is for. Do not stack praise on top (""great job"", ""wonderful"", ""it is great to see"") — the second part IS the substance. If there is no ""Why this matters"" line, add one true sentence about why that thing helps, drawn only from the subject of this question.
SAY WHICH WAY IT WENT (very important): the student cannot see the verdict, so the reply is the only place they learn whether their answer matched. A reply that only says ""interesting, take a look"" tells them nothing and reads as a brush-off. When it matches, say so plainly and warmly. When it does not, SAY THEIR ANSWER BACK FIRST, then say where that same thing actually landed — both, in that order, and with a soft landing: one short human phrase of your own before the fact, never one copied from these instructions. Never the words wrong, incorrect or ""your data shows something different"". A child who read the chart slightly off still looked at their work, so thank them for looking and then tell them the number. The sentence alone tells them what happened but not that what they said was read, and the answer alone leaves the difference invisible.
STAY INSIDE THE QUESTION (very important): the reply answers the ONE question above and nothing else. Do not bring in errors, hints, other decisions, or any other question from this reflection. If the question asked whether they compared two methods, the whole reply is about comparing two methods — a sentence about the solution, the method choice or their mistake count does not belong in it, however true it is. The facts line above states only what this question is about; treat anything it does not mention as unknown to you and do not guess at it.
NEVER TELL THEM THEY DID NOT DO SOMETHING (very important): every sentence is about what they DID. Write the fact affirmatively, and never build a sentence on a gap — nothing about what their answer left out, what they missed, what did not happen, or what their choice was not. Put no ""but you"" and no ""instead of"" in front of the fact, and never turn naming their answer into a correction of it. Those sentences read as a telling-off even when they are accurate, and they make a student write what sounds right rather than look at their own work. Where they took the offered help, state what they did plainly and without judgement (""you skipped the comparison here""), then say that asking for help is a real, sensible thing to do — and if there is something genuinely good to name, name it. Use their own words for their choice, never a verdict on it. If the answer was too short or too vague to match against anything, do not point at the gap — state what the facts line says about this question, warmly, and invite them to have a go at the next one. When the answer was vague, or said outright that they ignored the step, this rule matters most of all: state what the facts say as a plain fact, and stop.
NEVER INVENT WHAT THEY DID (very important): the lines above are the only thing you know about their choices, and they say what they say. Never credit them with something it does not state — do not write that they read, opened, saw, studied or took the time to look at an explanation unless the facts line says they did. If it says only that they did not explain their reasoning, then that is all that happened and the reply says nothing more about it. Where the facts say nothing, you know nothing about that step: never guess, and never fill the gap with something flattering or otherwise.
NO FOLLOW-UP QUESTIONS (very important): This reflection is ONE question and ONE answer. The student cannot reply again. Never ask them anything, never probe for more detail, never invite them to explain further, and never end your feedback with a question mark. Deliver your feedback as a complete statement and stop.
- If mode is 'Pippin told them': the student pressed ""Pippin, tell me"" instead of writing an answer, so there is nothing to grade, and requesting help pays nothing: return aligned=false with an award number of 0, never say they answered correctly, and never praise an answer there is none of. Never remark on the empty box either, or on there being no answer, or on what they did not write: they asked for help, which is a thing they did, and the reply says nothing about the shape of their turn.
  * On Q1 and Q2 the student is asking YOU for this question's answer, so ANSWER IT: one or two sentences stating plainly what the lines above say they did with the one thing this question asks about — the decision they took at that step, or the part of the working the question names. That statement IS the reply. Never replace it with a general tip, and never write that they asked for the model answer, that you are explaining their work, or anything else about the button they pressed.
  * On Q3 the question is about the NEXT exercise, so the reply is ONE concrete thing to try next, taken from this question's own answers, with a few words on why it will help. Say nothing about what they did earlier: a question about the future is not answered by the past.
  * Speak directly to the student as Pippin, warmly, without judging either choice. Everything the lines above do not mention is unknown to you — do not guess at it and do not credit them with it.
  * Where they SKIPPED the thing this question is about, that is what the lines above say and it decides the verdict. Say it plainly and warmly, without ranking it as a failure, and never carry it into a question it does not belong to. A decision here is a yes or a no: no means they skipped it, not that they asked for the answer to be revealed. If the answer did not match, their answer is said back first — see the bullet above.
- When they tapped a quick answer, ALIGNMENT IS ALREADY DECIDED, and it is stated above as the decision on their answer. Copy it exactly: do not change it, do not second-guess it, and do not decide the award yourself. Write only the reply. WHERE THE TAP AND THE FACTS DIFFER, THE REPLY OPENS BY SAYING THEIR ANSWER BACK, in their own terms and without judgement, and only then says what the facts show. Both halves are required and in that order: a reply that goes straight to the fact is about something they never claimed, and they have no way to know it was a reply to what they said. After that, make their actual choice sound like the reasonable thing it was — no ""but you"", no ""actually"", no ""in reality"", no ""the record shows"", and no sentence that could be read as marking them down. They do not need to be told the tap was wrong; the reply is there to end the reflection on something true and warm. Never write that their answer was right, close, or matches when the facts say it does not.
- ALWAYS FIND SOMETHING GENUINELY GOOD, AND ESPECIALLY ON Q1. Q1 asks what was good, so a reply to an answer that MATCHED leads with something real and good that the facts line supports — they worked it out themselves, they got through a part without a mistake, they took no hints, they explained their reasoning, they compared the methods, they asked for help rather than giving up, or they finished an exercise that cost them. Name it first, in their own terms, and let the reply stand on it: every exercise has one, even a rough one. When the answer did NOT match, their answer comes first and the good thing follows it, for the reason given above. Do not scold, and do not point out that they were wrong.
- NEVER AGREE WITH SOMETHING THAT DID NOT HAPPEN. If they say they worked it out themselves but the lines above say they skipped it, do not congratulate them for working it out and never state their claim as fact: that teaches them the reflection is a box to choose anything in. Say their choice back, then what they did, in a warm, matter-of-fact way, and celebrate the thing that is actually true instead — taking the help on offer is a real, sensible thing to do.
- A TAPPED QUICK ANSWER IS A COMPLETE ANSWER. If the answer text is empty but a quick answer is stated above, they answered: quote or refer to what they chose. NEVER say they did not answer, did not share their thoughts, or missed the question, and never remark on the empty box. There is nothing missing.
  * Where they SKIPPED the thing this question is about, that is what the lines above say and it decides the verdict. Say it plainly and warmly, without ranking it as a failure, and never carry it into a question it does not belong to. A decision here is a yes or a no: no means they skipped it, not that they asked for the answer to be revealed. If the answer did not match, their answer is said back first — see the bullet above.{sessionOnlyRule}
- If Q3: ignore alignment. The FEEDBACK must ANSWER the question on screen: name ONE concrete thing to do in the next exercise, taken from this question's own quick answers, and say in a few words why it will help. It must be about the subject THIS question is about (comparing, explaining, working it out, hints, the method) and never a general study tip. Put the same thing, one line and phrased as an offer, in nextStep. NEVER open by describing what the student did, what they pressed, or that they asked for anything. Set aligned=false with an award number of 0. The feedback must not end with a question mark — the audit catches that here more than anywhere else, so end on a full stop.

IMPORTANT: always include the ""aligned"", ""insightXp"" and ""nextStep"" keys with their exact boolean/integer/string values — never omit them and never quote the numbers as strings.

Respond ONLY in this JSON: {{""feedback"":""..."",""aligned"":true|false,""insightXp"":0-3,""nextStep"":""...""}}";
        }

        private static readonly System.Text.RegularExpressions.Regex ForbiddenReplyShape = new(
            @"\b(insight|xp|award(ed)?|you (just )?(asked|tapped|pressed|clicked|selected)|asked for (help|the answer)|the (help )?button|didn'?t|did not|you (missed|forgot))\b",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Compiled);

        /// <summary>
        /// A reply that turns naming their answer into a correction of it.
        ///
        /// The rule above asks a reply to say the student's answer back first, and the model reaches for
        /// the one construction that makes that read as a reproach: "You mentioned X, but the record
        /// shows Y", "You actually went straight on". Both reached a student in one 72-reply run, and
        /// both are banned by the prompt already — which is why this is enforced rather than asked for.
        ///
        /// "but you" and not "but": the shape the reply is meant to have does introduce the fact, it just
        /// does not do it as an accusation. "You said you compared them - what happened here is that you
        /// went on without comparing" is the sentence this wants; "but you skipped it" is the one it does
        /// not, and the difference between them is entirely in whose voice the fact arrives in.
        /// </summary>
        private static readonly System.Text.RegularExpressions.Regex CorrectsTheirAnswer = new(
            @"\bthe (record|data|facts) (shows|says|show|say)|\byou actually\b|\bbut you\b",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Compiled);

        /// <summary>
        /// A help reply that opens by reporting a choice the student never made.
        ///
        /// Only checked on the help path. Anywhere else these openers are ordinary and wanted — a reply
        /// grading a chip has to say what they picked — but the student who pressed the help button
        /// answered nothing, so "You chose the equalization method." is a verdict on a choice that does
        /// not exist, delivered to someone who asked for help with a question.
        /// </summary>
        private static readonly System.Text.RegularExpressions.Regex OpensByReportingTheirChoice = new(
            @"^\s*(you (chose|picked|selected|went with|marked|opted)|your choice|you tapped)\b",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Compiled);

        // A reply that only repeats the answer back.
        //
        // Narrow on purpose, and it was not. A bare "exactly what" was enough to reject a reply, and the
        // explanation sentence the prompt asks for is written in exactly that shape: "that independent
        // practice is exactly what builds your ability to solve problems" echoes nothing, it IS the second
        // half of every good reply. Two of the three rejections left in a 47-reply sample were this
        // pattern misfiring on the sentence it is supposed to be asking for. The restatement verb has to
        // be there now, which is what the real echoes ("that is exactly what happened", "you did exactly
        // that") all have and the explanation sentence does not.
        private static readonly System.Text.RegularExpressions.Regex EchoesTheAnswer = new(
            @"you did exactly that|exactly (what|that) (happened|you did|you said|you wrote)|that is (just )?what (happened|you did)|that'?s (just )?what (happened|you did)|exactly as you (said|did|wrote)",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Compiled);

        /// <summary>
        /// How many pieces of speech a reply holds: sentences, plus the clauses inside them.
        ///
        /// A clause counts only when it carries real words of its own, so "yes, exactly" is one clause and
        /// "You kept your work within the limits you set for yourself, which shows your methods are
        /// starting to hold" is two. The subject of a comma-joined clause is nearly always a word like
        /// "which", "and" or "so", but the test is the length of what follows, not a list of words — a
        /// keyword list here would be another thing to keep in step with the model's phrasing.
        /// </summary>
        private static int ClausesIn(string reply)
        {
            var pieces = new List<string>();
            foreach (var sentence in System.Text.RegularExpressions.Regex.Split(reply.Trim(), @"(?<=[.!?])\s+"))
                pieces.AddRange(System.Text.RegularExpressions.Regex.Split(sentence, @"(?<=[,;:])\s+"));
            return pieces.Count(piece => piece.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length >= 4);
        }

        // A reply that hedges, points at a difference, or attaches an improvement note to an answer it
        // is confirming. None of it may sit next to a confirmed answer: the badge says their claim
        // matched, so the sentence beside it cannot also say they are not there yet.
        //
        // The improvement-note family is here because of a reply that reached a student: "You made
        // progress on your method selection, but there's still room to improve", next to +3 Insight.
        // A confirmation is a confirmation — the prompt already says to celebrate and stop.
        private static readonly System.Text.RegularExpressions.Regex HedgesAConfirmation = new(
            @"differently|different from|(a |the )?(little|bit|touch|slightly)( bit)? different|not (quite|exactly)|(does|did|do)(n'?t| not)( quite)? (match|line up)|second (glance|look)|however|in reality|but actually|to be honest"
            + @"|still room (to|for)|room (to improve|for improvement)|you can (still )?improve|(needs?|there'?s) (a bit )?more (work|practice)|keep working on|had room to grow",
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

            if (CorrectsTheirAnswer.IsMatch(reply))
                return "it turns their answer into a correction — say their answer back and then say what happened, in your own voice: no 'but you', no 'you actually', no 'the record shows'";

            // A help reply that reports their choice back at them instead of answering the question.
            //
            // Only on the help path, where there is no answer of theirs to refer to at all: the model
            // produced "You chose the equalization method." for a student who had chosen nothing, which
            // reads as a verdict on a choice they never made. Anywhere else these openers are ordinary
            // and wanted — a reply grading a chip has to say what they picked.
            if (mode == "pippin" && OpensByReportingTheirChoice.IsMatch(reply))
                return "it opens by reporting a choice they never made — they asked for guidance, so start from what you can see";

            var judged = questionKind is ReflectionQuestionBank.Observation or ReflectionQuestionBank.Judgement;
            if (!judged) return null;

            // A reply that only hands the answer back: too short to hold a second thing, or built on
            // "that is exactly what happened". A second clause of substance is what makes it worth
            // reading.
            //
            // A SECOND CLAUSE, NOT A SECOND FULL STOP. This used to count sentence terminators and demand
            // two, which threw away 55 of 130 good replies in a sampled audit — every one of them stating
            // the fact in different words and then the reason for it, joined by a comma, which is good
            // English and exactly what the prompt asks for. At that rate the student read the generic
            // offline text on one answer in seven and the model got the blame for it. Counting a
            // comma-joined clause as well takes the same sample to 3 rejections out of 130.
            //
            // The 100-character floor that used to sit beside it is gone too. It rejected "You explained
            // your own reasoning, which is exactly how you find the habits worth repeating." at 91
            // characters — a fact and a reason with nothing wrong with it — and the clause count already
            // covers what the floor was there for: "You did well." is one clause, whatever its length.
            if (EchoesTheAnswer.IsMatch(reply) || ClausesIn(reply) < 2)
                return "it only hands their answer back — state the fact in different words, then add one sentence on why that thing matters";

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
                return $"Good, {picked} next time. Choosing it now, before the exercise starts, is what makes "
                     + "it happen rather than being one more thing to remember.";

            // Fact first, then what the thing is FOR. Neither says the answer was "exactly" anything: the
            // badge already says whether it matched, and the second sentence is what makes the reply
            // worth reading instead of the student's own words handed back.
            var why = string.IsNullOrWhiteSpace(question.Meaning) ? "" : $" {question.Meaning}";
            var fact = string.IsNullOrWhiteSpace(whatTheyDid) ? "" : $"{char.ToUpperInvariant(whatTheyDid[0])}{whatTheyDid[1..]}.";

            if (verdict.Status == "aligned")
                return string.IsNullOrWhiteSpace(fact)
                    ? $"That is how it went here.{why}".Trim()
                    : $"{fact}{why}";

            // The one case the record cannot settle: it has nothing to hold a claim against, so the
            // student's own reading stands and the reply does not pretend to confirm or correct it.
            if (verdict.Status == "partial")
                return string.IsNullOrWhiteSpace(fact)
                    ? $"{picked} is a fair reading to take from this one.{why}".Trim()
                    : $"{fact}{why}";

            // NOT ALIGNED, AND THE DIFFERENCE HAS TO BE VISIBLE FROM THE TEXT ALONE.
            //
            // This used to be the fact and nothing else, which reads as a non-sequitur. A student who
            // chose "I compared them myself" on an exercise where they had declined the comparison was
            // told "you went straight on without comparing the two methods" with no sign that anything
            // they said had been read — and no way to tell that sentence was a reply to their answer
            // rather than an unrelated remark. Their answer comes first now, then the fact, and the
            // second sentence is what makes the difference theirs to see rather than ours to point out.
            //
            // This is the same shape the model is told to write, and deliberately so: this text is what
            // the student reads whenever the model's reply trips the guard, so the two have to be
            // interchangeable or the reflection would speak in two different voices.
            var theyChose = string.IsNullOrWhiteSpace(choiceLabel) ? "" : $"You chose \"{choiceLabel}\". ";
            return string.IsNullOrWhiteSpace(fact)
                ? $"{theyChose}Thanks for looking at that one.{why}".Trim()
                : $"{theyChose}What happened here is {char.ToLowerInvariant(fact[0])}{fact[1..]}{why}";
        }

        /// <summary>
        /// The reply in the companion's own voice, built from the exact option the student chose.
        ///
        /// WHY THIS READS LIKE A PERSON. It quotes the words they actually picked, reacts to that exact
        /// choice, and never says a thing was wrong: when their answer does not match, it lands the fact
        /// gently ("that is an easy one to mix up") and then shows the number. A reflection is the one
        /// place in the app where being slightly off should cost nothing but a second look.
        ///
        /// It is deterministic on purpose. The verdict is already decided here, so the sentence that has
        /// to agree with it should be built from the same values rather than written by something that can
        /// contradict them. Null for the end-of-session item, which keeps its own wording.
        /// </summary>
        private static ReflectionEvaluateResponse? WarmReply(ReflectionEvaluateRequest request, ReflectionQuestion asked)
        {
            if (asked.Id is "reflection-session-q1" or "reflection-session-q2") return null;

            var verdict = ReflectionQuestionBank.Grade(asked, request.Choice ?? "");
            var said = string.IsNullOrWhiteSpace(request.ChoiceLabel) ? "" : request.ChoiceLabel.Trim();
            var fact = Sentence(asked.RecordFact);

            // THREE SENTENCES, AND THE MIDDLE ONE IS ALWAYS THE RECORD.
            //
            // Not a stub and not a report. The first sentence answers the exact words the student picked,
            // the second says what actually happened, the third is the warmth that makes this a person
            // answering rather than a verdict printing. Anything else - a welcome, a recap of their
            // numbers, a summary of the exercise - is about the reflection rather than about what they
            // were asked, and that is what turned the earlier replies into a wall of text.
            //
            // The wording varies with a seed built from the question and the choice, so two different
            // answers never come back in the same words. It stays deterministic: the same answer gets the
            // same reply, which matters because the verdict and the words have to agree.
            var seed = asked.Id + "|" + request.Choice + "|" + said;

            if (asked.Kind == ReflectionQuestionBank.NextAction)
            {
                // "I'm not sure yet" is a real answer to a plan question and is not a plan, so it gets its
                // own wording instead of being quoted back as a promise the student never made.
                if (request.Choice == "not-sure-yet")
                    return new ReflectionEvaluateResponse
                    {
                        Feedback = "\"I'm not sure yet\" is a fair place to be. Something usually comes to you the next time you sit down with an exercise.",
                        Aligned = false,
                        InsightXp = 0,
                        NextStep = "",
                    };

                var opening = said.Length > 0
                    ? Pick([
                        $"\"{said}\" it is.",
                        $"\"{said}\" - good pick.",
                        $"\"{said}\". I like that one.",
                    ], seed)
                    : Pick(["One small change, then.", "Something different next time, then."], seed);

                var promise = "That is a small change that makes a real difference. "
                            + "Saying it now is what turns it into something you actually do.";

                return new ReflectionEvaluateResponse
                {
                    Feedback = said.Length > 0 ? $"{opening} {promise}" : $"{opening} Say now what it will be - putting it into words is what turns it into something you actually do.",
                    Aligned = false,
                    InsightXp = 0,
                    NextStep = said,
                };
            }

            // The help button: nothing was claimed, so there is no verdict to soften - the reply has to BE
            // the answer, read off the numbers, because that is what the student asked for.
            if (string.IsNullOrWhiteSpace(request.Choice))
                return new ReflectionEvaluateResponse
                {
                    Feedback = fact.Length > 0
                        ? $"I will read it off your numbers: {char.ToLowerInvariant(fact[0])}{fact[1..]} That is what I would go with."
                        : "Nothing in your numbers settles this one, so I would rather hear what you think.",
                    Aligned = false,
                    InsightXp = 0,
                    NextStep = "",
                };

            if (verdict.Status == "participation" || request.Choice is "not-sure" or "not-sure-yet")
            {
                var opening = Pick([
                    "That is okay - not every answer has a reason you can name.",
                    "That is okay. Some of these are hard to put into words.",
                    "Honestly, that is a fair answer.",
                ], seed);

                return new ReflectionEvaluateResponse
                {
                    Feedback = fact.Length > 0
                        ? $"{opening} {fact} You still stopped to look, which is the part that counts."
                        : $"{opening} You still stopped to look, which is the part that counts.",
                    Aligned = false,
                    InsightXp = verdict.InsightXp,
                    NextStep = "",
                };
            }

            var matched = verdict.InsightXp > 0;

            if (said.Length == 0)
                return new ReflectionEvaluateResponse
                {
                    Feedback = matched
                        ? $"Yes, that is right. {fact} You are reading your own numbers well."
                        : $"That is okay. {fact} These are easy to mix up, and you will spot it faster next time.",
                    Aligned = matched,
                    InsightXp = verdict.InsightXp,
                    NextStep = "",
                };

            // A soft landing instead of a verdict: the child looked at their work, and being slightly off
            // is the normal case. Nothing here ever says a thing was wrong.
            var reaction = matched
                ? Pick([
                    $"\"{said}\" - yes, that is it.",
                    $"\"{said}\" - exactly.",
                    $"\"{said}\" - you read that one right.",
                ], seed)
                : Pick([
                    $"\"{said}\"? I can see why you would say that.",
                    $"\"{said}\" - a fair guess.",
                    $"\"{said}\"? That is usually the first thought.",
                ], seed);

            var landing = matched
                ? Pick([
                    "That is a good read of your own work.",
                    "You know how you work, and that is worth something.",
                    "Nothing to fix there.",
                ], seed + "|" + reaction)
                : Pick([
                    "That is an easy one to mix up, and nothing is spoiled by it.",
                    "An easy one to mix up, and it costs you nothing here.",
                    "No harm done - this is exactly what looking back is for.",
                ], seed + "|" + reaction);

            return new ReflectionEvaluateResponse
            {
                Feedback = fact.Length > 0 ? $"{reaction} {fact} {landing}" : $"{reaction} {landing}",
                Aligned = matched,
                InsightXp = verdict.InsightXp,
                NextStep = "",
            };
        }

        /// <summary>
        /// One of a few ways of saying the same thing, chosen by the answer so the wording moves with it.
        ///
        /// Deterministic rather than random: the same answer has to come back in the same words, or a
        /// student comparing two replies in their history would read one choice answered two ways.
        /// </summary>
        private static string Pick(string[] options, string seed)
        {
            var hash = 17;
            foreach (var character in seed) hash = (hash * 31 + character) & 0x7fffffff;

            return options[hash % options.Length];
        }

        /// <summary>Starts a sentence: the facts are stored lower case so they can follow a colon.</summary>
        private static string Sentence(string text) =>
            string.IsNullOrWhiteSpace(text) ? "" : char.ToUpperInvariant(text[0]) + text[1..].TrimEnd('.') + ".";

        private static ReflectionEvaluateResponse BuildReflectionFallback(
            ReflectionEvaluateRequest request,
            ReflectionQueueRecord item,
            ReflectionEvidence evidence,
            ReflectionQuestion asked)
        {
            var warm = WarmReply(request, asked);
            if (warm is not null) return warm;

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
                        ? "Good, you have named something to work on next time."
                        : $"Good, you have picked \"{promise}\" for next time.",
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
                //
                // It OPENS IN THE COMPANION'S VOICE, because that is what was asked for. The model
                // produced "You chose the equalization method." often enough that the reply read as a
                // report about the student rather than someone helping: they pressed a button asking for
                // guidance and were handed a statement about themselves. The observation still has to be
                // in there — it is the answer — but it arrives as something the companion noticed, with
                // the student as the subject of the second clause rather than the first word.
                var did = ReflectionQuestionBank.DescribeRecordToStudent(evidence, asked);
                return new ReflectionEvaluateResponse
                {
                    Feedback = string.IsNullOrWhiteSpace(did)
                        ? "Happy to help with this one. I have nothing about that step to go on here, so the "
                          + "best I can say is to take the moment this question is about and give it a go "
                          + "on the next exercise."
                        : PippinObservation(did, asked),
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
                    : FactAndMeaning(shown, asked),
                Aligned = false,
                InsightXp = 0,
                NextStep = ""
            };
        }

        /// <summary>The offline reply: the fact about this question, then what that thing is for.</summary>
        private static string FactAndMeaning(string fact, ReflectionQuestion question) =>
            $"{char.ToUpperInvariant(fact[0])}{fact[1..]}."
            + (string.IsNullOrWhiteSpace(question.Meaning) ? "" : $" {question.Meaning}");

        /// <summary>
        /// The same fact, framed as something the companion noticed rather than a statement about the
        /// student. Used only for the help button, where the student asked for guidance.
        ///
        /// The record's line is written as a bare clause about them ("you worked the solution out
        /// yourself"), which is right for a reply that answers a claim and wrong for one that answers a
        /// request: it reads as a report on the student, when what they asked for was help with the
        /// question. Wrapping it keeps the fact — it IS the answer — and changes who is speaking.
        /// </summary>
        private static string PippinObservation(string fact, ReflectionQuestion question) =>
            $"Here is what I noticed about this one: {char.ToLowerInvariant(fact[0])}{fact[1..]}."
            + (string.IsNullOrWhiteSpace(question.Meaning) ? "" : $" {question.Meaning}");

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

        }
}
