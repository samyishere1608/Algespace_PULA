import { TranslationNamespaces } from "@/i18n.ts";
import { faBan, faCalculator } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement, useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { EliminationExercise } from "@/types/elimination/eliminationExercise.ts";
import { EliminationTranslations } from "@/types/elimination/eliminationTranslations.ts";
import { Row } from "@/types/elimination/row.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import EquationFromRow from "@components/elimination/notebookActions/EquationFromRow.tsx";

export default function ConfirmAddition({ exercise, rows, selectedRows, text, showFractions, cancelAction, addRows }: { exercise: EliminationExercise; rows: Row[]; selectedRows: number[]; text: TranslationInterpolation; showFractions: boolean; cancelAction: () => void; addRows: () => void }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.Elimination]);

    const divRef = useRef(null);
    const [divWidth, setDivWidth] = useState(0);

    useEffect(() => {
        updateWidth();
        window.addEventListener("resize", updateWidth);
        return () => window.removeEventListener("resize", updateWidth);
    }, []);

    return (
        <React.Fragment>
            <p>
                <Trans ns={TranslationNamespaces.Elimination} i18nKey={text.translationKey} values={text.interpolationVariables as object} />
            </p>
            <div className={"action__equations-plus-buttons"}>
                <div className={"action__equations"}>
                    <EquationFromRow exercise={exercise} row={rows[selectedRows[0]]} showFractions={showFractions} />
                    <EquationFromRow exercise={exercise} row={rows[selectedRows[1]]} addition={true} showFractions={showFractions} />
                </div>
                <div className={"action__equation-addition-buttons"} ref={divRef}>
                    <button className={"button notebook-button"} onClick={() => cancelAction()}>
                        <FontAwesomeIcon icon={faBan} />
                        {divWidth >= 8 && t(GeneralTranslations.BUTTON_CANCEL, { ns: TranslationNamespaces.General })}
                    </button>
                    <button className={"button notebook-button"} onClick={() => addRows()}>
                        <FontAwesomeIcon icon={faCalculator} />
                        {divWidth >= 8 && t(GeneralTranslations.BUTTON_APPLY, { ns: TranslationNamespaces.General })}
                    </button>
                </div>
            </div>
        </React.Fragment>
    );

    function updateWidth(): void {
        if (divRef.current) {
            const width: number = divRef.current["offsetWidth"];
            const widthInRem: number = width / parseFloat(getComputedStyle(document.documentElement).fontSize);
            setDivWidth(widthInRem);
        }
    }
}

export function AddSubError({ text, cancelAction }: { text: TranslationInterpolation; cancelAction: () => void }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.Elimination]);

    return (
        <React.Fragment>
            <p>
                <Trans ns={TranslationNamespaces.Elimination} i18nKey={text.translationKey} values={text.interpolationVariables as object} />
            </p>
            <p className={"notebook__input-feedback"}>{t(EliminationTranslations.INPUT_RANGE_ERROR, { ns: TranslationNamespaces.Elimination })}</p>
            <button className={"button notebook-button"} onClick={() => cancelAction()}>
                <FontAwesomeIcon icon={faBan} />
                {t(GeneralTranslations.BUTTON_CANCEL, { ns: TranslationNamespaces.General })}
            </button>
        </React.Fragment>
    );
}
