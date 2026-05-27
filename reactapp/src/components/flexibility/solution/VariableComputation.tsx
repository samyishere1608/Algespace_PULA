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

export function VariableComputation({ variable, loadNextStep, agentType, additionalMessage, trackAction, trackError, trackChoice, trackType, trackInterventionChoice, isSecondSolution = false, condition, decideCalculationIntervention}: {
    variable: Variable;
    loadNextStep: () => void;
    agentType?: AgentType;
    additionalMessage?: string;
    trackAction: (action: string) => void;
    trackError: () => void;
    trackChoice: (choice: string) => void;
    trackType: (type: number) => void;
    trackInterventionChoice: (choice: string) => void;
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
                    handleNo={() => {
                        trackChoice("No");
                        if (condition == AgentCondition.PersonalMotivationalAgent) {
                            if(decision){
                                setExerciseState(FirstSolutionState.SecondIntervention);
                            }
                            else {
                                setExerciseState(FirstSolutionState.ResultAuto);
                            }
                        }
                        else{
                            setExerciseState(FirstSolutionState.ResultAuto);
                        }
                    }}
                    agentType={agentType} agentExpression={AgentExpression.Smiling} additionalMessage={additionalMessage}
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
                    handleNo={() => {
                        trackInterventionChoice("No");
                        setExerciseState(FirstSolutionState.ResultAuto);
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
                                          showSolution={() => setExerciseState(FirstSolutionState.ResultAuto)} agentType={agentType}
                                          trackAction={trackAction} trackError={trackError}
            />;
            break;
        }

        case FirstSolutionState.ResultAuto: {
            content = (
                <React.Fragment>
                    <p>{t(FlexibilityTranslations.FIRST_SOLUTION_SOLUTION)}</p>
                    <VariableSolution variable={variable} useLayout={isSecondSolution} />
                    <FlexibilityPopover agentType={agentType} agentExpression={AgentExpression.Neutral}>
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
