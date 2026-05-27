import { Method } from "@/types/flexibility/enums.ts";
import { ParenthesisEquation } from "@/types/math/linearEquation.ts";
import { Type } from "class-transformer";

export interface IComparison {
    readonly method: Method;
    readonly steps: SolutionStep[];
}

export class Comparison implements IComparison {
    public readonly method: Method;

    @Type(() => SolutionStep)
    public readonly steps: SolutionStep[];

    constructor(method: Method, steps: SolutionStep[]) {
        this.method = method;
        this.steps = steps;
    }
}

export class SolutionStep {
    public readonly description?: string | null;

    @Type(() => ParenthesisEquation)
    public readonly equations?: ParenthesisEquation[] | null;

    constructor(description: string | null | undefined, equations: ParenthesisEquation[] | null | undefined) {
        this.description = description;
        this.equations = equations;
    }
}
