import React, { ReactElement } from "react";
import { Parenthesis } from "@/types/math/enums.ts";
import { ParenthesisEquation as ParenthesisEquationProps } from "@/types/math/linearEquation.ts";
import { ParenthesisTerm as ParenthesisTermProps } from "@/types/math/term.ts";
import { FlexibilityCoefficient } from "@components/math/procedural-knowledge/FlexibilityCoefficient.tsx";
import { FlexibilityTerm } from "@components/math/procedural-knowledge/FlexibilityTerm.tsx";
import { ParenthesisLeft, ParenthesisRight } from "@components/math/procedural-knowledge/SubstitutedEquation.tsx";
import { parenthesisToFlexibilityTerm } from "@utils/utils.ts";

export function ParenthesisEquation({ equation }: { equation: ParenthesisEquationProps }) {
    return (
        <div className={"flexibility-equation flexibility-equation--light"}>
            <div className={"flexibility-equation__terms--left"}>
                {equation.leftTerms.map((term: ParenthesisTermProps, index: number) => {
                    return <ParenthesisTerm key={index} index={index} term={term} />;
                })}
            </div>
            <p>&#61;</p>
            <div className={"flexibility-equation__terms--right"}>
                {equation.rightTerms.map((term: ParenthesisTermProps, index: number) => {
                    return <ParenthesisTerm key={index} index={index} term={term} />;
                })}
            </div>
        </div>
    );
}

function ParenthesisTerm({ index, term }: { index: number; term: ParenthesisTermProps }): ReactElement | undefined {
    if (term.isMultiplication) {
        return (
            <React.Fragment>
                <p>&#8901;</p>
                <FlexibilityCoefficient coefficient={term.coefficient} displayOne={term.variable === null} colour={"light"} />
            </React.Fragment>
        );
    } else if (term.parenthesis === null) {
        return <FlexibilityTerm index={index} term={parenthesisToFlexibilityTerm(term)} colour={"light"} />;
    } else if (term.parenthesis === Parenthesis.LeftSmall || term.parenthesis === Parenthesis.LeftLarge) {
        let operator: ReactElement | undefined;
        if (index !== 0) {
            if (term.coefficient.s > 0) {
                operator = <p>&#43;</p>;
            } else {
                operator = <p>&#8722;</p>;
            }
        } else if (term.coefficient.s < 0) {
            operator = <p>-</p>;
        }
        return (
            <React.Fragment>
                {operator}
                <FlexibilityCoefficient coefficient={term.coefficient} displayOne={term.variable === null} colour={"light"} />
                <ParenthesisLeft containsFraction={term.parenthesis === Parenthesis.LeftLarge} />
            </React.Fragment>
        );
    } else {
        let operator: ReactElement | undefined;
        if (term.coefficient.s > 0) {
            operator = <p>&#43;</p>;
        } else {
            operator = <p>-</p>;
        }
        return (
            <React.Fragment>
                {operator}
                <FlexibilityCoefficient coefficient={term.coefficient} displayOne={term.variable === null} colour={"light"} />
                {term.variable !== null && <p>{term.variable}</p>}
                <ParenthesisRight containsFraction={term.parenthesis === Parenthesis.RightLarge} />
            </React.Fragment>
        );
    }
}
