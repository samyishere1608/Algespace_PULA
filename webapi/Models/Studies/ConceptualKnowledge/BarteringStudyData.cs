namespace webapi.Models.Studies.ConceptualKnowledge
{
    public class BarteringStudyData(long UserId, long StudyId, long ExerciseId) : ICKStudyData
    {
        public long? Id { get; set; }

        public long UserId { get; set; } = UserId;

        public long StudyId { get; set; } = StudyId;

        public long ExerciseId { get; set; } = ExerciseId;

        public float TotalTime { get; set; }

        public int RequestedHints { get; set; }

        public int TotalErrors { get; set; }

        public string Actions { get; set; } = String.Empty;
    }

    public static class BarteringStudyDBSettings
    {
        public const string TableName = "BarteringExercises";

        public const string TableScheme = "Id INTEGER PRIMARY KEY AUTOINCREMENT, UserId INTEGER, StudyId INTEGER, ExerciseId INTEGER, TotalTime REAL, RequestedHints INTEGER, TotalErrors INTEGER, Actions TEXT";

        public const string TableColumns = "(Id, UserId, StudyId, ExerciseId, TotalTime, RequestedHints, TotalErrors, Actions)";

        public const string TableValues = "(@Id, @UserId, @StudyId, @ExerciseId, @TotalTime, @RequestedHints, @TotalErrors, @Actions)";
    }
}
