import { Type } from "class-transformer";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { FlexibilityExerciseType, IsolatedIn, Method } from "@/types/flexibility/enums.ts";
import { IFlexibilityExercise } from "@/types/flexibility/flexibilityExercise.ts";
import { Comparison } from "@/types/flexibility/comparison.ts";

export class SuitabilityExercise implements IFlexibilityExercise {
    public readonly id: number;

    public readonly type: FlexibilityExerciseType = FlexibilityExerciseType.Suitability;

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

    @Type(() => Comparison)
    public readonly comparisonMethods: Comparison[];

    public readonly suitableMethods: Method[];

    public readonly agentMessageForFirstSolution?: string | undefined;

    public readonly agentMessageForSecondSolution?: string | undefined;

    public readonly agentMessageForComparison?: string | undefined;

    public readonly agentMessageForResolving?: string | undefined;

    constructor(id: number, firstEquation: FlexibilityEquation, secondEquation: FlexibilityEquation,
                firstEquationIsIsolatedIn: IsolatedIn, secondEquationIsIsolatedIn: IsolatedIn, firstVariable: Variable, secondVariable: Variable,
                suitableMethods: Method[], comparisonMethods: Comparison[], agentMessageForFirstSolution?: string | null, agentMessageForSecondSolution?: string | null,
                agentMessageForComparison?: string | null, agentMessageForResolving?: string | null) {
        this.id = id;
        this.firstEquation = firstEquation;
        this.secondEquation = secondEquation;
        this.firstEquationIsIsolatedIn = firstEquationIsIsolatedIn;
        this.secondEquationIsIsolatedIn = secondEquationIsIsolatedIn;
        this.firstVariable = firstVariable;
        this.secondVariable = secondVariable;
        this.suitableMethods = suitableMethods;
        this.comparisonMethods = comparisonMethods;
        this.agentMessageForFirstSolution = agentMessageForFirstSolution === null ? undefined : agentMessageForFirstSolution;
        this.agentMessageForSecondSolution = agentMessageForSecondSolution === null ? undefined : agentMessageForSecondSolution;
        this.agentMessageForComparison = agentMessageForComparison === null ? undefined : agentMessageForComparison;
        this.agentMessageForResolving = agentMessageForResolving === null ? undefined : agentMessageForResolving;
    }
}