import {TranslationNamespaces} from "@/i18n.ts";
import React, {ReactElement, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {AgentCondition, AgentExpression, AgentType, FirstSolutionState} from "@/types/flexibility/enums.ts";
import {FlexibilityTranslations} from "@/types/flexibility/flexibilityTranslations.ts";
import {Variable} from "@/types/flexibility/variable.ts";
import {ContinueMessage} from "@components/flexibility/interventions/ContinueMessage.tsx";
import {FlexibilityPopover} from "@components/flexibility/interventions/FlexibilityPopover.tsx";
import {Intervention} from "@components/flexibility/interventions/Intervention.tsx";
import {SolutionInputField} from "@components/flexibility/solution/SolutionInputField.tsx";
import {VariableSolution} from "@components/flexibility/solution/VariableSolution.tsx";
import {StepNextIntervention} from "@components/flexibility/interventions/StepIntervention.tsx";

export function VariableComputation({ variable, loadNextStep, agentType, additionalMessage, trackAction, trackError, trackChoice, trackType, trackInterventionChoice, reconsiderDecline, reconsiderInterventionDecline, recordSolutionShown, isSecondSolution = false, condition, decideCalculationIntervention}: {
    variable: Variable;
    loadNextStep: () => void;
    agentType?: AgentType;
    additionalMessage?: string;
    trackAction: (action: string) => void;
    trackError: () => void;
    trackChoice: (choice: string) => void;
    trackType: (type: number) => void;
    trackInterventionChoice: (choice: string) => void;
    /**
     * Offers the one nudge before a decline takes effect; resolves true if the student takes it.
     * Optional because a study run has no nudge — the study module has no counterpart for it.
     */
    reconsiderDecline?: () => Promise<boolean>;
    /** The same, for the second prompt the personal agent routes through. */
    reconsiderInterventionDecline?: () => Promise<boolean>;
    /**
     * Records that the solution was shown, which is a decision and not merely an action.
     *
     * Optional, and a no-op when absent, because a study run has no goal to protect and the study
     * module has no counterpart record. Bound to `isSecondSolution` by the caller below.
     */
    recordSolutionShown?: () => void;
    isSecondSolution?: boolean
    condition: AgentCondition,
    decideCalculationIntervention: () =>Promise<{ trigger: boolean; messageType: number }>;

}): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Flexibility);

    const [exerciseState, setExerciseState] = useState<FirstSolutionState>(
        condition === AgentCondition.MotivationIntentionAgent
            ? FirstSolutionState.StepIntervention
            : FirstSolutionState.Intervention
    );
    const [decision, setDecision] = useState<boolean | null>(null);
    const [messageType, setMessageType] = useState<number | null>(null);

    useEffect(() => {
        const decide = async () => {
            const { trigger, messageType } = await decideCalculationIntervention();
            setDecision(trigger);
            setMessageType(messageType);
            if (messageType !== undefined) {
                trackType(messageType);
            }
        };
        decide();
    }, []);

    let standardMessage = "";
    let personalMessage = "";

    if (messageType === 1) {
        standardMessage = t(FlexibilityTranslations.PERSONAL_CALCULATION_END_1);
        personalMessage = t(FlexibilityTranslations.PERSONAL_CALCULATION_START_1);
    } else if (messageType === 2) {
        standardMessage = t(FlexibilityTranslations.PERSONAL_CALCULATION_END_1);
        personalMessage = t(FlexibilityTranslations.PERSONAL_CALCULATION_START_2);
    } else if (messageType === 3) {
        standardMessage = t(FlexibilityTranslations.PERSONAL_CALCULATION_END_1);
        personalMessage = t(FlexibilityTranslations.PERSONAL_CALCULATION_START_3);
    } else if (messageType === 4) {
        standardMessage = t(FlexibilityTranslations.PERSONAL_CALCULATION_END_4);
        personalMessage = t(FlexibilityTranslations.PERSONAL_CALCULATION_START_4);
    }

    let content: ReactElement | undefined;
    switch (exerciseState) {
        case FirstSolutionState.Intervention: {
            content = (
                <Intervention
                    handleYes={() => {
                        trackChoice("Yes");
                        if (condition == AgentCondition.PersonalMotivationalAgent) {
                            if(!decision){
                                setExerciseState(FirstSolutionState.SecondIntervention);
                            }
                            else {
                                setExerciseState(FirstSolutionState.ManualComputation);
                            }
                        }
                        else{
                            setExerciseState(FirstSolutionState.ManualComputation);
                        }
                    }}
                    reconsider={reconsiderDecline}
                    handleNo={(engaged) => {
                        // `engaged` is true when the nudge turned the decline into a retry, so they work
                        // it out after all instead of seeing the answer.
                        const goNext = (engaged: boolean): void => {
                            if (condition == AgentCondition.PersonalMotivationalAgent && (engaged ? !decision : decision)) {
                                setExerciseState(FirstSolutionState.SecondIntervention);
                            }
                            else {
                                setExerciseState(engaged ? FirstSolutionState.ManualComputation : FirstSolutionState.ResultAuto);
                            }
                        };

                        trackChoice(engaged ? "Yes" : "No");
                        goNext(engaged);
                    }}
                    agentType={agentType} agentExpression={AgentExpression.Smiling} additionalMessage={additionalMessage}
                    /* No `mood`. This popover ASKS the student a question — the one place where the
                       answer is a yes or a no — so the face is `Intervention`'s own default, the
                       thinking pose with the question mark. It used to override that with `solo`, the
                       confident "your turn" pose, which reads as praise for something the student has
                       not done yet. */
                >
                    <p>{t(FlexibilityTranslations.FIRST_SOLUTION_CHOICE)}</p>
                </Intervention>

            );
            break;
        }

        case FirstSolutionState.StepIntervention: {
            content = (
                <StepNextIntervention
                    handleNext={() => {
                        setExerciseState(FirstSolutionState.Intervention);
                    }}
                    agentType={agentType}
                    agentExpression={AgentExpression.Smiling}
                    /* The same question, asked a beat before the yes/no buttons appear. It reads as a
                       question, so it gets the question face rather than the thumbs-up. */
                    mood={"question"}
                >
                    <p>{t(FlexibilityTranslations.FIRST_SOLUTION_CHOICE)}</p>
                </StepNextIntervention>
            );
            break;
        }

        case FirstSolutionState.SecondIntervention: {
            content = (
                <>
                    <div className="agent-backdrop" />
                <Intervention
                    handleYes={() => {
                        trackInterventionChoice("Yes");
                        setExerciseState(FirstSolutionState.ManualComputation);
                    }}
                    reconsider={reconsiderInterventionDecline}
                    handleNo={(engaged) => {
                        trackInterventionChoice(engaged ? "Yes" : "No");
                        setExerciseState(engaged ? FirstSolutionState.ManualComputation : FirstSolutionState.ResultAuto);
                    }}
                    agentType={agentType} agentExpression={AgentExpression.Thinking} additionalMessage={standardMessage}
                >
                    <p>{personalMessage}</p>
                </Intervention>
                    </>

            );
            break;
        }

        case FirstSolutionState.ManualComputation: {
            content = <SolutionInputField variable={variable} handleSolution={() => setExerciseState(FirstSolutionState.ResultManual)}
                                          showSolution={() => setExerciseState(FirstSolutionState.ResultAuto)}
                                          solutionShown={() => recordSolutionShown?.()} agentType={agentType}
                                          trackAction={trackAction} trackError={trackError}
            />;
            break;
        }

        case FirstSolutionState.ResultAuto: {
            content = (
                <React.Fragment>
                    <p>{t(FlexibilityTranslations.FIRST_SOLUTION_SOLUTION)}</p>
                    <VariableSolution variable={variable} useLayout={isSecondSolution} />
                    {/* `approve`, not the plain portrait. This is the moment the answer has been handed
                        over and the student is moving on, which is exactly what the thumbs-up face says.
                        It used to pass `AgentExpression.Neutral`, which maps to no mood at all, so the
                        companion lost its expression here while keeping it everywhere else. */}
                    <FlexibilityPopover agentType={agentType} agentExpression={AgentExpression.Neutral} mood={"approve"}>
                        <ContinueMessage message={FlexibilityTranslations.FIRST_SOLUTION_AUTO_CONTINUE} loadNextStep={loadNextStep} />
                    </FlexibilityPopover>
                </React.Fragment>
            );
            break;
        }

        case FirstSolutionState.ResultManual: {
            content = (
                <React.Fragment>
                    <p>{t(FlexibilityTranslations.FIRST_SOLUTION_SOLUTION)}</p>
                    <VariableSolution variable={variable} useLayout={isSecondSolution} />
                    <FlexibilityPopover agentType={agentType} agentExpression={AgentExpression.Smiling}>
                        <ContinueMessage message={FlexibilityTranslations.FIRST_SOLUTION_SUCCESS_CONTINUE} loadNextStep={loadNextStep} />
                    </FlexibilityPopover>
                </React.Fragment>
            );
            break;
        }
    }

    return content;
}
