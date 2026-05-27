import React, { ReactElement } from "react";
import { SubstitutionParameters, SubstitutionResultParameters } from "@/types/flexibility/substitutionParameters.ts";
import { FlexibilityEquation, FlexibilityEquation as FlexibilityEquationProps } from "@/types/math/linearEquation.ts";
import { FlexibilityTerm as FlexibilityTermProps } from "@/types/math/term.ts";
import { FlexibilityCoefficient } from "@components/math/procedural-knowledge/FlexibilityCoefficient.tsx";
import { FlexibilityTerm } from "@components/math/procedural-knowledge/FlexibilityTerm.tsx";
import { coefficientIsOne } from "@utils/utils.ts";
import LeftParenthesis from "@images/flexibility/LeftParenthesis.png";
import LeftParenthesisDark from "@images/flexibility/LeftParenthesisDark.png";
import RightParenthesis from "@images/flexibility/RightParenthesis.png";
import RightParenthesisDark from "@images/flexibility/RightParenthesisDark.png";

export function SubstitutedEquation({ initialEquation, substitutionParams, classname, colour }: {
    initialEquation: FlexibilityEquationProps;
    substitutionParams: SubstitutionResultParameters;
    containsFraction: boolean;
    classname?: string;
    colour?: string
}): ReactElement {
    return (
        <div className={`flexibility-equation ${classname !== undefined ? classname : ""}`}>
            <div className={"flexibility-equation__terms--left"}>
                {initialEquation.leftTerms.map((term: FlexibilityTermProps, index: number) => {
                    if (substitutionParams.isLeft && substitutionParams.index === index) {
                        return <SubstitutedTerm key={index} index={index} initialTerm={term} substitutionParams={substitutionParams} colour={colour} />;
                    } else {
                        return <FlexibilityTerm key={index} index={index} term={term} colour={colour} />;
                    }
                })}
            </div>
            <p>&#61;</p>
            <div className={"flexibility-equation__terms--right"}>
                {initialEquation.rightTerms.map((term: FlexibilityTermProps, index: number) => {
                    if (!substitutionParams.isLeft && substitutionParams.index === index) {
                        return <SubstitutedTerm key={index} index={index} initialTerm={term} substitutionParams={substitutionParams} colour={colour} />;
                    } else {
                        return <FlexibilityTerm key={index} index={index} term={term} colour={colour} />;
                    }
                })}
            </div>
        </div>
    );
}

function SubstitutedTerm({ index, initialTerm, substitutionParams, colour }: {
    index: number;
    initialTerm: FlexibilityTermProps;
    substitutionParams: SubstitutionResultParameters;
    colour?: string
}) {
    const factorIsOne = coefficientIsOne(initialTerm.coefficient);
    const factorIsPositive = initialTerm.coefficient.s > 0;
    const containsFraction: boolean = substitutionParams.substitutionItems.some((term) => term.coefficient.d !== 1);

    if (substitutionParams.substitutionItems.length === 1) {
        return <SubstitutionItemsLengthOne index={index} initialTerm={initialTerm} substitutionParams={substitutionParams} factorIsOne={factorIsOne}
                                           factorIsPositive={factorIsPositive} containsFraction={containsFraction} colour={colour} />;
    }

    const substitutionTerms: ReactElement = (
        <React.Fragment>
            {substitutionParams.substitutionItems.map((substitutionTerm: FlexibilityTermProps, substitutionIndex: number) => {
                return <FlexibilityTerm key={substitutionIndex} index={substitutionIndex} term={substitutionTerm} colour={colour} />;
            })}
        </React.Fragment>
    );

    if (factorIsPositive && (factorIsOne || initialTerm.variable === null || substitutionParams.replaceAll)) {
        return <React.Fragment>
            {index !== 0 && <p>&#43;</p>}
            {substitutionTerms}
        </React.Fragment>;
    }

    let operator: ReactElement | undefined;
    if (index !== 0) {
        if (factorIsPositive) {
            operator = <p>&#43;</p>;
        } else {
            operator = <p>&#8722;</p>;
        }
    } else if (!factorIsPositive) {
        operator = <p>-</p>;
    }

    return (
        <React.Fragment>
            {operator}
            {substitutionParams.variable !== undefined && <FlexibilityCoefficient coefficient={initialTerm.coefficient} displayOne={false} colour={colour} />}
            <ParenthesisLeft containsFraction={containsFraction} colour={colour} />
            {substitutionTerms}
            <ParenthesisRight containsFraction={containsFraction} colour={colour} />
            {substitutionParams.variable === undefined && <p>{initialTerm.variable}</p>}
        </React.Fragment>
    );
}

function SubstitutionItemsLengthOne({ index, initialTerm, substitutionParams, factorIsOne, factorIsPositive, containsFraction, colour }: {
    index: number;
    initialTerm: FlexibilityTermProps;
    substitutionParams: SubstitutionResultParameters;
    factorIsOne: boolean;
    factorIsPositive: boolean;
    containsFraction: boolean;
    colour?: string
}): ReactElement {
    const substitutionTerms: ReactElement = (
        <React.Fragment>
            {substitutionParams.substitutionItems.map((substitutionTerm: FlexibilityTermProps, substitutionIndex: number) => {
                return <FlexibilityTerm key={substitutionIndex} index={substitutionIndex} term={substitutionTerm} colour={colour} />;
            })}
        </React.Fragment>
    );

    const indexedSubstitutionTerms: ReactElement = (
        <React.Fragment>
            {substitutionParams.substitutionItems.map((substitutionTerm: FlexibilityTermProps, substitutionIndex: number) => {
                return <FlexibilityTerm key={substitutionIndex} index={substitutionIndex + substitutionParams.index} term={substitutionTerm} colour={colour} />;
            })}
        </React.Fragment>
    );

    const isPositive: boolean = substitutionParams.substitutionItems[0].coefficient.s > 0;

    if (substitutionParams.replaceAll) {
        if (factorIsPositive) {
            return indexedSubstitutionTerms;
        } else {
            return (
                <React.Fragment>
                    <p>-</p>
                    <ParenthesisLeft containsFraction={containsFraction} colour={colour} />
                    {indexedSubstitutionTerms}
                    <ParenthesisRight containsFraction={containsFraction} colour={colour} />
                </React.Fragment>
            );
        }
    } else if (substitutionParams.variable !== undefined) {
        if (factorIsOne) {
            let operator: ReactElement | undefined;
            if (index !== 0) {
                operator = <p>&#43;</p>;
            } else {
                operator = <p>-</p>;
            }
            if (factorIsPositive) {
                return indexedSubstitutionTerms;
            } else if (isPositive) {
                return (
                    <React.Fragment>
                        {operator}
                        {substitutionTerms}
                    </React.Fragment>
                );
            } else {
                return (
                    <React.Fragment>
                        {operator}
                        <ParenthesisLeft containsFraction={containsFraction} colour={colour} />
                        {substitutionTerms}
                        <ParenthesisRight containsFraction={containsFraction} colour={colour} />
                    </React.Fragment>
                );
            }
        } else {
            let operator: ReactElement | undefined;
            if (index !== 0) {
                if (factorIsPositive) {
                    operator = <p>&#43;</p>;
                } else {
                    operator = <p>&#8722;</p>;
                }
            } else if (!factorIsPositive) {
                operator = <p>-</p>;
            }
            if (isPositive) {
                return (
                    <React.Fragment>
                        {operator}
                        <FlexibilityCoefficient coefficient={initialTerm.coefficient} displayOne={true} colour={colour} />
                        {<p>&#8901;</p>}
                        {substitutionTerms}
                    </React.Fragment>
                );
            } else {
                return (
                    <React.Fragment>
                        {operator}
                        <FlexibilityCoefficient coefficient={initialTerm.coefficient} displayOne={true} colour={colour} />
                        <ParenthesisLeft containsFraction={containsFraction} colour={colour} />
                        {substitutionTerms}
                        <ParenthesisRight containsFraction={containsFraction} colour={colour} />
                    </React.Fragment>
                );
            }
        }
    }

    const showDot = initialTerm.variable !== null && substitutionParams.substitutionItems[0].variable !== null;

    if (factorIsPositive && initialTerm.variable === null) {
        return indexedSubstitutionTerms;
    } else {
        let operator: ReactElement | undefined;
        if (index !== 0) {
            if (factorIsPositive) {
                operator = <p>&#43;</p>;
            } else {
                operator = <p>&#8722;</p>;
            }
        } else if (!factorIsPositive) {
            operator = <p>-</p>;
        }
        return (
            <React.Fragment>
                {operator}
                {!isPositive && <ParenthesisLeft containsFraction={containsFraction} colour={colour} />}
                {substitutionTerms}
                {!isPositive && <ParenthesisRight containsFraction={containsFraction} colour={colour} />}
                {showDot && <p>&#8901;</p>}
                <p>{initialTerm.variable}</p>
            </React.Fragment>
        );
    }
}

export function ParenthesisLeft({ containsFraction, colour }: { containsFraction: boolean; colour?: string }): ReactElement {
    if (containsFraction) {
        return <img className={"parenthesis-image"} src={colour === "dark" ? LeftParenthesisDark : LeftParenthesis} alt={"Left parenthesis"} />;
    }
    return <p className={"parenthesis-text"}>(</p>;
}

export function ParenthesisRight({ containsFraction, colour }: { containsFraction: boolean; colour?: string }): ReactElement {
    if (containsFraction) {
        return <img className={"parenthesis-image"} src={colour === "dark" ? RightParenthesisDark : RightParenthesis} alt={"Right parenthesis"} />;
    }
    return <p className={"parenthesis-text"}>)</p>;
}

export function DetermineSubstitutedEquation({ initialSystem, transformedSystem, substitutionInfo }: {
    initialSystem: [FlexibilityEquation, FlexibilityEquation];
    transformedSystem?: [FlexibilityEquation, FlexibilityEquation];
    substitutionInfo?: SubstitutionParameters
}): ReactElement | undefined {
    if (substitutionInfo !== undefined) {
        let equation: FlexibilityEquation;
        if (transformedSystem !== undefined) {
            equation = substitutionInfo.isFirstEquation ? transformedSystem[0] : transformedSystem[1];
        } else {
            equation = substitutionInfo.isFirstEquation ? initialSystem[0] : initialSystem[1];
        }

        if (substitutionInfo.equationInfo === undefined) {
            return undefined;
        }
        const params = {
            variable: substitutionInfo.variable,
            substitutionItems: substitutionInfo.equationInfo.substitutionItems,
            isLeft: substitutionInfo.equationInfo.isLeft,
            index: substitutionInfo.equationInfo.index
        } as SubstitutionResultParameters;

        const containsFraction: boolean = params.substitutionItems.some((term) => term.coefficient.d !== 1);
        return <SubstitutedEquation initialEquation={equation} substitutionParams={params} containsFraction={containsFraction}
                                    classname={"flexibility-equation--light"} />;
    }
    return undefined;
}
