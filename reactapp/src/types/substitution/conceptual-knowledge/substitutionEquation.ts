import { Type } from "class-transformer";
import { LinearEquation } from "@/types/math/linearEquation.ts";

export interface ISubstitutionEquation {
    readonly equation: LinearEquation;
    readonly isIsolated: boolean;
}

export class SubstitutionEquation implements ISubstitutionEquation {
    @Type(() => LinearEquation)
    public readonly equation: LinearEquation;

    public readonly isIsolated: boolean;

    constructor(equation: LinearEquation, isIsolated: boolean) {
        this.equation = equation;
        this.isIsolated = isIsolated;
    }
}