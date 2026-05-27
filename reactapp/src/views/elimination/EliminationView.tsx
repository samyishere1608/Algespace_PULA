import { TranslationNamespaces } from "@/i18n.ts";
import React, { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import CollapsibleExerciseList from "@components/views/CollapsibleExerciseList.tsx";
import ViewLayout from "@components/views/ViewLayout.tsx";
import { Paths, getPathToExercises } from "@routes/paths.ts";
import { getCollapsibleState, getCompletedCKExercises, setCollapsibleState } from "@utils/storageUtils.ts";

export default function EliminationView(): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.General);

    const elimination: string = "elimination";
    const storageKey: string = "ck-open";

    const contents: ReactElement = (
        <React.Fragment>
            <p>{t(GeneralTranslations.ELIMINATION_INFO)}</p>
            <CollapsibleExerciseList text={t(GeneralTranslations.HEADER_ELIMINATION_GAME)} route={getPathToExercises(Paths.EliminationGamePath)} navigateTo={Paths.EliminationGamePath} completedExercises={getCompletedCKExercises(elimination)} isOpen={getCollapsibleState(elimination, storageKey, true)} handleOpen={(isOpen: boolean) => setCollapsibleState(elimination, storageKey, isOpen)} />
        </React.Fragment>
    );

    return <ViewLayout title={GeneralTranslations.ELIMINATION} children={contents} />;
}
