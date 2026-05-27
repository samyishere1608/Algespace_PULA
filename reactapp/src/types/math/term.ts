import { ICoefficient, Coefficient } from "@/types/math/coefficient.ts";
import { Transform, Type } from "class-transformer";
import { Operator, Parenthesis } from "./enums";
import { Fraction } from "mathjs";
import { math } from "@/types/math/math.ts";

export interface ITerm {
    operator: Operator.Plus | Operator.Minus | null;
    coefficient: ICoefficient | Fraction;
    variable: string | null;
}

export class Term implements ITerm {
    public operator: Operator.Plus | Operator.Minus | null;

    @Type(() => Coefficient)
    public coefficient: Coefficient;

    public variable: string | null;

    constructor(operator: Operator.Plus | Operator.Minus | null, coefficient: Coefficient, variable: string | null) {
        this.operator = operator;
        this.coefficient = coefficient;
        this.variable = variable;
    }
}

export class FlexibilityTerm {
    @Transform((jsonObj) => jsonObjectToFraction(jsonObj), { toClassOnly: true })
    public coefficient: Fraction;

    public variable: string | null;

    public isUnion: boolean;

    constructor(coefficient: Fraction, variable: string | null, isUnion?: boolean | null) {
        this.coefficient = coefficient;
        this.variable = variable;
        this.isUnion = (isUnion !== undefined && isUnion !== null) ? isUnion : false;
    }
}

export function jsonObjectToFraction(jsonObj: object): Fraction {
    const innerObj: ICoefficient = Object.entries(jsonObj)[0][1] as ICoefficient;
    return math.fraction(innerObj.value);
}

export class ParenthesisTerm {
    public isMultiplication: boolean;

    public parenthesis: Parenthesis | null;

    @Transform((jsonObj) => jsonObjectToFraction(jsonObj), { toClassOnly: true })
    public coefficient: Fraction;

    public variable: string | null;

    constructor(isMultiplication: boolean, parenthesis: Parenthesis | null, coefficient: Fraction, variable: string | null) {
        this.isMultiplication = isMultiplication;
        this.parenthesis = parenthesis;
        this.coefficient = coefficient;
        this.variable = variable;
    }
}