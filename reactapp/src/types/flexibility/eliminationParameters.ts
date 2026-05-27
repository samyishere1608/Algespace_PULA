import { Fraction } from "mathjs";

export interface EliminationParameters {
    readonly switchedEquations: boolean;
    readonly isAddition: boolean;
    readonly firstFactor?: number | Fraction;
    readonly secondFactor?: number | Fraction;
}
