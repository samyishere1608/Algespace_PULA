import { TranslationNamespaces } from "@/i18n.ts";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { CKStudyExercise } from "@/types/studies/ckStudyProperties.ts";
import { Collapsible } from "@components/views/CollapsibleExerciseList.tsx";
import { Paths } from "@routes/paths.ts";

function ExerciseList({ navigateTo, exercises, tutorialCompleted }: { navigateTo: string; exercises: CKStudyExercise[]; tutorialCompleted: boolean }) {
    const { t } = useTranslation(TranslationNamespaces.General);
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className={"exercise-list"}>
            <div key={"tutorial"} className={`exercise-list__item${tutorialCompleted ? "--completed" : "--todo"}`} onClick={() => navigate(location.pathname + navigateTo + Paths.TutorialSubPath)}>
                <p className={"exercise-font"}>{t(GeneralTranslations.TUTORIAL)}</p>
                <FontAwesomeIcon className={"exercise-font"} style={{ color: tutorialCompleted ? "transparent" : "" }} icon={faChevronRight} />
            </div>
            {exercises.map((exercise: CKStudyExercise, index: number) => {
                return (
                    <div
                        key={index}
                        className={`exercise-list__item${exercise.completed ? "--completed" : "--todo"}`}
                        onClick={(): void => {
                            navigate(location.pathname + navigateTo + Paths.ExercisesSubPath + exercise.id, {
                                state: { collectData: !exercise.completed }
                            });
                        }}
                    >
                        <p className={"exercise-font"}>
                            {t(GeneralTranslations.NAV_EXERCISE)} {index + 1}
                        </p>
                        <p className={"exercise-list__status"}>{exercise.completed ? t(GeneralTranslations.COMPLETED) : "To-Do"}</p>
                        <FontAwesomeIcon className={"exercise-font"} style={{ color: exercise.completed ? "transparent" : "" }} icon={faChevronRight} />
                    </div>
                );
            })}
        </div>
    );
}

export default function CollapsibleStudyExerciseList({ navigateTo, text, exercises, tutorialCompleted, isOpen, handleOpen }: { navigateTo: string; text: string; exercises: CKStudyExercise[]; tutorialCompleted: boolean; isOpen?: boolean; handleOpen: (isOpen: boolean) => void }) {
    const exerciseList: ReactElement = <ExerciseList navigateTo={navigateTo} exercises={exercises} tutorialCompleted={tutorialCompleted} />;
    return <Collapsible text={text} children={exerciseList} isOpen={isOpen} handleClick={handleOpen} isStudy={true} />;
}
