import { TranslationNamespaces } from "@/i18n.ts";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement } from "react";
import { Trans, useTranslation } from "react-i18next";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { SubstitutionExercise } from "@/types/substitution/conceptual-knowledge/substitutionExercise.ts";
import { SubstitutionTranslations } from "@/types/substitution/substitutionTranslations.ts";
import ImageEquation from "@components/math/conceptual-knowledge/ImageEquation.tsx";

export default function Introduction({ exercise, handleClick }: { exercise: SubstitutionExercise; handleClick: () => void }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.Substitution, TranslationNamespaces.Variables]);

    const descriptionOfFirstEq: TranslationInterpolation = SubstitutionTranslations.getDescriptionForFirstEquation(exercise.firstEquation.equation);
    const descriptionForSecondEq: TranslationInterpolation = SubstitutionTranslations.getDescriptionForSecondEquation(exercise.secondEquation.equation);
    const textForLastLine: TranslationInterpolation = SubstitutionTranslations.getTextForLastLine(exercise.isolatedVariable.name, exercise.secondVariable.name);

    return (
        <React.Fragment>
            <p>{t(SubstitutionTranslations.INTRO_FIRST_LINE, { ns: TranslationNamespaces.Substitution })}</p>
            <p>
                <Trans ns={TranslationNamespaces.Substitution} i18nKey={descriptionOfFirstEq.translationKey} values={descriptionOfFirstEq.interpolationVariables as object} />
            </p>
            <ImageEquation equation={exercise.firstEquation.equation} style={{ color: "var(--dark-text)" }} />
            <p>
                <Trans ns={TranslationNamespaces.Substitution} i18nKey={descriptionForSecondEq.translationKey} values={descriptionForSecondEq.interpolationVariables as object} />
            </p>
            <ImageEquation equation={exercise.secondEquation.equation} style={{ color: "var(--dark-text)" }} />
            <p>
                <Trans ns={TranslationNamespaces.Substitution} i18nKey={textForLastLine.translationKey} values={textForLastLine.interpolationVariables as object} />
            </p>
            <button className={"button primary-button"} onClick={handleClick}>
                {t(GeneralTranslations.BUTTON_CONTINUE, { ns: TranslationNamespaces.General })}
                <FontAwesomeIcon icon={faArrowRight} />
            </button>
        </React.Fragment>
    );
}
