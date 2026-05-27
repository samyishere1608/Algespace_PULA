import { TranslationNamespaces } from "@/i18n.ts";
import { ReactElement } from "react";
import { Trans, useTranslation } from "react-i18next";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { BarteringExercise } from "@/types/substitution/bartering/barteringExercise.ts";
import { BarteringTranslations } from "@/types/substitution/substitutionTranslations.ts";
import ImageEquation from "@components/math/conceptual-knowledge/ImageEquation.tsx";

export default function AssignmentSign({ exercise }: { exercise: BarteringExercise }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Substitution);
    const description: TranslationInterpolation = BarteringTranslations.getDescriptionForBartering(exercise.linearEquation);

    return (
        <div className={"assignment"}>
            <div className={"assignment__sign"}>
                <p>{t(BarteringTranslations.TASK_SIGN)}</p>
            </div>
            <div className={"assignment__background"}>
                <p>
                    <Trans ns={TranslationNamespaces.Substitution} i18nKey={description.translationKey} values={description.interpolationVariables as object} />
                </p>
                <ImageEquation equation={exercise.linearEquation} style={{ color: "var(--dark-text)" }} />
            </div>
        </div>
    );
}
