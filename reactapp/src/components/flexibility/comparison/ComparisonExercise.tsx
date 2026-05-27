import { TranslationNamespaces } from "@/i18n.ts";
import React, { CSSProperties, ReactElement, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Comparison as ComparisonProps } from "@/types/flexibility/comparison.ts";
import { EliminationParameters } from "@/types/flexibility/eliminationParameters.ts";
import { AgentExpression, AgentType, ComparisonChoice, IsolatedIn, Method, SelectedEquation } from "@/types/flexibility/enums.ts";
import { FlexibilityTranslations, getMethodTranslation } from "@/types/flexibility/flexibilityTranslations.ts";
import { SubstitutionParameters } from "@/types/flexibility/substitutionParameters.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { FlexibilityEquation as FlexibilityEquationProps, ParenthesisEquation as ParenthesisEquationProps } from "@/types/math/linearEquation.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { DescriptionFirstStep } from "@components/flexibility/comparison/DescriptionFirstStep.tsx";
import { DescriptionSecondStep } from "@components/flexibility/comparison/DescriptionSecondStep.tsx";
import { ContinueMessage } from "@components/flexibility/interventions/ContinueMessage.tsx";
import { FlexibilityPopover } from "@components/flexibility/interventions/FlexibilityPopover.tsx";
import { VariableSolution } from "@components/flexibility/solution/VariableSolution.tsx";
import { BackSubstitutionEquation } from "@components/math/procedural-knowledge/BackSubstitutionEquation.tsx";
import { FlexibilityEquation } from "@components/math/procedural-knowledge/FlexibilityEquation.tsx";
import { LinearSystem } from "@components/math/procedural-knowledge/LinearSystem.tsx";
import { ParenthesisEquation } from "@components/math/procedural-knowledge/ParenthesisEquation.tsx";
import { DetermineSubstitutedEquation } from "@components/math/procedural-knowledge/SubstitutedEquation.tsx";
import EquivalenceSymbol from "@images/flexibility/equivalenceThin.svg";

export function ComparisonExercise(
    {
        firstEquation,
        secondEquation,
        firstVariable,
        secondVariable,
        comparison,
        selectedMethod,
        comparisonMethod,
        transformedSystem,
        transformationInfo,
        methodEquation,
        substitutionInfo,
        eliminationInfo,
        selectedEquation,
        loadNextStep,
        agentType,
        endTrackingPhase
    }: {
        firstEquation: FlexibilityEquationProps;
        secondEquation: FlexibilityEquationProps;
        firstVariable: Variable;
        secondVariable: Variable;
        comparison: ComparisonProps;
        selectedMethod: Method;
        comparisonMethod: Method;
        transformedSystem?: [FlexibilityEquationProps, FlexibilityEquationProps];
        transformationInfo: [IsolatedIn, IsolatedIn];
        methodEquation: [FlexibilityEquationProps, boolean];
        substitutionInfo?: SubstitutionParameters;
        eliminationInfo?: EliminationParameters;
        selectedEquation: [FlexibilityEquationProps, SelectedEquation];
        loadNextStep: () => void;
        agentType?: AgentType;
        endTrackingPhase: (choice?: string) => void;
    }
): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Flexibility);

    const instruction: TranslationInterpolation = useMemo(() => FlexibilityTranslations.getComparisonLayoutDescription(selectedMethod), [selectedMethod]);
    const firstMethodName: string = useMemo(() => getMethodTranslation(selectedMethod), [selectedMethod]);
    const comparisonMethodName: string = useMemo(() => getMethodTranslation(comparisonMethod), [comparisonMethod]);

    const [choice, setChoice] = useState<ComparisonChoice | undefined>(undefined);

    return (
        <React.Fragment>
            <p>{t(FlexibilityTranslations.COMPARISON_SYSTEM_INTRO)}</p>
            <LinearSystem firstEquation={firstEquation} secondEquation={secondEquation} />
            <p>
                <Trans ns={TranslationNamespaces.Flexibility} i18nKey={instruction.translationKey} values={instruction.interpolationVariables as object} />
            </p>
            <Comparison
                initialSystem={[firstEquation, secondEquation]}
                firstVariable={firstVariable}
                secondVariable={secondVariable}
                comparison={comparison}
                firstMethod={selectedMethod}
                comparisonMethod={comparisonMethod}
                transformedSystem={transformedSystem}
                transformationInfo={transformationInfo}
                methodEquation={methodEquation}
                eliminationInfo={eliminationInfo}
                substitutionInfo={substitutionInfo}
                selectedEquation={selectedEquation}
            />
            <p>{t(FlexibilityTranslations.COMPARISON_TASK_1)}</p>
            <p>{t(FlexibilityTranslations.COMPARISON_TASK_2)}</p>
            <div className={"flexibility-popover__choice-buttons"}>
                <button className={"button primary-button"} onClick={() => {
                    endTrackingPhase(`chose INITIAL method ${Method[selectedMethod]}`);
                    setChoice(ComparisonChoice.First);
                }} style={{ textTransform: "capitalize" }}
                        disabled={choice !== undefined}>
                    {t(firstMethodName)}
                </button>
                <button className={"button primary-button"} onClick={() => {
                    endTrackingPhase(`chose COMPARISON method ${Method[comparisonMethod]}`);
                    setChoice(ComparisonChoice.Second);
                }} style={{ textTransform: "capitalize" }}
                        disabled={choice !== undefined}>
                    {t(comparisonMethodName)}
                </button>
            </div>
            {choice !== undefined && (
                <FlexibilityPopover agentType={agentType} agentExpression={AgentExpression.Smiling}>
                    <ContinueMessage
                        message={choice === ComparisonChoice.First ? FlexibilityTranslations.COMPARISON_REPLY_AGREE : FlexibilityTranslations.COMPARISON_REPLY_DISAGREE}
                        loadNextStep={loadNextStep} />
                </FlexibilityPopover>
            )}
        </React.Fragment>
    );
}

function Comparison(
    {
        initialSystem,
        firstVariable,
        secondVariable,
        comparison,
        firstMethod,
        comparisonMethod,
        transformedSystem,
        transformationInfo,
        methodEquation,
        substitutionInfo,
        eliminationInfo,
        selectedEquation
    }: {
        initialSystem: [FlexibilityEquationProps, FlexibilityEquationProps];
        firstVariable: Variable;
        secondVariable: Variable;
        comparison: ComparisonProps;
        firstMethod: Method;
        comparisonMethod: Method;
        transformedSystem?: [FlexibilityEquationProps, FlexibilityEquationProps];
        transformationInfo: [IsolatedIn, IsolatedIn];
        methodEquation: [FlexibilityEquationProps, boolean];
        substitutionInfo?: SubstitutionParameters;
        eliminationInfo?: EliminationParameters;
        selectedEquation: [FlexibilityEquationProps, SelectedEquation];
    }
): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Flexibility);

    const descriptionStep3: TranslationInterpolation = FlexibilityTranslations.getDescriptionForStep3(methodEquation[1] ? firstVariable.name : secondVariable.name, !methodEquation[1] ? firstVariable.name : secondVariable.name, selectedEquation[1]);

    const equivalenceSymbol: ReactElement = <img style={{ width: "1.75rem", height: "auto", marginTop: "0.125rem" }} src={EquivalenceSymbol} alt={"equivalent"} />;

    const borderStyle: CSSProperties = {
        borderBottom: (transformedSystem !== undefined || !nullOrUndefined(comparison.steps[0].equations)) ? "0.5px dashed var(--light-text-50)" : "none"
    };

    const paddingStyleSecondRowLeft: CSSProperties = {
        paddingTop: (transformedSystem !== undefined || eliminationInfo !== undefined) ? "1rem" : 0,
        paddingBottom: (transformedSystem !== undefined || eliminationInfo !== undefined) ? "1rem" : 0
    };

    const paddingStyleSecondRowRight: CSSProperties = {
        paddingTop: nullOrUndefined(comparison.steps[0].description) ? 0 : "1rem",
        paddingBottom: nullOrUndefined(comparison.steps[0].description) ? 0 : "1rem"
    };

    return (
        <div className={"comparison__grid"}>
            <div className="comparison__row1 comparison__column1-2">
                <p>{t(FlexibilityTranslations.COMPARISON_YOUR_APPROACH)}</p>
                <p className={"method"}>{t(getMethodTranslation(firstMethod))}</p>
            </div>
            <div className="comparison__row1 comparison__column3-4">
                <p>{t(FlexibilityTranslations.COMPARISON_CLASSMATE_APPROACH)}</p>
                <p className={"method"}>{t(getMethodTranslation(comparisonMethod))}</p>
            </div>

            <div className="comparison__row2 comparison__column1" style={{ ...paddingStyleSecondRowLeft, ...borderStyle }}>
                <DescriptionFirstStep firstVariable={firstVariable.name} secondVariable={secondVariable.name} transformationInfo={transformationInfo}
                                      transformedSystem={transformedSystem} eliminationInfo={eliminationInfo} />
            </div>
            <div className="comparison__row2 comparison__column2" style={{ ...paddingStyleSecondRowLeft, ...borderStyle }}>
                {transformedSystem !== undefined && (
                    <React.Fragment>
                        {transformationInfo[0] !== IsolatedIn.None &&
                            <FlexibilityEquation equation={transformedSystem[0]} classname={"flexibility-equation flexibility-equation--light"} />}
                        {transformationInfo[1] !== IsolatedIn.None &&
                            <FlexibilityEquation equation={transformedSystem[1]} classname={"flexibility-equation flexibility-equation--light"} />}
                    </React.Fragment>
                )}
            </div>
            <div className="comparison__row2 comparison__column3" style={{ ...paddingStyleSecondRowRight, ...borderStyle }}>
                {comparison.steps[0].equations?.map((equation: ParenthesisEquationProps, index: number) => {
                    return <ParenthesisEquation key={index} equation={equation} />;
                })}
            </div>
            <div className="comparison__row2 comparison__column4" style={{ ...paddingStyleSecondRowRight, ...borderStyle }}>
                {!nullOrUndefined(comparison.steps[0].description) && <p>{comparison.steps[0].description}</p>}
            </div>

            <div className="comparison__row3 comparison__column1">
                <DescriptionSecondStep method={firstMethod} variable={methodEquation[1] ? firstVariable.name : secondVariable.name}
                                       transformationInfo={transformationInfo} transformedSystem={transformedSystem} substitutionInfo={substitutionInfo}
                                       eliminationInfo={eliminationInfo} />
            </div>
            <div className="comparison__row3 comparison__column2">
                <div className={"equation__grid"}>
                    {substitutionInfo !== undefined && substitutionInfo.equationInfo !== undefined && (
                        <React.Fragment>
                            <div className={"equation__row1 equation__column1"} />
                            <div className={"equation__row1 equation__column2"}>
                                <DetermineSubstitutedEquation initialSystem={initialSystem} transformedSystem={transformedSystem} substitutionInfo={substitutionInfo} />
                            </div>
                        </React.Fragment>
                    )}
                    <div className={"equation__row2 equation__column1"}>{substitutionInfo !== undefined && equivalenceSymbol}</div>
                    <div className={"equation__row2 equation__column2"}>
                        <FlexibilityEquation equation={methodEquation[0]} classname={"flexibility-equation--light"} />
                    </div>
                    <div className={"equation__row3 equation__column1"}>{equivalenceSymbol}</div>
                    <div className={"equation__row3 equation__column2"}>
                        <VariableSolution variable={methodEquation[1] ? firstVariable : secondVariable} />
                    </div>
                </div>
            </div>
            <div className="comparison__row3 comparison__column3">{!nullOrUndefined(comparison.steps[1].equations) &&
                <EquationsInStep equations={comparison.steps[1].equations as ParenthesisEquationProps[]} />}</div>
            <div className="comparison__row3 comparison__column4">{!nullOrUndefined(comparison.steps[1].description) && <p>{comparison.steps[1].description}</p>}</div>

            <div className="comparison__row4 comparison__column1">
                <p>
                    <Trans ns={TranslationNamespaces.Flexibility} i18nKey={descriptionStep3.translationKey} values={descriptionStep3.interpolationVariables as object} />
                </p>
            </div>
            <div className="comparison__row4 comparison__column2">
                <div className={"equation__grid"}>
                    <div className={"equation__row1 equation__column1"} />
                    <div className={"equation__row1 equation__column2"}>
                        <FlexibilityEquation equation={selectedEquation[0]} classname={"flexibility-equation--light"} />
                    </div>
                    <div className={"equation__row2 equation__column1"}>{equivalenceSymbol}</div>
                    <div className={"equation__row2 equation__column2"}>
                        <BackSubstitutionEquation initialEquation={selectedEquation[0]} variable={methodEquation[1] ? firstVariable : secondVariable} />
                    </div>
                    <div className={"equation__row3 equation__column1"}>{equivalenceSymbol}</div>
                    <div className={"equation__row3 equation__column2"}>
                        <VariableSolution variable={!methodEquation[1] ? firstVariable : secondVariable} />
                    </div>
                </div>
            </div>
            <div className="comparison__row4 comparison__column3">{!nullOrUndefined(comparison.steps[2].equations) &&
                <EquationsInStep equations={comparison.steps[2].equations as ParenthesisEquationProps[]} />}</div>
            <div className="comparison__row4 comparison__column4">{!nullOrUndefined(comparison.steps[2].description) && <p>{comparison.steps[2].description}</p>}</div>
        </div>
    );
}

function EquationsInStep({ equations }: { equations: ParenthesisEquationProps[] }): ReactElement {
    if (equations.length === 1) {
        return <ParenthesisEquation equation={equations[0]} />;
    }

    return (
        <React.Fragment>
            <div className={"equation__grid"}>
                {equations.map((equation: ParenthesisEquationProps, index: number) => {
                    return (
                        <React.Fragment key={index}>
                            <div className={"equation__column1"}>{index !== 0 &&
                                <img style={{ width: "1.75rem", height: "auto", marginTop: "0.125rem" }} src={EquivalenceSymbol} alt={"equivalent"} />}</div>
                            <div className={"equation__column2"}>
                                <ParenthesisEquation equation={equation} />
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
        </React.Fragment>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function nullOrUndefined(object: any): boolean {
    return object === undefined || object === null;
}
