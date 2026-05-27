import { TranslationNamespaces } from "@/i18n.ts";
import React, { ReactElement, ReactNode, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { SubstitutionItem } from "@/types/shared/item.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { SubstitutionItemType, SubstitutionLocation } from "@/types/substitution/conceptual-knowledge/enums.ts";
import { ItemEquation } from "@/types/substitution/conceptual-knowledge/itemEquation.ts";
import { SubstitutionExercise } from "@/types/substitution/conceptual-knowledge/substitutionExercise.ts";
import { SubstitutionTranslations } from "@/types/substitution/substitutionTranslations.ts";
import { SelectableEquationItem } from "@components/substitution/conceptual-knowledge/EquationItem.tsx";
import { displayFeedBack, displayOperator } from "@utils/utils.ts";

function SelectableEquation({ location, items, containsSelectableItem, selectableItemType, handleClick }: { location: SubstitutionLocation; items: ItemEquation; containsSelectableItem: boolean; selectableItemType: SubstitutionItemType; handleClick: (isValid: boolean, selectedItem: SubstitutionItem, location: SubstitutionLocation) => void }): ReactElement {
    return (
        <React.Fragment>
            <div className={"substitution-equation"}>
                {items.leftItems.map((item: SubstitutionItem, index: number) => {
                    return <SelectableEquationItem key={index} location={location} item={item} showOperator={displayOperator(index, item.operator)} index={index} isSolution={isSolution} handleClick={handleClick} />;
                })}
                <p className={"substitution-equation__operator"}>&#61;</p>
                {items.rightItems.map((item: SubstitutionItem, index: number) => {
                    return <SelectableEquationItem key={index} location={location} item={item} showOperator={displayOperator(index, item.operator)} index={index} isSolution={isSolution} handleClick={handleClick} />;
                })}
            </div>
        </React.Fragment>
    );

    function isSolution(item: SubstitutionItem): boolean {
        if (!containsSelectableItem) {
            return false;
        }
        return item.itemType === selectableItemType;
    }
}

export default function VariableSelection({
    exercise,
    firstItemEquation,
    selectableIsInFirstEquation,
    secondItemEquation,
    selectableIsInSecondEquation,
    selectableItemType,
    callback,
    children,
    trackAction,
    trackError
}: {
    exercise: SubstitutionExercise;
    firstItemEquation: ItemEquation;
    selectableIsInFirstEquation: boolean;
    secondItemEquation: ItemEquation;
    selectableIsInSecondEquation: boolean;
    selectableItemType: SubstitutionItemType;
    callback: (location: SubstitutionLocation, selectedItem: SubstitutionItem) => void;
    children: ReactNode;
    trackAction: (action: string) => void;
    trackError: () => void;
}): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.Substitution, TranslationNamespaces.Variables]);

    const errorSelectionIsolatedVar: TranslationInterpolation = SubstitutionTranslations.getErrorForSelectionIsolatedVar(exercise.isolatedVariable.name, exercise.secondVariable.name);

    const [feedback, setFeedback] = useState<[boolean, string | ReactNode]>([false, ""]);

    return (
        <React.Fragment>
            {children}
            <SelectableEquation location={SubstitutionLocation.FirstEquation} items={firstItemEquation} containsSelectableItem={selectableIsInFirstEquation} selectableItemType={selectableItemType} handleClick={validateSelection} />
            <SelectableEquation location={SubstitutionLocation.SecondEquation} items={secondItemEquation} containsSelectableItem={selectableIsInSecondEquation} selectableItemType={selectableItemType} handleClick={validateSelection} />
            {feedback[0] && (
                <div className={"substitution__feedback"}>
                    <p> {feedback[1]}</p>
                </div>
            )}
        </React.Fragment>
    );

    function validateSelection(isValid: boolean, selectedItem: SubstitutionItem, location: SubstitutionLocation): void {
        if (!isValid) {
            trackError();
            if (selectedItem.itemType === selectableItemType) {
                displayFeedBack(setFeedback, <Trans ns={[TranslationNamespaces.Substitution, TranslationNamespaces.Variables]} i18nKey={errorSelectionIsolatedVar.translationKey} values={errorSelectionIsolatedVar.interpolationVariables as object} />);
                trackAction(`ERROR: SELECTED WRONG ${selectedItem.name}`);
            } else if (selectedItem.itemType === SubstitutionItemType.Coin) {
                displayFeedBack(setFeedback, t(SubstitutionTranslations.VAR_SELECTION_ERR_COIN));
                trackAction("ERROR: SELECTED COIN");
            } else {
                displayFeedBack(setFeedback, t(SubstitutionTranslations.VAR_SELECTION_ERR_SECOND));
                trackAction(`ERROR: SELECTED INVALID ${selectedItem.name}`);
            }
        } else {
            trackAction(`SELECTED SOLUTION in ${location === SubstitutionLocation.FirstEquation ? "first" : "second"} equation`);
            callback(location, selectedItem);
        }
    }
}
