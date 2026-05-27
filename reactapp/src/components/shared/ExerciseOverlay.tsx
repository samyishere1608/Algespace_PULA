import { TranslationNamespaces } from "@/i18n.ts";
import { faArrowLeft, faArrowRight, faThumbsDown, faThumbsUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { Paths } from "@routes/paths.ts";
import "@styles/views/overlay.scss";

export function OnboardingProgressOverlay({ message, onContinue, buttonText, disabled = false }: { message: string; onContinue: () => void; buttonText: string; disabled?: boolean }): ReactElement {
    return (
        <ExerciseOverlay>
            <p>{message}</p>
            <div className={"exercise-overlay__buttons"}>
                <button className={"button primary-button"} disabled={disabled} onClick={onContinue}>
                    {buttonText}
                    <FontAwesomeIcon icon={faArrowRight} />
                </button>
            </div>
        </ExerciseOverlay>
    );
}

function ExerciseOverlay({ children }: { children: ReactNode }): ReactElement {
    return (
        <div className={"exercise-overlay__background"}>
            <div className={"exercise-overlay__container"}>
                <div className={"exercise-overlay__contents"}>{children}</div>
            </div>
        </div>
    );
}

export function ContinueWithNextExerciseOverlay({ currentExercise, exercises, routeToReturn, routeToNextExercise }: { currentExercise: number; exercises: number[] | undefined; routeToReturn: string; routeToNextExercise: string }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.General);
    const navigate = useNavigate();

    if (exercises === undefined) {
        return getContentForReturn(routeToReturn, t(GeneralTranslations.RETURN_UNDEF_INSTR));
    }

    const index: number = exercises.indexOf(currentExercise);

    if (index === -1 || index >= exercises.length - 1) {
        return getContentForReturn(routeToReturn, t(GeneralTranslations.RETURN_COMPLETE_INSTR));
    }

    return (
        <ExerciseOverlay>
            <p>{t(GeneralTranslations.LOAD_NEXT_INSTR)}</p>
            <div className={"exercise-overlay__buttons"}>
                <button className={"button primary-button"} onClick={() => navigate(routeToReturn)}>
                    <FontAwesomeIcon icon={faArrowLeft} />
                    {t(GeneralTranslations.BUTTON_RETURN)}
                </button>
                <button className={"button primary-button"} onClick={() => navigateToNextExercise(exercises, routeToNextExercise)}>
                    {t(GeneralTranslations.BUTTON_NEXT)}
                    <FontAwesomeIcon icon={faArrowRight} />
                </button>
            </div>
        </ExerciseOverlay>
    );

    function getContentForReturn(route: string, text: string): ReactElement {
        return (
            <ExerciseOverlay>
                {<p>{text}</p>}
                <div className={"exercise-overlay__buttons"}>
                    <button className={"button primary-button"} onClick={() => navigate(route)}>
                        <FontAwesomeIcon icon={faArrowLeft} />
                        {t(GeneralTranslations.BUTTON_RETURN)}
                    </button>
                </div>
            </ExerciseOverlay>
        );
    }

    function navigateToNextExercise(exerciseIds: number[], route: string): void {
        if (index < exerciseIds.length - 1) {
            navigate(route + exerciseIds[index + 1], { state: { exercises: exerciseIds } });
        } else {
            navigate(route + exerciseIds[index + 1]);
        }
    }
}

export function ExitExerciseOverlay({ returnToHome, routeToReturn, closeOverlay }: { returnToHome: boolean; routeToReturn: string; closeOverlay: () => void }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.General);
    const navigate = useNavigate();

    return (
        <ExerciseOverlay>
            <p>{returnToHome ? t(GeneralTranslations.EXIT_EXERCISE_HOME) : t(GeneralTranslations.EXIT_EXERCISE_VIEW)}</p>
            <div className={"exercise-overlay__buttons"}>
                <button className={"button primary-button"} onClick={navigateTo}>
                    <FontAwesomeIcon icon={faThumbsUp} />
                    {t(GeneralTranslations.BUTTON_YES)}
                </button>
                <button className={"button primary-button"} onClick={closeOverlay}>
                    {t(GeneralTranslations.BUTTON_NO)}
                    <FontAwesomeIcon icon={faThumbsDown} />
                </button>
            </div>
        </ExerciseOverlay>
    );

    function navigateTo(): void {
        if (returnToHome) {
            navigate(Paths.HomePath);
        } else {
            navigate(routeToReturn);
        }
    }
}
