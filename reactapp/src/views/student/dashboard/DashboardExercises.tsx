import { ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import useAxios from "axios-hooks";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight, faCircleCheck, faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import { TranslationNamespaces } from "@/i18n.ts";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { FlexibilityStudyExerciseType } from "@/types/studies/enums.ts";
import type { FlexibilityExerciseResponse } from "@/types/flexibility/flexibilityExerciseResponse.ts";
import Loader from "@components/shared/Loader.tsx";
import { getCompletedPKExercises } from "@utils/storageUtils.ts";
import { getExerciseNumber, isExerciseCompleted } from "@utils/utils.ts";
import { exerciseNavTarget } from "@utils/flexibilityExercises.ts";
import { FLEXIBILITY_EXERCISE_TYPES, exerciseTypeMeta } from "@utils/flexibilityExerciseTypes.ts";

/**
 * The flexibility exercises, inside the dashboard.
 *
 * The same exercises the training page lists, reached without leaving the dashboard for a separate
 * page and a separate visual language. Nothing about an exercise is different here: the list is the
 * same server data, completion is the same localStorage record, and opening one goes through the
 * same `exerciseNavTarget` helper, so both lists cannot disagree about what an exercise is.
 *
 * THE PROBLEM this view has to solve: thirty-three rows that all look alike. The number and the
 * equation vary, but the thing that decides whether a student wants to open one — what kind of
 * decision it asks them to make — was a faint grey line of text. So:
 *
 *  - Each kind carries a colour AND its own mark AND its own name. Never colour alone, because a
 *    student who cannot tell the three hues apart still has to be able to tell the three apart.
 *  - The filter row doubles as the legend, and its counts answer "how much of this is left"
 *    without opening anything.
 *  - The explanation is reachable WITHOUT a pointer: selecting a kind prints its sentence above
 *    the list. The per-row tooltip is a shortcut for people who hover or tab, never the only route
 *    to the meaning — this app is used on tablets, where hover does not exist.
 */
export default function DashboardExercises(): ReactElement {
    const { t } = useTranslation([
        TranslationNamespaces.Student,
        TranslationNamespaces.General,
        TranslationNamespaces.Flexibility,
        TranslationNamespaces.Error,
    ]);
    const navigate = useNavigate();

    /** null = every kind. */
    const [activeType, setActiveType] = useState<FlexibilityStudyExerciseType | null>(null);

    const [{ data, loading, error }] = useAxios(`/flexibility-training/getFlexibilityExercises`);

    // Read from the same store the training page reads. The dashboard has no stake in how
    // completion is decided, so it does not make its own judgement about it.
    const exercises: FlexibilityExerciseResponse[] = (data as FlexibilityExerciseResponse[]) ?? [];
    const exerciseIds: number[] = exercises.map((entry) => entry.id);
    const completed = getCompletedPKExercises("flexibility-training");
    const isDone = (id: number) => isExerciseCompleted(id, completed);

    const doneCount = exercises.filter((entry) => isDone(entry.id)).length;
    const percent = exercises.length > 0 ? Math.round((doneCount / exercises.length) * 100) : 0;

    // Counts per kind drive both the filter chips and the "how much of this is left" answer, from
    // the same list the rows render, so the two can never disagree.
    const perType = FLEXIBILITY_EXERCISE_TYPES.map((meta) => {
        const ofType = exercises.filter((entry) => entry.exerciseType === meta.type);
        return { meta, total: ofType.length, done: ofType.filter((entry) => isDone(entry.id)).length };
    });

    const activeMeta = activeType === null ? undefined : exerciseTypeMeta(activeType);
    const visible = activeType === null ? exercises : exercises.filter((entry) => entry.exerciseType === activeType);
    const visibleDone = activeType === null
        ? doneCount
        : perType.find((entry) => entry.meta.type === activeType)?.done ?? 0;

    if (loading) return <Loader />;

    if (error) {
        console.error(error);
        return <p className={"dash-exercises__error"}>{t(ErrorTranslations.ERROR_LOAD, { ns: TranslationNamespaces.Error })}</p>;
    }

    return (
        <div className={"dash-exercises"}>
            {/* Two anchors the walkthrough uses. Its exercise leg lives on this tab now, so these
                are the elements it spotlights instead of the standalone training page. */}
            <div className={"dash-exercises__summary"} data-tour={"flex-info"}>
                <div className={"dash-exercises__summary-head"}>
                    <h2 className={"dash-exercises__title"}>{t("dashboard-exercises-title")}</h2>
                    <span className={"dash-exercises__count"}>
                        {t("dashboard-exercises-count", { done: doneCount, total: exercises.length })}
                    </span>
                </div>
                <div
                    className={"dash-exercises__track"}
                    role={"progressbar"}
                    aria-label={t("dashboard-exercises-title")}
                    aria-valuemin={0}
                    aria-valuemax={exercises.length}
                    aria-valuenow={doneCount}
                >
                    <div className={"dash-exercises__fill"} style={{ width: `${percent}%` }} />
                </div>
                <p className={"dash-exercises__hint"}>{t("dashboard-exercises-hint")}</p>
            </div>

            {/* The filter row is also the legend, so a chip has to be matchable to a row by shape
                and not only by colour. The count on a kind's chip is what is LEFT in it, because
                that is the number a student acts on. */}
            <div className={"dash-exercises__filters"} role={"group"} aria-label={t("dashboard-exercises-filter")}>
                <button
                    type={"button"}
                    className={`dash-exercise-filter${activeType === null ? " dash-exercise-filter--active" : ""}`}
                    data-type={"all"}
                    aria-pressed={activeType === null}
                    onClick={() => setActiveType(null)}
                >
                    <FontAwesomeIcon icon={faLayerGroup} className={"dash-exercise-filter__icon"} />
                    <span className={"dash-exercise-filter__label"}>{t("dashboard-exercises-filter-all")}</span>
                    <span className={"dash-exercise-filter__count"}>{doneCount}/{exercises.length}</span>
                </button>
                {perType.map(({ meta, total, done }) => (
                    <button
                        key={meta.nameKey}
                        type={"button"}
                        className={`dash-exercise-filter${activeType === meta.type ? " dash-exercise-filter--active" : ""}`}
                        data-type={FlexibilityStudyExerciseType[meta.type]}
                        aria-pressed={activeType === meta.type}
                        onClick={() => setActiveType(activeType === meta.type ? null : meta.type)}
                    >
                        <FontAwesomeIcon icon={meta.icon} className={"dash-exercise-filter__icon"} />
                        <span className={"dash-exercise-filter__label"}>
                            {t(meta.nameKey, { ns: TranslationNamespaces.Flexibility })}
                        </span>
                        <span className={"dash-exercise-filter__count"}>{done}/{total}</span>
                    </button>
                ))}
            </div>

            {/* The always-visible route to what the selected kind means. This is what keeps the
                tooltips a shortcut rather than the only way to find out. */}
            {activeMeta === undefined ? null : (
                <div className={"dash-exercises__kind"} data-type={FlexibilityStudyExerciseType[activeMeta.type]}>
                    <span className={"dash-exercises__kind-icon"} aria-hidden>
                        <FontAwesomeIcon icon={activeMeta.icon} />
                    </span>
                    <span className={"dash-exercises__kind-body"}>
                        <span className={"dash-exercises__kind-name"}>
                            {t(activeMeta.nameKey, { ns: TranslationNamespaces.Flexibility })}
                        </span>
                        <span className={"dash-exercises__kind-what"}>{t(activeMeta.whatKey)}</span>
                    </span>
                    <span className={"dash-exercises__kind-count"}>
                        {t("dashboard-exercises-count", { done: visibleDone, total: visible.length })}
                    </span>
                </div>
            )}

            <ul className={"dash-exercises__list"} data-tour={"flex-list"}>
                {visible.map((entry) => {
                    const done = isDone(entry.id);
                    const meta = exerciseTypeMeta(entry.exerciseType);
                    // Numbered by position in the FULL list, not in the filtered one, so an exercise
                    // keeps the same number it has on the training page and the same number it had
                    // before a filter was applied.
                    const number = getExerciseNumber(entry.id, exerciseIds) ?? exerciseIds.indexOf(entry.id) + 1;

                    return (
                        <li key={entry.id}>
                            {/* A button rather than a clickable row: it is the only thing a keyboard
                                user can reach here, and the whole row is the target. */}
                            <button
                                type={"button"}
                                className={`dash-exercise${done ? " dash-exercise--done" : ""}`}
                                data-type={FlexibilityStudyExerciseType[entry.exerciseType]}
                                onClick={() => {
                                    const { path, state } = exerciseNavTarget(entry, exerciseIds);
                                    navigate(path, { state });
                                }}
                            >
                                <span className={"dash-exercise__index"} aria-hidden>{number}</span>
                                {/* The kind's own mark, in the kind's own colour. The tooltip hangs
                                    off this chip, so scanning the list does not flash explanations
                                    at every row the pointer crosses. */}
                                <span className={"dash-exercise__icon"}>
                                    <FontAwesomeIcon icon={meta?.icon ?? faLayerGroup} aria-hidden />
                                    {meta === undefined ? null : (
                                        // Hidden from assistive tech on purpose: the row's accessible
                                        // name already carries the kind, and repeating this sentence on
                                        // all thirty-three rows would bury the list. The filter banner
                                        // is a screen reader's route to the same sentence.
                                        <span className={"dash-exercise__tip"} aria-hidden>
                                            <span className={"dash-exercise__tip-name"}>
                                                {t(meta.nameKey, { ns: TranslationNamespaces.Flexibility })}
                                            </span>
                                            <span className={"dash-exercise__tip-what"}>{t(meta.whatKey)}</span>
                                        </span>
                                    )}
                                </span>
                                <span className={"dash-exercise__body"}>
                                    <span className={"dash-exercise__name"}>
                                        {t(GeneralTranslations.NAV_EXERCISE, { ns: TranslationNamespaces.General })} {number}
                                    </span>
                                    <span className={"dash-exercise__type"}>
                                        {meta === undefined
                                            ? FlexibilityStudyExerciseType[entry.exerciseType]
                                            : t(meta.nameKey, { ns: TranslationNamespaces.Flexibility })}
                                    </span>
                                </span>
                                <span className={`dash-exercise__status${done ? " dash-exercise__status--done" : ""}`}>
                                    {done && <FontAwesomeIcon icon={faCircleCheck} />}
                                    {done
                                        ? t(GeneralTranslations.COMPLETED, { ns: TranslationNamespaces.General })
                                        : t(GeneralTranslations.TODO, { ns: TranslationNamespaces.General })}
                                </span>
                                <FontAwesomeIcon icon={faChevronRight} className={"dash-exercise__chevron"} />
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
