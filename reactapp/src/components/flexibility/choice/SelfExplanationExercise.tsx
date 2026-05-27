import { TranslationNamespaces } from "@/i18n.ts";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { CSSProperties, ReactElement, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { AgentExpression, AgentType, Method } from "@/types/flexibility/enums.ts";
import { FlexibilityTranslations, getDefinitionByMethod } from "@/types/flexibility/flexibilityTranslations.ts";
import { Option, SelfExplanation } from "@/types/flexibility/selfExplanation.ts";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { MultipleChoice } from "@components/flexibility/choice/MultipleChoice.tsx";
import { SingleChoice } from "@components/flexibility/choice/SingleChoice.tsx";
import { ContinueMessage } from "@components/flexibility/interventions/ContinueMessage.tsx";
import { FlexibilityHint } from "@components/flexibility/interventions/FlexibilityHint.tsx";
import { ClosableFlexibilityPopover, FlexibilityPopover } from "@components/flexibility/interventions/FlexibilityPopover.tsx";
import { LinearSystem } from "@components/math/procedural-knowledge/LinearSystem.tsx";
import { MatchableSystem } from "@/types/flexibility/matchingExercise.ts";

export function SelfExplanationExercise(
    {
        method,
        firstEquation,
        secondEquation,
        transformationsRequired,
        selfExplanation,
        loadNextStep,
        agentType,
        trackAction,
        trackError,
        trackHints
    }: {
        method: Method;
        firstEquation: FlexibilityEquation;
        secondEquation: FlexibilityEquation;
        transformationsRequired: boolean;
        selfExplanation: SelfExplanation;
        loadNextStep: () => void;
        agentType?: AgentType;
        trackAction: (action: string) => void;
        trackError: () => void;
        trackHints: () => void;
    }
): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.Flexibility, TranslationNamespaces.General]);

    const instruction = FlexibilityTranslations.getInstructionForSelfExplanationExercise(method, transformationsRequired);

    const text: ReactElement = (
        <p>
            {<Trans ns={TranslationNamespaces.Flexibility} i18nKey={instruction.translationKey}
                    values={instruction.interpolationVariables as object} />} {t(selfExplanation.isSingleChoice ? FlexibilityTranslations.EXPLANATION_SINGLE_CHOICE : FlexibilityTranslations.EXPLANATION_MULTIPLE_CHOICE)}
        </p>
    );

    return (
        <React.Fragment>
            <p>{t(FlexibilityTranslations.INTRO_SYSTEM)}</p>
            <LinearSystem firstEquation={firstEquation} secondEquation={secondEquation} />
            {selfExplanation.isSingleChoice ?
                <SingleChoiceExercise method={method} text={text} selfExplanation={selfExplanation} loadNextStep={loadNextStep} agentType={agentType}
                                      trackAction={trackAction} trackError={trackError} trackHints={trackHints}/> :
                <MultipleChoiceExercise method={method} text={text} selfExplanation={selfExplanation} loadNextStep={loadNextStep} agentType={agentType}
                                        trackAction={trackAction} trackError={trackError} trackHints={trackHints} />}
        </React.Fragment>
    );
}

export function SelfExplanationForSystemMatching(
    {
        method,
        firstEquation,
        secondEquation,
        alternativeSystems,
        selfExplanation,
        loadNextStep,
        agentType,
        trackAction,
        trackError,
        trackHints
    }: {
        method: Method;
        firstEquation: FlexibilityEquation;
        secondEquation: FlexibilityEquation;
        alternativeSystems: MatchableSystem[];
        selfExplanation: SelfExplanation;
        loadNextStep: () => void;
        agentType?: AgentType;
        trackAction: (action: string) => void;
        trackError: () => void;
        trackHints: () => void;
    }
): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.Flexibility, TranslationNamespaces.General]);

    const instruction = FlexibilityTranslations.getInstructionForSelfExplanationMatchingExercise(method);
    const text: ReactElement = (
        <React.Fragment>
            <p><Trans ns={TranslationNamespaces.Flexibility} i18nKey={instruction.translationKey} values={instruction.interpolationVariables as object} /></p>
            <p>{t(selfExplanation.isSingleChoice ? FlexibilityTranslations.EXPLANATION_SINGLE_CHOICE : FlexibilityTranslations.EXPLANATION_MULTIPLE_CHOICE)}</p>
        </React.Fragment>
    );

    const systemStyle: CSSProperties = {
        padding: "0.5rem",
        border: "2px solid var(--light-text-50)",
        borderRadius: "1rem",
        gap: "0.5rem",
        maxWidth: "fit-content"
    };

    return (
        <React.Fragment>
            <div className={"matching-explanation__grid"}>
                <div className={"matching-explanation__column1"}>
                    <p><strong>{t(FlexibilityTranslations.MATCHING_SOLUTION)}</strong></p>
                    <LinearSystem firstEquation={firstEquation} secondEquation={secondEquation} systemStyle={{ ...systemStyle, margin: "auto" }} />
                </div>
                <div className={"matching-explanation__column2"}>
                    <p><strong>{t(FlexibilityTranslations.MATCHING_ALTERNATIVES)}</strong></p>
                    <div className={"column__systems"}>
                        {alternativeSystems.map((system, index) => {
                            return <LinearSystem key={index} firstEquation={system.firstEquation} secondEquation={system.secondEquation} systemStyle={systemStyle} />;
                        })}
                    </div>
                </div>
            </div>
            {selfExplanation.isSingleChoice ?
                <SingleChoiceExercise method={method} text={text} selfExplanation={selfExplanation} loadNextStep={loadNextStep} agentType={agentType}
                                      trackAction={trackAction} trackError={trackError} trackHints={trackHints}/> :
                <MultipleChoiceExercise method={method} text={text} selfExplanation={selfExplanation} loadNextStep={loadNextStep} agentType={agentType}
                                        trackAction={trackAction} trackError={trackError} trackHints={trackHints}/>}
        </React.Fragment>
    );
}

function SingleChoiceExercise({ method, text, selfExplanation, loadNextStep, agentType, trackAction, trackError, trackHints}: {
    method: Method;
    text: ReactElement;
    selfExplanation: SelfExplanation;
    loadNextStep: () => void;
    agentType?: AgentType;
    trackAction: (action: string) => void;
    trackError: () => void;
    trackHints: () => void;
}): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.Flexibility, TranslationNamespaces.General]);

    const [selectedOption, setSelectedOption] = useState<number | undefined>();
    const [feedback, setFeedback] = useState<string>();
    const [showFeedback, setShowFeedback] = useState<boolean>(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);

    const definition: string = useMemo(() => getDefinitionByMethod(method), [method]);

    return (
        <React.Fragment>
            <div className={"self-explanation"}>
                {text}
                <SingleChoice options={selfExplanation.options.map((option) => option.text)}
                              selectedOption={selectedOption}
                              setSelectedOption={setSelectedOption}
                              disabled={showFeedback || showSuccessMessage}
                              optionClassname={"self-explanation__option"}
                              trackAction={trackAction}
                />
            </div>
            {selectedOption !== undefined && (
                <button className={"button primary-button"} onClick={handleChoice} disabled={showFeedback || showSuccessMessage}>
                    {t(GeneralTranslations.BUTTON_VERIFY_ANSWER, { ns: TranslationNamespaces.General })}
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                </button>
            )}
            <FlexibilityHint hints={[definition, FlexibilityTranslations.EXPLANATION_HINT]} agentType={agentType} agentExpression={AgentExpression.Neutral}
                             disabled={showFeedback} trackHint={trackHints}/>
            {showFeedback && (
                <ClosableFlexibilityPopover setShowContent={setShowFeedback} agentType={agentType} agentExpression={AgentExpression.Thinking}>
                    <p>{feedback}</p>
                </ClosableFlexibilityPopover>
            )}
            {showSuccessMessage && (
                <FlexibilityPopover agentType={agentType} agentExpression={AgentExpression.Smiling}>
                    <ContinueMessage message={FlexibilityTranslations.SUCCESS_MESSAGE_TASK} loadNextStep={loadNextStep} />
                </FlexibilityPopover>
            )}
        </React.Fragment>
    );

    function handleChoice(): void {
        if (selectedOption === undefined) {
            return;
        }

        const opt: Option = selfExplanation.options[selectedOption];

        if (opt.isSolution) {
            trackAction("SUCCESS");
            setShowSuccessMessage(true);
        } else {
            trackAction("FAILURE");
            trackError();
            let message: string = t(FlexibilityTranslations.EXPLANATION_FEEDBACK_SINGLE);
            if (opt.reason !== null && opt.reason !== undefined) {
                message += " " + opt.reason;
            }
            setFeedback(message);
            setShowFeedback(true);
        }
    }
}

function MultipleChoiceExercise({ method, text, selfExplanation, loadNextStep, agentType, trackAction, trackError, trackHints }: {
    method: Method;
    text: ReactElement;
    selfExplanation: SelfExplanation;
    loadNextStep: () => void;
    agentType?: AgentType;
    trackAction: (action: string) => void;
    trackError: () => void;
    trackHints: () => void;
}): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.Flexibility, TranslationNamespaces.General]);

    const [selectedOptions, setSelectedOptions] = useState<number[] | undefined>();
    const [feedback, setFeedback] = useState<string>();
    const [showFeedback, setShowFeedback] = useState<boolean>(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);

    const definition: string = useMemo(() => getDefinitionByMethod(method), [method]);

    return (
        <React.Fragment>
            <div className={"self-explanation"}>
                {text}
                <MultipleChoice options={selfExplanation.options.map((option) => option.text)} selectedOptions={selectedOptions} setSelectedOptions={setSelectedOptions}
                                disabled={showSuccessMessage} optionClassname={"self-explanation__option"} trackAction={trackAction} />
            </div>
            {selectedOptions !== undefined && (
                <button className={"button primary-button"} onClick={handleChoice} disabled={showFeedback || showSuccessMessage}>
                    {t(GeneralTranslations.BUTTON_VERIFY_ANSWER, { ns: TranslationNamespaces.General })}
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                </button>
            )}
            <FlexibilityHint hints={[definition, FlexibilityTranslations.EXPLANATION_HINT]} agentType={agentType} agentExpression={AgentExpression.Neutral}
                             disabled={showFeedback || showSuccessMessage} trackHint={trackHints}/>
            {showFeedback && (
                <ClosableFlexibilityPopover setShowContent={setShowFeedback} agentType={agentType} agentExpression={AgentExpression.Thinking}>
                    <p>{feedback}</p>
                </ClosableFlexibilityPopover>
            )}
            {showSuccessMessage && (
                <FlexibilityPopover agentType={agentType} agentExpression={AgentExpression.Smiling}>
                    <ContinueMessage message={FlexibilityTranslations.SUCCESS_MESSAGE_TASK} loadNextStep={loadNextStep} />
                </FlexibilityPopover>
            )}
        </React.Fragment>
    );

    function handleChoice(): void {
        if (selectedOptions === undefined) {
            return;
        }

        const { selected, notSelected } = filterOptions(selfExplanation.options, selectedOptions);

        if (selected.every((opt) => !opt.isSolution)) {
            trackAction("ALL faulty FAILURE");
            trackError();
            computeAndSetFeedback(t(FlexibilityTranslations.EXPLANATION_FEEDBACK_MULTIPLE_ALL_FAULTY), selected);
        } else if (selected.some((opt) => !opt.isSolution)) {
            trackAction("SOME faulty FAILURE");
            trackError();
            computeAndSetFeedback(t(FlexibilityTranslations.EXPLANATION_FEEDBACK_MULTIPLE_SOME_FAULTY), selected);
        } else if (notSelected.some((opt) => opt.isSolution)) {
            trackAction("MISSING FAILURE");
            trackError();
            computeAndSetFeedback(t(FlexibilityTranslations.EXPLANATION_FEEDBACK_MULTIPLE_MISSING), selected);
        } else {
            trackAction("SUCCESS");
            setShowSuccessMessage(true);
        }
    }

    function computeAndSetFeedback(feedback: string, options: Option[]) {
        let message: string = feedback;
        options.forEach((opt) => {
            if (!opt.isSolution && opt.reason !== null && opt.reason !== undefined) {
                message += " " + opt.reason;
            }
        });
        setFeedback(message);
        setShowFeedback(true);
    }
}

function filterOptions(options: Option[], selectedOptions: number[]): { selected: Option[]; notSelected: Option[] } {
    const selected: Option[] = [];
    const notSelected: Option[] = [];
    options.forEach((opt, index) => {
        if (selectedOptions.includes(index)) {
            selected.push(opt);
        } else {
            notSelected.push(opt);
        }
    });
    return { selected, notSelected };
}
