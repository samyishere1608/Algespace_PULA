export class Paths {
    static readonly HomePath: string = "/";
    static readonly AboutPath: string = "/about";
    static readonly EqualizationPath: string = "/equalization";
    static readonly EqualizationGamePath: string = "/equalization/conceptual-knowledge/";
    static readonly EqualizationGameExercisePath: string = "/equalization/conceptual-knowledge/exercises/:exerciseId";
    static readonly EqualizationGameTutorialPath: string = "/equalization/conceptual-knowledge/tutorial";
    static readonly SubstitutionPath: string = "/substitution";
    static readonly BarteringGamePath: string = "/substitution/bartering/";
    static readonly BarteringGameExercisePath: string = "/substitution/bartering/exercises/:exerciseId";
    static readonly BarteringGameTutorialPath: string = "/substitution/bartering/tutorial";
    static readonly SubstitutionGamePath: string = "/substitution/conceptual-knowledge/";
    static readonly SubstitutionGameExercisePath: string = "/substitution/conceptual-knowledge/exercises/:exerciseId";
    static readonly SubstitutionGameTutorialPath: string = "/substitution/conceptual-knowledge/tutorial";
    static readonly EliminationPath: string = "/elimination";
    static readonly EliminationGamePath: string = "/elimination/conceptual-knowledge/";
    static readonly EliminationGameExercisePath: string = "/elimination/conceptual-knowledge/exercises/:exerciseId";
    static readonly EliminationGameTutorialPath: string = "/elimination/conceptual-knowledge/tutorial";
    static readonly FlexibilityPath: string = "/flexibility-training/";
    static readonly FlexibilityExercisePath: string = "/flexibility-training/exercises/:exerciseId";
    static readonly StudiesLoginPath: string = "/studies/login";
    static readonly CKStudyPath: string = "/studies/ck-study/";
    static readonly CKConcreteStudyPath: string = "/studies/ck-study/:studyId";
    static readonly FlexibilityStudyExamplesPath: string = "/flexibility-examples/";
    static readonly FlexibilityStudyExamplesExercisePath: string = "/flexibility-examples/exercises/:exerciseId";
    static readonly FlexibilityStudyPath: string = "/studies/flexibility-study/";
    static readonly FlexibilityConcreteStudyPath: string = "/studies/flexibility-study/:studyId";
    static readonly FlexibilityStudyOptional: string = "/studies/flexibility-study/optional/:studyId";
    static readonly FlexibilityStudyExercisePath: string = "/studies/flexibility-study/:studyId/exercises/:exerciseId";
    static readonly FlexibilityStudyEqualizationDemoPath: string = "/studies/flexibility-study/:studyId/equalization-demo";
    static readonly FlexibilityStudySubstitutionDemoPath: string = "/studies/flexibility-study/:studyId/substitution-demo";
    static readonly FlexibilityStudyEliminationDemoPath: string = "/studies/flexibility-study/:studyId/elimination-demo";
    static readonly FlexibilityStudyEndPath: string = "/studies/flexibility-study/end";
    static readonly ExercisesSubPath: string = "exercises/";
    static readonly TutorialSubPath: string = "tutorial";
    static readonly StudentLoginPath: string = "/student/login";
    static readonly StudentRegisterPath: string = "/student/register";
    static readonly StudentDashboardPath: string = "/student/dashboard";
    static readonly OnboardingResumePath: string = "/student/onboarding/resume";
    static readonly OnboardingBarteringGamePath: string = "/onboarding/bartering/";
    static readonly OnboardingBarteringGameExercisePath: string = "/onboarding/bartering/exercises/:exerciseId";
    static readonly OnboardingEqualizationGamePath: string = "/onboarding/equalization/";
    static readonly OnboardingEqualizationGameExercisePath: string = "/onboarding/equalization/exercises/:exerciseId";
    static readonly OnboardingEliminationGamePath: string = "/onboarding/elimination/";
    static readonly OnboardingEliminationGameExercisePath: string = "/onboarding/elimination/exercises/:exerciseId";
}

export function getPathToExercises(path: string): string {
    return path + Paths.ExercisesSubPath + "getExercises";
}

export function getPathToExercise(path: string, exerciseId: string | number): string {
    return path + Paths.ExercisesSubPath + `getExercise/${exerciseId}`;
}

export function getPathToStudyExercise(path: string, exerciseId: string | number): string {
    return path + Paths.ExercisesSubPath + `getExerciseForStudy/${exerciseId}`;
}
