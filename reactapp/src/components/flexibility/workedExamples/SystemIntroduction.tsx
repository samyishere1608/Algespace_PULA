import React, { ReactElement } from "react";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { Language, TranslationNamespaces } from "@/i18n.ts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { getFirstEquation, getSecondEquation } from "@utils/workedExamples.ts";
import { useTranslation } from "react-i18next";
import { LinearSystem } from "@components/math/procedural-knowledge/LinearSystem.tsx";

const introductionDE: string = "Die folgenden Beispiellösungen zu den einzelnen Verfahren beziehen sich jeweils auf das folgende lineare Gleichungssystem (LGS):";
const introductionEN: string = "The following example solutions for the individual methods each relate to the following linear system of equations (LSE):";
const transitionDE: string = "Zuerst befassen wir uns mit dem Gleichsetzungsverfahren.";
const transitionEN: string = "Firstly, we will look at the equalization method.";

export function SystemIntroduction({ language, loadNextStep }: { language: string, loadNextStep: () => void }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.Elimination]);

    const firstEquation = getFirstEquation();
    const secondEquation = getSecondEquation();

    return <React.Fragment>
        <p>{language === Language.DE ? introductionDE : introductionEN}</p>
        <LinearSystem firstEquation={firstEquation} secondEquation={secondEquation} />
        <p>{language === Language.DE ? transitionDE : transitionEN}</p>
        <button className={"button primary-button"} onClick={loadNextStep}>
            {t(GeneralTranslations.BUTTON_CONTINUE, { ns: TranslationNamespaces.General })}
            <FontAwesomeIcon icon={faArrowRight} />
        </button>
    </React.Fragment>;
}