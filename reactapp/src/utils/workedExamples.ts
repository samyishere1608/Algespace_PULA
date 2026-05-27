import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { FlexibilityTerm } from "@/types/math/term.ts";
import { math } from "@/types/math/math.ts";

const variableX: string = "x";
const variableY: string = "y";

export function getFirstEquation(): FlexibilityEquation {
    const leftTerms: FlexibilityTerm[] = [
        new FlexibilityTerm(math.fraction(3), variableX),
        new FlexibilityTerm(math.fraction(2), variableY)
    ];
    const rightTerms: FlexibilityTerm[] = [new FlexibilityTerm(math.fraction(8), null)];
    return new FlexibilityEquation(leftTerms, rightTerms);
}

export function getSecondEquation(): FlexibilityEquation {
    const leftTerms: FlexibilityTerm[] = [
        new FlexibilityTerm(math.fraction(2), variableX),
        new FlexibilityTerm(math.fraction(-1), variableY)
    ];
    const rightTerms: FlexibilityTerm[] = [new FlexibilityTerm(math.fraction(3), null)];
    return new FlexibilityEquation(leftTerms, rightTerms);
}

export function getFirstTransformedEquationForEqualization(): FlexibilityEquation {
    const leftTerms: FlexibilityTerm[] = [new FlexibilityTerm(math.fraction(1), variableY)];
    const rightTerms: FlexibilityTerm[] = [
        new FlexibilityTerm(math.fraction(4), null),
        new FlexibilityTerm(math.fraction("-3/2"), variableX)
    ];
    return new FlexibilityEquation(leftTerms, rightTerms);
}

export function getSecondTransformedEquationForEqualizationAndSubstitution(): FlexibilityEquation {
    const leftTerms: FlexibilityTerm[] = [new FlexibilityTerm(math.fraction(1), variableY)];
    const rightTerms: FlexibilityTerm[] = [
        new FlexibilityTerm(math.fraction(2), variableX),
        new FlexibilityTerm(math.fraction(-3), null)
    ];
    return new FlexibilityEquation(leftTerms, rightTerms);
}

export function getEqualizationEquation(): FlexibilityEquation {
    const leftTerms: FlexibilityTerm[] = [
        new FlexibilityTerm(math.fraction(4), null),
        new FlexibilityTerm(math.fraction("-3/2"), variableX)
    ];
    const rightTerms: FlexibilityTerm[] = [
        new FlexibilityTerm(math.fraction(2), variableX),
        new FlexibilityTerm(math.fraction(-3), null)
    ];
    return new FlexibilityEquation(leftTerms, rightTerms);
}

export function getSimplifiedEqualizationEquation(): FlexibilityEquation {
    const leftTerms: FlexibilityTerm[] = [new FlexibilityTerm(math.fraction(7), null)];
    const rightTerms: FlexibilityTerm[] = [new FlexibilityTerm(math.fraction("7/2"), variableX)];
    return new FlexibilityEquation(leftTerms, rightTerms);
}

export function getFirstSolution(): FlexibilityEquation {
    const leftTerms: FlexibilityTerm[] = [new FlexibilityTerm(math.fraction(1), variableX)];
    const rightTerms: FlexibilityTerm[] = [new FlexibilityTerm(math.fraction(2), null)];
    return new FlexibilityEquation(leftTerms, rightTerms);
}

