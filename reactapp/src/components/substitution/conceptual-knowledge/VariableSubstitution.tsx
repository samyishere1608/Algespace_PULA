import { TranslationNamespaces } from "@/i18n.ts";
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { faCheck } from "@fortawesome/free-solid-svg-icons/faCheck";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement, ReactNode, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Popover } from "react-tiny-popover";
import { Operator } from "@/types/math/enums.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { SubstitutionItem } from "@/types/shared/item.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { SubstitutionItemType, SubstitutionLocation } from "@/types/substitution/conceptual-knowledge/enums.ts";
import { ItemEquation } from "@/types/substitution/conceptual-knowledge/itemEquation.ts";
import { SubstitutionConstants } from "@/types/substitution/conceptual-knowledge/substitutionConstants.ts";
import { SubstitutionExercise } from "@/types/substitution/conceptual-knowledge/substitutionExercise.ts";
import { SubstitutionInfo } from "@/types/substitution/conceptual-knowledge/substitutionInfo.ts";
import { SubstitutionVariable } from "@/types/substitution/conceptual-knowledge/substitutionVariable.ts";
import { SubstitutionTranslations } from "@/types/substitution/substitutionTranslations.ts";
import DropzoneEquation from "@components/substitution/conceptual-knowledge/DropzoneEquation.tsx";
import { DraggableEquationItem, PlainEquationItem } from "@components/substitution/conceptual-knowledge/EquationItem.tsx";
import { PlainEquation } from "@components/substitution/conceptual-knowledge/SubstitutionSolution.tsx";
import { getImageSourceByName } from "@utils/itemImageLoader.ts";
import { displayFeedBack, displayOperator } from "@utils/utils.ts";
import Arrow from "@images/substitution/arrow.png";

export function DraggableCoinItem({ variable }: { variable: SubstitutionVariable }): ReactElement {
    const coinItem: SubstitutionItem = new SubstitutionItem(SubstitutionConstants.COIN, variable.solution, Operator.Plus, SubstitutionItemType.Coin);

    return (
        <div className={"image-equation"}>
            <div className={"image-equation__image"}>
                <img src={getImageSourceByName(variable.name)} alt={variable.name} />
            </div>
            <p className={"image-equation__operator"}>&#61;</p>
            <DraggableEquationItem item={coinItem} index={0} inDropzone={false} showOperator={false} />
        </div>
    );
}

function DraggableEquation({ items }: { items: ItemEquation }): ReactElement {
    return (
        <div className={"substitution-equation"}>
            {items.leftItems.map((item: SubstitutionItem, index: number) => {
                return <DraggableEquationItem key={index} item={item} index={index} showOperator={displayOperator(index, item.operator)} inDropzone={false} />;
            })}
            <p className={"substitution-equation__operator"}>&#61;</p>
            {items.rightItems.map((item: SubstitutionItem, index: number) => {
                return <DraggableEquationItem key={index} item={item} index={index} showOperator={displayOperator(index, item.operator)} inDropzone={false} />;
            })}
        </div>
    );
}

function DroppableEquation({ substitutedItem, items, insertedItems }: { substitutedItem: SubstitutionItem; items: ItemEquation; insertedItems: SubstitutionItem[] }): ReactElement {
    const [isLeft, isFirst] = useMemo(() => {
        let index: number = items.leftItems.findIndex((item: SubstitutionItem): boolean => item.itemType === substitutedItem.itemType);
        if (index !== -1) {
            return [true, index === 0];
        }
        index = items.rightItems.findIndex((item: SubstitutionItem): boolean => item.itemType === substitutedItem.itemType);
        return [false, index === 0];
    }, [substitutedItem, items]);

    const children: ReactElement = (
        <div className={`substitution-equation ${(isLeft && isFirst) || (!isLeft && !isFirst) || insertedItems.length === 0 ? "" : "popover-top"}`}>
            {items.leftItems.map((item: SubstitutionItem, index: number) => {
                if (item.itemType === substitutedItem.itemType) {
                    return <DropzoneEquation key={index} placeholder={item} items={insertedItems} showOperator={displayOperator(index, item.operator)} />;
                }
                return <PlainEquationItem key={index} item={item} index={index} showOperator={displayOperator(index, item.operator)} />;
            })}
            <p className={"substitution-equation__operator"}>&#61;</p>
            {items.rightItems.map((item: SubstitutionItem, index: number) => {
                if (item.itemType === substitutedItem.itemType) {
                    return <DropzoneEquation key={index} placeholder={item} items={insertedItems} showOperator={displayOperator(index, item.operator)} />;
                }
                return <PlainEquationItem key={index} item={item} index={index} showOperator={displayOperator(index, item.operator)} />;
            })}
        </div>
    );

    if (insertedItems.length === 0) {
        return children;
    } else {
        return <SubstitutedItemPopover item={substitutedItem} children={children} isLeft={isLeft} isFirst={isFirst} />;
    }
}

function SubstitutedItemPopover({ item, children, isLeft, isFirst }: { item: SubstitutionItem; children: ReactElement; isLeft: boolean; isFirst: boolean }): ReactElement {
    return (
        <Popover
            containerStyle={{ zIndex: "200" }}
            isOpen={true}
            positions={[isLeft ? (isFirst ? "left" : "top") : isFirst ? "top" : "right"]}
            padding={0}
            align={isLeft || !isFirst ? "start" : "end"}
            transform={{ top: 0, left: 0 }}
            transformMode={"relative"}
            clickOutsideCapture={false}
            content={
                <div className={`substituted-item-popover__container ${!isLeft ? " reverse" : ""}`}>
                    <div className={"substituted-item-popover__item"}>
                        <p>
                            {item.amount}
                            <span>&#215;</span>
                        </p>
                        <img src={getImageSourceByName(item.name)} alt={item.name} />
                    </div>
                    <img className={`substituted-popover-item__arrow ${!isLeft ? "reverse" : ""}`} src={Arrow} alt={"arrow"} />
                </div>
            }
        >
            {children}
        </Popover>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleDragEnd(event: any, insertedItems: SubstitutionItem[], setInsertedItems: (value: React.SetStateAction<SubstitutionItem[]>) => void, invertOperator: boolean, maxCapacityCallback: () => void, trackAction: (action: string) => void): void {
    const { over, active } = event;

    if (over === null) {
        if (active.data.current.source) {
            setInsertedItems([...insertedItems.slice(0, active.data.current.index), ...insertedItems.slice(active.data.current.index + 1)]);
            trackAction(`DRAG ${active.data.current.item.name} OUT`);
        } else {
            trackAction(`DRAG ${active.data.current.item.name} IN`);
            return;
        }
    }

    if (active.data.current.source) {
        trackAction(`DRAG ${active.data.current.item.name} IN-OUT`);
        return;
    }

    if (insertedItems.length >= SubstitutionConstants.MAX_SUBSTITUTION_ITEMS) {
        trackAction(`DRAG ${active.data.current.item.name} no CAPACITY`);
        maxCapacityCallback();
        return;
    }

    const draggedItem: SubstitutionItem = new SubstitutionItem(active.data.current.item.name, active.data.current.item.amount, active.data.current.item.operator, active.data.current.item.itemType);
    if (invertOperator) {
        draggedItem.operator = draggedItem.operator === Operator.Plus ? Operator.Minus : Operator.Plus;
    }
    setInsertedItems([...insertedItems, draggedItem]);
    trackAction(`DRAG ${active.data.current.item.name} OUT-IN`);
}

export default function VariableSubstitution({
    exercise,
    substitutionInfo,
    firstItemEquation,
    secondItemEquation,
    invertOperator,
    callback,
    trackAction,
    trackError
}: {
    exercise: SubstitutionExercise;
    substitutionInfo: SubstitutionInfo;
    firstItemEquation: ItemEquation;
    secondItemEquation: ItemEquation;
    invertOperator: boolean;
    callback: (items: SubstitutionItem[]) => void;
    trackAction: (action: string) => void;
    trackError: () => void;
}): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.Substitution, TranslationNamespaces.Variables]);
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

    const textForSubstitutionGoal: TranslationInterpolation = SubstitutionTranslations.getTextForSubstitutionGoal(exercise.isolatedVariable.name, exercise.secondVariable.name);
    const instrForFirstSubstitution: TranslationInterpolation = SubstitutionTranslations.getInstructionForFirstSubstitution(exercise.isolatedVariable.name);
    const errorIsolatedVar: TranslationInterpolation = SubstitutionTranslations.getErrorForIsolatedSubstitution(exercise.isolatedVariable.name);
    const errorInvalidSubstitution: TranslationInterpolation = SubstitutionTranslations.getErrorForInvalidSubstitution(exercise.isolatedVariable.name);

    const [insertedItems, setInsertedItems] = useState<SubstitutionItem[]>([]);
    const [feedback, setFeedback] = useState<[boolean, string | ReactNode]>([false, ""]);

    return (
        <React.Fragment>
            <DndContext
                sensors={sensors}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onDragEnd={(event: any) => handleDragEnd(event, insertedItems, setInsertedItems, invertOperator, displayMaxCapacityWarning, trackAction)}
                modifiers={[snapCenterToCursor]}
            >
                <p>
                    <Trans ns={TranslationNamespaces.Substitution} i18nKey={textForSubstitutionGoal.translationKey} values={textForSubstitutionGoal.interpolationVariables as object} />
                </p>
                <p>
                    <Trans ns={TranslationNamespaces.Substitution} i18nKey={instrForFirstSubstitution.translationKey} values={instrForFirstSubstitution.interpolationVariables as object} />
                </p>
                {determineEquationComponent(firstItemEquation, SubstitutionLocation.FirstEquation)}
                {determineEquationComponent(secondItemEquation, SubstitutionLocation.SecondEquation)}
            </DndContext>
            {feedback[0] && (
                <div className={"substitution__feedback"}>
                    <p> {feedback[1]}</p>
                </div>
            )}
            <button className={"button primary-button"} onClick={verifySolution}>
                {t(GeneralTranslations.BUTTON_VERIFY, { ns: TranslationNamespaces.General })}
                <FontAwesomeIcon icon={faCheck} />
            </button>
        </React.Fragment>
    );

    function determineEquationComponent(equationItems: ItemEquation, location: SubstitutionLocation): ReactElement | null {
        if (location === substitutionInfo.itemLocation) {
            return <DroppableEquation items={equationItems} substitutedItem={substitutionInfo.selectedItem as SubstitutionItem} insertedItems={insertedItems} />;
        }

        return <DraggableEquation items={equationItems} />;
    }

    function displayMaxCapacityWarning(): void {
        displayFeedBack(setFeedback, t(SubstitutionTranslations.SUBSTITUTION_ERR_MAX_CAPACITY, { ns: TranslationNamespaces.Substitution }));
    }

    function verifySolution(): void {
        if (insertedItems.length === 0) {
            displayFeedBack(setFeedback, t(SubstitutionTranslations.SUBSTITUTION_ERR_EMPTY, { ns: TranslationNamespaces.Substitution }));
            trackError();
            trackAction("ERROR: SUBSTITUTION is EMPTY");
            return;
        }

        let secondVar: number = 0;
        let coins: number = 0;
        for (let i: number = 0; i < insertedItems.length; i++) {
            const item: SubstitutionItem = insertedItems[i];
            switch (item.itemType) {
                case SubstitutionItemType.IsolatedVariable: {
                    displayFeedBack(setFeedback, <Trans ns={[TranslationNamespaces.Substitution, TranslationNamespaces.Variables]} i18nKey={errorIsolatedVar.translationKey} values={errorIsolatedVar.interpolationVariables as object} />);
                    trackError();
                    trackAction("ERROR: SUBSTITUTION contains ISOLATED");
                    return;
                }
                case SubstitutionItemType.SecondVariable: {
                    secondVar += item.evaluateItem();
                    break;
                }
                case SubstitutionItemType.Coin: {
                    coins += item.evaluateItem();
                    break;
                }
            }
        }

        let requiredSecondVar: number;
        let requiredCoins: number;
        if (substitutionInfo.itemLocation === SubstitutionLocation.SecondEquation) {
            [requiredSecondVar, requiredCoins] = getRequiredAmounts(firstItemEquation);
        } else {
            [requiredSecondVar, requiredCoins] = getRequiredAmounts(secondItemEquation);
        }

        if (secondVar === requiredSecondVar && coins === requiredCoins) {
            trackAction("SUBSTITUTION SOLUTION");
            callback(insertedItems);
        } else {
            displayFeedBack(setFeedback, <Trans ns={TranslationNamespaces.Substitution} i18nKey={errorInvalidSubstitution.translationKey} values={errorInvalidSubstitution.interpolationVariables as object} />);
            trackError();
            trackAction("ERROR: SUBSTITUTION is INVALID");
        }
    }

    function getRequiredAmounts(items: ItemEquation): [number, number] {
        let secondVar: number = 0;
        let coins: number = 0;
        let firstVar: number = 1;

        [...items.leftItems, ...items.rightItems].forEach((item: SubstitutionItem): void => {
            switch (item.itemType) {
                case SubstitutionItemType.IsolatedVariable: {
                    firstVar = item.evaluateItem();
                    break;
                }
                case SubstitutionItemType.SecondVariable: {
                    secondVar += item.evaluateItem();
                    break;
                }
                case SubstitutionItemType.Coin: {
                    coins += item.evaluateItem();
                    break;
                }
            }
        });

        const multiplicationFactor: number = (substitutionInfo.selectedItem as SubstitutionItem).amount / firstVar;
        return [multiplicationFactor * secondVar, multiplicationFactor * coins];
    }
}

export function SecondVariableSubstitution({ exercise, firstItemEquation, secondItemEquation, substitutionInfo, callback, trackAction, trackError }: { exercise: SubstitutionExercise; firstItemEquation: ItemEquation; secondItemEquation: ItemEquation; substitutionInfo: SubstitutionInfo; callback: () => void; trackAction: (action: string) => void; trackError: () => void }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.Substitution, TranslationNamespaces.Variables]);
    const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor));

    const errorInvalidSubstitution: TranslationInterpolation = SubstitutionTranslations.getErrorForInvalidSubstitution(exercise.secondVariable.name);
    const textSecondVarValue: TranslationInterpolation = SubstitutionTranslations.getTextForSecondVarValue(exercise.secondVariable.name);

    const [insertedItems, setInsertedItems] = useState<SubstitutionItem[]>([]);
    const [feedback, setFeedback] = useState<[boolean, string | ReactNode]>([false, ""]);

    return (
        <React.Fragment>
            <DndContext
                sensors={sensors}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onDragEnd={(event: any) => handleDragEnd(event, insertedItems, setInsertedItems, false, displayMaxCapacityWarning, trackAction)}
                modifiers={[snapCenterToCursor]}
            >
                <p>
                    <Trans ns={TranslationNamespaces.Substitution} i18nKey={textSecondVarValue.translationKey} values={textSecondVarValue.interpolationVariables as object} />
                </p>
                <DraggableCoinItem variable={exercise.secondVariable} />
                <p>{t(SubstitutionTranslations.COIN_SUBSTITUTION, { ns: TranslationNamespaces.Substitution })}</p>
                {determineEquationComponent(firstItemEquation, SubstitutionLocation.FirstEquation)}
                {determineEquationComponent(secondItemEquation, SubstitutionLocation.SecondEquation)}
            </DndContext>
            {feedback[0] && (
                <div className={"substitution__feedback"}>
                    <p> {feedback[1]}</p>
                </div>
            )}
            <button className={"button primary-button"} onClick={verifySolution}>
                {t(GeneralTranslations.BUTTON_VERIFY, { ns: TranslationNamespaces.General })}
                <FontAwesomeIcon icon={faCheck} />
            </button>
        </React.Fragment>
    );

    function determineEquationComponent(equationItems: ItemEquation, location: SubstitutionLocation): ReactElement | null {
        if (location === substitutionInfo.itemLocation) {
            return <DroppableEquation items={equationItems} substitutedItem={substitutionInfo.selectedItem as SubstitutionItem} insertedItems={insertedItems} />;
        }

        return <PlainEquation items={equationItems} />;
    }

    function displayMaxCapacityWarning(): void {
        displayFeedBack(setFeedback, t(SubstitutionTranslations.SUBSTITUTION_ERR_MAX_CAPACITY, { ns: TranslationNamespaces.Substitution }));
    }

    function verifySolution(): void {
        if (insertedItems.length === 0) {
            displayFeedBack(setFeedback, t(SubstitutionTranslations.SUBSTITUTION_ERR_EMPTY, { ns: TranslationNamespaces.Substitution }));
            trackError();
            trackAction("ERROR: SUBSTITUTION is EMPTY");
            return;
        }

        if (insertedItems.length === (substitutionInfo.selectedItem as SubstitutionItem).amount) {
            trackAction("SUBSTITUTION SOLUTION");
            callback();
        } else {
            displayFeedBack(setFeedback, <Trans ns={TranslationNamespaces.Substitution} i18nKey={errorInvalidSubstitution.translationKey} values={errorInvalidSubstitution.interpolationVariables as object} />);
            trackError();
            trackAction("ERROR: SUBSTITUTION is INVALID");
        }
    }
}
