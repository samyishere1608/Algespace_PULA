import { CKExerciseType } from "@/types/studies/enums.ts";

export interface ICKExercise {
    readonly exerciseType: CKExerciseType;
    readonly exerciseId: number;
}

export class CKStudyExercise {
    constructor(
        public readonly id: number,
        public completed: boolean
    ) {}
}

export class CKStudyProperties {
    public readonly equalizationExercises: CKStudyExercise[] = [];

    public readonly completedEqualizationTutorial: boolean = false;

    public readonly barteringExercises: CKStudyExercise[] = [];

    public readonly completedBarteringTutorial: boolean = false;

    public readonly substitutionExercises: CKStudyExercise[] = [];

    public readonly completedSubstitutionTutorial: boolean = false;

    public readonly eliminationExercises: CKStudyExercise[] = [];

    public readonly completedEliminationTutorial: boolean = false;

    constructor(exercises: ICKExercise[], equalizationExercises?: (number | string)[], barteringExercises?: (number | string)[], substitutionExercises?: (number | string)[], eliminationExercises?: (number | string)[]) {
        exercises.forEach((exercise) => {
            switch (exercise.exerciseType) {
                case CKExerciseType.Equalization: {
                    if (equalizationExercises !== undefined) {
                        const index: number = equalizationExercises.findIndex((id): boolean => id === exercise.exerciseId);
                        this.equalizationExercises.push(new CKStudyExercise(exercise.exerciseId, index !== -1));
                    } else {
                        this.equalizationExercises.push(new CKStudyExercise(exercise.exerciseId, false));
                    }
                    break;
                }
                case CKExerciseType.Bartering: {
                    if (barteringExercises !== undefined) {
                        const index: number = barteringExercises.findIndex((id): boolean => id === exercise.exerciseId);
                        this.barteringExercises.push(new CKStudyExercise(exercise.exerciseId, index !== -1));
                    } else {
                        this.barteringExercises.push(new CKStudyExercise(exercise.exerciseId, false));
                    }
                    break;
                }
                case CKExerciseType.Substitution: {
                    if (substitutionExercises !== undefined) {
                        const index: number = substitutionExercises.findIndex((id): boolean => id === exercise.exerciseId);
                        this.substitutionExercises.push(new CKStudyExercise(exercise.exerciseId, index !== -1));
                    } else {
                        this.substitutionExercises.push(new CKStudyExercise(exercise.exerciseId, false));
                    }
                    break;
                }
                case CKExerciseType.Elimination: {
                    if (eliminationExercises !== undefined) {
                        const index: number = eliminationExercises.findIndex((id): boolean => id === exercise.exerciseId);
                        this.eliminationExercises.push(new CKStudyExercise(exercise.exerciseId, index !== -1));
                    } else {
                        this.eliminationExercises.push(new CKStudyExercise(exercise.exerciseId, false));
                    }
                    break;
                }
            }
        });

        if (equalizationExercises !== undefined) {
            const index: number = equalizationExercises.findIndex((id): boolean => id === "tutorial");
            this.completedEqualizationTutorial = index !== -1;
        }

        if (barteringExercises !== undefined) {
            const index: number = barteringExercises.findIndex((id): boolean => id === "tutorial");
            this.completedBarteringTutorial = index !== -1;
        }

        if (substitutionExercises !== undefined) {
            const index: number = substitutionExercises.findIndex((id): boolean => id === "tutorial");
            this.completedSubstitutionTutorial = index !== -1;
        }

        if (equalizationExercises !== undefined) {
            const index: number = equalizationExercises.findIndex((id): boolean => id === "tutorial");
            this.completedEliminationTutorial = index !== -1;
        }
    }
}
