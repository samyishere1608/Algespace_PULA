import { TranslationNamespaces } from "@/i18n.ts";
import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { EliminationTranslations } from "@/types/elimination/eliminationTranslations.ts";

export default function InitialAction({ addOrSubRows }: { addOrSubRows(onAdd: boolean): void }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Elimination);

    return (
        <React.Fragment>
            <p>{t(EliminationTranslations.INSTR_ADD_OR_SUB)}</p>
            <div className={"action__buttons"}>
                <button className={"button notebook-button"} onClick={() => addOrSubRows(true)}>
                    <FontAwesomeIcon icon={faPlus} />
                    {t(EliminationTranslations.BUTTON_ADD_ROWS)}
                </button>
                <button className={"button notebook-button"} onClick={() => addOrSubRows(false)}>
                    <FontAwesomeIcon icon={faMinus} />
                    {t(EliminationTranslations.BUTTON_SUB_ROWS)}
                </button>
            </div>
        </React.Fragment>
    );
}

export function MaxRowsWarning(): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Elimination);

    return (
        <React.Fragment>
            <p>{t(EliminationTranslations.INSTR_MAX_ROWS)}</p>
        </React.Fragment>
    );
}
