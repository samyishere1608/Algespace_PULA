import { TranslationNamespaces } from "@/i18n.ts";
import { faArrowLeft, faArrowRight, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { AgentExpression, AgentType } from "@/types/flexibility/enums.ts";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { SubstitutedEquationInfo, SubstitutionParameters, SubstitutionResultParameters } from "@/types/flexibility/substitutionParameters.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { FlexibilityEquation as FlexibilityEquationProps } from "@/types/math/linearEquation.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { FlexibilityPopover } from "@components/flexibility/interventions/FlexibilityPopover.tsx";
import { computeSubstitutionResult, getSubstitutionErrorMessage, requiresDotOrFractions } from "@utils/substitutionUtils.ts";
import { EquivalentSubstitutionEquations, SubstitutionResultEquations } from "@components/flexibility/substitution/SubstitutionResultEquations.tsx";

export function SubstitutionResult(
    {
        system,
        substitutionParams,
        firstVariable,
        setSubstitutionParams,
        attempts,
        setShowSampleSolution,
        loadNextStep,
        agentType,
        trackAction,
        isTip
    }: {
        system: [FlexibilityEquationProps, FlexibilityEquationProps];
        firstVariable: Variable;
        substitutionParams: SubstitutionResultParameters;
        setSubstitutionParams: (value: React.SetStateAction<SubstitutionResultParameters | undefined>) => void;
        attempts: number;
        setShowSampleSolution: (value: React.SetStateAction<boolean>) => void;
        loadNextStep: (equation: FlexibilityEquationProps, containsFirst: boolean, params?: SubstitutionParameters) => void;
        agentType?: AgentType;
        trackAction: (action: string) => void;
        isTip: boolean;
    }
): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.Flexibility, TranslationNamespaces.General]);

    const containsFraction: boolean = substitutionParams.substitutionItems.some((term) => term.coefficient.d !== 1);
    const substitutionResult: FlexibilityEquationProps | undefined = computeSubstitutionResult(system, substitutionParams);
    const containsDotOrFractions: boolean = isTip ? false : requiresDotOrFractions(substitutionParams.isFirstEquation ? system[0] : system[1], substitutionParams);

    return (
        <React.Fragment>
            <SubstitutionResultEquations system={system} substitutionParams={substitutionParams} containsFraction={containsFraction} />
            {!substitutionParams.isValid && substitutionParams.error !== undefined && (
                <FlexibilityPopover agentType={agentType} agentExpression={AgentExpression.Thinking}>
                    <React.Fragment>
                        {attempts <= 2 ?
                            <React.Fragment>
                                <p>{t(getSubstitutionErrorMessage(substitutionParams.error))} {t(FlexibilityTranslations.TRY_AGAIN)}</p>
                                <button className={"button primary-button"} onClick={() => setSubstitutionParams(undefined)}>
                                    <FontAwesomeIcon icon={faArrowLeft} />
                                    {t(FlexibilityTranslations.BUTTON_TRY_AGAIN)}
                                </button>
                            </React.Fragment> :
                            <React.Fragment>
                                <p>{t(getSubstitutionErrorMessage(substitutionParams.error))} {t(FlexibilityTranslations.SAMPLE_SOLUTION)}</p>
                                <button className={"button primary-button"} onClick={() => {
                                    trackAction("SAMPLE solution");
                                    setShowSampleSolution(true);
                                }}>
                                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                                    {t(GeneralTranslations.BUTTON_SHOW, { ns: TranslationNamespaces.General })}
                                </button>
                            </React.Fragment>
                        }
                    </React.Fragment>
                </FlexibilityPopover>
            )}
            {substitutionParams.isValid && substitutionResult !== undefined && (
                <FlexibilityPopover agentType={agentType} agentExpression={AgentExpression.Smiling}>
                    <React.Fragment>
                        <p>{t(FlexibilityTranslations.SUBSTITUTION_SOLUTION)}</p>
                        {containsDotOrFractions && (
                            <EquivalentSubstitutionEquations system={system} substitutionParams={substitutionParams} containsFraction={containsDotOrFractions}
                                                             substitutionResult={substitutionResult} />
                        )}
                        <button className={"button primary-button"} onClick={() => continueWithNextStep(substitutionResult)}>
                            {t(GeneralTranslations.BUTTON_CONTINUE, { ns: TranslationNamespaces.General })}
                            <FontAwesomeIcon icon={faArrowRight} />
                        </button>
                    </React.Fragment>
                </FlexibilityPopover>
            )}
        </React.Fragment>
    );

    function continueWithNextStep(equation: FlexibilityEquationProps): void {
        loadNextStep(equation, substitutionParams.variable !== firstVariable.name, {
            isFirstEquation: substitutionParams.isFirstEquation,
            variable: substitutionParams.variable,
            equationInfo: containsDotOrFractions
                ? ({
                    substitutionItems: substitutionParams.substitutionItems,
                    isLeft: substitutionParams.isLeft,
                    index: substitutionParams.index
                } as SubstitutedEquationInfo)
                : undefined
        } as SubstitutionParameters);
    }
}