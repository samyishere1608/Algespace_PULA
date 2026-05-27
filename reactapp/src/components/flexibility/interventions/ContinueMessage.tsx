import { TranslationNamespaces } from "@/i18n.ts";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { useTranslation } from "react-i18next";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";

export function ContinueMessage({ message, loadNextStep }: { message: string; loadNextStep: () => void }) {
    const { t } = useTranslation([TranslationNamespaces.Flexibility, TranslationNamespaces.General]);

    return (
        <React.Fragment>
            <p>{t(message, { ns: TranslationNamespaces.Flexibility })}</p>
            <button className={"button primary-button"} onClick={loadNextStep}>
                {t(GeneralTranslations.BUTTON_CONTINUE, { ns: TranslationNamespaces.General })}
                <FontAwesomeIcon icon={faArrowRight} />
            </button>
        </React.Fragment>
    );
}
