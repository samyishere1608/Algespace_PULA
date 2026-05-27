import { Language, TranslationNamespaces, getCurrentLanguage } from "@/i18n.ts";
import { faBan, faCalculator, faRotate } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement, useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { EliminationExercise } from "@/types/elimination/eliminationExercise.ts";
import { EliminationTranslations } from "@/types/elimination/eliminationTranslations.ts";
import { Row } from "@/types/elimination/row.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import EquationFromRow from "@components/elimination/notebookActions/EquationFromRow.tsx";

export default function ConfirmSubtraction({ exercise, rows, selectedRows, text, showFractions, cancelAction, switchSequence, subtractRows }: { exercise: EliminationExercise; rows: Row[]; selectedRows: number[]; text: TranslationInterpolation; showFractions: boolean; cancelAction: () => void; switchSequence: () => void; subtractRows: () => void }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Elimination);

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
                    <EquationFromRow exercise={exercise} row={rows[selectedRows[1]]} addition={false} showFractions={showFractions} />
                </div>
                <div className={"action__equation-substitution-buttons"} ref={divRef}>
                    {divWidth >= 8 ? (
                        <React.Fragment>
                            <button className={"button notebook-button"} onClick={() => switchSequence()}>
                                <FontAwesomeIcon icon={faRotate} />
                                {t(EliminationTranslations.BUTTON_SWITCH_ROWS)}
                            </button>
                            <div className={"action__equation-substitution-buttons-lower"} style={{ gap: getCurrentLanguage() === Language.DE ? "2rem" : "0.5rem" }}>
                                <button className={"button notebook-button"} onClick={() => cancelAction()}>
                                    <FontAwesomeIcon icon={faBan} />
                                </button>
                                <button className={"button notebook-button"} onClick={() => subtractRows()}>
                                    <FontAwesomeIcon icon={faCalculator} />
                                </button>
                            </div>
                        </React.Fragment>
                    ) : (
                        <React.Fragment>
                            <button className={"button notebook-button"} onClick={() => switchSequence()}>
                                <FontAwesomeIcon icon={faRotate} />
                            </button>
                            <button className={"button notebook-button"} onClick={() => cancelAction()}>
                                <FontAwesomeIcon icon={faBan} />
                            </button>
                            <button className={"button notebook-button"} onClick={() => subtractRows()}>
                                <FontAwesomeIcon icon={faCalculator} />
                            </button>
                        </React.Fragment>
                    )}
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
