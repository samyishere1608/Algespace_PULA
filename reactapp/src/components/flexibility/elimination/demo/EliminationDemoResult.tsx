import { TranslationNamespaces } from "@/i18n.ts";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Fraction } from "mathjs";
import React, { ReactElement, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { FlexibilityEquation as FlexibilityEquationProps } from "@/types/math/linearEquation.ts";
import { FlexibilityTerm } from "@/types/math/term.ts";
import { EliminationInstruction } from "@components/flexibility/elimination/EliminationMethod.tsx";
import { FlexibilityEquation } from "@components/math/procedural-knowledge/FlexibilityEquation.tsx";
import { MultipliedLinearSystem } from "@components/flexibility/elimination/MultipliedLinearSystem.tsx";

export function EliminationDemoResult(
    {
        system,
        resultingEquation,
        firstFactor,
        secondFactor,
        isAddition,
        isSwitched,
        firstVariable,
        secondVariable,
        reset,
        firstMultipliedEquation,
        secondMultipliedEquation
    }: {
        system: [FlexibilityEquationProps, FlexibilityEquationProps];
        resultingEquation: FlexibilityEquationProps;
        firstFactor: number | Fraction | undefined;
        secondFactor: number | Fraction | undefined;
        isAddition: boolean;
        isSwitched: boolean;
        firstVariable: Variable;
        secondVariable: Variable;
        reset: () => void;
        firstMultipliedEquation?: FlexibilityEquationProps;
        secondMultipliedEquation?: FlexibilityEquationProps;
    }
): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.Flexibility, TranslationNamespaces.General]);

    const containsFirst: boolean = equationContainsVariable(resultingEquation, firstVariable.name);
    const containsSecond: boolean = equationContainsVariable(resultingEquation, secondVariable.name);
    const isSolution: boolean = containsFirst ? !containsSecond : containsSecond;

    const contentRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        if (contentRef.current !== null) {
            contentRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, []);

    return (
        <React.Fragment>
            <div className={"elimination-instruction"}>
                <EliminationInstruction />
            </div>
            <div className={"elimination-result"} ref={contentRef}>
                <div className={"elimination-result__top"}>
                    <MultipliedLinearSystem firstEquation={system[0]} secondEquation={system[1]} firstFactor={firstFactor} secondFactor={secondFactor}
                                            isSwitched={isSwitched} isAddition={isAddition} firstMultipliedEquation={firstMultipliedEquation}
                                            secondMultipliedEquation={secondMultipliedEquation} />
                </div>
                <hr />
                <div className={`elimination-result__bottom${isSolution ? "--solution" : "--error"}`}>{resultingEquation !== undefined &&
                    <FlexibilityEquation equation={resultingEquation} />}</div>
            </div>
            {isSolution ? <p>{t(FlexibilityTranslations.ELIMINATION_DEMO_SOL)}</p> :
                <p>{t(FlexibilityTranslations.ELIMINATION_DEMO_ERROR)} {t(FlexibilityTranslations.TRY_AGAIN)}</p>}
            <button className={"button primary-button"} onClick={reset}>
                <FontAwesomeIcon icon={faArrowLeft} />
                {t(FlexibilityTranslations.DEMO_TRY_AGAIN)}
            </button>
            <div style={{ minHeight: "1rem", minWidth: "1rem" }}></div>
        </React.Fragment>
    );
}

function equationContainsVariable(equation: FlexibilityEquationProps, variable: string): boolean {
    return termsContainVariable(equation.leftTerms, variable) || termsContainVariable(equation.rightTerms, variable);
}

function termsContainVariable(terms: FlexibilityTerm[], variable: string): boolean {
    return terms.some((term: FlexibilityTerm) => term.variable !== null && term.variable === variable);
}
