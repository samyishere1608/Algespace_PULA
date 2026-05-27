import { Fraction } from "mathjs";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { FlexibilityTerm } from "@/types/math/term.ts";

/**
 * Formats a Fraction value as a compact string: "2", "-3", "1/2", etc.
 */
function fractionToString(f: Fraction): string {
    // mathjs Fraction has .n (numerator), .d (denominator), .s (sign)
    const num = f.s * f.n;
    const den = f.d;
    if (den === 1) return `${num}`;
    return `${num}/${den}`;
}

/**
 * Converts a list of FlexibilityTerms into a human-readable sum string,
 * e.g. "2x - y + 3" or "x + 2y"
 */
function termsToString(terms: FlexibilityTerm[]): string {
    let result = "";
    for (let i = 0; i < terms.length; i++) {
        const term = terms[i];
        const coeff = term.coefficient;
        const variable = term.variable;

        const coeffNum = coeff.s * coeff.n;
        const coeffDen = coeff.d;
        const isNegative = coeffNum < 0;
        const absCoeff: Fraction = { ...coeff, s: 1, n: Math.abs(coeffNum) } as Fraction;

        const sign = isNegative ? "-" : "+";

        let termStr: string;
        if (variable === null) {
            // Pure number
            termStr = fractionToString(coeff);
        } else {
            const absVal = Math.abs(coeffNum);
            const isOne = absVal === 1 && coeffDen === 1;
            const coeffStr = isOne ? "" : fractionToString(absCoeff);
            termStr = `${isNegative ? "-" : ""}${coeffStr}${variable}`;
        }

        if (i === 0) {
            result += termStr;
        } else {
            // Remove leading sign from termStr since we add it separately
            const stripped = termStr.startsWith("-") ? termStr.slice(1) : termStr;
            result += ` ${sign} ${stripped}`;
        }
    }
    return result || "0";
}

/**
 * Converts a FlexibilityEquation to a readable string like "2x + y = 5"
 */
export function equationToString(eq: FlexibilityEquation): string {
    const left = termsToString(eq.leftTerms);
    const right = termsToString(eq.rightTerms);
    return `${left} = ${right}`;
}
