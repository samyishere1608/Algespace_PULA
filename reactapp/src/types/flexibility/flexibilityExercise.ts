import { FlexibilityExerciseType, IsolatedIn } from "@/types/flexibility/enums.ts";
import { IVariable } from "@/types/flexibility/variable.ts";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { FlexibilityStudyExerciseType } from "@/types/studies/enums.ts";

export interface IFlexibilityExercise {
    readonly id: number;
    readonly type: FlexibilityExerciseType | FlexibilityStudyExerciseType;
    readonly firstEquation: FlexibilityEquation;
    readonly secondEquation: FlexibilityEquation;
    readonly firstEquationIsIsolatedIn: IsolatedIn;
    readonly secondEquationIsIsolatedIn: IsolatedIn;
    readonly firstVariable: IVariable;
    readonly secondVariable: IVariable;
}
