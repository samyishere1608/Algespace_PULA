namespace webapi.Models.Student
{
    // ── Stored in students.db ──────────────────────────────────────────────────

    /// <summary>Running XP total per student (one row per student).</summary>
    public class StudentProgressRecord
    {
        public long StudentId { get; set; }
        public int TotalXP { get; set; }
        public int ExercisesCompleted { get; set; }
        public int StreakDays { get; set; }
        public string LastExerciseDate { get; set; } = "";
        public int ChoiceXP { get; set; }
        public int InsightXP { get; set; }
        public int ResolveXP { get; set; }
        public int LifetimeAgencyXP { get; set; }
        /// <summary>Current onboarding step: "bartering" | "equalization" | "elimination" | "complete".</summary>
        public string OnboardingStep { get; set; } = "bartering";
        /// <summary>JSON array of completed tutorial keys (e.g. ["elimination","equalization"]).</summary>
        public string TutorialsCompleted { get; set; } = "[]";
    }

    /// <summary>One log entry per goal completion event.</summary>
    public class GoalCompletionRecord
    {
        public long Id { get; set; }
        public long StudentId { get; set; }
        /// <summary>
        /// One of the six goal categories: method | exerciseType | selfExplanation |
        /// methodComparison | solveOnOwn | hintsAndErrors. Stable, so historical rows stay readable.
        /// </summary>
        public string GoalId { get; set; } = "";
        /// <summary>
        /// The goal as the student saw it, e.g. "5 Elimination exercises". Stored verbatim because the
        /// goal's numbers are part of its identity — "5 exercises" and "3 exercises" are different
        /// goals, and the label is the only place that survives.
        /// </summary>
        public string GoalLabel { get; set; } = "";
        public int XpEarned { get; set; }
        public string ExerciseType { get; set; } = "";
        public int TotalErrors { get; set; }
        public int TotalHints { get; set; }
        public int PippinMessages { get; set; }
        public string CompletedAt { get; set; } = "";
    }

    // ── Request / Response DTOs ───────────────────────────────────────────────

    public class LogGoalRequest
    {
        public long StudentId { get; set; }
        /// <summary>One of the six goal categories. The client owns the goal model.</summary>
        public string GoalId { get; set; } = "";
        public string GoalLabel { get; set; } = "";
        /// <summary>Resolve XP awarded for following through on the goal.</summary>
        public int XpEarned { get; set; }
        public string ExerciseType { get; set; } = "";
        public int TotalErrors { get; set; }
        public int TotalHints { get; set; }
    }

    /// <summary>
    /// One goal the student is working on. Mirrors `StudyGoal` on the client field for field, so a
    /// mismatch shows up as a compile-time contract break rather than as a goal that silently stops
    /// counting.
    /// </summary>
    public class ActiveGoalRecord
    {
        /// <summary>Instance id. Two goals can share a category, so the category is not an identity.</summary>
        public string Id { get; set; } = "";

        public long StudentId { get; set; }

        /// <summary>One of the six categories. Opaque here — the client owns the catalogue.</summary>
        public string Category { get; set; } = "";

        /// <summary>The method or exercise type the goal is about. Empty means "any".</summary>
        public string Focus { get; set; } = "";

        public string Metric { get; set; } = "exercises";

        public double Target { get; set; }

        /// <summary>hintsAndErrors only: "hints" or "errors". Empty for the other five.</summary>
        public string Quality { get; set; } = "";

        /// <summary>hintsAndErrors only: the per-exercise limit the student must stay within.</summary>
        public int MaxPerExercise { get; set; }

        /// <summary>
        /// When the goal was set, as "yyyy-MM-ddTHH:mm:ssZ".
        ///
        /// The trailing Z is load-bearing. The client parses this with `new Date(...)`, and without a
        /// zone marker that is read as LOCAL time, shifting the goal's start by the browser's offset;
        /// every exercise in that window would then count towards a goal that did not exist yet.
        /// The other stamps in this schema are compared as strings and so need no zone — this one is
        /// read as an instant, so it does.
        /// </summary>
        public string CreatedAt { get; set; } = "";
    }

    /// <summary>Request to set (add, or replace by id) one active goal.</summary>
    public class SetActiveGoalRequest
    {
        public long StudentId { get; set; }
        public string Id { get; set; } = "";
        public string Category { get; set; } = "";
        public string? Focus { get; set; }
        public string? Metric { get; set; }
        public double Target { get; set; }
        public string? Quality { get; set; }
        public int MaxPerExercise { get; set; }
        public string CreatedAt { get; set; } = "";
    }

    /// <summary>Request to clear several goals at once — what happens when they complete together.</summary>
    public class RemoveActiveGoalsRequest
    {
        public long StudentId { get; set; }
        public List<string> GoalIds { get; set; } = [];
    }

    public class LogExerciseRequest
    {
        public long StudentId { get; set; }
        public string ExerciseType { get; set; } = "";
        public int Errors { get; set; }
        public int Hints { get; set; }

        /// <summary>
        /// What the student decided during the exercise, e.g. "SolveOnOwn=Declined".
        ///
        /// Errors and hints cannot distinguish "I found this easy" from "this was easy because I
        /// asked to be shown the answer". A student who took the help has nothing recorded that
        /// disagrees with them, so without this the reflection scores their self-assessment against
        /// evidence that the help itself produced. Empty when they never reached a decision point,
        /// which must be read as "unknown" rather than "engaged".
        /// </summary>
        public string Decisions { get; set; } = "";
    }

    public class SpendXpRequest
    {
        public long StudentId { get; set; }
        public int Amount { get; set; }
    }

    /// <summary>Request to log agency XP earned (Choice, Insight, or Resolve).</summary>
    public class LogAgencyXpRequest
    {
        public long StudentId { get; set; }
        public string XpType { get; set; } = "";    // "choice" | "insight" | "resolve"
        public int Amount { get; set; }
        public string Source { get; set; } = "";     // e.g. "daily-intention", "solo-solve", "retry"
    }

    // ── Tutorial / Onboarding Progress ───────────────────────────────────────

    /// <summary>Response for GET /student-progress/tutorial/{studentId}.</summary>
    public class TutorialStateResponse
    {
        public string OnboardingStep { get; set; } = "bartering";
        public List<string> TutorialsCompleted { get; set; } = [];
    }

    /// <summary>Request to advance onboarding step and/or mark a tutorial complete.</summary>
    public class TutorialUpdateRequest
    {
        public long StudentId { get; set; }
        /// <summary>Optional new onboarding step. Empty = don't change.</summary>
        public string OnboardingStep { get; set; } = "";
        /// <summary>Optional tutorial key to mark complete (e.g. "elimination"). Empty = don't add.</summary>
        public string TutorialKey { get; set; } = "";
    }

    // ── Exercise Completion (CK + PK + tutorials in one table) ───────────────

    /// <summary>One completed exercise/tutorial entry.</summary>
    public class ExerciseCompletionRecord
    {
        public long Id { get; set; }
        public long StudentId { get; set; }
        /// <summary>"conceptual-knowledge" | "procedural-knowledge".</summary>
        public string Category { get; set; } = "";
        /// <summary>Exercise group key: "elimination" | "equalization" | "substitution" | "flexibility-training".</summary>
        public string ExerciseKey { get; set; } = "";
        /// <summary>Specific exercise id, or "tutorial".</summary>
        public string ExerciseId { get; set; } = "";
        public string CompletedAt { get; set; } = "";
    }

    /// <summary>Request to mark a single exercise/tutorial complete.</summary>
    public class ExerciseCompletionRequest
    {
        public long StudentId { get; set; }
        public string Category { get; set; } = "";
        public string ExerciseKey { get; set; } = "";
        public string ExerciseId { get; set; } = "";
    }

    /// <summary>Request for AI to compare student's self-reflection against their data.</summary>
    public class ReflectOnStatsRequest
    {
        public string StudentReflection { get; set; } = "";
        /// <summary>Language for the feedback, so the reply matches the language the student works in.</summary>
        public string Language { get; set; } = "en";
    }

    /// <summary>AI feedback on how well the student's self-assessment matches reality.</summary>
    public class ReflectOnStatsResponse
    {
        public string Feedback { get; set; } = "";
        /// <summary>"practice" | "goal" | "both" | "unclear" | "no_xp"</summary>
        public string Category { get; set; } = "unclear";
    }

    // ── Post-exercise Reflection ─────────────────────────────────────────────

    /// <summary>One item waiting for the student to reflect on it.</summary>
    public class ReflectionQueueRecord
    {
        public long Id { get; set; }
        public long StudentId { get; set; }
        /// <summary>"goal" | "exercise"</summary>
        public string ItemType { get; set; } = "";
        public string ItemId { get; set; } = "";
        public string ItemLabel { get; set; } = "";
        public string Status { get; set; } = "pending";
        public int Errors { get; set; }
        public int Hints { get; set; }
        public int PippinMessages { get; set; }
        /// <summary>Exercise type or solving method for this item.</summary>
        public string Method { get; set; } = "";

        /// <summary>
        /// What the student decided on this exercise, e.g. "SolveOnOwn=Declined".
        ///
        /// Stored as a snapshot, like the error and hint counts beside it, because the reflection is
        /// graded against how the exercise went — and how it went includes what the student chose,
        /// not only what they got wrong. Empty on rows written before this column existed and on
        /// exercises with no decision points.
        /// </summary>
        public string Decisions { get; set; } = "";

        public string CompletedAt { get; set; } = "";
    }

    /// <summary>One saved turn of a reflection conversation (for AI context).</summary>
    public class ReflectionHistoryRecord
    {
        public long Id { get; set; }
        public long StudentId { get; set; }
        public string ItemType { get; set; } = "";
        public string ItemId { get; set; } = "";
        /// <summary>"pippin" | "student" | "system"</summary>
        public string Role { get; set; } = "";
        public string Text { get; set; } = "";
        public int InsightXp { get; set; }
        public string CreatedAt { get; set; } = "";
    }

    /// <summary>Request to evaluate one reflection answer.</summary>
    public class ReflectionEvaluateRequest
    {
        public long StudentId { get; set; }
        public long QueueItemId { get; set; }
        /// <summary>1 | 2 | 3 (3 = final "next steps" question)</summary>
        public int QuestionNumber { get; set; }
        /// <summary>"self" | "pippin"</summary>
        public string Mode { get; set; } = "self";
        public string Answer { get; set; } = "";
        public string Language { get; set; } = "en";
    }

    public class ReflectionEvaluateResponse
    {
        public string Feedback { get; set; } = "";
        public bool Aligned { get; set; }
        public int InsightXp { get; set; }
        /// <summary>Concrete next step (filled for the final question).</summary>
        public string NextStep { get; set; } = "";
        /// <summary>
        /// True when the answer was unusable — unrelated to the exercise — and the student should be
        /// asked to write it again. The turn is NOT persisted and no Insight XP is awarded, so the
        /// student is neither rewarded nor credited with a reflection they did not actually make.
        /// </summary>
        public bool NeedsRetry { get; set; }
    }

    /// <summary>Marks a reflection item complete and persists its chat history.</summary>
    public class ReflectionCompleteRequest
    {
        public long StudentId { get; set; }
        public long QueueItemId { get; set; }
        /// <summary>If true, marks the item skipped (no history saved).</summary>
        public bool Skip { get; set; }
        public List<ReflectionHistoryRecord> History { get; set; } = [];
    }


    /// <summary>One log entry per exercise completion (used for charts).</summary>
    public class ExerciseLogRecord
    {
        public long StudentId { get; set; }
        public string ExerciseType { get; set; } = "";
        public string CompletedAt { get; set; } = "";
    }

    public class MethodCount
    {
        public string Method { get; set; } = "";
        public int Value { get; set; }
    }

    /// <summary>
    /// How many goals of one category a student has completed, all time.
    ///
    /// Keyed by the SAME six category names the client uses (method | exerciseType | selfExplanation |
    /// methodComparison | solveOnOwn | hintsAndErrors), so the client can look each one up in its own
    /// catalogue without a translation layer. Categories with no completions are simply absent, so the
    /// client renders a zero for them rather than the server inventing rows.
    /// </summary>
    public class GoalCategoryCount
    {
        public string Category { get; set; } = "";
        public int Count { get; set; }
    }

    public class DailyXp
    {
        public string Day { get; set; } = "";
        public int Xp { get; set; }
    }

    public class StudentProgressResponse
    {
        public int TotalXP { get; set; }
        public int ExercisesCompleted { get; set; }
        public int StreakDays { get; set; }
        public int ChoiceXP { get; set; }
        public int InsightXP { get; set; }
        public int ResolveXP { get; set; }
        public int LifetimeAgencyXP { get; set; }
        /// <summary>
        /// Goals completed in the current calendar week, for the "recently completed" list.
        /// Week-scoped on purpose here — this is a "what have you done lately" panel, and saying so
        /// is the difference between a useful nudge and reading like the history was wiped.
        /// </summary>
        public List<GoalCompletionRecord> GoalsThisWeek { get; set; } = [];
        /// <summary>
        /// Goals completed per category, ALL TIME.
        ///
        /// Deliberately lifetime rather than week-scoped, unlike <see cref="GoalsThisWeek"/>: this
        /// panel answers "what am I actually working on", and a weekly filter would show a student
        /// their history resetting every Monday. It replaces the removed goals-by-difficulty panel,
        /// which was also kept lifetime for the same reason.
        /// </summary>
        public List<GoalCategoryCount> GoalCountsByCategory { get; set; } = [];
        public List<MethodCount> MethodCounts { get; set; } = [];
        /// <summary>Actual solving methods used (Elimination, Equalization, Substitution) from ExerciseCompletions.</summary>
        public List<MethodCount> SolvingMethodCounts { get; set; } = [];
        public List<DailyXp> DailyXp { get; set; } = [];
    }

    // ── Weak-Area Detection ───────────────────────────────────────────────────

    /// <summary>One dimension of student weakness evaluation.</summary>
    public class WeaknessDimension
    {
        /// <summary>Machine key: "decision-accuracy" | "efficiency-judgment" | "method-recognition" | "computational-skill" | "independence" | "consistency"</summary>
        public string Key { get; set; } = "";
        /// <summary>Display label.</summary>
        public string Label { get; set; } = "";
        /// <summary>Score 0–100, higher = stronger.</summary>
        public int Score { get; set; }
        /// <summary>Max possible score (always 100).</summary>
        public int MaxScore { get; set; } = 100;
        /// <summary>Recommended exercise type to improve this area.</summary>
        public string RecommendedExercise { get; set; } = "";
    }

    /// <summary>Response for GET /student-progress/weakness/{studentId}.</summary>
    public class WeaknessResponse
    {
        /// <summary>All 6 dimensions with computed scores.</summary>
        public List<WeaknessDimension> Dimensions { get; set; } = [];
        /// <summary>The single weakest dimension.</summary>
        public WeaknessDimension? Weakest { get; set; }
    }

    /// <summary>Aggregated stats from GoalCompletions table (used by weakness endpoint).</summary>
    public class GoalCompletionStats
    {
        public int TotalGoalCompletions { get; set; }
        public double AvgErrors { get; set; }
        public double AvgHints { get; set; }
        public double AvgPippin { get; set; }
    }

    /// <summary>One agency XP log entry.</summary>
    public class AgencyLogEntry
    {
        public long Id { get; set; }
        public long StudentId { get; set; }
        public string XpType { get; set; } = "";
        public int Amount { get; set; }
        public string Source { get; set; } = "";
        public string LoggedAt { get; set; } = "";
    }

    // ── Session Analysis (Anchor 5.1) ─────────────────────────────────────────

    /// <summary>Response for GET /student-progress/analyze-session/{studentId}.</summary>
    public class SessionAnalysisResponse
    {
        /// <summary>AI-generated summary of today's session (2-3 paragraphs).</summary>
        public string Summary { get; set; } = "";
        /// <summary>What the student did well today.</summary>
        public string Strengths { get; set; } = "";
        /// <summary>
        /// Area the student could improve.
        ///
        /// Named `Improvement` to match what the client actually reads. It was `ImprovementArea`,
        /// which serialises to `improvementArea`, so `analysis.improvement` in EndSessionModal was
        /// always undefined and that whole block rendered empty.
        /// </summary>
        public string Improvement { get; set; } = "";
        /// <summary>2-3 actionable steps for the next session.</summary>
        public List<string> ActionSteps { get; set; } = [];
        /// <summary>Whether this was generated by AI or rule-based fallback.</summary>
        public bool IsAiGenerated { get; set; }

        // ── Visualization data ──────────────────────────────────────────────

        /// <summary>Exercise type counts: e.g. {"Suitability":5, "Efficiency":3, "Matching":1}</summary>
        public Dictionary<string, int> ExerciseTypeBreakdown { get; set; } = [];
        /// <summary>Hints taken and errors made across the goals completed today.</summary>
        public int TotalHintsToday { get; set; }
        public int TotalErrorsToday { get; set; }
        /// <summary>Total exercises today</summary>
        public int ExercisesToday { get; set; }
        /// <summary>Goals completed today (labels)</summary>
        public List<string> GoalsCompletedToday { get; set; } = [];
        /// <summary>Total goals that were active</summary>
        public int ActiveGoalsCount { get; set; }
    }

    // ── DB Settings ───────────────────────────────────────────────────────────

    public static class StudentProgressDBSettings
    {
        public const string ProgressTable = "StudentProgress";
        public const string ProgressScheme =
            "StudentId INTEGER PRIMARY KEY, TotalXP INTEGER NOT NULL DEFAULT 0, " +
            "ExercisesCompleted INTEGER NOT NULL DEFAULT 0, " +
            "StreakDays INTEGER NOT NULL DEFAULT 0, " +
            "LastExerciseDate TEXT NOT NULL DEFAULT '', " +
            "ChoiceXP INTEGER NOT NULL DEFAULT 0, " +
            "InsightXP INTEGER NOT NULL DEFAULT 0, " +
            "ResolveXP INTEGER NOT NULL DEFAULT 0, " +
            "LifetimeAgencyXP INTEGER NOT NULL DEFAULT 0, " +
            "OnboardingStep TEXT NOT NULL DEFAULT 'bartering', " +
            "TutorialsCompleted TEXT NOT NULL DEFAULT '[]'";

        public const string AgencyLogTable = "AgencyLog";
        public const string AgencyLogScheme =
            "Id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "StudentId INTEGER NOT NULL, " +
            "XpType TEXT NOT NULL, " +
            "Amount INTEGER NOT NULL, " +
            "Source TEXT NOT NULL DEFAULT '', " +
            "LoggedAt TEXT NOT NULL";

        public const string GoalsTable = "GoalCompletions";
        public const string GoalsScheme =
            "Id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "StudentId INTEGER NOT NULL, " +
            "GoalId TEXT NOT NULL, " +
            "GoalLabel TEXT NOT NULL, " +
            "XpEarned INTEGER NOT NULL, " +
            "ExerciseType TEXT NOT NULL, " +
            "TotalErrors INTEGER NOT NULL, " +
            "TotalHints INTEGER NOT NULL, " +
            "PippinMessages INTEGER NOT NULL, " +
            "CompletedAt TEXT NOT NULL";

        /// <summary>
        /// The goals the student is currently working on.
        ///
        /// A goal is a commitment, and its progress is measured against history this server holds.
        /// Kept in the browser, the two could disagree: clearing storage erased the commitment while
        /// every exercise that counted towards it stayed, and the same student on a second device saw
        /// no goals at all while their progress towards them was still being counted. So the goal
        /// itself is a record, not a preference.
        ///
        /// The CATALOGUE stays on the client — what a goal means, how it is counted, which exercise
        /// types can advance it. This table stores only the choice the student made, which is why a
        /// category can be renamed or a metric dropped without a migration here.
        /// </summary>
        public const string ActiveGoalsTable = "ActiveGoals";
        public const string ActiveGoalsScheme =
            "StudentId INTEGER NOT NULL, " +
            "Id TEXT NOT NULL, " +
            "Category TEXT NOT NULL, " +
            "Focus TEXT NOT NULL DEFAULT '', " +
            "Metric TEXT NOT NULL DEFAULT 'exercises', " +
            "Target REAL NOT NULL DEFAULT 0, " +
            "Quality TEXT NOT NULL DEFAULT '', " +
            "MaxPerExercise INTEGER NOT NULL DEFAULT 0, " +
            "CreatedAt TEXT NOT NULL, " +
            "PRIMARY KEY (StudentId, Id)";

        public const string ExerciseLogTable = "ExerciseLog";
        public const string ExerciseLogScheme =
            "Id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "StudentId INTEGER NOT NULL, " +
            "ExerciseType TEXT NOT NULL, " +
            "CompletedAt TEXT NOT NULL";

        public const string ExerciseCompletionsTable = "ExerciseCompletions";
        public const string ExerciseCompletionsScheme =
            "Id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "StudentId INTEGER NOT NULL, " +
            "Category TEXT NOT NULL, " +
            "ExerciseKey TEXT NOT NULL, " +
            "ExerciseId TEXT NOT NULL, " +
            "CompletedAt TEXT NOT NULL";

        public const string ReflectionQueueTable = "ReflectionQueue";
        public const string ReflectionQueueScheme =
            "Id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "StudentId INTEGER NOT NULL, " +
            "ItemType TEXT NOT NULL, " +
            "ItemId TEXT NOT NULL, " +
            "ItemLabel TEXT NOT NULL, " +
            "Status TEXT NOT NULL DEFAULT 'pending', " +
            "Errors INTEGER NOT NULL DEFAULT 0, " +
            "Hints INTEGER NOT NULL DEFAULT 0, " +
            "PippinMessages INTEGER NOT NULL DEFAULT 0, " +
            "Method TEXT NOT NULL DEFAULT '', " +
            "Decisions TEXT NOT NULL DEFAULT '', " +
            "CompletedAt TEXT NOT NULL";

        public const string ReflectionHistoryTable = "ReflectionHistory";
        public const string ReflectionHistoryScheme =
            "Id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "StudentId INTEGER NOT NULL, " +
            "ItemType TEXT NOT NULL, " +
            "ItemId TEXT NOT NULL, " +
            "Role TEXT NOT NULL, " +
            "Text TEXT NOT NULL, " +
            "InsightXp INTEGER NOT NULL DEFAULT 0, " +
            "CreatedAt TEXT NOT NULL";
    }
}
