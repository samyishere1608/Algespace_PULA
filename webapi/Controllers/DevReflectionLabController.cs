using Dapper;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using webapi.Models.Anchors;
using webapi.Models.Database;
using webapi.Models.Student;

namespace webapi.Controllers
{
    /// <summary>
    /// Fills a student's history with one crafted attempt (or goal window) and queues the reflection for it,
    /// so every scenario can be looked at without doing the exercises first.
    ///
    /// WHY THIS EXISTS. Checking the reflection means seeing it in states that only occur naturally in
    /// particular attempts: a skipped comparison, a tie between two exercises, a clean run, a goal with a
    /// hints limit. Producing those by hand means working through the exercises over and over, and a run
    /// that comes out slightly different tests nothing. This writes the rows the reflection reads and
    /// nothing else, so a scenario is one click and always the same.
    ///
    /// IT IS A DEVELOPMENT TOOL. Every endpoint answers 404 outside Development, and everything it writes
    /// carries <see cref="SeedMark"/> in the attempt's AgentCondition so it can be swept away again - each
    /// run clears the previous one first, so scenarios never contaminate each other's "your usual".
    ///
    /// It never awards anything: no XP, no progress, no completion - only the anchor records and the queue
    /// row the reflection is built from.
    /// </summary>
    [ApiController]
    [Route("dev/reflection")]
    public class DevReflectionLabController : ControllerBase
    {
        /// <summary>The AgentCondition written on every seeded attempt, so seeded rows can be deleted.</summary>
        public const string SeedMark = "DevLab";

        private readonly IWebHostEnvironment _environment;

        public DevReflectionLabController(IWebHostEnvironment environment) => _environment = environment;

        public record ScenarioInfo(string Id, string Title, string ItemType, string What);
        public record RunRequest(long StudentId, string Scenario);
        public record ClearRequest(long StudentId);

        /// <summary>What can be run, in the order a tester would want to work through them.</summary>
        [HttpGet("scenarios")]
        public ActionResult<List<ScenarioInfo>> Scenarios()
        {
            if (!_environment.IsDevelopment()) return NotFound();

            return Ok(Catalog()
                .Select(scenario => new ScenarioInfo(scenario.Id, scenario.Title, scenario.ItemType, scenario.What))
                .ToList());
        }

        /// <summary>
        /// Writes what <paramref name="request"/>'s scenario needs and queues its reflection, then hands
        /// back the queue item ready to render - the same shape the dashboard receives.
        /// </summary>
        [HttpPost("run")]
        public ActionResult<ReflectionQueueItemResponse> Run([FromBody] RunRequest request)
        {
            if (!_environment.IsDevelopment()) return NotFound();
            if (request.StudentId <= 0) return BadRequest("studentId is required.");

            var scenario = Catalog().FirstOrDefault(candidate => candidate.Id == request.Scenario);
            if (scenario is null) return BadRequest($"Unknown scenario '{request.Scenario}'.");

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();

            // One scenario at a time: the previous run's rows are what "your usual" would otherwise be
            // averaged over, so a tester working down the list would be testing the list, not the scenario.
            RemoveSeeded(conn, request.StudentId);

            foreach (var prior in scenario.Priors)
                WriteAttempt(conn, request.StudentId, scenario.ExerciseType, prior, daysAgo: 2);

            var attemptIds = scenario.Window
                .Select(run => WriteAttempt(conn, request.StudentId, scenario.ExerciseType, run, daysAgo: 0))
                .ToList();

            // A session's questions read the same window a goal's do, so it is seeded with one too: its
            // own exercises, in order, with what the student did in each. Without it the menu falls back
            // to "I made time to practise" and names nothing the day actually shows.
            var evidence = scenario.ItemType is "goal" or "session"
                ? JsonSerializer.Serialize(BuildWindow(scenario, attemptIds))
                : string.Empty;

            // The refusals belong to whatever was on screen before this run, including a session
            // reflection left pending in another tab: the lab clears its own attempts, but a session row
            // is not tied to an attempt and would otherwise be the newest thing of its type.
            conn.Execute(
                $"UPDATE {StudentProgressDBSettings.ReflectionQueueTable} SET Status = 'skipped' " +
                "WHERE StudentId = @StudentId AND Status = 'pending' AND ItemType = @ItemType",
                new { StudentId = request.StudentId, ItemType = scenario.ItemType });

            StudentProgressController.EnqueueReflection(
                conn,
                request.StudentId,
                scenario.ItemType,
                scenario.ItemId,
                scenario.Title,
                errors: scenario.Window.Sum(run => run.Errors),
                hints: scenario.Window.Sum(run => run.Hints),
                pippinMessages: 0,
                method: scenario.ExerciseType,
                decisions: scenario.ItemType == "goal" ? "" : scenario.Window[0].Decisions,
                focus: scenario.Focus,
                evidence: evidence,
                attemptId: scenario.ItemType == "goal" ? 0 : attemptIds[^1]);

            var item = conn.QueryFirstOrDefault<ReflectionQueueRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ReflectionQueueTable} " +
                "WHERE StudentId = @StudentId AND Status = 'pending' AND ItemType = @ItemType " +
                "ORDER BY Id DESC LIMIT 1",
                new { StudentId = request.StudentId, ItemType = scenario.ItemType });

            if (item is null) return Problem("Nothing was queued - check the server log.");

            return Ok(StudentProgressController.ToQueueResponse(conn, item));
        }

        /// <summary>Removes every seeded attempt, its records, and the reflections queued for it.</summary>
        [HttpPost("clear")]
        public ActionResult Clear([FromBody] ClearRequest request)
        {
            if (!_environment.IsDevelopment()) return NotFound();

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();

            var removed = RemoveSeeded(conn, request.StudentId);
            return Ok(new { removedAttempts = removed });
        }

        private static int RemoveSeeded(Microsoft.Data.Sqlite.SqliteConnection conn, long studentId)
        {
            var seeded = conn.Query<long>(
                $"SELECT Id FROM {AnchorStoreSettings.Table} WHERE StudentId = @StudentId AND AgentCondition = @Mark",
                new { StudentId = studentId, Mark = SeedMark }).ToList();

            if (seeded.Count > 0)
            {
                conn.Execute($"DELETE FROM {AnchorStoreSettings.RecordTable} WHERE AttemptId IN @Ids", new { Ids = seeded });
                conn.Execute($"DELETE FROM {AnchorStoreSettings.Table} WHERE Id IN @Ids", new { Ids = seeded });
                conn.Execute(
                    $"DELETE FROM {StudentProgressDBSettings.ReflectionQueueTable} WHERE StudentId = @StudentId AND AttemptId IN @Ids",
                    new { StudentId = studentId, Ids = seeded });
            }

            // A pending reflection is always in the way of the next scenario, whichever row it came from.
            conn.Execute(
                $"DELETE FROM {StudentProgressDBSettings.ReflectionQueueTable} " +
                "WHERE StudentId = @StudentId AND Status = 'pending' AND ItemType <> 'session'",
                new { StudentId = studentId });

            return seeded.Count;
        }

        // ── Writing the rows the reflection reads ────────────────────────────

        private static long WriteAttempt(
            Microsoft.Data.Sqlite.SqliteConnection conn, long studentId, string exerciseType, AttemptSeed run, int daysAgo)
        {
            var when = DateTime.UtcNow.AddDays(-daysAgo).ToString("yyyy-MM-ddTHH:mm:ss");

            conn.Execute(
                $"INSERT INTO {AnchorStoreSettings.Table} " +
                "(StudentId, ExerciseType, ExerciseId, SelectedMethod, AgentCondition, IsStudy, StartedAt, CompletedAt, TotalTime, TotalErrors, TotalHints) " +
                "VALUES (@StudentId, @ExerciseType, 1, @Method, @Mark, 0, @When, @When, @Time, @Errors, @Hints)",
                new
                {
                    StudentId = studentId,
                    ExerciseType = exerciseType,
                    Method = run.SelectedMethod,
                    Mark = SeedMark,
                    When = when,
                    Time = run.Steps.Sum(step => step.Time),
                    Errors = run.Steps.Sum(step => step.Errors),
                    Hints = run.Steps.Sum(step => step.Hints),
                });

            var attemptId = conn.ExecuteScalar<long>("SELECT last_insert_rowid()");

            foreach (var step in run.Steps)
                conn.Execute(
                    $"INSERT INTO {AnchorStoreSettings.RecordTable} (AttemptId, StudentId, Name, Choice, MessageType, Actions, Time, Errors, Hints, UpdatedAt) " +
                    "VALUES (@AttemptId, @StudentId, @Name, '', NULL, '', @Time, @Errors, @Hints, @When)",
                    new { AttemptId = attemptId, StudentId = studentId, step.Name, step.Time, step.Errors, step.Hints, When = when });

            return attemptId;
        }

        /// <summary>The goal window the goal questions are built from, in the shape the app stores it.</summary>
        private static ReflectionGoalWindow BuildWindow(Scenario scenario, List<long> attemptIds)
        {
            var window = new ReflectionGoalWindow
            {
                Quality = scenario.Quality,
                Limit = scenario.Limit,
                // A real goal's window is capped at five while the goal itself counted every exercise, so a
                // scenario can stand for a longer goal than the reflection looks at.
                TotalExercises = Math.Max(scenario.CountedExercises, scenario.Window.Length),
            };

            foreach (var run in scenario.Window)
                window.Exercises.Add(new ReflectionGoalExercise
                {
                    Method = 2,
                    ExerciseType = scenario.ExerciseType switch
                    {
                        "Efficiency" => 1,
                        "Suitability" => 2,
                        _ => 3,
                    },
                    Errors = run.Steps.Sum(step => step.Errors),
                    Hints = run.Steps.Sum(step => step.Hints),
                    Time = run.Steps.Sum(step => step.Time),
                    Own = run.Decisions.Contains("SolveOnOwn=Engaged"),
                    Explained = run.Decisions.Contains("SelfExplanation=Engaged"),
                    Compared = run.Decisions.Contains("MethodComparison=Engaged"),
                    WasShown = run.Decisions.Contains("SolveOnOwn=Declined"),
                });

            window.AttemptIds = [.. attemptIds];
            return window;
        }

        // ── The scenarios ────────────────────────────────────────────────────

        private sealed class StepSeed
        {
            public StepSeed(string name, double time, int errors = 0, int hints = 0)
            {
                Name = name;
                Time = time;
                Errors = errors;
                Hints = hints;
            }

            public string Name { get; }
            public double Time { get; }
            public int Errors { get; }
            public int Hints { get; }
        }

        private sealed class AttemptSeed
        {
            public AttemptSeed(string selectedMethod, string decisions, StepSeed[] steps)
            {
                SelectedMethod = selectedMethod;
                Decisions = decisions;
                Steps = steps;
            }

            public string SelectedMethod { get; }
            public string Decisions { get; }
            public StepSeed[] Steps { get; }

            public int Errors => Steps.Sum(step => step.Errors);
            public int Hints => Steps.Sum(step => step.Hints);
        }

        private sealed class Scenario
        {
            public Scenario(
                string id, string title, string itemType, string itemId, string exerciseType, string focus,
                string quality, int limit, AttemptSeed[] priors, AttemptSeed[] window, string what,
                // How many exercises the goal itself counted, when that is more than the window holds.
                // Zero means "the window is the whole goal", which is the ordinary case.
                int countedExercises = 0)
            {
                Id = id;
                Title = title;
                ItemType = itemType;
                ItemId = itemId;
                ExerciseType = exerciseType;
                Focus = focus;
                Quality = quality;
                Limit = limit;
                Priors = priors;
                Window = window;
                What = what;
                CountedExercises = countedExercises;
            }

            public string Id { get; }
            public string Title { get; }
            public string ItemType { get; }
            public string ItemId { get; }
            public string ExerciseType { get; }
            public string Focus { get; }
            public string Quality { get; }
            public int Limit { get; }
            public AttemptSeed[] Priors { get; }
            public AttemptSeed[] Window { get; }
            public string What { get; }
            public int CountedExercises { get; }
        }

        /// <summary>
        /// Every scenario, each written to land on a different question.
        ///
        /// The two priors differ from each other, so "your usual" is the average of two real attempts rather
        /// than one attempt counted twice, and the numbers inside a window are uneven the way a student's
        /// own work is: a quick clean one beside a slow one with hints in it.
        /// </summary>
        private static List<Scenario> Catalog()
        {
            // Real attempts on this app record a few seconds per part and ten to forty seconds in total,
            // and these rows sit beside the student's own history in the "your usual" average. The step
            // times below are written at a readable scale and divided here, so a scripted three-minute run
            // cannot drag that baseline out of range.
            const double Pace = 0.125;

            StepSeed[] Steps(double choose, double setup, double solve, double explain,
                int setupErrors = 0, int setupHints = 0, int solveErrors = 0, int solveHints = 0,
                // The two ends of the run can carry mistakes too. Without them every "clean" scenario had
                // choosing and explaining level at zero, so the question's one-best-part wording - the one
                // a student reaches by slipping in the method choice - could never be looked at.
                int chooseErrors = 0, int explainErrors = 0) =>
            [
                new("EfficiencySelection", choose * Pace, chooseErrors),
                new("Substitution", setup * Pace, setupErrors, setupHints),
                new("FirstSolution", solve * Pace, solveErrors, solveHints),
                new("SelfExplanation", explain * Pace, explainErrors),
            ];

            // Two priors that differ, because a student's last two goes are never the same run twice. One
            // carries the mistakes and the other the hints, so "your usual" is an average of two real
            // attempts rather than one attempt counted twice.
            var usual = new AttemptSeed("Substitution", "SolveOnOwn=Engaged", Steps(20, 60, 80, 25, setupErrors: 2));
            var usualSlower = new AttemptSeed("Substitution", "SolveOnOwn=Engaged", Steps(28, 74, 96, 21, setupErrors: 1, setupHints: 1));

            return
            [
                new("exercise-clean", "Exercise • clean run", "exercise", "Suitability", "Suitability", "", "", 0,
                    [usual, usualSlower],
                    [new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(12, 40, 55, 18))],
                    "Nothing went wrong: the part question picks the cleanest part and the reasons are measured against usual."),

                new("exercise-skipped-compare", "Exercise • skipped the comparison", "exercise", "Suitability", "Suitability", "", "", 0,
                    [usual, usualSlower],
                    [new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Declined", Steps(15, 70, 90, 20, setupErrors: 1))],
                    "The compare step was offered and declined, so Q2 is about that rather than about the mistake."),

                new("exercise-skipped-explain", "Exercise • skipped the explanation", "exercise", "Efficiency", "Efficiency", "", "", 0,
                    [usual, usualSlower],
                    [new AttemptSeed("Elimination", "SolveOnOwn=Engaged;SelfExplanation=Declined", Steps(18, 65, 85, 12))],
                    "Efficiency declines the explanation, so Q2 asks about the skipped explain step."),

                new("exercise-match-declined", "Exercise • matching, explanation declined", "exercise", "Matching", "Matching", "", "", 0,
                    [usual, usualSlower],
                    [new AttemptSeed("Substitution", "SolveOnOwn=Declined;SelfExplanation=Declined", Steps(25, 50, 60, 10))],
                    "Matching hands the method over, so the panel says the app did it and Q2 asks about the explanation."),

                new("exercise-hints", "Exercise • hints taken", "exercise", "Suitability", "Suitability", "", "", 0,
                    [usual, usualSlower],
                    [new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(30, 95, 120, 22, setupHints: 2))],
                    "Hints in the applying step, so Q2 is the hints question and the hints tile is not zero."),

                new("goal-self-explanation", "Goal • explain your thinking", "goal", "selfExplanation", "Efficiency", "selfExplanation", "", 0,
                    [usual, usualSlower],
                    [
                        new AttemptSeed("Elimination", "SolveOnOwn=Engaged;SelfExplanation=Engaged", Steps(20, 55, 70, 30)),
                        new AttemptSeed("Elimination", "SolveOnOwn=Engaged;SelfExplanation=Engaged", Steps(18, 50, 65, 28)),
                        new AttemptSeed("Elimination", "SolveOnOwn=Engaged;SelfExplanation=Engaged", Steps(24, 95, 80, 26, setupErrors: 1)),
                    ],
                    "Three explained runs with one costly last exercise, so the two goal questions point at different runs."),

                new("goal-method-comparison", "Goal • compare methods", "goal", "methodComparison", "Suitability", "methodComparison", "", 0,
                    [usual, usualSlower],
                    [
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(16, 60, 75, 20)),
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Declined", Steps(20, 70, 95, 18, setupErrors: 2)),
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(15, 55, 65, 19)),
                    ],
                    "One run skipped the comparison, so the panel counts it: compared in 2 of 3."),

                new("goal-tie", "Goal • two runs tied", "goal", "method", "Suitability", "Substitution", "", 0,
                    [usual, usualSlower],
                    [
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(15, 60, 70, 20, setupErrors: 2)),
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(25, 50, 55, 15)),
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(12, 55, 60, 18, setupErrors: 2)),
                    ],
                    "Exercises 1 and 3 both have 2 mistakes: the tie is broken by hints, then by time."),

                new("exercise-time-decides", "Exercise • time decides the best part", "exercise", "Suitability", "Suitability", "", "", 0,
                    [usual, usualSlower],
                    [
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged",
                        [
                            new("EfficiencySelection", 18 * Pace, 1),
                            new("Substitution", 55 * Pace, 1),
                            new("FirstSolution", 48 * Pace, 1),
                            new("SelfExplanation", 16 * Pace, 1),
                        ]),
                    ],
                    "Every part has one mistake, so no part is ahead: the question says they all went well and asks what worked."),

                new("exercise-time-decides-clean", "Exercise • time decides, nothing wrong", "exercise", "Suitability", "Suitability", "", "", 0,
                    [usual, usualSlower],
                    [new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(20, 60, 50, 14))],
                    "No part has a mistake or a hint, so every part went well and the question asks what worked overall."),

                new("goal-time-decides", "Goal • time decides the best run", "goal", "method", "Suitability", "Substitution", "", 0,
                    [usual, usualSlower],
                    [
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(15, 60, 70, 20, setupErrors: 2)),
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(20, 65, 75, 22, setupErrors: 2)),
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(25, 70, 80, 25, setupErrors: 3)),
                    ],
                    "Exercises 1 and 2 both have 2 mistakes and no hints, so the question says two of them went well."),

                new("goal-time-decides-clean", "Goal • time decides, nothing wrong", "goal", "method", "Suitability", "Substitution", "", 0,
                    [usual, usualSlower],
                    [
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(20, 60, 70, 20)),
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(25, 68, 80, 22)),
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(22, 64, 75, 21)),
                    ],
                    "Three clean runs, so the question says every exercise went well and asks what worked overall."),

                new("goal-method", "Goal • method goal (stick with one method)", "goal", "method", "Suitability", "Substitution", "", 0,
                    [usual, usualSlower],
                    [
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(26, 78, 118, 34, setupErrors: 1, setupHints: 1)),
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(14, 42, 61, 16)),
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Declined", Steps(19, 105, 92, 23, setupErrors: 2, solveHints: 1)),
                    ],
                    "A method goal with an uneven window: one slow run with hints, one quick clean run, one that went off the rails."),

                new("goal-exercise-type", "Goal • exercise goal (three of one type)", "goal", "exerciseType", "Suitability", "Suitability", "", 0,
                    [usual, usualSlower],
                    [
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(22, 68, 88, 24, setupErrors: 1)),
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(11, 39, 52, 13)),
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(31, 96, 132, 29, setupErrors: 3, setupHints: 2)),
                    ],
                    "A goal on the exercise type itself: the middle run is clean, the last one is where it went wrong."),

                new("goal-solve-on-own", "Goal • solve them on your own", "goal", "solveOnOwn", "Efficiency", "solveOnOwn", "", 0,
                    [usual, usualSlower],
                    [
                        new AttemptSeed("Elimination", "SolveOnOwn=Engaged;SelfExplanation=Engaged", Steps(17, 52, 66, 19)),
                        new AttemptSeed("Elimination", "SolveOnOwn=Declined;SelfExplanation=Declined", Steps(9, 88, 74, 0, setupErrors: 2)),
                        new AttemptSeed("Elimination", "SolveOnOwn=Engaged;SelfExplanation=Engaged", Steps(21, 47, 59, 24, setupHints: 1)),
                    ],
                    "One run was shown the answer instead of working it out, so the panel counts 2 of 3 and Q2 lands on that run."),

                new("session-reflection", "Session • end-of-session reflection", "session", "session", "Suitability", "", "", 0,
                    [usual, usualSlower],
                    [
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(24, 71, 96, 27, setupErrors: 1, setupHints: 1)),
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Declined", Steps(12, 44, 58, 15)),
                        new AttemptSeed("Substitution", "SolveOnOwn=Declined;MethodComparison=Engaged", Steps(31, 88, 74, 20, setupErrors: 2)),
                    ],
                    "The end-of-session reflection: two menus of true statements about the day, with the day's own counts in them."),

                new("goal-hints-limit", "Goal • a hint limit was set", "goal", "hintsAndErrors", "Efficiency", "hintsAndErrors", "hints", 1,
                    [usual, usualSlower],
                    [
                        new AttemptSeed("Elimination", "SolveOnOwn=Engaged;SelfExplanation=Engaged", Steps(23, 71, 84, 26, setupHints: 3)),
                        new AttemptSeed("Elimination", "SolveOnOwn=Engaged;SelfExplanation=Engaged", Steps(16, 48, 57, 15)),
                        new AttemptSeed("Elimination", "SolveOnOwn=Engaged;SelfExplanation=Engaged", Steps(12, 63, 49, 18, setupErrors: 1)),
                    ],
                    "A hints goal, so Q2 uses the wording about hints and the hints tile carries the count."),

                new("goal-errors-limit", "Goal • a mistake limit was set", "goal", "hintsAndErrors", "Efficiency", "hintsAndErrors", "errors", 1,
                    [usual, usualSlower],
                    [
                        new AttemptSeed("Elimination", "SolveOnOwn=Engaged;SelfExplanation=Engaged", Steps(19, 58, 72, 21, setupErrors: 2)),
                        new AttemptSeed("Elimination", "SolveOnOwn=Engaged;SelfExplanation=Engaged", Steps(24, 66, 79, 17)),
                        new AttemptSeed("Elimination", "SolveOnOwn=Engaged;SelfExplanation=Engaged", Steps(13, 45, 54, 16, solveErrors: 1)),
                    ],
                    "The same goal measured on mistakes instead of hints, so Q2 uses the other wording."),

                new("exercise-first-time", "Exercise • first ever run of the type", "exercise", "Suitability", "Suitability", "", "", 0,
                    [],
                    [new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(13, 46, 62, 19, setupErrors: 1))],
                    "No history for this exercise type, so there is no usual to compare with and the reasons are absolute."),

                new("exercise-one-part-best", "Exercise • one part clearly best", "exercise", "Suitability", "Suitability", "", "", 0,
                    [usual, usualSlower],
                    [new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(20, 58, 74, 21, chooseErrors: 1, setupErrors: 2, solveErrors: 1))],
                    "Only the explanation came out clean, so the question points at one part rather than at a tie."),

                // A minutes goal has no bound on how many exercises it takes, so the window the reflection
                // looks at is the tail of the goal. This is the scenario that says so out loud.
                new("goal-past-the-window", "Goal • longer goal than the window", "goal", "method", "Suitability", "Substitution", "", 0,
                    [usual, usualSlower],
                    [
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(24, 71, 96, 27, setupErrors: 1)),
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(12, 44, 58, 15)),
                        new AttemptSeed("Substitution", "SolveOnOwn=Engaged;MethodComparison=Engaged", Steps(31, 88, 74, 20, setupErrors: 2, solveHints: 1)),
                    ],
                    "A goal that took nine exercises: the reflection looks at the last three and says so.",
                    countedExercises: 9),
            ];
        }
    }
}
