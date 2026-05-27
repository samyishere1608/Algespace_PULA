import { SubstitutionError } from "@/types/flexibility/enums.ts";
import { FlexibilityTerm } from "@/types/math/term.ts";

export interface SubstitutionResultParameters {
    readonly isValid: boolean;
    readonly substitutionItems: FlexibilityTerm[];
    readonly isFirstEquation: boolean;
    readonly isLeft: boolean;
    readonly index: number;
    readonly variable: string | undefined;
    readonly replaceAll: boolean;
    readonly error: SubstitutionError | undefined;
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
