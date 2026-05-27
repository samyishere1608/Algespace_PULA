import { TranslationNamespaces } from "@/i18n.ts";
import React, { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import CollapsibleExerciseList from "@components/views/CollapsibleExerciseList.tsx";
import ViewLayout from "@components/views/ViewLayout.tsx";
import { Paths, getPathToExercises } from "@routes/paths.ts";
import { getCollapsibleState, getCompletedCKExercises, setCollapsibleState } from "@utils/storageUtils.ts";

export default function SubstitutionView(): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.General);

    const bartering: string = "bartering";
    const barteringStorageKey: string = "bartering-open";
    const substitution: string = "substitution";
    const substitutionStorageKey: string = "ck-open";

    const contents: ReactElement = (
        <React.Fragment>
            <p>{t(GeneralTranslations.SUBSTITUTION_INFO)}</p>
            <CollapsibleExerciseList
                text={t(GeneralTranslations.HEADER_BARTERING_GAME)}
                route={getPathToExercises(Paths.BarteringGamePath)}
                navigateTo={Paths.BarteringGamePath}
                completedExercises={getCompletedCKExercises(substitution, bartering)}
                isOpen={getCollapsibleState(substitution, barteringStorageKey, true)}
                handleOpen={(isOpen: boolean) => setCollapsibleState(substitution, barteringStorageKey, isOpen)}
            />
            <CollapsibleExerciseList
                text={t(GeneralTranslations.HEADER_SUBSTITUTION_GAME)}
                route={getPathToExercises(Paths.SubstitutionGamePath)}
                navigateTo={Paths.SubstitutionGamePath}
                completedExercises={getCompletedCKExercises(substitution)}
                isOpen={getCollapsibleState(substitution, substitutionStorageKey, false)}
                handleOpen={(isOpen: boolean) => setCollapsibleState(substitution, substitutionStorageKey, isOpen)}
            />
        </React.Fragment>
    );

    return <ViewLayout title={GeneralTranslations.SUBSTITUTION} children={contents} />;
}
