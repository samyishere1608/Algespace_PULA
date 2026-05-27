import { useAuth } from "@/contexts/AuthProvider.tsx";
import { TranslationNamespaces } from "@/i18n.ts";
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { faRotateLeft, faRotateRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { produce } from "immer";
import React, { ReactElement, ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useImmer } from "use-immer";
import { GameError, GameErrorType } from "@/types/shared/error.ts";
import { BarteringItem } from "@/types/shared/item.ts";
import { CKExerciseType } from "@/types/studies/enums.ts";
import { IUser } from "@/types/studies/user.ts";
import { BarteringExercise } from "@/types/substitution/bartering/barteringExercise.ts";
import { RetailBox, initializeRetailBoxes } from "@/types/substitution/bartering/retailBox.ts";
import { Trade } from "@/types/substitution/bartering/trade.ts";
import { BarteringTranslations } from "@/types/substitution/substitutionTranslations.ts";
import HintPopover from "@components/shared/HintPopover.tsx";
import AssignmentSign from "@components/substitution/bartering/AssignmentSign.tsx";
import Inventory from "@components/substitution/bartering/Inventory.tsx";
import Merchant from "@components/substitution/bartering/Merchant.tsx";
import { Paths } from "@routes/paths.ts";
import useCKTracker from "@hooks/useCKTracker.ts";
import { setCKExerciseCompleted, setCKStudyExerciseCompleted } from "@utils/storageUtils.ts";
import "@styles/substitution/bartering.scss";

export default function BarteringGame({ exercise, actionOverlay, isStudy = false, studyId, collectData = true }: { exercise: BarteringExercise; actionOverlay?: ReactNode; isStudy?: boolean; studyId?: number; collectData?: boolean }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Substitution);
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
    const { trackAction, trackHint, trackError, endTracking } = useCKTracker(isStudy && collectData, user as IUser, CKExerciseType.Bartering, studyId as number, exercise.id, performance.now());

    const [gameHistory, setGameHistory] = useImmer<RetailBox[][]>(() => initializeRetailBoxes(exercise.trade));

    const [currentStep, setCurrentStep] = useState<number>(0);
    const retailBoxes = gameHistory[currentStep];
    const inventory = retailBoxes.slice(0, 5);

    const [draggedItem, setDraggedItem] = useState<string | null>(null);

    const [showInventoryWarning, setShowInventoryWarning] = useState<boolean>(false);

    // Display overlay once the game is completed
    const [showActionOverlay, setShowActionOverlay] = useState<boolean>(false);
    const isEnd: boolean = isGameEnd();
    useEffect(() => {
        if (isEnd) {
            if (isStudy) {
                if (collectData) {
                    setCKStudyExerciseCompleted(studyId as number, "bartering", exercise.id);
                }
                navigate(Paths.CKStudyPath + studyId);
            } else {
                const timer: number = setTimeout(() => {
                    setShowActionOverlay(true);
                    setCKExerciseCompleted(exercise.id, "substitution", "bartering");
                }, 1000);

                return (): void => {
                    clearTimeout(timer);
                    setShowActionOverlay(false);
                };
            }
        }
        return;
    }, [exercise.id, isStudy, studyId, isEnd, navigate, collectData]);

    // Compute the height of the grass background image based on the location of the merchants' tents
    const merchantsRef = useRef<HTMLInputElement>(null);
    const barteringRef = useRef<HTMLInputElement>(null);
    const [backgroundHeight, setBackgroundHeight] = useState<number>(0);

    useEffect(() => {
        updateHeight();
        window.addEventListener("resize", updateHeight); // Update height on window resize
        return () => window.removeEventListener("resize", updateHeight);
    }, []);

    return (
        <React.Fragment>
            {showActionOverlay && actionOverlay}
            <div className={"bartering"} ref={barteringRef}>
                <div className={"bartering__grass"} style={{ backgroundSize: `100% ${backgroundHeight}rem` }}>
                    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                        <div className={"bartering__merchants"} ref={merchantsRef}>
                            <Merchant id={1} merchant={exercise.firstMerchant} boxes={retailBoxes.slice(5, 7)} isValidDropLocation={canDrop} exchangeItems={exchangeItems} trackAction={trackAction} />
                            <Merchant id={2} merchant={exercise.secondMerchant} boxes={retailBoxes.slice(7, 9)} isValidDropLocation={canDrop} exchangeItems={exchangeItems} trackAction={trackAction} />
                            <Merchant id={3} merchant={exercise.thirdMerchant} boxes={retailBoxes.slice(-2)} isValidDropLocation={canDrop} exchangeItems={exchangeItems} trackAction={trackAction} />
                        </div>
                        <div className={"bartering__footer"}>
                            <div className={"bartering__button-group"}>
                                <button className={"button primary-button"} disabled={currentStep < 1 || showActionOverlay} onClick={undoLastStep}>
                                    <FontAwesomeIcon icon={faRotateLeft} />
                                </button>
                                <button className={"button primary-button"} disabled={currentStep >= gameHistory.length - 1 || showActionOverlay} onClick={loadPreviousState}>
                                    <FontAwesomeIcon icon={faRotateRight} />
                                </button>
                            </div>
                            <AssignmentSign exercise={exercise} />
                            <div className={"bartering__inventory"}>
                                {showInventoryWarning && <p className={"bartering__warning"}>{t(BarteringTranslations.INVENTORY_WARN)}</p>}
                                <Inventory inventory={inventory} canDrop={canDrop} />
                            </div>
                            <HintPopover hints={BarteringTranslations.getHintsForBartering()} namespaces={[TranslationNamespaces.Substitution]} disabled={showActionOverlay} trackHint={trackHint} />
                        </div>
                    </DndContext>
                </div>
            </div>
        </React.Fragment>
    );

    function updateHeight(): void {
        if (merchantsRef.current && barteringRef.current) {
            const divRect: DOMRect = barteringRef.current.getBoundingClientRect();
            const componentRect: DOMRect = merchantsRef.current.getBoundingClientRect();
            const height: number = divRect.bottom - componentRect.bottom;
            let heightInRem: number = height / parseFloat(getComputedStyle(document.documentElement).fontSize);
            heightInRem += 4.5;
            setBackgroundHeight(heightInRem);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleDragStart(event: any): void {
        setDraggedItem(event.active.data.current.item.name);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleDragEnd(event: any): void {
        setDraggedItem(null);

        const { over, active } = event;
        if (over === null || !over.data.current.canDrop || over.data.current.target === active.data.current.source) {
            logInvalidDragEnd(active.data.current, over);
            return;
        }

        trackAction(`DRAG ${active.data.current.item.name} from ${active.data.current.source} to ${over.data.current.target}`);

        setGameHistory(
            produce((draft): void => {
                const copiedBoxes: RetailBox[] = [...draft[currentStep]];

                const targetBox: RetailBox = gameHistory[currentStep][over.data.current.target];
                copiedBoxes[over.data.current.target] = new RetailBox(over.data.current.target, new BarteringItem(active.data.current.item.name, targetBox.item !== null ? targetBox.item.amount + 1 : 1));

                const sourceBox: RetailBox = gameHistory[currentStep][active.data.current.source];
                let item: BarteringItem | null;
                if (sourceBox.item !== null && sourceBox.item.amount > 1) {
                    item = new BarteringItem(active.data.current.item.name, sourceBox.item.amount - 1);
                } else {
                    item = null;
                }
                copiedBoxes[active.data.current.source] = new RetailBox(active.data.current.source, item);

                draft[currentStep + 1] = copiedBoxes;
            })
        );

        setCurrentStep(currentStep + 1);

        logBoxAssignments(gameHistory[currentStep]);
    }

    function canDrop(boxItem: BarteringItem | null, trade: Trade | null): boolean {
        if (draggedItem === null) {
            return true;
        }

        if (trade === null) {
            // Drop over inventory
            return boxItem === null || boxItem.name === draggedItem;
        }

        if (boxItem === null) {
            // Check which trade the merchant offers
            if (trade.firstInput.name === draggedItem) {
                return true;
            }

            return trade.secondInput !== null && trade.secondInput.name === draggedItem;
        }

        return boxItem.name === draggedItem;
    }

    function exchangeItems(boxes: RetailBox[], trade: Trade): void {
        let newBoxes: RetailBox[] | null = addItemToInventory(trade.firstOutput, retailBoxes);
        if (newBoxes === null) {
            return;
        }

        if (trade.secondOutput !== null) {
            newBoxes = addItemToInventory(trade.secondOutput, newBoxes);
            if (newBoxes === null) {
                return;
            }
        }

        let itemLeft: BarteringItem | null = null;
        let itemRight: BarteringItem | null = null;

        [trade.firstInput, trade.secondInput].forEach((item: BarteringItem | null) => {
            if (item !== null) {
                if (boxes[0].item !== null && boxes[0].item.name === item.name) {
                    const difference: number = boxes[0].item.amount - item.amount;
                    if (difference < 0 && boxes[1].item != null && boxes[1].item.name === item.name) {
                        const newQuantity: number = boxes[1].item.amount + difference;
                        if (newQuantity > 0) {
                            // If newQuantity === 0, let the item stay null
                            itemRight = new BarteringItem(boxes[1].item.name, newQuantity);
                        }
                    } else if (difference >= 0) {
                        if (trade.secondInput == null && boxes[1].item != null) {
                            itemRight = new BarteringItem(boxes[1].item.name, boxes[1].item.amount);
                        }

                        // If difference === 0, let the item stay null
                        if (difference > 0) {
                            itemLeft = new BarteringItem(boxes[0].item.name, difference);
                        }
                    }
                } else if (boxes[1].item != null && boxes[1].item.name === item.name) {
                    if (boxes[1].item.amount - item.amount > 0) {
                        // If difference === 0, let the item stay null
                        itemRight = new BarteringItem(boxes[1].item.name, boxes[1].item.amount - item.amount);
                    }
                }
            }
        });

        setGameHistory(
            produce((draft): void => {
                if (newBoxes) {
                    const copiedBoxes: RetailBox[] = [...newBoxes];
                    copiedBoxes[boxes[0].id] = new RetailBox(boxes[0].id, itemLeft);
                    copiedBoxes[boxes[1].id] = new RetailBox(boxes[1].id, itemRight);
                    draft[currentStep + 1] = copiedBoxes;
                }
            })
        );

        setCurrentStep(currentStep + 1);

        logBoxAssignments(gameHistory[currentStep]);
    }

    function addItemToInventory(item: BarteringItem, boxes: RetailBox[]): RetailBox[] | null {
        // Check if the item already exists in the inventory
        let inventoryIndex: number = boxes.findIndex((box: RetailBox) => 0 <= box.id && box.id <= 4 && box.item !== null && box.item.name === item.name);
        if (inventoryIndex === -1) {
            // If not, find first empty space
            inventoryIndex = boxes.findIndex((box: RetailBox) => 0 <= box.id && box.id <= 4 && box.item === null);
        }
        if (inventoryIndex === -1) {
            // No empty space left
            showWarning();
            trackAction("FULL Inventory");
            return null;
        }

        return boxes.map((box: RetailBox) => {
            if (box.id === inventoryIndex) {
                if (box.item !== null) {
                    return {
                        ...box,
                        item: new BarteringItem(box.item.name, box.item.amount + item.amount)
                    };
                }
                return {
                    ...box,
                    item: new BarteringItem(item.name, item.amount)
                };
            }
            return box;
        });
    }

    function undoLastStep(): void {
        if (currentStep >= 1 && gameHistory.length >= currentStep) {
            setCurrentStep(currentStep - 1);
        }
        trackAction("UNDO");
    }

    function loadPreviousState(): void {
        if (currentStep < gameHistory.length) {
            setCurrentStep(currentStep + 1);
        }
        trackAction("REDO");
    }

    function isGameEnd(): boolean {
        const isEnd: boolean = isSolution();
        if (isEnd) {
            endTracking();
        }
        return isEnd;
    }

    function isSolution(): boolean {
        const firstName: string = exercise.trade.firstOutput.name;
        const firstAmount: number = exercise.trade.firstOutput.amount;

        if (firstName === null || firstAmount === null) {
            console.error("Items must not be null.");
            return false;
        }

        if (exercise.trade.secondOutput !== null) {
            const secondName: string = exercise.trade.secondOutput.name;
            const secondAmount: number = exercise.trade.secondOutput.amount;

            if (secondName === null || secondAmount === null) {
                return inventoryContainsItemWithAmount(firstName, firstAmount);
            }

            if (secondName === firstName) {
                return inventoryContainsItemWithAmount(firstName, firstAmount + secondAmount);
            } else if (inventoryContainsItemWithAmount(firstName, firstAmount)) {
                return inventoryContainsItemWithAmount(secondName, secondAmount);
            }

            return false;
        } else {
            return inventoryContainsItemWithAmount(firstName, firstAmount);
        }
    }

    function inventoryContainsItemWithAmount(name: string, amount: number): boolean {
        const relevantBoxes: RetailBox[] = inventory.filter((box: RetailBox) => box.item !== null && box.item.name === name);
        let count: number = 0;
        relevantBoxes.forEach((box: RetailBox): void => {
            if (box.item != null) {
                count += box.item.amount;
            }
        });
        return count >= amount;
    }

    function showWarning(): void {
        setShowInventoryWarning(true);
        setTimeout((): void => {
            setShowInventoryWarning(false);
        }, 5000);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function logInvalidDragEnd(dragged: any, over: any): void {
        if (over === null) {
            trackAction(`DRAG ${dragged.item.name} from ${dragged.source} to NULL`);
        } else if (!over.data.current.canDrop) {
            trackError();
            trackAction(`ERROR: DRAG ${dragged.item.name} from ${dragged.source} to INVALID at ${over.data.current.target}`);
        } else {
            trackAction(`DRAG ${dragged.item.name} to target=source=${dragged.source}`);
        }
    }

    function logBoxAssignments(boxes: RetailBox[]): void {
        if (!isStudy) {
            return;
        }

        const action: string = boxes
            .filter((box: RetailBox) => box.item !== null)
            .map((box: RetailBox) => `Box ${box.id}: {item: ${box.item?.name}, amount: ${box.item?.amount}}`)
            .join(" | ");

        trackAction(action);
    }
}
