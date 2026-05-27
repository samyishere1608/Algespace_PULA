import { Type } from "class-transformer";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { IsolatedIn } from "@/types/flexibility/enums.ts";
import { IFlexibilityExercise } from "@/types/flexibility/flexibilityExercise.ts";
import { FlexibilityStudyExerciseType } from "@/types/studies/enums.ts";

export class PlainExercise implements IFlexibilityExercise {
    public readonly id: number;

    public readonly type: FlexibilityStudyExerciseType = FlexibilityStudyExerciseType.PlainExercise;

    @Type(() => FlexibilityEquation)
    public readonly firstEquation: FlexibilityEquation;

    @Type(() => FlexibilityEquation)
    public readonly secondEquation: FlexibilityEquation;

    public readonly firstEquationIsIsolatedIn: IsolatedIn;

    public readonly secondEquationIsIsolatedIn: IsolatedIn;

    @Type(() => Variable)
    public readonly firstVariable: Variable;

    @Type(() => Variable)
    public readonly secondVariable: Variable;

    public readonly agentMessageForFirstSolution?: string | undefined;

    public readonly agentMessageForSecondSolution?: string | undefined;

    constructor(id: number, firstEquation: FlexibilityEquation, secondEquation: FlexibilityEquation, firstEquationIsIsolatedIn: IsolatedIn, secondEquationIsIsolatedIn: IsolatedIn,
                firstVariable: Variable, secondVariable: Variable, agentMessageForFirstSolution?: string | null, agentMessageForSecondSolution?: string | null) {
        this.id = id;
        this.firstEquation = firstEquation;
        this.secondEquation = secondEquation;
        this.firstEquationIsIsolatedIn = firstEquationIsIsolatedIn;
        this.secondEquationIsIsolatedIn = secondEquationIsIsolatedIn;
        this.firstVariable = firstVariable;
        this.secondVariable = secondVariable;
        this.agentMessageForFirstSolution = agentMessageForFirstSolution === null ? undefined : agentMessageForFirstSolution;
        this.agentMessageForSecondSolution = agentMessageForSecondSolution === null ? undefined : agentMessageForSecondSolution;
    }
}