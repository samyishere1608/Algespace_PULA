import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useAxios from "axios-hooks";
import { TranslationNamespaces } from "@/i18n.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { FlexibilityStudyExerciseType } from "@/types/studies/enums.ts";
import type { FlexibilityExerciseResponse } from "@/types/flexibility/flexibilityExerciseResponse.ts";
import { Paths } from "@routes/paths.ts";
import NavigationBar from "@components/shared/NavigationBar.tsx";
import Loader from "@components/shared/Loader.tsx";
import { TourHost } from "@components/shared/TourHost.tsx";
import { ExerciseRouter } from "@views/flexibility/FlexibilityExercise.tsx";
import { PreviewContext } from "@/contexts/previewContext.ts";
import "@styles/views/flexibility.scss";
import "@styles/views/tour-preview.scss";

/**
 * The walkthrough's view of a REAL flexibility exercise, made read-only.
 *
 * It renders the actual exercise component rather than a copy of it. A hand-built stand-in was tried
 * first and it was worse than useless: it looked almost like the real thing, so a student would
 * compare the two, find they did not match, and conclude that the tour had shown them something else.
 *
 * Two things make showing the real one safe, and neither of them is "the overlay blocks clicks":
 *
 *  1. `PreviewContext` switches tracking off at its single source (`useTrackerIdentity`). The mount
 *     effect that issues an attempt is gated on that same decision, so no attempt is created, every
 *     later write has no destination to go to, and both the Insight award and the nudge are
 *     unavailable. A student cannot move their goals by looking at an exercise.
 *  2. `buildHandleEnd` is a no-op, so finishing cannot log a completion, navigate or celebrate.
 *
 * It is its own route rather than the real exercise URL because `FlexibilityExercise` reads its
 * exercise type and id from `location.state` and shows an error screen when they are missing.
 */
export default function FlexibilityPreview(): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Student);
    const navigate = useNavigate();

    const [{ data, loading }] = useAxios(`/flexibility-training/getFlexibilityExercises`);
    const exercises = (data ?? []) as FlexibilityExerciseResponse[];

    /**
     * The exercise to show, and where it sits in the list.
     *
     * The FIRST exercise is preferred, because that is the one the student will actually meet first
     * and the breadcrumb then reads true. The fallback exists only because the walkthrough's steps
     * are written against a Suitability first screen — it asks which method suits the system, which
     * is the clearest of the three — so if the catalogue ever opens on a different type, this picks
     * a Suitability one anyway rather than showing steps that point at nothing.
     */
    const first = exercises[0];
    const chosen = first === undefined || first.exerciseType === FlexibilityStudyExerciseType.Suitability
        ? first
        : (exercises.find((entry) => entry.exerciseType === FlexibilityStudyExerciseType.Suitability) ?? first);
    const position = chosen === undefined ? 0 : exercises.indexOf(chosen) + 1;

    return (
        <PreviewContext.Provider value={true}>
            <div className={"full-page"} style={{ background: "linear-gradient(180deg, var(--blue-background) 0%, #044a6d 100%)", paddingBottom: "1rem" }}>
                {/* No `handleSelection`, so the breadcrumb is inert — this screen is not part of the app. */}
                <NavigationBar mainRoute={GeneralTranslations.FLEXIBILITY_TRAINING} currentExercise={position} exercisesCount={exercises.length} style={{ minHeight: "3.5rem" }} />

                <div className={"flexibility-view__container"}>
                    <div className={"flexibility-view__contents"}>
                        {loading || chosen === undefined
                            ? <Loader />
                            : (
                                <ExerciseRouter
                                    concreteExerciseType={chosen.exerciseType}
                                    concreteExerciseId={chosen.exerciseId}
                                    flexibilityId={chosen.id}
                                    navigateBackTo={Paths.StudentDashboardPath}
                                    // Never reached, because the walkthrough blocks every click. A no-op
                                    // anyway, so even a stray one cannot log a completion.
                                    buildHandleEnd={() => () => { /* nothing is recorded here */ }}
                                />
                            )}
                    </div>
                </div>

                {/* The walkthrough ENDS on this screen, so there has to be a way out of it that does
                    not depend on the tour still being up. Covered by the overlay while a step is. */}
                <div className={"tour-preview__exit"}>
                    <button type={"button"} className={"tour-preview__back"} onClick={() => navigate(Paths.StudentDashboardPath)}>
                        <FontAwesomeIcon icon={faArrowLeft} /> {t("tour-preview-back")}
                    </button>
                </div>
            </div>

            <TourHost />
        </PreviewContext.Provider>
    );
}

