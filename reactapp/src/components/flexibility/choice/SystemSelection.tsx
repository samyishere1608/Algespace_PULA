import {FlexibilityEquation} from "@/types/math/linearEquation.ts";
import {AgentCondition, AgentExpression, AgentType, Method} from "@/types/flexibility/enums.ts";
import React, {ReactElement, useMemo, useState} from "react";
import {MatchableSystem} from "@/types/flexibility/matchingExercise.ts";
import {Trans, useTranslation} from "react-i18next";
import {TranslationNamespaces} from "@/i18n.ts";
import {FlexibilityTranslations, getDefinitionByMethod} from "@/types/flexibility/flexibilityTranslations.ts";
import {TranslationInterpolation} from "@/types/shared/translationInterpolation.ts";
import {Option} from "@components/flexibility/choice/SingleChoice.tsx";
import {LinearSystem} from "@components/math/procedural-knowledge/LinearSystem.tsx";
import {GeneralTranslations} from "@/types/shared/generalTranslations.ts";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faMagnifyingGlass} from "@fortawesome/free-solid-svg-icons";
import {FlexibilityHint} from "@components/flexibility/interventions/FlexibilityHint.tsx";
import {Intervention} from "@components/flexibility/interventions/Intervention.tsx";
import {ClosableFlexibilityPopover} from "@components/flexibility/interventions/FlexibilityPopover.tsx";
import {StepNextIntervention} from "@components/flexibility/interventions/StepIntervention.tsx";

//import {FlexibilityExerciseChoicePhase} from "@/types/studies/enums.ts";

export function SystemSelection(
    {
        firstEquation,
        secondEquation,
        method,
        alternativeSystems,
        randomOrder,
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
        decidePersonalIntervention
    }: {
        firstEquation: FlexibilityEquation;
        secondEquation: FlexibilityEquation;
        method: Method;
        alternativeSystems: MatchableSystem[];
        randomOrder: number[];
        loadNextStep: (selfExplain: boolean) => void;
        question?: string;
        agentType?: AgentType;
        additionalMessage?: string;
        trackAction: (action: string) => void;
        trackError: () => void;
        trackHints: () => void;
        trackChoice: (choice: string) => void;
        trackChoiceIntervention: (choice: string) => void;
        trackType: (type: number) => void;
        condition: AgentCondition,
        decidePersonalIntervention: (method: number) => Promise<{ trigger: boolean; messageType: number }>;
    }
): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.Flexibility, TranslationNamespaces.General]);

    const secondInstruction: TranslationInterpolation = useMemo(() => FlexibilityTranslations.getSecondMatchingInstruction(method), [method]);
    const feedback = useMemo(() => getFeedback(method), [method]);
    const definition: string = useMemo(() => getDefinitionByMethod(method), [method]);
    const [personalIntervention, setPersonalIntervention] = useState<boolean>(false);
    const systems = [new MatchableSystem(firstEquation, secondEquation, true), ...alternativeSystems];

    const [selectedOption, setSelectedOption] = useState<number | undefined>();
    const [showIntervention, setShowIntervention] = useState<boolean>(false);
    const [showSetIntervention, setShowSetIntervention] = useState<boolean>(false);
    const [showFeedback, setShowFeedback] = useState<boolean>(false);

    const [standardMessage, setStandardMessage] = useState<string | undefined>(undefined);
    const [personalMessage, setPersonalMessage] = useState<string | undefined>(undefined);

    const [decision, setDecision] = useState<boolean | null>(null);





    return <React.Fragment>
        <p>{t(FlexibilityTranslations.MATCHING_INSTRUCTION_1)}</p>
        <div className={"system-selection"}>
            {randomOrder.map((o, index) => {
                return <Option key={index} index={index} selectedOption={selectedOption} setSelectedOption={setSelectedOption} disabled={showIntervention || showFeedback}
                               trackAction={trackAction} classname={"system-selection__option"}>
                    <LinearSystem firstEquation={systems[o].firstEquation} secondEquation={systems[o].secondEquation}
                                  systemStyle={{ padding: "0.5rem", border: "2px solid var(--light-text-50)", borderRadius: "1rem", gap: "0.5rem" }} />
                </Option>;
            })}
        </div>
        <p>{(question !== null && question !== undefined) ? question :
            <Trans ns={[TranslationNamespaces.Flexibility]} i18nKey={secondInstruction.translationKey} values={secondInstruction.interpolationVariables as object} />
        }</p>
        {selectedOption !== undefined && !showIntervention && (
            <button className={"button primary-button"} onClick={evaluateChoice} disabled={showFeedback}>
                {t(GeneralTranslations.BUTTON_VERIFY_ANSWER, { ns: TranslationNamespaces.General })}
                <FontAwesomeIcon icon={faMagnifyingGlass} />
            </button>
        )}
        <FlexibilityHint hints={[definition, FlexibilityTranslations.MATCHING_HINT]} agentType={agentType} agentExpression={AgentExpression.Neutral} trackHint={trackHints}
                         disabled={showIntervention || showFeedback} />
        {showIntervention && (
            <Intervention
                handleYes={() => {
                    trackChoice("Yes");
                    if(condition == AgentCondition.PersonalMotivationalAgent){
                        if(!decision){
                            setPersonalIntervention(true);
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
                    trackChoice("No");
                    if(condition == AgentCondition.PersonalMotivationalAgent){
                        if(decision){
                            setPersonalIntervention(true);
                        }
                        else{
                            loadNextStep(false);
                        }
                    }
                    else{
                        loadNextStep(false);
                    }
                }}
                agentType={agentType} agentExpression={AgentExpression.Smiling} additionalMessage={additionalMessage}
            >
                <p>{t(FlexibilityTranslations.MATCHING_QUESTION)}</p>
            </Intervention>
        )}
        {showSetIntervention && (
            <StepNextIntervention handleNext={() => {
                setShowIntervention(true);
                setShowSetIntervention(false);
            }} agentType={agentType}
                agentExpression={AgentExpression.Smiling}>
                <p>{t(FlexibilityTranslations.MATCHING_QUESTION)}</p>
            </StepNextIntervention>
        )}
        {personalIntervention && (
            <>
            <div className="agent-backdrop" />
            <Intervention handleYes={() => {
                trackChoiceIntervention("Yes");
                loadNextStep(true);
            }} handleNo={() => {
                trackChoiceIntervention("No");
                loadNextStep(false);
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
    </React.Fragment>;

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
        if (selectedOption === undefined) {
            return;
        }
        if (systems[randomOrder[selectedOption]].isSolution) {
            runPersonalInterventionFlow(selectedOption);
            trackAction("SUCCESS");
            if(condition == AgentCondition.MotivationIntentionAgent || condition == AgentCondition.PersonalMotivationalAgent){
                setShowSetIntervention(true);
            }
            else{
                setShowIntervention(true);
            }
        } else {
            trackAction(`selected alternative system ${randomOrder[selectedOption]},\nFAILED`);
            trackError();
            setShowFeedback(true);
        }
    }
}

function getFeedback(method: Method): string {
    switch (method) {
        case Method.Equalization:
            return FlexibilityTranslations.EQUALIZATION_NOT_EFFICIENT;
        case Method.Substitution:
            return FlexibilityTranslations.SUBSTITUTION_NOT_EFFICIENT;
        case Method.Elimination:
            return FlexibilityTranslations.ELIMINATION_NOT_EFFICIENT;
    }
}

