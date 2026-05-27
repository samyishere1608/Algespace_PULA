import DraggableImage from "@/components/shared/DraggableImage";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { TranslationNamespaces } from "@/i18n.ts";
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { faCheck, faRotateLeft, faRotateRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { produce } from "immer";
import React, { ReactElement, ReactNode, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useImmer } from "use-immer";
import { DragSource, EqualizationGamePhase, EqualizationItemType, InstructionType } from "@/types/equalization/enums";
import { EqualizationConstants } from "@/types/equalization/equalizationConstants.ts";
import { EqualizationExercise } from "@/types/equalization/equalizationExercise";
import { EqualizationGameState } from "@/types/equalization/equalizationGameState.ts";
import { EqualizationTranslations } from "@/types/equalization/equalizationTranslations.ts";
import { Goal } from "@/types/equalization/goal";
import { GameError, GameErrorType } from "@/types/shared/error.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { EqualizationItem } from "@/types/shared/item";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { CKExerciseType, EqualizationPhase } from "@/types/studies/enums.ts";
import { IUser } from "@/types/studies/user.ts";
import HighlightedArea from "@components/equalization/HighlightedArea.tsx";
import HintPopover from "@components/shared/HintPopover.tsx";
import { Paths } from "@routes/paths.ts";
import useCKTracker from "@hooks/useCKTracker.ts";
import { setCKExerciseCompleted, setCKStudyExerciseCompleted } from "@utils/storageUtils.ts";
import { countSecondVariable, displayFeedBack, sumWeightOfItems } from "@utils/utils";
import BalanceScale from "./BalanceScale";
import DigitalScale from "./DigitalScale.tsx";
import FruitBox from "./FruitBox";
import Instruction, { InstructionForContinuingWithSimplification, InstructionForDeterminingIsolatedVariable, InstructionForScaleAndSystemRelation, InstructionForSecondVariableInput, InstructionForSolution } from "./Instruction.tsx";
import SystemImage from "./SystemImage";
import Weight from "./Weight";

export default function EqualizationGame({ exercise, actionOverlay, isStudy = false, studyId, collectData = true }: { exercise: EqualizationExercise; actionOverlay?: ReactNode; isStudy?: boolean; studyId?: number; collectData?: boolean }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.Equalization, TranslationNamespaces.Variables]);
    const navigate = useNavigate();
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

    const { user } = useAuth();
    if (isStudy) {
        if (user === undefined) {
            throw new GameError(GameErrorType.AUTH_ERROR);
        }
        if (studyId === undefined) {
            throw new GameError(GameErrorType.STUDY_ID_ERROR);
        }
    }
    const { trackActionInPhase, trackHintInPhase, trackErrorInPhase, setNextTrackingPhase, endTrackingPhase, endTracking } = useCKTracker(isStudy && collectData, user as IUser, CKExerciseType.Equalization, studyId as number, exercise.id, performance.now());

    const [gameHistory, setGameHistory] = useImmer<EqualizationGameState[]>([EqualizationGameState.initializeGameState(exercise)]);
    const [currentStep, setCurrentStep] = useState<number>(0);
    const currentGameState: EqualizationGameState = gameHistory[currentStep];

    const [goal, setGoal] = useState<Goal>(Goal.getEqualizationGoal(exercise));

    const [instructionType, setInstructionType] = useState<InstructionType>(InstructionType.FirstInstruction);

    const [showTransparentOverlay, setShowTransparentOverlay] = useState<boolean>(false);

    const [draggedItem, setDraggedItem] = useState<[string | null, DragSource | null]>([null, null]);

    const [feedback, setFeedback] = useState<[boolean, string | ReactNode]>([false, ""]);

    const [hints, setHints] = useState<TranslationInterpolation[]>(EqualizationTranslations.getEqualizationHints(exercise));
    const [showHints, setShowHints] = useState<boolean>(true);

    const [showScaleSystemRelation, setShowScaleSystemRelation] = useState<boolean>(false);

    const scaleRef = useRef<HTMLInputElement>(null);
    const systemRef = useRef<HTMLInputElement>(null);

    const [showActionOverlay, setShowActionOverlay] = useState<boolean>(false);

    let instruction;
    switch (instructionType) {
        case InstructionType.FirstInstruction: {
            instruction = <Instruction translation={EqualizationTranslations.getFirstInstruction(exercise)} />;
            break;
        }

        case InstructionType.ScaleAndSystemRelation: {
            instruction = <Instruction translation={EqualizationTranslations.getInstructionForRelation()} children={<InstructionForScaleAndSystemRelation onContinue={loadSimplificationPhase} onExplain={explainScaleAndSystemRelation} trackAction={trackActionInPhase} />} />;
            break;
        }

        case InstructionType.RelationReason: {
            instruction = <Instruction translation={EqualizationTranslations.getInstructionForRelationReason()} children={<InstructionForContinuingWithSimplification handleClick={loadSimplificationPhase} />} />;
            break;
        }

        case InstructionType.Simplification: {
            instruction = <Instruction translation={EqualizationTranslations.getInstructionForSimplification()} />;
            break;
        }

        case InstructionType.DeterminingSecondVariable: {
            instruction = <Instruction translation={EqualizationTranslations.getInstructionForDeterminingSecondVariable(exercise)} children={<InstructionForSecondVariableInput key={"unique"} exercise={exercise} handleCorrectSolution={loadSolutionPhase} trackAction={trackActionInPhase} trackError={trackErrorInPhase} />} />;
            break;
        }
        case InstructionType.DeterminingIsolatedVariable: {
            instruction = <Instruction translation={EqualizationTranslations.getInstructionForDeterminingIsolatedVariable(exercise)} children={<InstructionForDeterminingIsolatedVariable exercise={exercise} />} />;
            break;
        }

        case InstructionType.Solution: {
            instruction = (
                <Instruction
                    translation={EqualizationTranslations.getSolutionInstruction()}
                    children={
                        <InstructionForSolution
                            exercise={exercise}
                            handleClick={() => {
                                if (isStudy) {
                                    if (collectData) {
                                        setCKStudyExerciseCompleted(studyId as number, "equalization", exercise.id);
                                    }
                                    navigate(Paths.CKStudyPath + studyId);
                                } else {
                                    setCKExerciseCompleted(exercise.id, "equalization");
                                    setShowActionOverlay(true);
                                }
                            }}
                        />
                    }
                />
            );
            break;
        }
    }

    return (
        <React.Fragment>
            {showActionOverlay && actionOverlay}
            <div className={"equalization"}>
                <div className={"system-image"} ref={systemRef}>
                    <SystemImage exercise={exercise} />
                </div>
                {instruction}
                {showTransparentOverlay && <div className={"equalization__overlay"}></div>}
                <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} modifiers={[snapCenterToCursor]}>
                    <div className={"equalization__table"}>
                        <div className={"equalization__shelf"}>
                            <div className={"equalization__weights"}>
                                {currentGameState.weights.map((value: EqualizationItem, index: number) => {
                                    return <Weight key={index} index={index} weightItem={value} />;
                                })}
                            </div>
                            <div className={"equalization__fruits-background"}>
                                <div className={"equalization__fruits-boxes"}>
                                    <FruitBox source={DragSource.FruitsLeft} item={exercise.isolatedVariable.toItem(EqualizationItemType.IsolatedVariable)} containsItems={currentGameState.isolatedVariableCount > 0} />
                                    <FruitBox source={DragSource.FruitsRight} item={exercise.secondVariable.toItem(EqualizationItemType.SecondVariable)} containsItems={currentGameState.secondVariableCount > 0} />
                                </div>
                            </div>
                        </div>
                        <div className={"scale-container"} ref={scaleRef}>
                            {goal.gamePhase === EqualizationGamePhase.SolvingSystem ? <DigitalScale items={currentGameState.leftItems} isValidDropzone={isValidDropzone} /> : <BalanceScale exercise={exercise} leftItems={currentGameState.leftItems} rightItems={currentGameState.rightItems} isValidDropzone={isValidDropzone} />}
                        </div>
                    </div>
                    {draggedItem[0] !== null && (
                        <DragOverlay>
                            <div className={"draggable-item__container--3rem"}>
                                <DraggableImage isVisible={true} imageName={draggedItem[0]} />
                            </div>
                        </DragOverlay>
                    )}
                </DndContext>
                <div className={"equalization__footer"}>
                    <div className={"equalization__button-group"}>
                        <button className={"button primary-button"} disabled={currentStep < 1 || showTransparentOverlay} onClick={undoLastStep}>
                            <FontAwesomeIcon icon={faRotateLeft} />
                        </button>
                        <button className={"button primary-button"} disabled={currentStep >= gameHistory.length - 1 || showTransparentOverlay} onClick={loadPreviousState}>
                            <FontAwesomeIcon icon={faRotateRight} />
                        </button>
                    </div>
                    {feedback[0] && <div className={"equalization__feedback"}>{feedback[1]}</div>}
                    <div className={"equalization__button-group"}>
                        {goal.gamePhase === EqualizationGamePhase.SolvingSystem ? (
                            <button className={"button primary-button"} onClick={verifyWeight} disabled={showTransparentOverlay}>
                                {t(EqualizationTranslations.ADOPT_WEIGHT, { ns: TranslationNamespaces.Equalization })}
                                <FontAwesomeIcon icon={faCheck} />
                            </button>
                        ) : (
                            <button className={"button primary-button"} onClick={goal.gamePhase === EqualizationGamePhase.Equalization ? verifyEqualization : verifySimplification} disabled={showTransparentOverlay}>
                                {t(GeneralTranslations.BUTTON_VERIFY, { ns: TranslationNamespaces.General })}
                                <FontAwesomeIcon icon={faCheck} />
                            </button>
                        )}
                        <HintPopover hints={hints} namespaces={[TranslationNamespaces.Equalization]} disabled={!showHints} trackHint={trackHintInPhase} />
                    </div>
                </div>
                {showScaleSystemRelation && <HighlightedArea scaleRect={computeBoundingBoxOfScale()} systemRect={computeBoundingBoxOfSystem()} gameState={currentGameState} exercise={exercise} />}
            </div>
        </React.Fragment>
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleDragStart(event: any): void {
        const source = event.active.data.current.source;
        if (source == DragSource.FruitsLeft || source == DragSource.FruitsRight) {
            setDraggedItem([event.active.data.current.item.name, source]);
        } else {
            setDraggedItem([null, source]);
        }
    }

    function isValidDropzone(target: DragSource): boolean {
        return target !== draggedItem[1];
    }

    function isSpaceAvailable(target: DragSource): boolean {
        if (goal.gamePhase === EqualizationGamePhase.SolvingSystem) {
            return currentGameState.leftItems.length < EqualizationConstants.MAX_ITEMS_DIG_SCALE;
        }
        return !((target === DragSource.BalanceScaleLeft && currentGameState.leftItems.length >= (exercise.maximumCapacity ?? EqualizationConstants.MAX_ITEMS_SCALE)) || (target === DragSource.BalanceScaleRight && currentGameState.rightItems.length >= (exercise.maximumCapacity ?? EqualizationConstants.MAX_ITEMS_SCALE)));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleDragEnd(event: any): void {
        setDraggedItem([null, null]);

        const { over, active } = event;

        if (over !== null && over.data.current.target === active.data.current.source) {
            let source: string = "";
            if (active.data.current.source === DragSource.BalanceScaleLeft) {
                source = "ScaleLeft";
            } else if (active.data.current.source === DragSource.BalanceScaleRight) {
                source = "ScaleRight";
            }
            trackActionInPhase(`DROP ${event.active.data.current.item.name} at target=source=${source}`);
            return;
        }

        let isolatedVariableCount: number = currentGameState.isolatedVariableCount;
        let secondVariableCount: number = currentGameState.secondVariableCount;
        let leftItems: EqualizationItem[] = currentGameState.leftItems;
        let rightItems: EqualizationItem[] = currentGameState.rightItems;
        let weights: EqualizationItem[] = currentGameState.weights;

        switch (active.data.current.source) {
            case DragSource.FruitsLeft: {
                if (over === null || !isSpaceAvailable(over.data.current.target)) {
                    if (over === null) {
                        trackActionInPhase(`DRAG ${exercise.isolatedVariable.name} from FruitsLeft to NULL`);
                    } else {
                        const target: string = over.data.current.target === DragSource.BalanceScaleLeft ? "LeftScale" : "RightScale";
                        trackActionInPhase(`DROP INVALID at ${target} for dragged ${exercise.isolatedVariable.name} from FruitsLeft`);
                    }
                    return;
                }

                isolatedVariableCount--;

                if (over.data.current.target === DragSource.BalanceScaleLeft || over.data.current.target === DragSource.DigitalScale) {
                    leftItems = produce(currentGameState.leftItems, (draft) => {
                        draft.push(exercise.isolatedVariable.toItem(EqualizationItemType.IsolatedVariable));
                    });
                    trackActionInPhase(`DRAG ${exercise.isolatedVariable.name} from FruitsLeft to ${over.data.current.target === DragSource.BalanceScaleLeft ? "ScaleLeft" : "DigitalScale"}`);
                } else {
                    rightItems = produce(currentGameState.rightItems, (draft) => {
                        draft.push(exercise.isolatedVariable.toItem(EqualizationItemType.IsolatedVariable));
                    });
                    trackActionInPhase(`DRAG ${exercise.isolatedVariable.name} from FruitsLeft to ScaleRight`);
                }

                break;
            }

            case DragSource.FruitsRight: {
                if (over === null || !isSpaceAvailable(over.data.current.target)) {
                    if (over === null) {
                        trackActionInPhase(`DRAG ${exercise.secondVariable.name} from FruitsRight to NULL`);
                    } else {
                        const target: string = over.data.current.target === DragSource.BalanceScaleLeft ? "LeftScale" : "RightScale";
                        trackActionInPhase(`DROP INVALID at ${target} for dragged ${exercise.secondVariable.name} from FruitsRight`);
                    }
                    return;
                }

                secondVariableCount--;

                if (over.data.current.target === DragSource.BalanceScaleLeft || over.data.current.target === DragSource.DigitalScale) {
                    leftItems = produce(currentGameState.leftItems, (draft) => {
                        draft.push(exercise.secondVariable.toItem(EqualizationItemType.SecondVariable));
                    });
                    trackActionInPhase(`DRAG ${exercise.secondVariable.name} from FruitsRight to ${over.data.current.target === DragSource.BalanceScaleLeft ? "ScaleLeft" : "DigitalScale"}`);
                } else {
                    rightItems = produce(currentGameState.rightItems, (draft) => {
                        draft.push(exercise.secondVariable.toItem(EqualizationItemType.SecondVariable));
                    });
                    trackActionInPhase(`DRAG ${exercise.secondVariable.name} from FruitsRight to ScaleRight`);
                }

                break;
            }

            case DragSource.Weights: {
                if (over === null || !isSpaceAvailable(over.data.current.target)) {
                    if (over === null) {
                        trackActionInPhase(`DRAG ${event.active.data.current.item.name} from Weights to NULL`);
                    } else {
                        const target: string = over.data.current.target === DragSource.BalanceScaleLeft ? "LeftScale" : "RightScale";
                        trackActionInPhase(`DROP INVALID at ${target} for dragged ${event.active.data.current.item.name} from Weights`);
                    }
                    return;
                }

                const count: number = currentGameState.weights[active.data.current.index].amount;
                if (count === 1) {
                    weights = produce(currentGameState.weights, (draft) => {
                        draft.splice(active.data.current.index, 1);
                    });
                } else {
                    weights = produce(currentGameState.weights, (draft) => {
                        draft[active.data.current.index].amount = count - 1;
                    });
                }

                if (over.data.current.target === DragSource.BalanceScaleLeft || over.data.current.target === DragSource.DigitalScale) {
                    leftItems = produce(currentGameState.leftItems, (draft) => {
                        draft.push({
                            ...currentGameState.weights[active.data.current.index],
                            amount: 1
                        } as EqualizationItem);
                    });
                    trackActionInPhase(`DRAG ${event.active.data.current.item.name} from Weights to ${over.data.current.target === DragSource.BalanceScaleLeft ? "ScaleLeft" : "DigitalScale"}`);
                } else {
                    rightItems = produce(currentGameState.rightItems, (draft) => {
                        draft.push({
                            ...currentGameState.weights[active.data.current.index],
                            amount: 1
                        } as EqualizationItem);
                    });
                    trackActionInPhase(`DRAG ${event.active.data.current.item.name} from Weights to ScaleRight`);
                }

                break;
            }

            case DragSource.BalanceScaleLeft:
            case DragSource.BalanceScaleRight: {
                const source: string = active.data.current.source === DragSource.BalanceScaleLeft ? "ScaleLeft" : "ScaleRight";

                if (over !== null && !isSpaceAvailable(over.data.current.target)) {
                    trackActionInPhase(`DROP INVALID at ${over.data.current.target} for dragged ${event.active.data.current.item.name} from ${source}`);
                    return;
                }

                if (active.data.current.source === DragSource.BalanceScaleLeft) {
                    leftItems = produce(currentGameState.leftItems, (draft) => {
                        draft.splice(active.data.current.index, 1);
                    });
                } else {
                    rightItems = produce(currentGameState.rightItems, (draft) => {
                        draft.splice(active.data.current.index, 1);
                    });
                }

                if (over === null) {
                    const item: EqualizationItem = active.data.current.item as EqualizationItem;
                    switch (item.itemType) {
                        case EqualizationItemType.IsolatedVariable: {
                            isolatedVariableCount++;
                            break;
                        }
                        case EqualizationItemType.SecondVariable: {
                            secondVariableCount++;
                            break;
                        }
                        default: {
                            // Must be a weight
                            const index: number = currentGameState.weights.findIndex((entry: EqualizationItem) => entry.name === item.name);
                            weights = returnWeight(index, item);
                            break;
                        }
                    }
                    trackActionInPhase(`REMOVE ${event.active.data.current.item.name} from ${source}`);
                } else {
                    if (active.data.current.source === DragSource.BalanceScaleLeft) {
                        rightItems = produce(currentGameState.rightItems, (draft) => {
                            draft.push({
                                ...currentGameState.leftItems[active.data.current.index],
                                amount: 1
                            } as EqualizationItem);
                        });
                        trackActionInPhase(`DRAG ${event.active.data.current.item.name} from ScaleLeft to ScaleRight`);
                    } else {
                        leftItems = produce(currentGameState.leftItems, (draft) => {
                            draft.push({
                                ...currentGameState.rightItems[active.data.current.index],
                                amount: 1
                            } as EqualizationItem);
                        });
                        trackActionInPhase(`DRAG ${event.active.data.current.item.name} from ScaleRight to ScaleLeft`);
                    }
                }

                break;
            }

            case DragSource.DigitalScale: {
                leftItems = produce(currentGameState.leftItems, (draft) => {
                    draft.splice(active.data.current.index, 1);
                });

                const item: EqualizationItem = active.data.current.item as EqualizationItem;
                switch (item.itemType) {
                    case EqualizationItemType.SecondVariable: {
                        secondVariableCount++;
                        break;
                    }
                    default: {
                        // Must be a weight
                        const index: number = currentGameState.weights.findIndex((entry: EqualizationItem) => entry.name === item.name);
                        weights = returnWeight(index, item);
                        break;
                    }
                }
                trackActionInPhase(`REMOVE ${event.active.data.current.item.name} from DigitalScale`);
                break;
            }
        }

        setGameHistory(
            produce((draft): void => {
                draft[currentStep + 1] = new EqualizationGameState(isolatedVariableCount, secondVariableCount, weights, leftItems, rightItems);
            })
        );
        setCurrentStep(currentStep + 1);
    }

    function returnWeight(index: number, item: EqualizationItem): EqualizationItem[] {
        if (index === -1) {
            return produce(currentGameState.weights, (draft) => {
                draft.push({
                    ...item,
                    amount: 1
                } as EqualizationItem);
            });
        } else {
            return produce(currentGameState.weights, (draft) => {
                draft[index] = {
                    ...currentGameState.weights[index],
                    amount: currentGameState.weights[index].amount + 1
                } as EqualizationItem;
            });
        }
    }

    function undoLastStep(): void {
        if (currentStep >= 1 && gameHistory.length >= currentStep) {
            setCurrentStep(currentStep - 1);
        }
        trackActionInPhase("UNDO");
    }

    function loadPreviousState(): void {
        if (currentStep < gameHistory.length) {
            setCurrentStep(currentStep + 1);
        }
        trackActionInPhase("REDO");
    }

    function verifyEqualization(): void {
        const [leftWeight, rightWeight] = calculateWeightPerPan();

        if (leftWeight === rightWeight) {
            const [countLeft, countRight] = calculateSecondVariablePerPan();
            const satisfiesCount: boolean = satisfiesSecondVariableCount(countLeft, countRight);

            if (goal.expectedWeight === leftWeight && satisfiesCount) {
                setShowTransparentOverlay(true);
                setShowHints(false);
                setInstructionType(InstructionType.ScaleAndSystemRelation);
            }
            else {
                // Scale is invalid, show feedback
                trackErrorInPhase();
                if (leftWeight === 0) {
                    showFeedbackForEmptyScale();
                } else {
                    if (scaleContainsIsolatedVariable()) {
                        trackActionInPhase("ERROR: scale contains ISOLATED");
                        const feedbackContainsIsolated: TranslationInterpolation = EqualizationTranslations.getFeedbackForIsolatedVariableOnEqualization(exercise);
                        displayFeedBack(
                            setFeedback,
                            <p>
                                <Trans ns={TranslationNamespaces.Equalization} i18nKey={feedbackContainsIsolated.translationKey} values={feedbackContainsIsolated.interpolationVariables as object} />
                            </p>
                        );
                    } else {
                        if(!scaleSimplificationVariable()){
                            trackActionInPhase("ERROR: Simplification");
                            const feedbackInvalidBalance: TranslationInterpolation = EqualizationTranslations.getFeedbackForInvalidBalanceOnEqualizationSimplification(exercise);
                            displayFeedBack(
                                setFeedback,
                                <p>
                                    <Trans ns={TranslationNamespaces.Equalization} i18nKey={feedbackInvalidBalance.translationKey} values={feedbackInvalidBalance.interpolationVariables as object} />
                                </p>
                            );
                        }
                        else{
                            trackActionInPhase("ERROR: INVALID balance");
                            const feedbackInvalidBalance: TranslationInterpolation = EqualizationTranslations.getFeedbackForInvalidBalanceOnEqualization(exercise);
                            displayFeedBack(
                                setFeedback,
                                <p>
                                    <Trans ns={TranslationNamespaces.Equalization} i18nKey={feedbackInvalidBalance.translationKey} values={feedbackInvalidBalance.interpolationVariables as object} />
                                </p>
                            );

                        }

                    }
                }
            }
        } else {
            showFeedbackForImbalance();
        }
    }

    function verifySimplification(): void {
        const [leftWeight, rightWeight] = calculateWeightPerPan();

        if (leftWeight === rightWeight) {
            const [countLeft, countRight] = calculateSecondVariablePerPan();
            const satisfiesCount: boolean = satisfiesSecondVariableCount(countLeft, countRight);

            if (goal.expectedWeight === leftWeight && satisfiesCount) {
                setShowTransparentOverlay(true);
                setNextTrackingPhase(EqualizationPhase.FirstSolution);
                setInstructionType(InstructionType.DeterminingSecondVariable);
                setHints(EqualizationTranslations.getSecondVariableHints(exercise, currentGameState.leftItems, currentGameState.rightItems));
            } else {
                // Scale is invalid, show feedback
                trackErrorInPhase();
                if (leftWeight === 0) {
                    showFeedbackForEmptyScale();
                } else {
                    if (scaleContainsIsolatedVariable()) {
                        trackActionInPhase("ERROR: scale contains ISOLATED");
                        displayFeedBack(setFeedback, <p>{t(EqualizationTranslations.FEEDBACK_SIMPLIFICATION_ISO, { ns: TranslationNamespaces.Equalization })}</p>);
                    } else if ((countLeft >= goal.expectedCountLeft && countRight >= goal.expectedCountRight) || (countRight >= goal.expectedCountLeft && countLeft >= goal.expectedCountRight)) {
                        trackActionInPhase("ERROR: SIMPLIFICATION required");
                        displayFeedBack(setFeedback, <p>{t(EqualizationTranslations.FEEDBACK_SIMPLIFICATION_REQ, { ns: TranslationNamespaces.Equalization })}</p>);
                    } else {
                        trackActionInPhase("ERROR: INVALID balance");
                        displayFeedBack(setFeedback, <p>{t(EqualizationTranslations.FEEDBACK_SIMPLIFICATION_INV, { ns: TranslationNamespaces.Equalization })}</p>);
                    }
                }
            }
        } else {
            showFeedbackForImbalance();
        }
    }

    function calculateWeightPerPan(): [number, number] {
        const leftWeight: number = sumWeightOfItems(currentGameState.leftItems);
        const rightWeight: number = sumWeightOfItems(currentGameState.rightItems);
        return [leftWeight, rightWeight];
    }

    function calculateSecondVariablePerPan(): [number, number] {
        const countLeft: number = countSecondVariable(currentGameState.leftItems);
        const countRight: number = countSecondVariable(currentGameState.rightItems);
        return [countLeft, countRight];
    }

    function satisfiesSecondVariableCount(countLeft: number, countRight: number): boolean {
        return (countLeft === goal.expectedCountLeft && countRight === goal.expectedCountRight) || (countRight === goal.expectedCountLeft && countLeft === goal.expectedCountRight);
    }

    function scaleContainsIsolatedVariable(): boolean {
        const containsIsolated: boolean = currentGameState.leftItems.some((item: EqualizationItem): boolean => item.itemType === EqualizationItemType.IsolatedVariable);
        return containsIsolated || currentGameState.rightItems.some((item: EqualizationItem): boolean => item.itemType === EqualizationItemType.IsolatedVariable);
    }

    function scaleSimplificationVariable(): boolean {
        const containsVarLeft: boolean = currentGameState.leftItems.some((item: EqualizationItem): boolean => item.itemType === EqualizationItemType.SecondVariable);
        const containsVarRight: boolean = currentGameState.rightItems.some((item: EqualizationItem): boolean => item.itemType === EqualizationItemType.SecondVariable);
        return containsVarLeft == containsVarRight;
    }

    function showFeedbackForEmptyScale(): void {
        trackActionInPhase("ERROR: EMPTY scale");
        displayFeedBack(setFeedback, <p>{t(EqualizationTranslations.FEEDBACK_EMPTY_SCALE, { ns: TranslationNamespaces.Equalization })}</p>);
    }

    function showFeedbackForImbalance(): void {
        trackErrorInPhase();
        trackActionInPhase("ERROR: IMBALANCED scale");
        displayFeedBack(setFeedback, <p>{t(EqualizationTranslations.FEEDBACK_IMBALANCE, { ns: TranslationNamespaces.Equalization })}</p>);
    }

    function verifyWeight(): void {
        const weight: number = sumWeightOfItems(currentGameState.leftItems);
        if (weight === exercise.isolatedVariable.weight) {
            endTrackingPhase();
            endTracking();
            setShowTransparentOverlay(true);
            setShowHints(false);
            setInstructionType(InstructionType.Solution);
        } else {
            trackErrorInPhase();
            trackActionInPhase("ERROR: WEIGHT INVALID");
            displayFeedBack(setFeedback, <p>{t(EqualizationTranslations.FEEDBACK_INV_WEIGHT, { ns: TranslationNamespaces.Equalization })}</p>);
        }
    }

    function explainScaleAndSystemRelation(): void {
        setShowScaleSystemRelation(true);
        setInstructionType(InstructionType.RelationReason);
    }

    function loadSimplificationPhase(): void {
        setNextTrackingPhase(EqualizationPhase.Simplification);
        setGoal(Goal.getSimplificationGoal(exercise));
        setHints(EqualizationTranslations.getSimplificationHints(exercise, currentGameState.leftItems, currentGameState.rightItems));
        setInstructionType(InstructionType.Simplification);
        setShowScaleSystemRelation(false);
        setShowHints(true);
        setGameHistory([gameHistory[currentStep]]);
        setCurrentStep(0);
        setShowTransparentOverlay(false);
    }

    function loadSolutionPhase(): void {
        setNextTrackingPhase(EqualizationPhase.SecondSolution);
        setGoal(Goal.getSolutionGoal());
        setCurrentStep(0);
        setGameHistory([EqualizationGameState.setGameStateForSolutionPhase(exercise)]);
        setHints(EqualizationTranslations.getIsolatedVariableHints(exercise));
        setInstructionType(InstructionType.DeterminingIsolatedVariable);
        setShowTransparentOverlay(false);
    }

    function computeBoundingBoxOfScale(): DOMRect | undefined {
        if (scaleRef.current) {
            return scaleRef.current.getBoundingClientRect();
        }
        return undefined;
    }

    function computeBoundingBoxOfSystem(): DOMRect | undefined {
        if (systemRef.current) {
            return systemRef.current.getBoundingClientRect();
        }
        return undefined;
    }
}
