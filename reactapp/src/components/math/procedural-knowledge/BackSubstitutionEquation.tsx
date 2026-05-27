import { Fraction } from "mathjs";
import React, { ReactElement } from "react";
import { Variable } from "@/types/flexibility/variable.ts";
import { FlexibilityEquation as FlexibilityEquationProps } from "@/types/math/linearEquation.ts";
import { math } from "@/types/math/math.ts";
import { FlexibilityTerm as FlexibilityTermProps } from "@/types/math/term.ts";
import { FlexibilityCoefficient } from "@components/math/procedural-knowledge/FlexibilityCoefficient.tsx";
import { FlexibilityTerm } from "@components/math/procedural-knowledge/FlexibilityTerm.tsx";
import { ParenthesisLeft, ParenthesisRight } from "@components/math/procedural-knowledge/SubstitutedEquation.tsx";
import { coefficientIsOne } from "@utils/utils.ts";

export function BackSubstitutionEquation({ initialEquation, variable }: { initialEquation: FlexibilityEquationProps; variable: Variable }): ReactElement {
    const variableFactor = math.fraction(variable.value.value);

    return (
        <div className={`flexibility-equation flexibility-equation--light`}>
            <div className={"flexibility-equation__terms--left"}>
                {initialEquation.leftTerms.map((term: FlexibilityTermProps, index: number) => {
                    return <BackSubstitutionTerm key={index} index={index} term={term} variable={variable.name} variableFactor={variableFactor} />;
                })}
            </div>
            <p>&#61;</p>
            <div className={"flexibility-equation__terms--right"}>
                {initialEquation.rightTerms.map((term: FlexibilityTermProps, index: number) => {
                    return <BackSubstitutionTerm key={index} index={index} term={term} variable={variable.name} variableFactor={variableFactor} />;
                })}
            </div>
        </div>
    );
}

function BackSubstitutionTerm({ index, term, variable, variableFactor }: { index: number; term: FlexibilityTermProps; variable: string; variableFactor: Fraction }): ReactElement {
    if (term.variable !== null && term.variable === variable) {
        const isPositive = term.coefficient.s > 0;
        const varIsPositive = variableFactor.s > 0;
        if (coefficientIsOne(term.coefficient)) {
            if (!isPositive) {
                if (!varIsPositive) {
                    return (
                        <React.Fragment>
                            {index !== 0 ? <p>&#8722;</p> : <p>-</p>}
                            <ParenthesisLeft containsFraction={variableFactor.d !== 1} />
                            <p>-</p>
                            <FlexibilityCoefficient coefficient={variableFactor} displayOne={true} colour={"light"} />
                            <ParenthesisRight containsFraction={variableFactor.d !== 1} />
                        </React.Fragment>
                    );
                } else {
                    return (
                        <React.Fragment>
                            {index !== 0 ? <p>&#8722;</p> : <p>-</p>}
                            <FlexibilityCoefficient coefficient={variableFactor} displayOne={true} colour={"light"} />
                        </React.Fragment>
                    );
                }
            } else {
                let operator: ReactElement | undefined;
                if (index !== 0) {
                    if (varIsPositive) {
                        operator = <p>&#43;</p>;
                    } else {
                        operator = <p>&#8722;</p>;
                    }
                } else if (!varIsPositive) {
                    operator = <p>-</p>;
                }
                return (
                    <React.Fragment>
                        {operator}
                        <FlexibilityCoefficient coefficient={variableFactor} displayOne={true} colour={"light"} />
                    </React.Fragment>
                );
            }
        } else {
            let operator: ReactElement | undefined;
            if (index !== 0) {
                if (isPositive) {
                    operator = <p>&#43;</p>;
                } else {
                    operator = <p>&#8722;</p>;
                }
            } else if (!isPositive) {
                operator = <p>-</p>;
            }
            return (
                <React.Fragment>
                    {operator}
                    <FlexibilityCoefficient coefficient={term.coefficient} displayOne={true} colour={"light"} />
                    {varIsPositive && <p>&#8901;</p>}
                    {!varIsPositive && (
                        <React.Fragment>
                            <ParenthesisLeft containsFraction={variableFactor.d !== 1} />
                            <p>-</p>
                        </React.Fragment>
                    )}
                    <FlexibilityCoefficient coefficient={variableFactor} displayOne={true} colour={"light"} />
                    {!varIsPositive && <ParenthesisRight containsFraction={variableFactor.d !== 1} />}
                </React.Fragment>
            );
        }
    }

    return <FlexibilityTerm index={index} term={term} />;
}
