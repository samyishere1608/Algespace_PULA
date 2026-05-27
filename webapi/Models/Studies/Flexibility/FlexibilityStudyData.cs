using webapi.Models.Flexibility;

namespace webapi.Models.Studies.Flexibility
{
    public class FlexibilityStudyData(long UserId, long StudyId, long FlexibilityId, long ExerciseId, FlexibilityExerciseType ExerciseType, AgentCondition AgentCondition, AgentType? AgentType = null)
    {
        public long? Id { get; set; }

        public long UserId { get; set; } = UserId;

        public long StudyId { get; set; } = StudyId;

        public long FlexibilityId { get; set; } = FlexibilityId;

        public long ExerciseId { get; set; } = ExerciseId;

        public string ExerciseType { get; set; } = ExerciseType.ToString();

        public string AgentCondition { get; set; } = AgentCondition.ToString();

        public string? AgentType { get; set; } = AgentType.ToString();

        public float TotalTime { get; set; }

        public int TotalErrors { get; set; }

         public int TotalHints { get; set; }

        public string WorkedExamplesChoice { get; set; } = string.Empty;

        public string SelfExplanationChoice { get; set; } = string.Empty;

        public string SelfExplanationInterventionChoice { get; set; } = string.Empty;

        public int? StudentTypeSelfExplanation { get; set; }

        public string ComparisonChoice { get; set; } = string.Empty;

         public string ComparisonInterventionChoice { get; set; } = string.Empty;

        public int? StudentTypeComparison { get; set; }

        public string ResolvingChoice { get; set; } = string.Empty;

         public string ResolvingInterventionChoice { get; set; } = string.Empty;

         public int? StudentTypeResolving { get; set; }

        public string FirstSolutionChoice { get; set; } = string.Empty;

         public string FirstSolutionInterventionChoice { get; set; } = string.Empty;

         public int? StudentTypeFirstSolution { get; set; }

         public string SecondSolutionChoice { get; set; } = string.Empty;

        public string SecondSolutionInterventionChoice { get; set; } = string.Empty;

        public int? StudentTypeSecondSolution { get; set; }

        public string TipChoice { get; set; } = string.Empty;

        public string SelectedMethod { get; set; } = string.Empty;

        public string EfficiencySelection { get; set; } = string.Empty;

        public string EfficiencySelectionActions { get; set; } = string.Empty;

        public string SystemMatchingActions { get; set; } = string.Empty;

        public string SystemSelection { get; set; } = string.Empty;

        public string SelfExplanation { get; set; } = string.Empty;

        public string SelfExplanationActions { get; set; } = string.Empty;

        public string Comparison { get; set; } = string.Empty;

        public string ResolveConclusion { get; set; } = string.Empty;

        public string Transformation { get; set; } = string.Empty;

        public string TransformationResolve { get; set; } = string.Empty;

        public string TransformationActions { get; set; } = string.Empty;

        public string Equalization { get; set; } = string.Empty;

        public string EqualizationResolve { get; set; } = string.Empty;

        public string EqualizationActions { get; set; } = string.Empty;

        public string Substitution { get; set; } = string.Empty;

        public string SubstitutionResolve { get; set; } = string.Empty;

        public string SubstitutionActions { get; set; } = string.Empty;

        public string Elimination { get; set; } = string.Empty;

        public string EliminationResolve { get; set; } = string.Empty;

        public string EliminationActions { get; set; } = string.Empty;

        public string FirstSolution { get; set; } = string.Empty;

        public string FirstSolutionActions { get; set; } = string.Empty;

        public string EquationSelection { get; set; } = string.Empty;

        public string SecondSolution { get; set; } = string.Empty;

        public string SecondSolutionActions { get; set; } = string.Empty;
    }

    public enum FlexibilityExerciseActionPhase
    {
        SelectedMethod,
        EfficiencySelectionActions,
        SystemMatchingActions,
        SelfExplanationActions,
        TransformationActions,
        EqualizationActions,
        SubstitutionActions,
        EliminationActions,
        FirstSolutionActions,
        EquationSelection,
        SecondSolutionActions
    }

    public enum FlexibilityExercisePhase
    {
        Comparison,
        ResolveConclusion,
        EfficiencySelection,
        SystemSelection,
        SelfExplanation,
        Transformation,
        TransformationResolve,
        Equalization,
        EqualizationResolve,
        Substitution,
        SubstitutionResolve,
        Elimination,
        EliminationResolve,
        FirstSolution,
        SecondSolution
    }

    public enum FlexibilityExerciseChoicePhase
    {
        WorkedExamplesChoice,
        SelfExplanationChoice,
        ComparisonChoice,
        ResolvingChoice,
        FirstSolutionChoice,
        SecondSolutionChoice,
        TipChoice,
        SelfExplanationInterventionChoice,
        ComparisonInterventionChoice,
        ResolvingInterventionChoice,
        FirstSolutionInterventionChoice,
        SecondSolutionInterventionChoice,
        StudentTypeComparison,
        StudentTypeSelfExplanation,
        StudentTypeFirstSolution,
        StudentTypeSecondSolution,
        StudentTypeResolving
    }


    public class FlexibilityExercisePhaseData
    {
        public float Time { get; set; }

        public int Errors { get; set; }

        public int Hints { get; set; }
    }

    public class FlexibilityComparisonOrResolveData
    {
        public float Time { get; set; }

        public int Errors { get; set; }

        public int Hints { get; set; }

        public string Choice { get; set; } = string.Empty;
    }

    public static class FlexibilityStudyDataDBSettings
    {
        public static string GetTableName(long studyId, long userId, string username)
        {
            return $"FlexibilityStudy{studyId}_user_{userId}_{username}";
        }

        public const string TableScheme = "Id INTEGER PRIMARY KEY AUTOINCREMENT, UserId INTEGER, StudyId INTEGER, FlexibilityId INTEGER, ExerciseId INTEGER, ExerciseType TEXT, AgentCondition TEXT, AgentType TEXT, TotalTime REAL, TotalErrors INTEGER, TotalHints INTEGER, "
            + "WorkedExamplesChoice TEXT, SelfExplanationChoice TEXT, SelfExplanationInterventionChoice TEXT, StudentTypeSelfExplanation INTEGER, ComparisonChoice TEXT,  ComparisonInterventionChoice TEXT, StudentTypeComparison INTEGER, ResolvingChoice TEXT,  ResolvingInterventionChoice TEXT, StudentTypeResolving INTEGER, FirstSolutionChoice TEXT, FirstSolutionInterventionChoice TEXT, StudentTypeFirstSolution INTEGER, SecondSolutionChoice TEXT,  SecondSolutionInterventionChoice TEXT, StudentTypeSecondSolution INTEGER, TipChoice TEXT, SelectedMethod TEXT, "
            + "EfficiencySelection TEXT, EfficiencySelectionActions TEXT, SystemSelection TEXT, SystemMatchingActions TEXT, SelfExplanation TEXT, SelfExplanationActions TEXT, Comparison TEXT, ResolveConclusion TEXT, Transformation TEXT, TransformationResolve TEXT, TransformationActions TEXT,  "
            + "Equalization TEXT, EqualizationResolve TEXT, EqualizationActions TEXT, Substitution TEXT, SubstitutionResolve TEXT, SubstitutionActions TEXT, Elimination TEXT, EliminationResolve TEXT, EliminationActions TEXT, "
            + "FirstSolution TEXT, FirstSolutionActions TEXT, EquationSelection TEXT, SecondSolution TEXT, SecondSolutionActions TEXT";

        public const string TableColumns = "(Id, UserId, StudyId, FlexibilityId, ExerciseId, ExerciseType, AgentCondition, AgentType, TotalTime, TotalErrors, TotalHints, WorkedExamplesChoice, SelfExplanationChoice, SelfExplanationInterventionChoice, StudentTypeSelfExplanation, ComparisonChoice, ComparisonInterventionChoice, StudentTypeComparison,  ResolvingChoice, ResolvingInterventionChoice, StudentTypeResolving, FirstSolutionChoice, FirstSolutionInterventionChoice, StudentTypeFirstSolution, SecondSolutionChoice, SecondSolutionInterventionChoice, StudentTypeSecondSolution, TipChoice, SelectedMethod, "
            + "EfficiencySelection, EfficiencySelectionActions, SystemSelection, SystemMatchingActions, SelfExplanation, SelfExplanationActions, Comparison, ResolveConclusion, Transformation, TransformationResolve, TransformationActions, "
            + "Equalization, EqualizationResolve, EqualizationActions, Substitution, SubstitutionResolve, SubstitutionActions, Elimination, EliminationResolve, EliminationActions, "
            + "FirstSolution, FirstSolutionActions, EquationSelection, SecondSolution, SecondSolutionActions, SubstitutionActions)";

        public const string TableValues = "(@Id, @UserId, @StudyId, @FlexibilityId, @ExerciseId, @ExerciseType, @AgentCondition, @AgentType, @TotalTime, @TotalErrors, @TotalHints, @WorkedExamplesChoice, @SelfExplanationChoice, @SelfExplanationInterventionChoice, @StudentTypeSelfExplanation, @ComparisonChoice, @ComparisonInterventionChoice, @StudentTypeComparison, @ResolvingChoice,  @ResolvingInterventionChoice, @StudentTypeResolving, @FirstSolutionChoice, @FirstSolutionInterventionChoice, @StudentTypeFirstSolution, @SecondSolutionChoice, @SecondSolutionInterventionChoice, @StudentTypeSecondSolution, @TipChoice, @SelectedMethod, "
            + "@EfficiencySelection, @EfficiencySelectionActions, @SystemSelection, @SystemMatchingActions, @SelfExplanation, @SelfExplanationActions, @Comparison, @ResolveConclusion, @Transformation, @TransformationResolve, @TransformationActions, "
            + "@Equalization, @EqualizationResolve, @EqualizationActions, @Substitution, @SubstitutionResolve, @SubstitutionActions, @Elimination, @EliminationResolve, @EliminationActions, "
            + "@FirstSolution, @FirstSolutionActions, @EquationSelection, @SecondSolution, @SecondSolutionActions, @SubstitutionActions)";
    }
}
