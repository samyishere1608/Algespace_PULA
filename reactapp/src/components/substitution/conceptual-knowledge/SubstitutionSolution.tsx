import { TranslationNamespaces } from "@/i18n.ts";
import { faArrowRight, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
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
import { PlainEquationItem } from "@components/substitution/conceptual-knowledge/EquationItem.tsx";
import { getImageSourceByName } from "@utils/itemImageLoader.ts";
import { displayOperator } from "@utils/utils.ts";

export function VariableSolution({ variable }: { variable: SubstitutionVariable }): ReactElement {
    const coinItem: SubstitutionItem = new SubstitutionItem(SubstitutionConstants.COIN, variable.solution, Operator.Plus, SubstitutionItemType.Coin);

    return (
        <div className={"image-equation"}>
            <div className={"image-equation__image"}>
                <img src={getImageSourceByName(variable.name)} alt={variable.name} />
            </div>
            <p className={"image-equation__operator"}>=</p>
            <PlainEquationItem item={coinItem} index={0} showOperator={false} />
        </div>
    );
}

export function PlainEquation({ items }: { items: ItemEquation }): ReactElement {
    return (
        <div className={"substitution-equation"}>
            {items.leftItems.map((item: SubstitutionItem, index: number) => {
                return <PlainEquationItem key={index} item={item} index={index} showOperator={displayOperator(index, item.operator)} />;
            })}
            <p className={"substitution-equation__operator"}>&#61;</p>
            {items.rightItems.map((item: SubstitutionItem, index: number) => {
                return <PlainEquationItem key={index} item={item} index={index} showOperator={displayOperator(index, item.operator)} />;
            })}
        </div>
    );
}

function SubstitutedTerm({ items, substitutedItems, substitutedVariable, invertOperator }: { items: SubstitutionItem[]; substitutedItems: SubstitutionItem[]; substitutedVariable: SubstitutionItem; invertOperator: boolean }): ReactElement {
    return (
        <React.Fragment>
            {items.map((item: SubstitutionItem, index: number) => {
                if (item.itemType === substitutedVariable.itemType) {
                    return (
                        <React.Fragment key={index}>
                            {substitutedItems.map((substitutedItem: SubstitutionItem, substitutedIndex: number) => {
                                let operator: Operator = substitutedItem.operator;
                                if (invertOperator && substitutedItem.operator !== null) {
                                    operator = substitutedItem.operator === Operator.Plus ? Operator.Minus : Operator.Plus;
                                }
                                return <PlainEquationItem key={substitutedIndex} item={substitutedItem} index={substitutedIndex} showOperator={index === 1 || displayOperator(substitutedIndex, operator)} invertedOperator={operator} />;
                            })}
                        </React.Fragment>
                    );
                }
                return <PlainEquationItem key={index} item={item} index={index} showOperator={displayOperator(index, item.operator)} />;
            })}
        </React.Fragment>
    );
}

function SubstitutedEquation({ substitutedItems, equationItems, substitutedVariable }: { substitutedItems: SubstitutionItem[]; equationItems: ItemEquation; substitutedVariable: SubstitutionItem }): ReactElement {
    const invertOperator: boolean = substitutedVariable.operator !== null && substitutedVariable.operator === Operator.Minus;
    return (
        <div className={"substitution-equation wrap-substituted"}>
            <SubstitutedTerm items={equationItems.leftItems} substitutedItems={substitutedItems} substitutedVariable={substitutedVariable} invertOperator={invertOperator} />
            <p className={"substitution-equation__operator"}>&#61;</p>
            <SubstitutedTerm items={equationItems.rightItems} substitutedItems={substitutedItems} substitutedVariable={substitutedVariable} invertOperator={invertOperator} />
        </div>
    );
}

export default function SubstitutionSolution({ exercise, firstItemEquation, secondItemEquation, substitutionInfo, callback }: { exercise: SubstitutionExercise; firstItemEquation: ItemEquation; secondItemEquation: ItemEquation; substitutionInfo: SubstitutionInfo; callback: () => void }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.Substitution, TranslationNamespaces.Variables]);

    const successMessage: TranslationInterpolation = SubstitutionTranslations.getSuccessMessage(substitutionInfo.itemLocation === SubstitutionLocation.FirstEquation);
    const textSecondVarQuestion: TranslationInterpolation = SubstitutionTranslations.getTextForSecondVarQuestion(exercise.secondVariable.name);

    const [showSolution, setShowSolution] = useState<boolean>(false);

    return (
        <React.Fragment>
            <p>
                <Trans ns={[TranslationNamespaces.Substitution, TranslationNamespaces.Variables]} i18nKey={successMessage.translationKey} values={successMessage.interpolationVariables as object} />
            </p>
            <PlainEquation items={firstItemEquation} />
            <PlainEquation items={secondItemEquation} />
            <p>{t(SubstitutionTranslations.FIRST_SUBSTITUTION_EQUIV, { ns: TranslationNamespaces.Substitution })}</p>
            <SubstitutedEquation substitutedItems={substitutionInfo.substitutionItems} equationItems={exercise.firstEquation.isIsolated ? secondItemEquation : firstItemEquation} substitutedVariable={substitutionInfo.selectedItem as SubstitutionItem} />
            <p>
                <Trans ns={TranslationNamespaces.Substitution} i18nKey={textSecondVarQuestion.translationKey} values={textSecondVarQuestion.interpolationVariables as object} />
            </p>
            {showSolution && <VariableSolution variable={exercise.secondVariable} />}
            {!showSolution && (
                <button className={"button primary-button"} onClick={handleClick}>
                    {t(GeneralTranslations.BUTTON_SHOW, { ns: TranslationNamespaces.General })}
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                </button>
            )}
            {showSolution && (
                <button className={"button primary-button"} onClick={handleClick}>
                    {t(GeneralTranslations.BUTTON_CONTINUE, { ns: TranslationNamespaces.General })}
                    <FontAwesomeIcon icon={faArrowRight} />
                </button>
            )}
        </React.Fragment>
    );

    function handleClick(): void {
        if (showSolution) {
            callback();
        } else {
            setShowSolution(true);
        }
    }
}

export function SystemSolution({ exercise, firstItemEquation, secondItemEquation, handleEnd }: { exercise: SubstitutionExercise; firstItemEquation: ItemEquation; secondItemEquation: ItemEquation; handleEnd: () => void }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.Substitution]);

    return (
        <React.Fragment>
            <p>{t(SubstitutionTranslations.SYSTEM_SOL_1, { ns: TranslationNamespaces.Substitution })}</p>
            <PlainEquation items={firstItemEquation} />
            <PlainEquation items={secondItemEquation} />
            <p>{t(SubstitutionTranslations.SYSTEM_SOL_2, { ns: TranslationNamespaces.Substitution })}</p>
            <div className={"substitution__solution"}>
                <VariableSolution variable={exercise.isolatedVariable} />
                <VariableSolution variable={exercise.secondVariable} />
            </div>
            <p>{t(SubstitutionTranslations.NEXT_EXERCISE, { ns: TranslationNamespaces.Substitution })}</p>
            <button className={"button primary-button"} onClick={handleEnd}>
                {t(GeneralTranslations.BUTTON_CONTINUE, { ns: TranslationNamespaces.General })}
                <FontAwesomeIcon icon={faArrowRight} />
            </button>
        </React.Fragment>
    );
}
