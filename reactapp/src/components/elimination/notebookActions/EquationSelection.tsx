import { TranslationNamespaces } from "@/i18n.ts";
import React, { ReactElement } from "react";
import { Trans, useTranslation } from "react-i18next";
import { EliminationConstants } from "@/types/elimination/eliminationConstants.ts";
import { EliminationExercise } from "@/types/elimination/eliminationExercise.ts";
import { EliminationTranslations } from "@/types/elimination/eliminationTranslations.ts";
import { EliminationVariable } from "@/types/elimination/eliminationVariable.ts";
import { NotebookState, OptimalEquation } from "@/types/elimination/enums.ts";
import { Row } from "@/types/elimination/row.ts";
import { math } from "@/types/math/math.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { EliminationChoice } from "@/types/studies/enums.ts";
import { TermFromRow } from "@components/elimination/notebookActions/EquationFromRow.tsx";
import ImageEquation from "@components/math/conceptual-knowledge/ImageEquation.tsx";

export default function EquationSelection({
    exercise,
    rows,
    selectedRows,
    showFractions,
    setNotebookState,
    trackChoice,
    setFirstEquationSelected
}: {
    exercise: EliminationExercise;
    rows: Row[];
    selectedRows: number[];
    showFractions: boolean;
    setNotebookState: (value: React.SetStateAction<NotebookState>) => void;
    trackChoice: (choice: EliminationChoice) => void;
    setFirstEquationSelected: (value: React.SetStateAction<boolean>) => void;
}): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.Elimination]);

    const firstIsZero: boolean = math.isZero(rows[selectedRows[0]].first);

    const textFirstSolutionValue: TranslationInterpolation = EliminationTranslations.getTextForFirstSolutionValue(firstIsZero ? exercise.secondVariable.name : exercise.firstVariable.name);
    const textSystemSelection: TranslationInterpolation = EliminationTranslations.getTextForSystemSelection(!firstIsZero ? exercise.secondVariable.name : exercise.firstVariable.name);

    return (
        <div className={"notebook__page"}>
            <p>
                <Trans ns={[TranslationNamespaces.Elimination, TranslationNamespaces.Variables]} i18nKey={textFirstSolutionValue.translationKey} values={textFirstSolutionValue.interpolationVariables as object} />
            </p>
            <div className={"action__equation-solution"}>
                {firstIsZero ? <TermFromRow variable={exercise.secondVariable.name} coefficient={rows[selectedRows[0]].second} showFractions={showFractions} displayOperator={false} /> : <TermFromRow variable={exercise.firstVariable.name} coefficient={rows[selectedRows[0]].first} showFractions={showFractions} displayOperator={false} />}
                <p>&#61;</p>
                <TermFromRow coefficient={rows[selectedRows[0]].costs} variable={EliminationConstants.BILL} displayOperator={false} showFractions={showFractions} />
            </div>
            <p>
                <Trans ns={[TranslationNamespaces.Elimination, TranslationNamespaces.Variables]} i18nKey={textSystemSelection.translationKey} values={textSystemSelection.interpolationVariables as object} />
            </p>
            <div className={"action__system-equation"}>
                <p style={{ color: "var(--secondary-orange)" }}>1.</p>
                <ImageEquation equation={exercise.firstEquation} style={{ color: "var(--dark-text)" }} />
            </div>
            <div className={"action__system-equation"}>
                <p style={{ color: "var(--secondary-orange)" }}>2.</p>
                <ImageEquation equation={exercise.secondEquation} style={{ color: "var(--dark-text)" }} />
            </div>
            <p> {t(EliminationTranslations.SYSTEM_SEL, { ns: TranslationNamespaces.Elimination })}</p>
            <div className={"action__buttons"}>
                <button className={"button notebook-button"} onClick={() => handleClick(true)}>
                    {t(GeneralTranslations.EQUATION1, { ns: TranslationNamespaces.General })}
                </button>
                <button className={"button notebook-button"} onClick={() => handleClick(false)}>
                    {t(GeneralTranslations.EQUATION2, { ns: TranslationNamespaces.General })}
                </button>
            </div>
        </div>
    );

    function handleClick(selectedFirstEquation: boolean): void {
        setFirstEquationSelected(selectedFirstEquation);
        if (firstIsZero) {
            evaluateSelection(exercise.secondVariable, selectedFirstEquation);
        } else {
            evaluateSelection(exercise.firstVariable, selectedFirstEquation);
        }
    }

    function evaluateSelection(variable: EliminationVariable, selectedFirstEquation: boolean): void {
        switch (variable.optimalEquation) {
            case OptimalEquation.First: {
                if (selectedFirstEquation) {
                    trackChoice(EliminationChoice.Good);
                    setNotebookState(NotebookState.GoodChoice);
                } else {
                    trackChoice(EliminationChoice.Bad);
                    setNotebookState(NotebookState.BadChoice);
                }
                break;
            }
            case OptimalEquation.Both: {
                trackChoice(EliminationChoice.Neutral);
                setNotebookState(NotebookState.NeutralChoice);
                break;
            }
            case OptimalEquation.Second: {
                if (selectedFirstEquation) {
                    trackChoice(EliminationChoice.Bad);
                    setNotebookState(NotebookState.BadChoice);
                } else {
                    trackChoice(EliminationChoice.Good);
                    setNotebookState(NotebookState.GoodChoice);
                }
                break;
            }
        }
    }
}
