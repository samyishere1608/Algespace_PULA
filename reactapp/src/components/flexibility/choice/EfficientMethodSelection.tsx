import {TranslationNamespaces} from "@/i18n.ts";
import {faMagnifyingGlass} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import React, {ReactElement, useState} from "react";
import {Trans, useTranslation} from "react-i18next";
import {AgentCondition, AgentExpression, AgentType, Method} from "@/types/flexibility/enums.ts";
import {FlexibilityTranslations} from "@/types/flexibility/flexibilityTranslations.ts";
import {FlexibilityEquation} from "@/types/math/linearEquation.ts";
import {GeneralTranslations} from "@/types/shared/generalTranslations.ts";
import {TranslationInterpolation} from "@/types/shared/translationInterpolation.ts";
import {SingleChoice} from "@components/flexibility/choice/SingleChoice.tsx";
import {FlexibilityHint} from "@components/flexibility/interventions/FlexibilityHint.tsx";
import {ClosableFlexibilityPopover} from "@components/flexibility/interventions/FlexibilityPopover.tsx";
import {Intervention} from "@components/flexibility/interventions/Intervention.tsx";
import {LinearSystem} from "@components/math/procedural-knowledge/LinearSystem.tsx";
import {StepNextIntervention} from "@components/flexibility/interventions/StepIntervention.tsx";

export function EfficientMethodSelection(
    {
        firstEquation,
        secondEquation,
        efficientMethods,
        transformationRequired,
        loadNextStep,
        question,
        agentType,
        additionalMessage,
        trackAction,
        trackError,
        trackHints,
        trackChoice,
        trackChoiceIntervention,
        trackType,
        condition,
        decidePersonalIntervention,
    }: {
        firstEquation: FlexibilityEquation;
        secondEquation: FlexibilityEquation;
        efficientMethods: Method[];
        transformationRequired: boolean;
        loadNextStep: (method: Method, selfExplain: boolean) => void;
        question?: string;
        agentType?: AgentType;
        additionalMessage?: string;
        trackAction: (action: string) => void;
        trackError: () => void;
        trackHints: () => void;
        trackChoice: (choice: string) => void;
        trackChoiceIntervention: (choice: string) => void;
        trackType: (type: number) => void;
        condition: AgentCondition;
        decidePersonalIntervention: (method: number) => Promise<{ trigger: boolean; messageType: number }>;


    }
): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.Flexibility, TranslationNamespaces.General]);

    const [selectedOption, setSelectedOption] = useState<number | undefined>();
    const [selectedMethod, setSelectedMethod] = useState<Method>(Method.Equalization);
    const [intervention, setIntervention] = useState<TranslationInterpolation | undefined>(undefined);
    const [personalIntervention, setPersonalIntervention] = useState<boolean | undefined>(undefined);
    const [stepIntervention, setStepIntervention] = useState<TranslationInterpolation | undefined>(undefined);
    const [feedback, setFeedback] = useState<string>("");
    const [showFeedback, setShowFeedback] = useState<boolean>(false);

    const [decision, setDecision] = useState<boolean | null>(null);

    const [standardMessage, setStandardMessage] = useState<string | undefined>(undefined);
    const [personalMessage, setPersonalMessage] = useState<string | undefined>(undefined);




    return (
        <React.Fragment>
            <p>{t(FlexibilityTranslations.INTRO_SYSTEM)}</p>
            <LinearSystem firstEquation={firstEquation} secondEquation={secondEquation} />
            <div className={"method-selection"}>
                <p>{question !== null ? question : t(efficientMethods.length > 1 ? FlexibilityTranslations.MULTIPLE_EFFICIENT_INSTR : FlexibilityTranslations.SINGLE_EFFICIENT_INSTR)}</p>
                <SingleChoice options={[t(FlexibilityTranslations.EQUALIZATION), t(FlexibilityTranslations.SUBSTITUTION), t(FlexibilityTranslations.ELIMINATION)]}
                              selectedOption={selectedOption} setSelectedOption={setSelectedOption} disabled={intervention !== undefined}
                              optionClassname={"method-selection__option"} />
            </div>
            {selectedOption !== undefined && intervention === undefined && (
                <button className={"button primary-button"} onClick={evaluateChoice} disabled={showFeedback}>
                    {t(GeneralTranslations.BUTTON_VERIFY_ANSWER, { ns: TranslationNamespaces.General })}
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                </button>
            )}
            <FlexibilityHint hints={[FlexibilityTranslations.EFFICIENT_METHOD_HINT]} agentType={agentType} agentExpression={AgentExpression.Neutral}
                             disabled={intervention !== undefined || showFeedback} trackHint={trackHints} />
            {intervention !== undefined && (
                <Intervention handleYes={() => {
                    trackChoice("Yes");

                    if(condition == AgentCondition.PersonalMotivationalAgent){

                        if(!decision) {
                            setPersonalIntervention(true);
                        }
                        else{
                            loadNextStep(selectedMethod, true);
                        }
                    }
                    else{
                        loadNextStep(selectedMethod, true);
                    }

                    }
                } handleNo={() => {
                    trackChoice("No");
                    if(condition == AgentCondition.PersonalMotivationalAgent){
                        if(decision) {
                            setPersonalIntervention(true);
                        }
                        else{
                            loadNextStep(selectedMethod, false);
                        }
                    }
                    else{
                        loadNextStep(selectedMethod, false);
                    }
                }} agentType={agentType}
                              agentExpression={AgentExpression.Smiling} additionalMessage={additionalMessage}>
                    <p><Trans ns={TranslationNamespaces.Flexibility} i18nKey={intervention.translationKey} values={intervention.interpolationVariables as object} /></p>
                </Intervention>
            )}
            {stepIntervention !== undefined && (
                <StepNextIntervention handleNext={() => {
                    setIntervention(stepIntervention);
                    setStepIntervention(undefined);
                }} agentType={agentType}
                              agentExpression={AgentExpression.Smiling} >
                    <p><Trans ns={TranslationNamespaces.Flexibility} i18nKey={stepIntervention.translationKey} values={stepIntervention.interpolationVariables as object} /></p>
                </StepNextIntervention>
            )}
            {personalIntervention !== undefined && (
                <>
                <div className="agent-backdrop" />
                <Intervention handleYes={() => {
                    trackChoiceIntervention("Yes");
                    loadNextStep(selectedMethod, true);
                }} handleNo={() => {
                    trackChoiceIntervention("No");
                    loadNextStep(selectedMethod, false);
                }} agentType={agentType}
                              agentExpression={AgentExpression.Thinking} additionalMessage={standardMessage}>
                    <p>{personalMessage}</p>
                </Intervention>
                </>
            )}

            {showFeedback && (
                <ClosableFlexibilityPopover setShowContent={setShowFeedback} agentType={agentType} agentExpression={AgentExpression.Thinking}>
                    <p>{t(feedback)}</p>
                </ClosableFlexibilityPopover>
            )}
        </React.Fragment>
    );

    async function runPersonalInterventionFlow(method: Method) {
        const { trigger, messageType } = await decidePersonalIntervention(method);
        setDecision(trigger);

        if (messageType != null) {
            trackType(messageType);
        }

        const interpolation = FlexibilityTranslations.getPersonalExplainTranslation(messageType, method);
        setPersonalMessage(t(interpolation.translationKey, {
            ...(interpolation.interpolationVariables || {})
        }));

        if (messageType === 4) {
            setStandardMessage(t(FlexibilityTranslations.PERSONAL_END_2));
        } else {
            setStandardMessage(t(FlexibilityTranslations.PERSONAL_Explain_END_1));
        }
    }

    function evaluateChoice(): void {
        let method: Method = Method.Elimination;
        let feedback: string = transformationRequired ? FlexibilityTranslations.ELIMINATION_NOT_EFFICIENT_NO_TRANSFORMATION : FlexibilityTranslations.ELIMINATION_NOT_EFFICIENT;
        if (selectedOption === 0) {
            method = Method.Equalization;
            feedback = transformationRequired ? FlexibilityTranslations.EQUALIZATION_NOT_EFFICIENT_NO_TRANSFORMATION : FlexibilityTranslations.EQUALIZATION_NOT_EFFICIENT;
            setSelectedMethod(Method.Equalization);
        } else if (selectedOption === 1) {
            method = Method.Substitution;
            feedback = transformationRequired ? FlexibilityTranslations.SUBSTITUTION_NOT_EFFICIENT_NO_TRANSFORMATION : FlexibilityTranslations.SUBSTITUTION_NOT_EFFICIENT;
            setSelectedMethod(Method.Substitution);
        } else {
            setSelectedMethod(Method.Elimination);
        }

        if (efficientMethods.includes(method)) {
            runPersonalInterventionFlow(method);
            trackAction(`selected ${Method[method]},\nSUCCESS`);
            const question = FlexibilityTranslations.getQuestionForSEInterventionForEfficiency(method);
            if(condition == AgentCondition.MotivationIntentionAgent || condition == AgentCondition.PersonalMotivationalAgent){
                setStepIntervention(question);
            }
            else{
                setIntervention(question);
            }
        } else {
            trackAction(`selected ${Method[method]},\nFAILED`);
            trackError();
            setFeedback(feedback);
            setShowFeedback(true);
        }
    }
}
