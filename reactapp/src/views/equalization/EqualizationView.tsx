import { TranslationNamespaces } from "@/i18n.ts";
import React, { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import CollapsibleExerciseList from "@components/views/CollapsibleExerciseList.tsx";
import ViewLayout from "@components/views/ViewLayout.tsx";
import { Paths, getPathToExercises } from "@routes/paths.ts";
import { getCollapsibleState, getCompletedCKExercises, setCollapsibleState } from "@utils/storageUtils.ts";

export default function EqualizationView(): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.General);

    const equalization: string = "equalization";
    const storageKey: string = "ck-open";

    const contents: ReactElement = (
        <React.Fragment>
            <p>{t(GeneralTranslations.EQUALIZATION_INFO)}</p>
            <CollapsibleExerciseList text={t(GeneralTranslations.HEADER_EQUALIZATION_GAME)} route={getPathToExercises(Paths.EqualizationGamePath)} navigateTo={Paths.EqualizationGamePath} completedExercises={getCompletedCKExercises(equalization)} isOpen={getCollapsibleState(equalization, storageKey, true)} handleOpen={(isOpen: boolean) => setCollapsibleState(equalization, storageKey, isOpen)} />
        </React.Fragment>
    );

    return <ViewLayout title={GeneralTranslations.EQUALIZATION} children={contents} />;
}
