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
    }

    public class SpendXpRequest
    {
        public long StudentId { get; set; }
        public int Amount { get; set; }
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
        public List<GoalCompletionRecord> GoalsThisWeek { get; set; } = [];
        public List<MethodCount> MethodCounts { get; set; } = [];
        public List<DailyXp> DailyXp { get; set; } = [];
    }

    // ── DB Settings ───────────────────────────────────────────────────────────

    public static class StudentProgressDBSettings
    {
        public const string ProgressTable = "StudentProgress";
        public const string ProgressScheme =
            "StudentId INTEGER PRIMARY KEY, TotalXP INTEGER NOT NULL DEFAULT 0, " +
            "ExercisesCompleted INTEGER NOT NULL DEFAULT 0, " +
            "StreakDays INTEGER NOT NULL DEFAULT 0, " +
            "LastExerciseDate TEXT NOT NULL DEFAULT ''";

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
    }
}
