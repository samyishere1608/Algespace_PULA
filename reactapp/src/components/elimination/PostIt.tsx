import { TranslationNamespaces } from "@/i18n.ts";
import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { EliminationExercise } from "@/types/elimination/eliminationExercise.ts";
import { EliminationTranslations } from "@/types/elimination/eliminationTranslations.ts";
import ImageEquation from "@components/math/conceptual-knowledge/ImageEquation.tsx";

export default function PostIt({ exercise }: { exercise: EliminationExercise }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.Elimination]);

    return (
        <div className={"elimination__post-it"}>
            <p className={"elimination__post-it-title"}>{t(EliminationTranslations.POST_IT_TITLE, { ns: TranslationNamespaces.Elimination })}</p>
            <p>{t(EliminationTranslations.POST_IT_SYSTEM, { ns: TranslationNamespaces.Elimination })}</p>
            <ImageEquation equation={exercise.firstEquation} style={{ color: "var(--dark-text)" }} />
            <ImageEquation equation={exercise.secondEquation} style={{ color: "var(--dark-text)" }} />
            <p>{t(EliminationTranslations.POST_IT_TASK, { ns: TranslationNamespaces.Elimination })}</p>
        </div>
    );
}
