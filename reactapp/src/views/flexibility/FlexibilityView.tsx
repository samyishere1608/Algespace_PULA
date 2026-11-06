import { TranslationNamespaces } from "@/i18n.ts";
import React, { ReactElement, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
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
import { FlexibilityStudyExerciseType } from "@/types/studies/enums.ts";
import { TourHost } from "@components/shared/TourHost.tsx";
import { exerciseNavTarget } from "@utils/flexibilityExercises.ts";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { isControlStudent } from "@utils/studyCondition.ts";
import { hasOfferedSection, isTourActive, startSectionTour, syncOfferedSections } from "@utils/onboardingTour.ts";
import { hydrateStudentState } from "@utils/studentState.ts";

export default function FlexibilityView(): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.General);
    const { student } = useAuth();

    const flexibility: string = "flexibility-training";
    const storageKey: string = "pk-open";

    /**
     * The control arm's walkthrough, played here because this page is all they have.
     *
     * A control student signs in straight to this list — no dashboard, so none of the dashboard's
     * sections can ever reach them, and until now that meant no introduction at all. The section is
     * started once and recorded as offered like every other, so a second visit is just the list.
     *
     * The state exists only to re-render `TourHost`, which reads the "running" flag at render time.
     */
    const [, setTourStarted] = useState(false);

    useEffect(() => {
        if (student === undefined || !isControlStudent(student)) return;
        // A tour already under way must not be restarted: this page is one of the routes the
        // walkthrough navigates through, so it re-mounts mid-tour and would reset the step.
        if (isTourActive()) return;

        // ASK THE SERVER BEFORE DECIDING. A control student lands here directly, and may land here on
        // a machine they have never used, where the local cache is empty even though the server
        // recorded the walkthrough weeks ago. Deciding from the cache first is what re-offered it.
        void (async () => {
            await hydrateStudentState(student.id);
            await syncOfferedSections(student.id);

            if (isTourActive()) return;
            if (hasOfferedSection(student.id, "module")) return;

            startSectionTour(student.id, "module");
            setTourStarted(true);
        })();
    }, [student]);

    const exerciseList: ReactElement = <ExerciseList completedExercises={getCompletedPKExercises("flexibility-training")} />;
    const contents: ReactElement = (
        <React.Fragment>
            <p data-tour={"flex-info"}>{t(GeneralTranslations.FLEXIBILITY_TRAINING_INFO)}</p>
            <Collapsible text={t(GeneralTranslations.HEADER_FLEXIBILITY_TRAINING)} children={exerciseList} isOpen={true}
                         handleClick={(isOpen: boolean) => setCollapsibleState(flexibility, storageKey, isOpen)} />
        </React.Fragment>
    );

    return (
        <React.Fragment>
            <ViewLayout title={GeneralTranslations.FLEXIBILITY_TRAINING} children={contents} />
            {/*
             * The walkthrough walks the student onto this page, and a component mounted inside the
             * router is unmounted the moment it navigates. Without this the overlay would disappear
             * exactly when it arrived. Renders nothing unless a tour is running.
             */}
            <TourHost />
        </React.Fragment>
    );
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
        <div className={"exercise-list"} data-tour={"flex-list"}>
            {exerciseList.map((entry: FlexibilityExerciseResponse, index) => {
                const isCompleted: boolean = isExerciseCompleted(entry.id, completedExercises);
                return (
                    <div
                        key={index}
                        className={"exercise-list__item" + (isCompleted ? "--completed" : "--todo")}
                        onClick={() => {
                            // The destination and its router state come from the shared helper, so this
                            // list and the dashboard's Exercises tab cannot drift apart.
                            const { path, state } = exerciseNavTarget(entry, exerciseIds);
                            navigate(path, { state });
                        }}
                    >
                        <p className={"exercise-font"}>
                            {t(GeneralTranslations.NAV_EXERCISE)} {index + 1}
                        </p>
                        <p>{t(FlexibilityStudyExerciseType[entry.exerciseType], { ns: TranslationNamespaces.Flexibility })}</p>
                        <p className={"exercise-list__status"}>{isCompleted ? t(GeneralTranslations.COMPLETED) : t(GeneralTranslations.TODO)}</p>
                        <FontAwesomeIcon className={"exercise-font"} icon={faChevronRight} />
                    </div>
                );
            })}
        </div>
    );
}