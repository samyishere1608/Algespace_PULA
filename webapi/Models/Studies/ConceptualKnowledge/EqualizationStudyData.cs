namespace webapi.Models.Studies.ConceptualKnowledge
{
    public class EqualizationStudyData(long UserId, long StudyId, long ExerciseId) : ICKStudyData
    {
        public long? Id { get; set; }

        public long UserId { get; set; } = UserId;

        public long StudyId { get; set; } = StudyId;

        public long ExerciseId { get; set; } = ExerciseId;

        public float TotalTime { get; set; }

        public int RequestedHints { get; set; }

        public int TotalErrors { get; set; }

        public string ActionsEqualization { get; set; } = String.Empty;

        public string Equalization { get; set; } = String.Empty;

        public string ActionsSimplification { get; set; } = String.Empty;

        public string Simplification { get; set; } = String.Empty;

        public string ActionsFirstSolution { get; set; } = String.Empty;

        public string FirstSolution { get; set; } = String.Empty;

        public string ActionsSecondSolution { get; set; } = String.Empty;

        public string SecondSolution { get; set; } = String.Empty;
    }

    public enum EqualizationPhase
    {
        Equalization,
        Simplification,
        FirstSolution,
        SecondSolution
    }

    public class EqualizationPhaseData
    {
        public float Time { get; set; }

        public int Hints { get; set; }

        public int Errors { get; set; }
    }

    public static class EqualizationStudyDBSettings
    {
        public const string TableName = "EqualizationExercises";

        public const string TableScheme = "Id INTEGER PRIMARY KEY AUTOINCREMENT, UserId INTEGER, StudyId INTEGER, ExerciseId INTEGER, TotalTime REAL, RequestedHints INTEGER, TotalErrors INTEGER, ActionsEqualization TEXT, Equalization TEXT, ActionsSimplification TEXT, Simplification TEXT, ActionsFirstSolution TEXT, FirstSolution TEXT, ActionsSecondSolution TEXT, SecondSolution TEXT";

        public const string TableColumns = "(Id, UserId, StudyId, ExerciseId, TotalTime, RequestedHints, TotalErrors, ActionsEqualization, Equalization, ActionsSimplification, Simplification, ActionsFirstSolution, FirstSolution, ActionsSecondSolution, SecondSolution)";

        public const string TableValues = "(@Id, @UserId, @StudyId, @ExerciseId, @TotalTime, @RequestedHints, @TotalErrors, @ActionsEqualization, @Equalization, @ActionsSimplification, @Simplification, @ActionsFirstSolution, @FirstSolution, @ActionsSecondSolution, @SecondSolution)";
    }
}
