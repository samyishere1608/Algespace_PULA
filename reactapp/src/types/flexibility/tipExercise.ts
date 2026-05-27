import { Type } from "class-transformer";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { IsolatedIn, Method } from "@/types/flexibility/enums.ts";
import { IFlexibilityExercise } from "@/types/flexibility/flexibilityExercise.ts";
import { FlexibilityStudyExerciseType } from "@/types/studies/enums.ts";

export class TipExercise implements IFlexibilityExercise {
    public readonly id: number;

    public readonly type: FlexibilityStudyExerciseType = FlexibilityStudyExerciseType.TipExercise;

    public readonly method: Method;

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

    public readonly question: string;

    public readonly agentMessageForTask?: string | undefined;

    public readonly agentMessageForFirstSolution?: string | undefined;

    public readonly agentMessageForSecondSolution?: string | undefined;

    constructor(id: number, method: Method, firstEquation: FlexibilityEquation, secondEquation: FlexibilityEquation, firstEquationIsIsolatedIn: IsolatedIn,
                secondEquationIsIsolatedIn: IsolatedIn, firstVariable: Variable, secondVariable: Variable, question: string,
                agentMessageForTask?: string | null, agentMessageForFirstSolution?: string | null, agentMessageForSecondSolution?: string | null) {
        this.id = id;
        this.method = method;
        this.firstEquation = firstEquation;
        this.secondEquation = secondEquation;
        this.firstEquationIsIsolatedIn = firstEquationIsIsolatedIn;
        this.secondEquationIsIsolatedIn = secondEquationIsIsolatedIn;
        this.firstVariable = firstVariable;
        this.secondVariable = secondVariable;
        this.question = question;
        this.agentMessageForTask = agentMessageForTask === null ? undefined : agentMessageForTask;
        this.agentMessageForFirstSolution = agentMessageForFirstSolution === null ? undefined : agentMessageForFirstSolution;
        this.agentMessageForSecondSolution = agentMessageForSecondSolution === null ? undefined : agentMessageForSecondSolution;
    }
}