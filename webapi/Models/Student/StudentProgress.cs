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
        public string GoalId { get; set; } = "";
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
        public string GoalId { get; set; } = "";
        public string GoalLabel { get; set; } = "";
        public int XpEarned { get; set; }
        public string ExerciseType { get; set; } = "";
        public int TotalErrors { get; set; }
        public int TotalHints { get; set; }
        public int PippinMessages { get; set; }
    }

    public class LogExerciseRequest
    {
        public long StudentId { get; set; }
        public string ExerciseType { get; set; } = "";
        public int Errors { get; set; }
        public int Hints { get; set; }
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
        public List<GoalCompletionRecord> GoalsThisWeek { get; set; } = [];
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
        /// <summary>Area the student could improve.</summary>
        public string ImprovementArea { get; set; } = "";
        /// <summary>2-3 actionable steps for the next session.</summary>
        public List<string> ActionSteps { get; set; } = [];
        /// <summary>Whether this was generated by AI or rule-based fallback.</summary>
        public bool IsAiGenerated { get; set; }

        // ── Visualization data ──────────────────────────────────────────────

        /// <summary>Exercise type counts: e.g. {"Suitability":5, "Efficiency":3, "Matching":1}</summary>
        public Dictionary<string, int> ExerciseTypeBreakdown { get; set; } = [];
        /// <summary>Solo exercises: avg errors, avg hints</summary>
        public double SoloAvgErrors { get; set; }
        public double SoloAvgHints { get; set; }
        public int SoloCount { get; set; }
        /// <summary>Pippin exercises: avg errors, avg hints</summary>
        public double PippinAvgErrors { get; set; }
        public double PippinAvgHints { get; set; }
        public int PippinCount { get; set; }
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
