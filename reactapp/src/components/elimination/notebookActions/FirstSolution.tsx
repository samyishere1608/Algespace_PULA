import { TranslationNamespaces } from "@/i18n.js";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement } from "react";
import { Trans, useTranslation } from "react-i18next";
import { EliminationConstants } from "@/types/elimination/eliminationConstants.js";
import { EliminationExercise } from "@/types/elimination/eliminationExercise.ts";
import { EliminationTranslations } from "@/types/elimination/eliminationTranslations.js";
import { NotebookState } from "@/types/elimination/enums.ts";
import { Row } from "@/types/elimination/row.ts";
import { math } from "@/types/math/math.js";
import { GeneralTranslations } from "@/types/shared/generalTranslations.js";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.js";
import { TermFromRow } from "@components/elimination/notebookActions/EquationFromRow.js";

export default function FirstSolution({ exercise, rows, selectedRows, showFractions, setNotebookState }: { exercise: EliminationExercise; rows: Row[]; selectedRows: number[]; showFractions: boolean; setNotebookState: (value: React.SetStateAction<NotebookState>) => void }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.Elimination]);

    const isZero: boolean = math.isZero(rows[selectedRows[0]].first);

    const textFirstSolution: TranslationInterpolation = EliminationTranslations.getTextForFirstSolution(isZero ? exercise.secondVariable.name : exercise.firstVariable.name);

    return (
        <React.Fragment>
            <p>
                <Trans ns={[TranslationNamespaces.Elimination, TranslationNamespaces.Variables]} i18nKey={textFirstSolution.translationKey} values={textFirstSolution.interpolationVariables as object} />
            </p>
            <div className={"action__equation-solution"}>
                {isZero ? <TermFromRow variable={exercise.secondVariable.name} coefficient={rows[selectedRows[0]].second} showFractions={showFractions} displayOperator={false} /> : <TermFromRow variable={exercise.firstVariable.name} coefficient={rows[selectedRows[0]].first} showFractions={showFractions} displayOperator={false} />}
                <p>&#61;</p>
                <TermFromRow variable={EliminationConstants.BILL} coefficient={rows[selectedRows[0]].costs} showFractions={showFractions} displayOperator={false} />
            </div>
            <button className={"button primary-button"} style={{ marginTop: "1rem" }} onClick={() => setNotebookState(NotebookState.EquationSelection)}>
                {t(GeneralTranslations.BUTTON_CONTINUE, { ns: TranslationNamespaces.General })}
                <FontAwesomeIcon icon={faArrowRight} />
            </button>
        </React.Fragment>
    );
}
