namespace webapi.Models.Studies.ConceptualKnowledge
{
    public class SubstitutionStudyData(long UserId, long StudyId, long ExerciseId) : ICKStudyData
    {
        public long? Id { get; set; }

        public long UserId { get; set; } = UserId;

        public long StudyId { get; set; } = StudyId;

        public long ExerciseId { get; set; } = ExerciseId;

        public float TotalTime { get; set; }

        public int RequestedHints { get; set; }

        public int TotalErrors { get; set; }

        public string ActionsFirstSelection { get; set; } = String.Empty;

        public string FirstSelection { get; set; } = String.Empty;

        public string ActionsFirstSubstitution { get; set; } = String.Empty;

        public string FirstSubstitution { get; set; } = String.Empty;

        public string ActionsSecondSelection { get; set; } = String.Empty;

        public string SecondSelection { get; set; } = String.Empty;

        public string ActionsSecondSubstitution { get; set; } = String.Empty;

        public string SecondSubstitution { get; set; } = String.Empty;

        public string ActionsRepeatedSecondSelection { get; set; } = String.Empty;

        public string RepeatedSecondSelection { get; set; } = String.Empty;

        public string ActionsRepeatedSecondSubstitution { get; set; } = String.Empty;

        public string RepeatedSecondSubstitution { get; set; } = String.Empty;
    }

    public enum SubstitutionPhase
    {
        FirstSelection,
        FirstSubstitution,
        SecondSelection,
        SecondSubstitution,
        RepeatedSecondSelection,
        RepeatedSecondSubstitution
    }

    public class SubstitutionPhaseData
    {
        public float Time { get; set; }

        public int Hints { get; set; }

        public int Errors { get; set; }
    }

    public static class SubstitutionStudyDBSettings
    {
        public const string TableName = "SubstitutionExercises";

        public const string TableScheme = "Id INTEGER PRIMARY KEY AUTOINCREMENT, UserId INTEGER, StudyId INTEGER, ExerciseId INTEGER, TotalTime REAL, RequestedHints INTEGER, TotalErrors INTEGER, ActionsFirstSelection TEXT, FirstSelection TEXT, ActionsFirstSubstitution TEXT, FirstSubstitution TEXT, ActionsSecondSelection TEXT, SecondSelection TEXT, ActionsSecondSubstitution TEXT, SecondSubstitution TEXT, ActionsRepeatedSecondSelection TEXT, RepeatedSecondSelection TEXT, ActionsRepeatedSecondSubstitution TEXT, RepeatedSecondSubstitution TEXT";

        public const string TableColumns = "(Id, UserId, StudyId, ExerciseId, TotalTime, RequestedHints, TotalErrors, ActionsFirstSelection, FirstSelection, ActionsFirstSubstitution, FirstSubstitution, ActionsSecondSelection, SecondSelection, ActionsSecondSubstitution, SecondSubstitution, ActionsRepeatedSecondSelection, RepeatedSecondSelection, ActionsRepeatedSecondSubstitution, RepeatedSecondSubstitution)";

        public const string TableValues = "(@Id, @UserId, @StudyId, @ExerciseId, @TotalTime, @RequestedHints, @TotalErrors, @ActionsFirstSelection, @FirstSelection, @ActionsFirstSubstitution, @FirstSubstitution, @ActionsSecondSelection, @SecondSelection, @ActionsSecondSubstitution, @SecondSubstitution, @ActionsRepeatedSecondSelection, @RepeatedSecondSelection, @ActionsRepeatedSecondSubstitution, @RepeatedSecondSubstitution)";
    }
}
