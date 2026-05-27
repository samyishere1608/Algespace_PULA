namespace webapi.Models.Studies.ConceptualKnowledge
{
    public class EliminationStudyData(long UserId, long StudyId, long ExerciseId) : ICKStudyData
    {
        public long? Id { get; set; }

        public long UserId { get; set; } = UserId;

        public long StudyId { get; set; } = StudyId;

        public long ExerciseId { get; set; } = ExerciseId;

        public float TotalTime { get; set; }

        public int RequestedHints { get; set; }

        public int TotalErrors { get; set; }

        public string Actions { get; set; } = String.Empty;

        public string Choice { get; set; } = string.Empty;
    }

    public enum EliminationChoice
    {
        Good,
        Bad,
        Neutral
    }

    public static class EliminationStudyDBSettings
    {
        public const string TableName = "EliminationExercises";

        public const string TableScheme = "Id INTEGER PRIMARY KEY AUTOINCREMENT, UserId INTEGER, StudyId INTEGER, ExerciseId INTEGER, TotalTime REAL, RequestedHints INTEGER, TotalErrors INTEGER, Actions TEXT, Choice TEXT";

        public const string TableColumns = "(Id, UserId, StudyId, ExerciseId, TotalTime, RequestedHints, TotalErrors, Actions, Choice)";

        public const string TableValues = "(@Id, @UserId, @StudyId, @ExerciseId, @TotalTime, @RequestedHints, @TotalErrors, @Actions, @Choice)";
    }
}
