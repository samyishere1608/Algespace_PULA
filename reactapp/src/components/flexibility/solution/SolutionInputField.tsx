import { TranslationNamespaces } from "@/i18n.ts";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Fraction, equal, evaluate } from "mathjs";
import React, { ReactElement, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { AgentExpression, AgentType } from "@/types/flexibility/enums.ts";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { math } from "@/types/math/math.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { ClosableFlexibilityPopover, FlexibilityPopover } from "@components/flexibility/interventions/FlexibilityPopover.tsx";
import { Intervention } from "@components/flexibility/interventions/Intervention.tsx";

export function SolutionInputField({ variable, handleSolution, showSolution, agentType, trackAction, trackError }: {
    variable: Variable;
    handleSolution: () => void;
    showSolution: () => void;
    agentType?: AgentType
    trackAction: (action: string) => void;
    trackError: () => void;
}): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Flexibility);

    const inputLabel: TranslationInterpolation = useMemo(() => FlexibilityTranslations.getInputLabelForSolution(variable.name), [variable]);

    const [input, setInput] = useState<string>("");
    const [error, setError] = useState<boolean>(false);
    const [showError, setShowError] = useState<boolean>(false);
    const [attempts, setAttempts] = useState<number>(0);
    const [showFeedbackWrongSolution, setShowFeedbackWrongSolution] = useState(false);

    return (
        <React.Fragment>
            <p>{t(FlexibilityTranslations.FIRST_SOLUTION_MANUAL_TASK)}</p>
            <div className={"flexibility-solution-input"}>
                <p style={{ marginLeft: "2rem" }}>
                    <Trans ns={TranslationNamespaces.Flexibility} i18nKey={inputLabel.translationKey} values={inputLabel.interpolationVariables as object} />
                </p>
                <input autoFocus className={`flexibility-solution-input__input ${error ? "error" : ""}`} value={input}
                       pattern="^((-?(0[.,][0-9]\d*|[0-9]\d*([.,]\d+)?))|[+\-*\/])*$" maxLength={10} onChange={handleChange} disabled={showFeedbackWrongSolution} />
                <button className={"button primary-button"} onClick={evaluateSolution} disabled={input === "" || showError || showFeedbackWrongSolution}
                        style={{ marginLeft: "2rem" }}>
                    {t(GeneralTranslations.BUTTON_VERIFY_ANSWER, { ns: TranslationNamespaces.General })}
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                </button>
            </div>
            {(showFeedbackWrongSolution && attempts <= 2) && (
                <Intervention handleYes={retry} agentType={agentType} agentExpression={AgentExpression.Thinking}
                              handleNo={() => {
                                  trackAction("show SOLUTION");
                                  showSolution();
                              }}
                >
                    <p>{t(FlexibilityTranslations.FIRST_SOLUTION_WRONG_INPUT)}</p>
                </Intervention>
            )}
            {(showFeedbackWrongSolution && attempts > 2) && (
                <FlexibilityPopover agentType={agentType} agentExpression={AgentExpression.Thinking}>
                    <React.Fragment>
                        <p>{t(FlexibilityTranslations.FIRST_SOLUTION_SAMPLE_SOLUTION)}</p>
                        <button className={"button primary-button"} onClick={() => {
                            trackAction("SAMPLE solution");
                            showSolution();
                        }}>
                            <FontAwesomeIcon icon={faMagnifyingGlass} />
                            {t(GeneralTranslations.BUTTON_SHOW, { ns: TranslationNamespaces.General })}
                        </button>
                    </React.Fragment>
                </FlexibilityPopover>
            )}
            {showError && (
                <ClosableFlexibilityPopover setShowContent={setShowError} agentType={agentType} agentExpression={AgentExpression.Thinking}>
                    <p>{t(FlexibilityTranslations.FIRST_SOLUTION_INPUT_ERROR)}</p>
                </ClosableFlexibilityPopover>
            )}
            {(showError || showFeedbackWrongSolution) && <div style={{ minHeight: "8rem", minWidth: "1rem" }}></div>}
        </React.Fragment>
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleChange(event: any): void {
        const isValid: boolean = !event.target.validity.patternMismatch;
        if (error) {
            if (isValid) {
                setError(false);
            }
        } else if (!isValid) {
            setError(true);
        }
        setInput(event.target.value);
    }

    function evaluateSolution(): void {
        if (error) {
            setShowError(true);
            return;
        }

        const modifiedInput: string = input.replace(",", ".");
        try {
            const evaluatedInput: number | Fraction = evaluate(modifiedInput);
            if (equal(evaluatedInput, math.fraction(variable.value.value))) {
                trackAction(`VALID input ${modifiedInput},\nSUCCESS`);
                handleSolution();
            } else {
                trackAction(`WRONG input ${modifiedInput}`);
                trackError();
                setAttempts((prevState: number) => prevState + 1);
                setShowFeedbackWrongSolution(true);
            }
        } catch (error) {
            trackAction(`INVALID input ${modifiedInput}`);
            setShowError(true);
        }
    }

    function retry(): void {
        trackAction("selected RETRY");
        setShowFeedbackWrongSolution(false);
        setInput("");
    }
}
