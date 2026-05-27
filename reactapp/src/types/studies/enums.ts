export enum StudyType {
    CKStudy,
    FlexibilityStudy,
    FlexibilityTest
}

export enum CKExerciseType {
    Equalization,
    Bartering,
    Substitution,
    Elimination
}

export enum EqualizationPhase {
    Equalization,
    Simplification,
    FirstSolution,
    SecondSolution
}

export enum SubstitutionPhase {
    FirstSelection,
    FirstSubstitution,
    SecondSelection,
    SecondSubstitution,
    RepeatedSecondSelection,
    RepeatedSecondSubstitution
}

export enum EliminationChoice {
    Good,
    Bad,
    Neutral
}

export enum FlexibilityStudyExerciseType {
    WorkedExamples,
    Efficiency,
    Suitability,
    Matching,
    TipExercise,
    PlainExercise
}

export enum FlexibilityExerciseActionPhase {
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

export enum FlexibilityExercisePhase {
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

export enum FlexibilityExerciseChoicePhase {
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
    StudentTypeResolving,
}