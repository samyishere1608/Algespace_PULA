import ViewLayout from "@components/views/ViewLayout.tsx";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import React, { ReactElement } from "react";
import { getCompletedPKExercises } from "@utils/storageUtils.ts";
import { useTranslation } from "react-i18next";
import { getCurrentLanguage, Language, TranslationNamespaces } from "@/i18n.ts";
import { useNavigate } from "react-router-dom";
import useAxios from "axios-hooks";
import { Paths } from "@routes/paths.ts";
import Loader from "@components/shared/Loader.tsx";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { FlexibilityExerciseResponse } from "@/types/flexibility/flexibilityExerciseResponse.ts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { isExerciseCompleted } from "@utils/utils.ts";
import { FlexibilityStudyExerciseType } from "@/types/studies/enums.ts";
import { useAuth } from "@/contexts/AuthProvider.tsx";

export default function FlexibilityStudyExamplesView(): ReactElement {
    const contents: ReactElement = (
        <React.Fragment>
            <p>{getCurrentLanguage() === Language.DE ? "Aufgaben für die Studie" : "Exercises for study:"}</p>
            <ExerciseList completedExercises={getCompletedPKExercises("flexibility-training")} />
        </React.Fragment>
    );

    return <ViewLayout title={GeneralTranslations.FLEXIBILITY_TRAINING} children={contents} isStudy={true} />;
}

function ExerciseList({ completedExercises }: { completedExercises?: (number | string)[] }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.Error]);
    const { user } = useAuth();
    const navigate = useNavigate();

    const [{ data, loading, error }] = useAxios({
        url: `/flexibility-study/getExercisesForStudy/1`,
        headers: {
            Authorization: "Bearer " + user?.token
        }
    });

    if (loading) return <Loader />;
    if (error) {
        console.error(error);
        return <p className={"exercise-list__load-error"}>{t(ErrorTranslations.ERROR_LOAD, { ns: TranslationNamespaces.Error })}</p>;
    }

    const exerciseList: FlexibilityExerciseResponse[] = data as FlexibilityExerciseResponse[];
    const exerciseIds: number[] = exerciseList.map((entry: FlexibilityExerciseResponse) => entry.id);
    return (
        <div className={"exercise-list"} style={{ marginTop: "1rem" }}>
            {exerciseList.map((entry: FlexibilityExerciseResponse, index) => {
                const isCompleted: boolean = isExerciseCompleted(entry.id, completedExercises);
                return (
                    <div
                        key={index}
                        className={"exercise-list__item" + (isCompleted ? "--completed" : "--todo")}
                        onClick={() =>
                            navigate(Paths.FlexibilityStudyExamplesPath + Paths.ExercisesSubPath + entry.id, {
                                state: { exerciseType: entry.exerciseType, exerciseId: entry.exerciseId, exercises: exerciseIds }
                            })
                        }
                    >
                        <p className={"exercise-font"}>
                            {t(GeneralTranslations.NAV_EXERCISE)} {index + 1}
                        </p>
                        <p>{FlexibilityStudyExerciseType[entry.exerciseType]}</p>
                        <p className={"exercise-list__status"}>{isCompleted ? t(GeneralTranslations.COMPLETED) : "To-Do"}</p>
                        <FontAwesomeIcon className={"exercise-font"} icon={faChevronRight} />
                    </div>
                );
            })}
        </div>
    );
}