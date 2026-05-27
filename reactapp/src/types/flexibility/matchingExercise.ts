import { Type } from "class-transformer";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { FlexibilityExerciseType, IsolatedIn, Method } from "@/types/flexibility/enums.ts";
import { SelfExplanation } from "@/types/flexibility/selfExplanation.ts";
import { IFlexibilityExercise } from "@/types/flexibility/flexibilityExercise.ts";

export class MatchingExercise implements IFlexibilityExercise {
    public readonly id: number;

    public readonly type: FlexibilityExerciseType = FlexibilityExerciseType.Matching;

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

    public readonly method: Method;

    @Type(() => MatchableSystem)
    public readonly alternativeSystems: MatchableSystem[];

    @Type(() => SelfExplanation)
    public readonly selfExplanationTask: SelfExplanation;

    public readonly question: string | undefined;

    public readonly agentMessageForSelfExplanation?: string | undefined;

    public readonly agentMessageForFirstSolution?: string | undefined;

    public readonly agentMessageForSecondSolution?: string | undefined;

    constructor(id: number, firstEquation: FlexibilityEquation, secondEquation: FlexibilityEquation, firstEquationIsIsolatedIn: IsolatedIn,
                secondEquationIsIsolatedIn: IsolatedIn, firstVariable: Variable, secondVariable: Variable, method: Method,
                selfExplanationTask: SelfExplanation, question: string | null, alternativeSystems: MatchableSystem[],
                agentMessageForSelfExplanation?: string | null, agentMessageForFirstSolution?: string | null, agentMessageForSecondSolution?: string | null) {
        this.id = id;
        this.firstEquation = firstEquation;
        this.secondEquation = secondEquation;
        this.firstEquationIsIsolatedIn = firstEquationIsIsolatedIn;
        this.secondEquationIsIsolatedIn = secondEquationIsIsolatedIn;
        this.firstVariable = firstVariable;
        this.secondVariable = secondVariable;
        this.selfExplanationTask = selfExplanationTask;
        this.method = method;
        this.alternativeSystems = alternativeSystems;
        this.question = question === null ? undefined : question;
        this.agentMessageForSelfExplanation = agentMessageForSelfExplanation === null ? undefined : agentMessageForSelfExplanation;
        this.agentMessageForFirstSolution = agentMessageForFirstSolution === null ? undefined : agentMessageForFirstSolution;
        this.agentMessageForSecondSolution = agentMessageForSecondSolution === null ? undefined : agentMessageForSecondSolution;
    }
}

export class MatchableSystem {
    public readonly isSolution: boolean;

    @Type(() => FlexibilityEquation)
    public readonly firstEquation: FlexibilityEquation;

    @Type(() => FlexibilityEquation)
    public readonly secondEquation: FlexibilityEquation;

    constructor(firstEquation: FlexibilityEquation, secondEquation: FlexibilityEquation, isSolution: boolean = false) {
        this.firstEquation = firstEquation;
        this.secondEquation = secondEquation;
        this.isSolution = isSolution;
    }
}