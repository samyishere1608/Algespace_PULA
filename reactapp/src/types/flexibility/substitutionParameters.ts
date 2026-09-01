import { SubstitutionError } from "@/types/flexibility/enums.ts";
import { FlexibilityTerm } from "@/types/math/term.ts";
import { Fraction } from "mathjs";

export interface SubstitutionResultParameters {
    readonly isValid: boolean;
    readonly substitutionItems: FlexibilityTerm[];
    readonly isFirstEquation: boolean;
    readonly isLeft: boolean;
    readonly index: number;
    readonly variable: string | undefined;
    readonly replaceAll: boolean;
    readonly error: SubstitutionError | undefined;
    /** If true, the source variable has coefficient ≠ ±1 (e.g. 2y = expr not y = expr).
     *  Used for rendering: hides the target coefficient outside parentheses. */
    readonly keepCoefficient: boolean;
    /** The coefficient of the variable in the source equation (e.g. 2 for 2y = expr).
     *  Used to compute the correct substitution ratio: targetCoefficient / sourceCoefficient. */
    readonly sourceCoefficient?: Fraction;
}

export interface SubstitutionParameters {
    readonly isFirstEquation: boolean;
    readonly variable: string;
    readonly equationInfo?: SubstitutedEquationInfo;
}

export interface SubstitutedEquationInfo {
    readonly substitutionItems: FlexibilityTerm[];
    readonly isLeft: boolean;
    readonly index: number;
    readonly replaceAll: boolean;
}
