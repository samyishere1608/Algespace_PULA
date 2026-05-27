import { TranslationNamespaces } from "@/i18n.ts";
import React, { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { Paths } from "@routes/paths.ts";
import { getCompletedPKExercises, setCollapsibleState } from "@utils/storageUtils.ts";
import ViewLayout from "@components/views/ViewLayout.tsx";
import { useNavigate } from "react-router-dom";
import useAxios from "axios-hooks";
import Loader from "@components/shared/Loader.tsx";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { FlexibilityExerciseResponse } from "@/types/flexibility/flexibilityExerciseResponse.ts";
import { isExerciseCompleted } from "@utils/utils.ts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { Collapsible } from "@components/views/CollapsibleExerciseList.tsx";
import { FlexibilityExerciseType } from "@/types/flexibility/enums.ts";
import { FlexibilityStudyExerciseType } from "@/types/studies/enums.ts";

export default function FlexibilityView(): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.General);

    const flexibility: string = "flexibility-training";
    const storageKey: string = "pk-open";

    const exerciseList: ReactElement = <ExerciseList completedExercises={getCompletedPKExercises("flexibility-training")} />;
    const contents: ReactElement = (
        <React.Fragment>
            <p>{t(GeneralTranslations.FLEXIBILITY_TRAINING_INFO)}</p>
            <Collapsible text={t(GeneralTranslations.HEADER_FLEXIBILITY_TRAINING)} children={exerciseList} isOpen={true}
                         handleClick={(isOpen: boolean) => setCollapsibleState(flexibility, storageKey, isOpen)} />
        </React.Fragment>
    );

    return <ViewLayout title={GeneralTranslations.FLEXIBILITY_TRAINING} children={contents} />;
}

function ExerciseList({ completedExercises }: { completedExercises?: (number | string)[] }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.Error, TranslationNamespaces.Flexibility]);
    const navigate = useNavigate();

    const [{ data, loading, error }] = useAxios(`/flexibility-training/getFlexibilityExercises`);

    if (loading) return <Loader />;
    if (error) {
        console.error(error);
        return <p className={"exercise-list__load-error"}>{t(ErrorTranslations.ERROR_LOAD, { ns: TranslationNamespaces.Error })}</p>;
    }

    const exerciseList: FlexibilityExerciseResponse[] = data as FlexibilityExerciseResponse[];
    const exerciseIds: number[] = exerciseList.map((entry: FlexibilityExerciseResponse) => entry.id);
    return (
        <div className={"exercise-list"}>
            {exerciseList.map((entry: FlexibilityExerciseResponse, index) => {
                const isCompleted: boolean = isExerciseCompleted(entry.id, completedExercises);
                return (
                    <div
                        key={index}
                        className={"exercise-list__item" + (isCompleted ? "--completed" : "--todo")}
                        onClick={() =>
                            navigate(Paths.FlexibilityPath + Paths.ExercisesSubPath + entry.id, {
                                state: { exerciseType: entry.exerciseType, exerciseId: entry.exerciseId, exercises: exerciseIds }
                            })
                        }
                    >
                        <p className={"exercise-font"}>
                            {t(GeneralTranslations.NAV_EXERCISE)} {index + 1}
                        </p>
                        <p>{t(FlexibilityStudyExerciseType[entry.exerciseType], { ns: TranslationNamespaces.Flexibility })}</p>
                        <p className={"exercise-list__status"}>{isCompleted ? t(GeneralTranslations.COMPLETED) : "To-Do"}</p>
                        <FontAwesomeIcon className={"exercise-font"} icon={faChevronRight} />
                    </div>
                );
            })}
        </div>
    );
}