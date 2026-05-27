import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { FlexibilityTerm } from "@/types/math/term.ts";
import { Fraction } from "mathjs";
import { addOrSubtractCoefficients, multiplyCoefficientWithScalar } from "@utils/utils.ts";
import { math } from "@/types/math/math.ts";

export function multiplyTerms(terms: FlexibilityTerm[], scalar: number | Fraction): FlexibilityTerm[] {
    const multipliedTerms: FlexibilityTerm[] = [];
    terms.forEach((term: FlexibilityTerm): void => {
        multipliedTerms.push(new FlexibilityTerm(multiplyCoefficientWithScalar(term.coefficient, scalar), term.variable));
    });
    return multipliedTerms;
}

export function sumUpEquations(firstEquation: FlexibilityEquation, secEquation: FlexibilityEquation, isAddition: boolean): FlexibilityEquation {
    return new FlexibilityEquation(sumUpTerms(firstEquation.leftTerms, secEquation.leftTerms, isAddition), sumUpTerms(firstEquation.rightTerms, secEquation.rightTerms, isAddition));
}

export function sumUpTerms(firstTerms: FlexibilityTerm[], secondTerms: FlexibilityTerm[], isAddition: boolean): FlexibilityTerm[] {
    const addedTerms: FlexibilityTerm[] = [];
    const checkedIndices: number[] = [];

    firstTerms.forEach((term: FlexibilityTerm): void => {
        const index: number = secondTerms.findIndex((entry: FlexibilityTerm): boolean => entry.variable === term.variable);
        if (index === -1) {
            addedTerms.push(new FlexibilityTerm(term.coefficient, term.variable));
        } else {
            const sum: Fraction = addOrSubtractCoefficients(isAddition, term.coefficient, secondTerms[index].coefficient);
            if (!math.isZero(sum)) {
                addedTerms.push(new FlexibilityTerm(sum, term.variable));
            }
            checkedIndices.push(index);
        }
    });

    secondTerms.forEach((term: FlexibilityTerm, index: number): void => {
        if (checkedIndices.includes(index)) {
            return;
        }
        addedTerms.push(new FlexibilityTerm(isAddition ? term.coefficient : math.unaryMinus(term.coefficient), term.variable));
    });

    if (addedTerms.length === 0) {
        addedTerms.push(new FlexibilityTerm(math.fraction(0), null));
    }

    return addedTerms;
}