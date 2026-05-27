import { TranslationNamespaces } from "@/i18n.ts";
import { faArrowLeft, faArrowRight, faQuestion } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Fraction } from "mathjs";
import React, {ReactElement, useLayoutEffect, useRef, useState} from "react";
import { useTranslation} from "react-i18next";
import { EliminationParameters } from "@/types/flexibility/eliminationParameters.ts";
import { AgentExpression, AgentType } from "@/types/flexibility/enums.ts";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { FlexibilityEquation as FlexibilityEquationProps } from "@/types/math/linearEquation.ts";
import { FlexibilityTerm } from "@/types/math/term.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { EliminationInstruction } from "@components/flexibility/elimination/EliminationMethod.tsx";
import { FlexibilityPopover } from "@components/flexibility/interventions/FlexibilityPopover.tsx";
import { FlexibilityEquation } from "@components/math/procedural-knowledge/FlexibilityEquation.tsx";
import { MultipliedLinearSystem } from "@components/flexibility/elimination/MultipliedLinearSystem.tsx";
import {Intervention} from "@components/flexibility/interventions/Intervention.tsx";


export function EliminationResult(
    {
        system,
        resultingEquation,
        firstFactor,
        secondFactor,
        isAddition,
        isSwitched,
        firstVariable,
        secondVariable,
        loadNextStep,
        reset,
        firstMultipliedEquation,
        secondMultipliedEquation,
        attempts,
        setShowSampleSolution,
        agentType,
        trackAction,
        trackError,
        trackHints,
        loadPreviousStep
    }: {
        system: [FlexibilityEquationProps, FlexibilityEquationProps];
        resultingEquation: FlexibilityEquationProps;
        firstFactor: number | Fraction | undefined;
        secondFactor: number | Fraction | undefined;
        isAddition: boolean;
        isSwitched: boolean;
        firstVariable: Variable;
        secondVariable: Variable;
        loadNextStep: (resultingEquation: FlexibilityEquationProps, containsFirst: boolean, params?: EliminationParameters, firstMultipliedEquation?: FlexibilityEquationProps, secondMultipliedEquation?: FlexibilityEquationProps) => void;
        reset: () => void;
        firstMultipliedEquation?: FlexibilityEquationProps;
        secondMultipliedEquation?: FlexibilityEquationProps;
        attempts: number;
        setShowSampleSolution: (value: React.SetStateAction<boolean>) => void;
        agentType?: AgentType;
        trackAction: (action: string) => void;
        trackError: () => void;
        trackHints: () => void;
        loadPreviousStep?: () => void;
    }
): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.Flexibility, TranslationNamespaces.General]);

    const containsFirst: boolean = equationContainsVariable(resultingEquation, firstVariable.name);
    const containsSecond: boolean = equationContainsVariable(resultingEquation, secondVariable.name);
    const isSolution: boolean = containsFirst ? !containsSecond : containsSecond;
    const phase: string = getRandomBackToExplanation();
    const [showSampleMessage, setShowSampleMessage] = useState(false);


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
            {isSolution ? (
                <FlexibilityPopover agentType={agentType} agentExpression={AgentExpression.Smiling}>
                    <React.Fragment>
                        <p>{t(FlexibilityTranslations.ELIMINATION_SOLUTION)}</p>
                        <button
                            className={"button primary-button"}
                            onClick={(): void => {
                                trackAction("SUCCESS");
                                if (firstMultipliedEquation !== undefined || secondMultipliedEquation !== undefined) {
                                    loadNextStep(
                                        resultingEquation,
                                        containsFirst,
                                        {
                                            switchedEquations: isSwitched,
                                            isAddition: isAddition,
                                            firstFactor: firstFactor,
                                            secondFactor: secondFactor
                                        } as EliminationParameters,
                                        firstMultipliedEquation,
                                        secondMultipliedEquation
                                    );
                                } else {
                                    loadNextStep(resultingEquation, containsFirst, {
                                        switchedEquations: isSwitched,
                                        isAddition: isAddition
                                    } as EliminationParameters);
                                }
                            }}
                        >
                            {t(GeneralTranslations.BUTTON_CONTINUE, { ns: TranslationNamespaces.General })}
                            <FontAwesomeIcon icon={faArrowRight} />
                        </button>
                    </React.Fragment>
                </FlexibilityPopover>
            ) : (
                attempts <= 2 ? (
                    <FlexibilityPopover agentType={agentType} agentExpression={AgentExpression.Thinking}>
                        <>
                            <p>{t(FlexibilityTranslations.ELIMINATION_FAULTY)} {t(FlexibilityTranslations.TRY_AGAIN)}</p>
                            <button className={"button primary-button"} onClick={reset}>
                                <FontAwesomeIcon icon={faArrowLeft} />
                                {t(FlexibilityTranslations.BUTTON_TRY_AGAIN)}
                            </button>
                        </>
                    </FlexibilityPopover>

                )
                : loadPreviousStep !== undefined ? (
                <Intervention
                handleYes={() => {
                trackError();
                trackAction("BACK TO EXPLANATION");
                loadPreviousStep();
            }}
            handleNo={() => {
                trackAction("FAILED, SAMPLE solution");
                trackError();
                setShowSampleMessage(true);
                setShowSampleSolution(true);
            }}
            agentType={agentType}
            agentExpression={AgentExpression.Thinking}
        >
            <p className={"strong-primary"}>
                {t(phase)}
            </p>
        </Intervention>
                    ):
                        <FlexibilityPopover agentType={agentType} agentExpression={AgentExpression.Thinking}>
                            <>
                                {attempts === 3 ? (
                                    <>
                                        <p>{t(FlexibilityTranslations.ELIMINATION_HINT_1)}</p>
                                        <button className="button primary-button" onClick={() => {
                                            reset();
                                            trackHints()
                                        }}>
                                            <FontAwesomeIcon icon={faArrowLeft} />{t(FlexibilityTranslations.BUTTON_TRY_AGAIN)}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p>{t(FlexibilityTranslations.ELIMINATION_HINT_2)}</p>
                                        <button
                                            className="button primary-button"
                                            onClick={() => {
                                                trackAction("FAILED, SAMPLE solution");
                                                setShowSampleMessage(true);
                                                setShowSampleSolution(true);
                                                trackHints();
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faArrowLeft} />
                                            {t(FlexibilityTranslations.BUTTON_SHOW_SAMPLE_SOLUTION)}
                                        </button>
                                        <button className="button primary-button" onClick={() => {
                                            reset();
                                            trackHints()
                                        }}>
                                            <FontAwesomeIcon icon={faArrowLeft} />
                                            {t(FlexibilityTranslations.BUTTON_TRY_AGAIN)}
                                        </button>
                                    </>
                                )}
                            </>
                        </FlexibilityPopover>
            )}
            {showSampleMessage && (
                <p className="strong-primary">
            {t(FlexibilityTranslations.ELIMINATION_FAULTY)}{" "}
            {t(FlexibilityTranslations.SAMPLE_SOLUTION)}
                </p>
            )}
            <button className={"button primary-button help-button flexibility-hint-button"} disabled={true}>
                <FontAwesomeIcon icon={faQuestion}/>
            </button>
            <div style={{ minHeight: "9rem", minWidth: "1rem" }}></div>
        </React.Fragment>
    );
}

function equationContainsVariable(equation: FlexibilityEquationProps, variable: string): boolean {
    return termsContainVariable(equation.leftTerms, variable) || termsContainVariable(equation.rightTerms, variable);
}

function termsContainVariable(terms: FlexibilityTerm[], variable: string): boolean {
    return terms.some((term: FlexibilityTerm) => term.variable !== null && term.variable === variable);
}


function getRandomBackToExplanation(): string {
    const explanations = [
        FlexibilityTranslations.BACK_TO_EXPLANATION1,
        FlexibilityTranslations.BACK_TO_EXPLANATION2,
        FlexibilityTranslations.BACK_TO_EXPLANATION3,
        FlexibilityTranslations.BACK_TO_EXPLANATION4,
        FlexibilityTranslations.BACK_TO_EXPLANATION5
    ];
    const randomIndex = Math.floor(Math.random() * explanations.length);
    return explanations[randomIndex];
}