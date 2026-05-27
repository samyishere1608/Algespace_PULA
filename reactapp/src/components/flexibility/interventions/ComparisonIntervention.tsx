import {TranslationNamespaces} from "@/i18n.ts";
import {ReactElement, useEffect, useMemo, useState} from "react";
import {Trans, useTranslation} from "react-i18next";
import {AgentCondition, AgentExpression, AgentType, Method} from "@/types/flexibility/enums.ts";
import {FlexibilityTranslations} from "@/types/flexibility/flexibilityTranslations.ts";
import {SubstitutionParameters} from "@/types/flexibility/substitutionParameters.ts";
import {Variable} from "@/types/flexibility/variable.ts";
import {FlexibilityEquation as FlexibilityEquationProps} from "@/types/math/linearEquation.ts";
import {TranslationInterpolation} from "@/types/shared/translationInterpolation.ts";
import {ContinueMessage} from "@components/flexibility/interventions/ContinueMessage.tsx";
import {FlexibilityPopover} from "@components/flexibility/interventions/FlexibilityPopover.tsx";
import {Intervention} from "@components/flexibility/interventions/Intervention.tsx";
import {SystemSolution} from "@components/flexibility/solution/SystemSolution.tsx";
import {StepNextIntervention} from "@/components/flexibility/interventions/StepIntervention.tsx";

export function ComparisonIntervention({
    selectedMethod,
    initialSystem,
    transformedSystem,
    methodEquation,
    selectedEquation,
    firstSolutionVariable,
    otherVariable,
    firstSolutionIsFirstVariable,
    loadNextStep,
    setFirstChoice,
    setSecondChoice,
    trackType,
    compareMethods,
    comparisonMethod,
    substitutionInfo,
    agentType,
    additionalMessage,
    condition,
    decideIntervention


}: {
    selectedMethod: Method;
    initialSystem: [FlexibilityEquationProps, FlexibilityEquationProps];
    transformedSystem?: [FlexibilityEquationProps, FlexibilityEquationProps];
    methodEquation: FlexibilityEquationProps;
    selectedEquation: FlexibilityEquationProps;
    firstSolutionVariable: Variable;
    otherVariable: Variable;
    firstSolutionIsFirstVariable: boolean;
    loadNextStep: (compliance: boolean) => void;
    setFirstChoice: (firstChoice: boolean) => void;
    setSecondChoice: (firstChoice: boolean) => void;
    trackType: (type: number) => void;
    compareMethods: boolean;
    comparisonMethod: Method;
    substitutionInfo?: SubstitutionParameters;
    agentType?: AgentType;
    additionalMessage?: string;
    condition: AgentCondition;
    decideIntervention: () => Promise<{ trigger: boolean; messageType: number }>;


}): ReactElement {
    const [showPrompt, setShowPrompt] = useState<boolean>(false);
    const [showStepPrompt, setShowStepPrompt] = useState<boolean>(false);
    const [showSecondPrompt, setShowSecondPrompt] = useState<boolean>(false);
    const [showMotivationalPrompt, setShowMotivationalPrompt] = useState<boolean>(false);


    const [decision, setDecision] = useState<boolean | null>(null);
    const [messageType, setMessageType] = useState<number | null>(null);

    useEffect(() => {
        const decide = async () => {
            const { trigger, messageType } = await decideIntervention();
            setDecision(trigger);
            setMessageType(messageType);
            if (messageType !== undefined) {
                trackType(messageType);
            }
        };
        decide();
    }, [decideIntervention, trackType]);

    const { t } = useTranslation(TranslationNamespaces.Flexibility);

    const message: TranslationInterpolation = useMemo(() => {
        return compareMethods ? FlexibilityTranslations.getComparisonPrompt(comparisonMethod) : FlexibilityTranslations.getResolvingPrompt(comparisonMethod);
    }, [compareMethods, comparisonMethod]);

    let standardMessage = "";
    let personalMessage = "";
    let question = "";

    if(condition == AgentCondition.PersonalMotivationalAgent){
        if(compareMethods){
            question = t(FlexibilityTranslations.COMPARISON_QUESTION);
            if (messageType === 1) {
                standardMessage = t(FlexibilityTranslations.PERSONAL_COMPARISON_END_1);
                personalMessage = t(FlexibilityTranslations.PERSONAL_COMPARISON_START_1);
            } else if (messageType === 2) {
                standardMessage = t(FlexibilityTranslations.PERSONAL_COMPARISON_END_1);
                personalMessage = t(FlexibilityTranslations.PERSONAL_COMPARISON_START_2);
            } else if (messageType === 3) {
                standardMessage = t(FlexibilityTranslations.PERSONAL_COMPARISON_END_1);
                personalMessage = t(FlexibilityTranslations.PERSONAL_COMPARISON_START_3);
            } else if (messageType === 4) {
                standardMessage = t(FlexibilityTranslations.PERSONAL_END_2);
                personalMessage = t(FlexibilityTranslations.PERSONAL_COMPARISON_START_4);
            }
        }
        else{
            const interpolation = FlexibilityTranslations.getResolvingQuestion(comparisonMethod);
            question = t(interpolation.translationKey, {
                ...(interpolation.interpolationVariables || {})
            });
            if (messageType === 4) {
                standardMessage = t(FlexibilityTranslations.PERSONAL_END_2);
                const interpolation = FlexibilityTranslations.getPersonalResolveTranslation(messageType, comparisonMethod);
                personalMessage = t(interpolation.translationKey, {
                    ...(interpolation.interpolationVariables || {})
                });
            } else if (typeof messageType === "number") {
                standardMessage = t(FlexibilityTranslations.PERSONAL_RESOLVING_END_1);
                const interpolation = FlexibilityTranslations.getPersonalResolveTranslation(messageType, comparisonMethod);
                personalMessage = t(interpolation.translationKey, {
                    ...(interpolation.interpolationVariables || {})
                });
            }
        }
    }



    const continuePopover: ReactElement = (
        <FlexibilityPopover agentType={agentType} agentExpression={AgentExpression.Smiling}>
            <ContinueMessage message={FlexibilityTranslations.SYSTEM_SOLUTION_SUCCESS} loadNextStep={() => {
                if(condition == AgentCondition.MotivationIntentionAgent || condition == AgentCondition.PersonalMotivationalAgent){
                    setShowStepPrompt(true);
                }
                else{
                    setShowPrompt(true);
                }

            }} />
        </FlexibilityPopover>
    );

    const promptPopover: ReactElement = (
        <Intervention
            handleYes={() => {
                setFirstChoice(true);
                if(condition == AgentCondition.PersonalMotivationalAgent){
                    if(!decision){
                        setShowSecondPrompt(true);
                    }
                    else{
                        loadNextStep(true);
                    }
                }
                else{
                    loadNextStep(true);
                }
            }}
            handleNo={() => {
                setFirstChoice(false);
                if(condition == AgentCondition.PersonalMotivationalAgent){
                    if(decision){
                        setShowSecondPrompt(true);
                    }
                    else{
                        loadNextStep(false);
                    }
                }
                else{
                    loadNextStep(false)
                }
            }}
            agentType={agentType}
            agentExpression={AgentExpression.Smiling}
            additionalMessage={additionalMessage}
        >
            <p className={"strong-primary"}>
                <Trans ns={TranslationNamespaces.Flexibility} i18nKey={message.translationKey} values={message.interpolationVariables as object} />
            </p>
        </Intervention>
    );

    const stepPromptPopover: ReactElement = (
        <StepNextIntervention
            handleNext={() => {
                setShowStepPrompt(false);
                setShowMotivationalPrompt(true);
            }}
            agentType={agentType}
            agentExpression={AgentExpression.Smiling}
        >
            <p className={"strong-primary"}>
                <Trans
                    ns={TranslationNamespaces.Flexibility}
                    i18nKey={message.translationKey}
                    values={message.interpolationVariables as object}
                />
            </p>
        </StepNextIntervention>
    );

    const motivationalPromptPopover: ReactElement = (
        <Intervention
            handleYes={() => {
                setFirstChoice(true);
                if (condition == AgentCondition.PersonalMotivationalAgent) {
                    if (!decision) {
                        setShowSecondPrompt(true);
                    } else {
                        loadNextStep(true);
                    }
                } else {
                    loadNextStep(true);
                }
            }}
            handleNo={() => {
                setFirstChoice(false);
                if (condition == AgentCondition.PersonalMotivationalAgent) {
                    if (decision) {
                        setShowSecondPrompt(true);
                    } else {
                        loadNextStep(false);
                    }
                } else {
                    loadNextStep(false)
                }
            }}
            agentType={agentType}
            agentExpression={AgentExpression.Smiling}
            additionalMessage={additionalMessage}
        >
            <p className={"strong-primary"}>
                <span>{question}</span>
            </p>
        </Intervention>
    );

    const secondPromptPopover: ReactElement = (
        <>
            <div className="agent-backdrop" />
    <Intervention
        handleYes={() => {
                setSecondChoice(true);
                loadNextStep(true);
            }}
            handleNo={() => {
                setSecondChoice(false);
                loadNextStep(false);
            }}
            agentType={agentType}
            agentExpression={AgentExpression.Thinking}
            additionalMessage={standardMessage}
        >
        <p className={"strong-primary"}>
            <span>{personalMessage}</span>
        </p>
    </Intervention>
        </>
    );

    function getCurrentPopover(): ReactElement {
        if (showSecondPrompt) {
            return secondPromptPopover;
        }

        if (showStepPrompt) {
            return stepPromptPopover;
        }

        if (showMotivationalPrompt) {
            return motivationalPromptPopover;
        }

        if (showPrompt) {
            return promptPopover;
        }

        return continuePopover;
    }

    return (
        <SystemSolution
            method={selectedMethod}
            initialSystem={initialSystem}
            transformedSystem={transformedSystem}
            applicationEquation={methodEquation}
            firstSolutionVariable={firstSolutionVariable}
            selectedEquation={selectedEquation}
            otherVariable={otherVariable}
            firstSolutionIsFirstVariable={firstSolutionIsFirstVariable}
            popover={getCurrentPopover()}
            substitutionInfo={substitutionInfo}
        />
    );
}
