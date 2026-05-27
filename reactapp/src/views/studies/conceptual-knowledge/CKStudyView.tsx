import { useAuth } from "@/contexts/AuthProvider.tsx";
import { TranslationNamespaces } from "@/i18n.ts";
import useAxios from "axios-hooks";
import { ReactElement } from "react";
import { useErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { CKStudyProperties, ICKExercise } from "@/types/studies/ckStudyProperties.ts";
import { StudyTranslations } from "@/types/studies/studyTranslations.ts";
import ErrorScreen from "@components/shared/ErrorScreen.tsx";
import Loader from "@components/shared/Loader.tsx";
import CollapsibleStudyExerciseList from "@components/views/CollapsibleStudyExerciseList.tsx";
import ViewLayout from "@components/views/ViewLayout.tsx";
import { Paths } from "@routes/paths.ts";
import { getCKStudyCollapsibleState, getExercises, setCKStudyCollapsibleState } from "@utils/storageUtils.ts";

export default function CKStudyView(): ReactElement {
    const { logout } = useAuth();
    const { studyId } = useParams();

    if (studyId === undefined || studyId === "undefined") {
        logout();
        return <ErrorScreen text={ErrorTranslations.ERROR_STUDY_ID} routeToReturn={Paths.StudiesLoginPath} showFrownIcon={true} />;
    }

    return <CKStudy studyId={parseInt(studyId)} />;
}

function CKStudy({ studyId }: { studyId: number }): ReactElement | undefined {
    const { t } = useTranslation(TranslationNamespaces.Study);
    const { showBoundary } = useErrorBoundary();
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [{ data, loading, error }] = useAxios({
        url: `/ck-study/getExercisesForStudy/${studyId.toString()}`,
        headers: {
            Authorization: "Bearer " + user?.token
        }
    });

    if (loading) return <Loader />;
    if (error) {
        console.error(error);
        if (error.response?.status === 401) {
            logout();
            navigate(Paths.StudiesLoginPath);
        }
        showBoundary(error);
    }

    const equalization: string = "equalization";
    const bartering: string = "bartering";
    const substitution: string = "substitution";
    const elimination: string = "elimination";

    const studyInfo: CKStudyProperties = initializeExercisesAndSession(studyId, data);

    return (
        <ViewLayout title={t(StudyTranslations.STUDY)} isStudy={true}>
            <p>{t(StudyTranslations.CK_STUDY)}</p>
            <CollapsibleStudyExerciseList navigateTo={Paths.EqualizationGamePath} text={t(StudyTranslations.CK_EQUALIZATION)} exercises={studyInfo.equalizationExercises} tutorialCompleted={studyInfo.completedEqualizationTutorial} isOpen={getCKStudyCollapsibleState(equalization, false)} handleOpen={(isOpen: boolean) => setCKStudyCollapsibleState(equalization, isOpen)} />
            <CollapsibleStudyExerciseList navigateTo={Paths.BarteringGamePath} text={t(StudyTranslations.CK_BARTERING)} exercises={studyInfo.barteringExercises} tutorialCompleted={studyInfo.completedBarteringTutorial} isOpen={getCKStudyCollapsibleState(bartering, false)} handleOpen={(isOpen: boolean) => setCKStudyCollapsibleState(bartering, isOpen)} />
            <CollapsibleStudyExerciseList navigateTo={Paths.SubstitutionGamePath} text={t(StudyTranslations.CK_SUBSTITUTION)} exercises={studyInfo.substitutionExercises} tutorialCompleted={studyInfo.completedSubstitutionTutorial} isOpen={getCKStudyCollapsibleState(substitution, false)} handleOpen={(isOpen: boolean) => setCKStudyCollapsibleState(substitution, isOpen)} />
            <CollapsibleStudyExerciseList navigateTo={Paths.EliminationGamePath} text={t(StudyTranslations.CK_ELIMINATION)} exercises={studyInfo.eliminationExercises} tutorialCompleted={studyInfo.completedEliminationTutorial} isOpen={getCKStudyCollapsibleState(elimination, false)} handleOpen={(isOpen: boolean) => setCKStudyCollapsibleState(elimination, isOpen)} />
        </ViewLayout>
    );

    function initializeExercisesAndSession(studyId: string | number, data: ICKExercise[]): CKStudyProperties {
        let studyInfo: CKStudyProperties;
        const jsonString: string | null = sessionStorage.getItem(`ck-study-${studyId}`);

        if (jsonString !== null) {
            const jsonObject = JSON.parse(jsonString);
            const equalizationExercises: (number | string)[] | undefined = getExercises(jsonObject, equalization);
            const barteringExercises: (number | string)[] | undefined = getExercises(jsonObject, bartering);
            const substitutionExercises: (number | string)[] | undefined = getExercises(jsonObject, substitution);
            const eliminationExercises: (number | string)[] | undefined = getExercises(jsonObject, elimination);
            studyInfo = new CKStudyProperties(data as ICKExercise[], equalizationExercises, barteringExercises, substitutionExercises, eliminationExercises);
        } else {
            studyInfo = new CKStudyProperties(data as ICKExercise[]);
        }

        return studyInfo;
    }
}
