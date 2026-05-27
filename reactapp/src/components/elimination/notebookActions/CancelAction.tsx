import { TranslationNamespaces } from "@/i18n.ts";
import { faBan } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";

export default function CancelAction({ text, cancelAction }: { text: string; cancelAction: () => void }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.Elimination]);

    return (
        <React.Fragment>
            <p>{t(text, { ns: TranslationNamespaces.Elimination })}</p>
            <button className={"button notebook-button"} onClick={() => cancelAction()}>
                <FontAwesomeIcon icon={faBan} />
                {t(GeneralTranslations.BUTTON_CANCEL, { ns: TranslationNamespaces.General })}
            </button>
        </React.Fragment>
    );
}
