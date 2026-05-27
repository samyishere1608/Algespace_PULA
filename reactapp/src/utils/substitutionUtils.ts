import { SubstitutionError } from "@/types/flexibility/enums.ts";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { FlexibilityEquation as FlexibilityEquationProps } from "@/types/math/linearEquation.ts";
import { SubstitutionResultParameters } from "@/types/flexibility/substitutionParameters.ts";
import { FlexibilityTerm as FlexibilityTermProps } from "@/types/math/term.ts";
import { math } from "@/types/math/math.ts";
import { Fraction } from "mathjs";
import { coefficientIsOne } from "@utils/utils.ts";

export function getSubstitutionErrorMessage(error: SubstitutionError): string {
    switch (error) {
        case SubstitutionError.ExchangedFactor:
            return FlexibilityTranslations.SUBSTITUTION_ERROR_FACTOR;
        case SubstitutionError.ExchangedWrongVariable:
            return FlexibilityTranslations.SUBSTITUTION_ERROR_VARIABLE;
        case SubstitutionError.NotExchangeable:
            return FlexibilityTranslations.SUBSTITUTION_ERROR_NOT;
    }
}

export function computeSubstitutionResult(system: [FlexibilityEquationProps, FlexibilityEquationProps], substitutionParams: SubstitutionResultParameters): FlexibilityEquationProps | undefined {
    if (!substitutionParams.isValid) {
        return undefined;
    }
    const equation = substitutionParams.isFirstEquation ? system[0] : system[1];
    if (substitutionParams.isLeft) {
        return new FlexibilityEquationProps(computeSubstitutionTerms(equation.leftTerms, substitutionParams.substitutionItems, substitutionParams.index, substitutionParams.replaceAll), [...equation.rightTerms]);
    }
    return new FlexibilityEquationProps([...equation.leftTerms], computeSubstitutionTerms(equation.rightTerms, substitutionParams.substitutionItems, substitutionParams.index, substitutionParams.replaceAll));
}

export function computeSubstitutionTerms(terms: FlexibilityTermProps[], substitutionTerms: FlexibilityTermProps[], substitutionIndex: number, replaceAll: boolean): FlexibilityTermProps[] {
    const newTerms: FlexibilityTermProps[] = [];
    terms.forEach((term: FlexibilityTermProps, index: number): void => {
        if (index !== substitutionIndex) {
            newTerms.push(term);
        } else if (replaceAll) {
            substitutionTerms.forEach((substitutionTerm: FlexibilityTermProps) => {
                newTerms.push(substitutionTerm);
            });
        } else {
            substitutionTerms.forEach((substitutionTerm: FlexibilityTermProps) => {
                newTerms.push(new FlexibilityTermProps(math.multiply(term.coefficient, substitutionTerm.coefficient) as Fraction, substitutionTerm.variable));
            });
        }
    });
    return newTerms;
}

export function requiresDotOrFractions(initialEquation: FlexibilityEquationProps, substitutionParams: SubstitutionResultParameters): boolean {
    const terms = substitutionParams.isLeft ? initialEquation.leftTerms : initialEquation.rightTerms;
    const initialTerm = terms[substitutionParams.index];
    const factorIsOne = coefficientIsOne(initialTerm.coefficient);
    const factorIsPositive = initialTerm.coefficient.s > 0;
    const isPositive: boolean = substitutionParams.substitutionItems[0].coefficient.s > 0;
    const isOne = coefficientIsOne(substitutionParams.substitutionItems[0].coefficient);

    if (substitutionParams.substitutionItems.length === 1) {
        if (substitutionParams.variable !== undefined) {
            return !factorIsOne || (!factorIsPositive && !isPositive) || !isOne;
        }
        return !(factorIsPositive && initialTerm.variable === null) && (!isPositive || (initialTerm.variable !== null && substitutionParams.substitutionItems[0].variable !== null));
    } else {
        return !(factorIsPositive && (factorIsOne || initialTerm.variable === null));
    }
}
