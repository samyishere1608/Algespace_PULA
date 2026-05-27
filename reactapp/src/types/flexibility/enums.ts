export enum FlexibilityExerciseType {
    Efficiency,
    Suitability,
    Matching
}

export enum Method {
    Equalization = 0,
    Substitution = 1,
    Elimination = 2
}

export enum AgentCondition {
    None,
    Agent,
    MotivationalAgent,
    PersonalMotivationalAgent,
    MotivationIntentionAgent,
}

export enum SuitabilityExerciseState {
    MethodSelection,
    SystemTransformation,
    EqualizationMethod,
    SubstitutionMethod,
    EliminationMethod,
    FirstSolution,
    EquationSelection,
    SecondSolution,
    SystemSolution,
    SystemTransformationOnResolve,
    ResolveWithEqualizationMethod,
    ResolveWithSubstitutionMethod,
    ResolveWithEliminationMethod,
    ResolveConclusion,
    Comparison
}

export enum EfficiencyExerciseState {
    MethodSelection,
    SelfExplanation,
    SystemTransformation,
    EqualizationMethod,
    SubstitutionMethod,
    EliminationMethod,
    FirstSolution,
    EquationSelection,
    SecondSolution,
    SystemSolution
}

export enum MatchingExerciseState {
    SystemSelection,
    SelfExplanation,
    SystemTransformation,
    EqualizationMethod,
    SubstitutionMethod,
    EliminationMethod,
    FirstSolution,
    EquationSelection,
    SecondSolution,
    SystemSolution
}

export enum TipExerciseState {
    Choice,
    EqualizationMethod,
    SubstitutionMethod,
    FirstSolution,
    EquationSelection,
    SecondSolution,
    SystemSolution
}

export enum WorkedExampleExerciseState {
    Choice,
    SystemIntroduction,
    Equalization,
    Substitution,
    Elimination
}

export enum PlainExerciseState {
    MethodSelection,
    SystemTransformation,
    EqualizationMethod,
    SubstitutionMethod,
    EliminationMethod,
    FirstSolution,
    EquationSelection,
    SecondSolution,
    SystemSolution
}

export enum AgentType {
    MaleCaucasian,
    FemaleCaucasian,
    MaleAsian,
    FemaleAsian,
    MaleEastern,
    FemaleEastern,
    MaleAfrican,
    FemaleAfrican
}

export enum AgentExpression {
    Neutral,
    Smiling,
    Thinking
}

export enum FlexibilityDragSource {
    FirstLeft,
    FirstRight,
    SecondLeft,
    SecondRight
}

export enum FlexibilityDragTarget {
    Left,
    Right
}

export enum SubstitutionError {
    ExchangedFactor,
    ExchangedWrongVariable,
    NotExchangeable
}

export enum IsolatedIn {
    First,
    Second,
    None,
    FirstMultiple,
    SecondMultiple,
    Elimination,
    EliminationFirst,
    EliminationSecond
}

export enum FirstSolutionState {
    Intervention,
    ManualComputation,
    ResultAuto,
    ResultManual,
    SecondIntervention,
    StepIntervention
}

export enum SelectedEquation {
    FirstInitial,
    SecondInitial,
    FirstTransformed,
    SecondTransformed
}

export enum ComparisonChoice {
    First,
    Second
}

export enum Case {
    First,
    Second,
    Four
}

export enum CompletedDemo {
    Equalization,
    Substitution,
    Elimination
}