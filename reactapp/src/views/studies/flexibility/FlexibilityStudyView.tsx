import React, { ReactElement} from "react";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { useNavigate, useParams} from "react-router-dom";
import ErrorScreen from "@components/shared/ErrorScreen.tsx";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { Paths } from "@routes/paths.ts";
import {
    getCompletedFlexibilityStudyDemos,
    getCompletedFlexibilityStudyExercises,
    setFlexibilityStudyStudyCompleted
} from "@utils/storageUtils.ts";
import ViewLayout from "@components/views/ViewLayout.tsx";
import { StudyTranslations } from "@/types/studies/studyTranslations.ts";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import { CompletedDemo } from "@/types/flexibility/enums.ts";
import { useErrorBoundary } from "react-error-boundary";
import useAxios from "axios-hooks";
import Loader from "@components/shared/Loader.tsx";
import { FlexibilityExerciseResponse } from "@/types/flexibility/flexibilityExerciseResponse.ts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import "@styles/flexibility/flexibility.scss";

export function FlexibilityStudyView(): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Study);
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { studyId } = useParams();




    if (studyId === undefined || studyId === "undefined") {
        logout();
        return <ErrorScreen text={ErrorTranslations.ERROR_STUDY_ID} routeToReturn={Paths.StudiesLoginPath} showFrownIcon={true} />;
    }

    const completedDemos = getCompletedFlexibilityStudyDemos(studyId);
    const finishedEqualization = completedDemos?.includes(CompletedDemo.Equalization) ?? false;
    const finishedSubstitution = completedDemos?.includes(CompletedDemo.Substitution) ?? false;
    const finishedElimination = completedDemos?.includes(CompletedDemo.Elimination) ?? false;

    return <ViewLayout title={t(StudyTranslations.STUDY)} isStudy={true}>
        <div className={"flexibility-view__contents flexibility-study-view"}>
            <p>{t(StudyTranslations.FLEXIBILITY_STUDY_2)} <strong>{t(StudyTranslations.FLEXIBILITY_STUDY_3)}</strong></p>
            <div className={"demo-buttons"}>
                <button className={`button ${finishedEqualization ? "green-button" : "primary-button"}`}
                        onClick={() => navigate(Paths.FlexibilityStudyPath + `${studyId}/` + "equalization-demo")}>
                    {t(StudyTranslations.TRY_EQUALIZATION)}
                    <FontAwesomeIcon icon={faArrowRight} />
                </button>
                <button className={`button ${finishedSubstitution ? "green-button" : "primary-button"}`}
                        onClick={() => navigate(Paths.FlexibilityStudyPath + `${studyId}/` + "substitution-demo")}>
                    {t(StudyTranslations.TRY_SUBSTITUTION)}
                    <FontAwesomeIcon icon={faArrowRight} />
                </button>
                <button className={`button ${finishedElimination ? "green-button" : "primary-button"}`}
                        onClick={() => navigate(Paths.FlexibilityStudyPath + `${studyId}/` + "elimination-demo")}>
                    {t(StudyTranslations.TRY_ELIMINATION)}
                    <FontAwesomeIcon icon={faArrowRight} />
                </button>
            </div>
            {(finishedEqualization && finishedSubstitution && finishedElimination) && <FlexibilityStudy studyId={studyId.replace(/\D/g, "")} />}
        </div>
    </ViewLayout>;
}

function FlexibilityStudy({ studyId }: { studyId: string }): ReactElement {
    const {t} = useTranslation(TranslationNamespaces.Study);
    const {showBoundary} = useErrorBoundary();
    console.log(studyId)
    const { user, logout } = useAuth();

    const navigate = useNavigate();

    const [{data, loading, error}] = useAxios({
        url: `/flexibility-study/getExercisesForStudy/${studyId}`,
        headers: {
            Authorization: "Bearer " + user?.token
        }
    });

    if (loading) return <Loader/>;
    if (error) {
        console.error(error);
        if (error.response?.status === 401) {
            logout();
            navigate(Paths.StudiesLoginPath);
        }
        showBoundary(error);
    }

    const exerciseList: FlexibilityExerciseResponse[] = data as FlexibilityExerciseResponse[];
    let index = 0;
    const completedExercises: (string | number)[] | undefined = getCompletedFlexibilityStudyExercises(studyId);
    if (completedExercises !== undefined && completedExercises.length !== 0) {
        index = Math.max(...completedExercises.map(exercise => exercise as number));
    }

    return <React.Fragment>
        <p>{t(StudyTranslations.FLEXIBILITY_STUDY_4)}</p>
        <p>{t(StudyTranslations.FLEXIBILITY_STUDY_5)}</p>
        <p><strong>{t(StudyTranslations.FLEXIBILITY_STUDY_6)}</strong> {t(StudyTranslations.FLEXIBILITY_STUDY_7)}</p>
        <button className={"button primary-button"}

                onClick={() => {
                    const firstHalf = exerciseList.slice(0, Math.floor(exerciseList.length / 2));
                    if (index  < firstHalf.length - 1){
                        navigate(Paths.FlexibilityStudyPath + `${studyId}/` + Paths.ExercisesSubPath + exerciseList[index].id, {
                            state: {exercises: firstHalf, condition: user?.agentCondition}
                        });
                    } else {
                        setFlexibilityStudyStudyCompleted(studyId, "1");
                        navigate(Paths.FlexibilityStudyEndPath);
                    }
                }}
        >
            {t(StudyTranslations.START_STUDY1)}
            <FontAwesomeIcon icon={faArrowRight}/>
        </button>

        <button className={"button primary-button"}
                onClick={() => {
                    const secondHalf = exerciseList.slice(Math.floor(exerciseList.length / 2));
                    if (index < exerciseList.length - 1) {
                        const firstHalf = exerciseList.slice(0, Math.floor(exerciseList.length / 2));
                        index = firstHalf.length;
                        navigate(Paths.FlexibilityStudyPath + `${studyId}/` + Paths.ExercisesSubPath + exerciseList[index].id, {
                            state: {exercises: secondHalf, condition: user?.agentCondition}
                        });
                    } else {
                        setFlexibilityStudyStudyCompleted(studyId, "2");
                        navigate(Paths.FlexibilityStudyEndPath);
                    }
                }}
        >
            {t(StudyTranslations.START_STUDY2)}
            <FontAwesomeIcon icon={faArrowRight}/>
        </button>
    </React.Fragment>;
}