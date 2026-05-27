import { EqualizationGamePhase } from "./enums";
import { EqualizationExercise } from "./equalizationExercise";

export interface IGoal {
    readonly expectedWeight: number;
    readonly expectedCountLeft: number;
    readonly expectedCountRight: number;
    readonly gamePhase: EqualizationGamePhase;
}

export class Goal implements IGoal {
    constructor(
        public readonly expectedWeight: number,
        public readonly expectedCountLeft: number,
        public readonly expectedCountRight: number,
        public readonly gamePhase: EqualizationGamePhase
    ) {}

    public static getEqualizationGoal(exercise: EqualizationExercise): Goal {
        return new Goal(exercise.equalizedScale.totalWeight, exercise.equalizedScale.variablesLeft, exercise.equalizedScale.variablesRight, EqualizationGamePhase.Equalization);
    }

    public static getSimplificationGoal(exercise: EqualizationExercise): Goal {
        return new Goal(exercise.simplifiedScale.totalWeight, exercise.simplifiedScale.variablesLeft, exercise.simplifiedScale.variablesRight, EqualizationGamePhase.Simplification);
    }

    public static getSolutionGoal(): Goal {
        return new Goal(0, 0, 0, EqualizationGamePhase.SolvingSystem);
    }
}
