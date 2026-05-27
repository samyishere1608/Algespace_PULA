import { Type } from "class-transformer";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { FlexibilityExerciseType, IsolatedIn, Method } from "@/types/flexibility/enums.ts";
import { SelfExplanation } from "@/types/flexibility/selfExplanation.ts";
import { IFlexibilityExercise } from "@/types/flexibility/flexibilityExercise.ts";

export class EfficiencyExercise implements IFlexibilityExercise {
    public readonly id: number;

    public readonly type: FlexibilityExerciseType = FlexibilityExerciseType.Efficiency;

    public readonly transformationRequired: boolean;

    public readonly useWithTip: boolean;

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

    public readonly efficientMethods: Method[];

    @Type(() => SelfExplanation)
    public readonly selfExplanationTasks: SelfExplanation[];

    public readonly question: string | undefined;

    public readonly agentMessageForSelfExplanation?: string | undefined;

    public readonly agentMessageForFirstSolution?: string | undefined;

    public readonly agentMessageForSecondSolution?: string | undefined;

    constructor(id: number, transformationRequired: boolean, useWithTip: boolean, firstEquation: FlexibilityEquation, secondEquation: FlexibilityEquation,
                firstEquationIsIsolatedIn: IsolatedIn, secondEquationIsIsolatedIn: IsolatedIn, firstVariable: Variable,
                secondVariable: Variable, efficientMethods: Method[], selfExplanationTasks: SelfExplanation[], question: string | null,
                agentMessageForSelfExplanation?: string | null, agentMessageForFirstSolution?: string | null, agentMessageForSecondSolution?: string | null) {
        this.id = id;
        this.transformationRequired = transformationRequired;
        this.useWithTip = useWithTip;
        this.firstEquation = firstEquation;
        this.secondEquation = secondEquation;
        this.firstEquationIsIsolatedIn = firstEquationIsIsolatedIn;
        this.secondEquationIsIsolatedIn = secondEquationIsIsolatedIn;
        this.firstVariable = firstVariable;
        this.secondVariable = secondVariable;
        this.efficientMethods = efficientMethods;
        this.selfExplanationTasks = selfExplanationTasks;
        this.question = question === null ? undefined : question;
        this.agentMessageForSelfExplanation = agentMessageForSelfExplanation === null ? undefined : agentMessageForSelfExplanation;
        this.agentMessageForFirstSolution = agentMessageForFirstSolution === null ? undefined : agentMessageForFirstSolution;
        this.agentMessageForSecondSolution = agentMessageForSecondSolution === null ? undefined : agentMessageForSecondSolution;
    }
}