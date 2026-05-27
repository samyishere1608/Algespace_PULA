import { TranslationNamespaces } from "@/i18n.ts";
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { faArrowLeft, faArrowRight, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { AgentExpression, AgentType, FlexibilityDragSource, FlexibilityDragTarget, Method } from "@/types/flexibility/enums.ts";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { FlexibilityTerm } from "@/types/math/term.ts";
import { GameError, GameErrorType } from "@/types/shared/error.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { DraggableEqualizationEquation } from "@components/flexibility/equalization/DraggableEqualizationEquation.tsx";
import { DroppableEqualizationEquation } from "@components/flexibility/equalization/DroppableEqualizationEquation.tsx";
import { FlexibilityHint } from "@components/flexibility/interventions/FlexibilityHint.tsx";
import { FlexibilityPopover } from "@components/flexibility/interventions/FlexibilityPopover.tsx";
import { TransformedSystem } from "@components/flexibility/system/TransformedSystem.tsx";
import { countElementsInTerm } from "@utils/utils.ts";

export function EqualizationMethod({ initialSystem, transformedSystem, loadNextStep, agentType, trackAction, trackError, trackHints }: {
    initialSystem: [FlexibilityEquation, FlexibilityEquation];
    transformedSystem?: [FlexibilityEquation, FlexibilityEquation];
    loadNextStep: (equation: FlexibilityEquation) => void;
    agentType?: AgentType;
    trackAction: (action: string) => void;
    trackError: () => void;
    trackHints: () => void;
}): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Flexibility);

    const transformationIntroduction: TranslationInterpolation = FlexibilityTranslations.getInstructionForSolvingSystem(Method.Equalization);

    return (
        <React.Fragment>
            <p>
                <Trans ns={TranslationNamespaces.Flexibility} i18nKey={transformationIntroduction.translationKey}
                       values={transformationIntroduction.interpolationVariables as object} />
            </p>
            <TransformedSystem initialSystem={initialSystem} transformedSystem={transformedSystem} />
            <p>{t(FlexibilityTranslations.EQUALIZATION_INSTR)}</p>
            <MethodApplication system={transformedSystem !== undefined ? transformedSystem : initialSystem} loadNextStep={loadNextStep} agentType={agentType}
                               trackAction={trackAction} trackError={trackError} trackHints={trackHints}/>
        </React.Fragment>
    );
}

export function MethodApplication({ system, loadNextStep, agentType, trackAction, trackError, trackHints }: {
    system: [FlexibilityEquation, FlexibilityEquation];
    loadNextStep: (equation: FlexibilityEquation) => void;
    agentType?: AgentType
    trackAction: (action: string) => void;
    trackError: () => void;
    trackHints: () => void
}): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.Flexibility, TranslationNamespaces.General]);

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 8,
                delay: 10,
                tolerance: 5
            }
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                distance: 8,
                delay: 10,
                tolerance: 5
            }
        })
    );

    const minWidth = useMemo(() => {
        const leftCount: number = Math.max(countElementsInTerm(system[0].leftTerms), countElementsInTerm(system[1].leftTerms), 1) * 1.5;
        const rightCount: number = Math.max(countElementsInTerm(system[0].rightTerms), countElementsInTerm(system[1].rightTerms), 1) * 1.5;
        return Math.max(leftCount, rightCount);
    }, [system]);

    const [leftTerms, setLeftTerms] = useState<[FlexibilityTerm[], FlexibilityDragSource]>();
    const [rightTerms, setRightTerms] = useState<[FlexibilityTerm[], FlexibilityDragSource]>();
    const [errorFeedback, setErrorFeedback] = useState<string | undefined>(undefined);
    const [successFeedback, setSuccessFeedback] = useState<boolean>(false);
    const [attempts, setAttempts] = useState<number>(0);
    const [showSampleSolution, setShowSampleSolution] = useState<boolean>(false);

    const disabled: boolean = errorFeedback !== undefined || successFeedback || showSampleSolution;

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd} modifiers={[snapCenterToCursor]}>
            <div className={"equalization-application"}>
                <DraggableEqualizationEquation equation={system[0]} isFirstEquation={true} isFirst={true} minWidth={minWidth} disabled={disabled} />
                <DraggableEqualizationEquation equation={system[1]} isFirstEquation={false} isFirst={false} minWidth={minWidth} disabled={disabled} />
                <DroppableEqualizationEquation leftTerms={leftTerms !== undefined ? leftTerms[0] : undefined}
                                               rightTerms={rightTerms !== undefined ? rightTerms[0] : undefined}
                                               classname={(successFeedback || showSampleSolution) ? "--valid" : (errorFeedback !== undefined ? "--invalid" : "")}
                />
                {leftTerms !== undefined && rightTerms !== undefined && (
                    <button className={"button primary-button"} onClick={evaluateEquation} disabled={disabled}>
                        {t(GeneralTranslations.BUTTON_VERIFY_ANSWER, { ns: TranslationNamespaces.General })}
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                    </button>
                )}
            </div>
            <FlexibilityHint hints={[FlexibilityTranslations.EQUALIZATION_HINT]} disabled={disabled} agentType={agentType} agentExpression={AgentExpression.Neutral} trackHint={trackHints} />
            {(errorFeedback !== undefined && !showSampleSolution) && (
                <FlexibilityPopover agentType={agentType} agentExpression={AgentExpression.Thinking}>
                    <React.Fragment>
                        {attempts <= 2 ?
                            <React.Fragment>
                                <p>{t(errorFeedback)} {t(FlexibilityTranslations.TRY_AGAIN)}</p>
                                <button className={"button primary-button"} onClick={reset}>
                                    <FontAwesomeIcon icon={faArrowLeft} />
                                    {t(FlexibilityTranslations.BUTTON_TRY_AGAIN)}
                                </button>
                            </React.Fragment> :
                            <React.Fragment>
                                <p>{t(errorFeedback)} {t(FlexibilityTranslations.SAMPLE_SOLUTION)}</p>
                                <button className={"button primary-button"} onClick={computeSampleSolution}>
                                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                                    {t(GeneralTranslations.BUTTON_SHOW, { ns: TranslationNamespaces.General })}
                                </button>
                            </React.Fragment>
                        }
                    </React.Fragment>
                </FlexibilityPopover>
            )}
            {(successFeedback || showSampleSolution) && (
                <FlexibilityPopover agentType={agentType} agentExpression={successFeedback ? AgentExpression.Smiling : AgentExpression.Thinking}>
                    <React.Fragment>
                        <p>{t(successFeedback ? FlexibilityTranslations.EQUALIZATION_SOLUTION : FlexibilityTranslations.EQUALIZATION_SAMPLE_SOLUTION)}</p>
                        <button className={"button primary-button"} onClick={loadNext}>
                            <FontAwesomeIcon icon={faArrowRight} />
                            {t(GeneralTranslations.BUTTON_CONTINUE, { ns: TranslationNamespaces.General })}
                        </button>
                    </React.Fragment>
                </FlexibilityPopover>
            )}
        </DndContext>
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleDragEnd(event: any): void {
        const { over, active } = event;

        let terms: FlexibilityTerm[] = system[0].leftTerms;
        let source: FlexibilityDragSource = FlexibilityDragSource.FirstLeft;
        let dragAction: string = "DRAG term FIRST LEFT";
        switch (active.data.current.source) {
            case FlexibilityDragSource.FirstRight: {
                dragAction = "DRAG term FIRST RIGHT";
                terms = system[0].rightTerms;
                source = FlexibilityDragSource.FirstRight;
                break;
            }
            case FlexibilityDragSource.SecondLeft: {
                dragAction = "DRAG term SECOND LEFT";
                terms = system[1].leftTerms;
                source = FlexibilityDragSource.SecondLeft;
                break;
            }
            case FlexibilityDragSource.SecondRight: {
                dragAction = "DRAG term SECOND RIGHT";
                terms = system[1].rightTerms;
                source = FlexibilityDragSource.SecondRight;
                break;
            }
        }

        if (over === null) {
            trackAction(`${dragAction} DROP OUTSIDE`);
            return;
        }

        if (over.data.current.target === FlexibilityDragTarget.Left) {
            trackAction(`${dragAction} DROP LEFT`);
            setLeftTerms([terms, source]);
        } else {
            trackAction(`${dragAction} DROP RIGHT`);
            setRightTerms([terms, source]);
        }
    }

    function evaluateEquation(): void {
        if (leftTerms === undefined || rightTerms === undefined) {
            return;
        }
        if (leftTerms[1] === rightTerms[1]) {
            trackAction("ERROR: same SOURCE");
            trackError();
            setAttempts((prevState: number) => prevState + 1);
            setErrorFeedback(FlexibilityTranslations.EQUALIZATION_SAME_SOURCE_ERROR);
        } else if (leftTerms[0].length === 1 || rightTerms[0].length === 1) {
            if (leftTerms[0].length === 1 && rightTerms[0].length === 1) {
                trackAction("ERROR: same EXPRESSION");
                trackError();
                setAttempts((prevState: number) => prevState + 1);
                setErrorFeedback(FlexibilityTranslations.EQUALIZATION_SAME_SOURCE_ERROR);
            } else {
                trackAction("ERROR: contains TWO var");
                trackError();
                setAttempts((prevState: number) => prevState + 1);
                setErrorFeedback(FlexibilityTranslations.EQUALIZATION_TWO_VAR_ERROR);
            }
        } else {
            trackAction("SUCCESS");
            setSuccessFeedback(true);
        }
    }

    function reset(): void {
        setLeftTerms(undefined);
        setRightTerms(undefined);
        setErrorFeedback(undefined);
    }

    function loadNext(): void {
        if (leftTerms === undefined || rightTerms === undefined) {
            throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
        }
        loadNextStep(new FlexibilityEquation(leftTerms[0], rightTerms[0]));
    }

    function computeSampleSolution() {
        trackAction("SAMPLE solution");
        if (system[0].leftTerms.length === 1) {
            setLeftTerms([system[0].rightTerms, FlexibilityDragSource.FirstRight]);
        } else {
            setLeftTerms([system[0].leftTerms, FlexibilityDragSource.FirstLeft]);
        }
        if (system[1].leftTerms.length === 1) {
            setRightTerms([system[1].rightTerms, FlexibilityDragSource.SecondRight]);
        } else {
            setRightTerms([system[1].leftTerms, FlexibilityDragSource.SecondLeft]);
        }
        setShowSampleSolution(true);
    }
}
