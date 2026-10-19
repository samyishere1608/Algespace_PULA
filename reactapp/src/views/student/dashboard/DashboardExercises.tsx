import { ReactElement, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import useAxios from "axios-hooks";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBullseye, faChevronRight, faCircleCheck, faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import { TranslationNamespaces } from "@/i18n.ts";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { FlexibilityStudyExerciseType } from "@/types/studies/enums.ts";
import type { FlexibilityExerciseResponse } from "@/types/flexibility/flexibilityExerciseResponse.ts";
import type { StudyGoal } from "@/types/student/goal.ts";
import Loader from "@components/shared/Loader.tsx";
import { ShowSectionTourButton } from "@components/shared/ShowSectionTourButton.tsx";
import { getCompletedPKExercises } from "@utils/storageUtils.ts";
import { getExerciseNumber, isExerciseCompleted } from "@utils/utils.ts";
import { exerciseNavTarget } from "@utils/flexibilityExercises.ts";
import { FLEXIBILITY_EXERCISE_TYPES, exerciseTypeMeta } from "@utils/flexibilityExerciseTypes.ts";
import { goalFitHint, type GoalFit } from "@utils/goalExerciseFit.ts";
import { asTranslate, describeGoal, getCategoryDef } from "@utils/goalCatalog.ts";

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
 *
 * A student who sets a goal then has to guess where to take it, which is why the rows carry one more
 * mark: the ones that can move a goal they set. Which rows those are is decided in
 * `goalExerciseFit.ts`, and the difference between "this counts" and "you decide the method here"
 * is the whole point of it.
 */
export default function DashboardExercises({
    onShowTutorial,
    goals = [],
}: { onShowTutorial?: () => void; goals?: readonly StudyGoal[] } = {}): ReactElement {
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

    // ── The goal filter ──────────────────────────────────────────────────────
    //
    // A goal is a fifth filter on the same row as the three kinds, not a mark on every row. The first
    // attempt put a chip on each exercise that suited the goal, plus a banner explaining the chips:
    // with three goals active the list read "Exercises for:" + three chips + a sentence + a chip on
    // thirty-three rows, and the answer — "which of these should I open" — was the hardest thing on
    // the screen to find. Filtering is a pattern a student already uses here for the three kinds, so
    // it costs no new idea, adds no text of its own, and leaves the plain list alone while it is off.
    //
    // ONE goal at a time, never all of them. The union of two goals is usually the whole list: a
    // method goal fits every Suitability, "explain your reasoning" fits every Efficiency and
    // Matching. So the filter asks which goal it is filtering for.
    const [focusGoalId, setFocusGoalId] = useState<string | null>(null);
    const [goalOnly, setGoalOnly] = useState(false);
    const selectedGoal: StudyGoal | null = useMemo(
        // Newest first as the default: the goal a student just set is the one they are wondering
        // about. `getActiveGoals` returns oldest first.
        () => goals.find((goal) => goal.id === focusGoalId) ?? goals[goals.length - 1] ?? null,
        [goals, focusGoalId]
    );

    const fitHints = useMemo(
        () => new Map(
            exercises.map((entry) => [
                entry.id,
                selectedGoal === null ? null : goalFitHint([selectedGoal], entry.exerciseType, entry.method)?.fit ?? null,
            ])
        ),
        [exercises, selectedGoal]
    );
    const goalCount = exercises.filter((entry) => fitHints.get(entry.id) != null).length;

    const visible = exercises.filter(
        (entry) => (activeType === null || entry.exerciseType === activeType) && (!goalOnly || fitHints.get(entry.id) != null)
    );
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
                    <div className={"dash-exercises__summary-actions"}>
                        {onShowTutorial !== undefined && (
                            <ShowSectionTourButton section={"exercises"} onPlay={onShowTutorial} />
                        )}
                        <span className={"dash-exercises__count"}>
                            {t("dashboard-exercises-count", { done: doneCount, total: exercises.length })}
                        </span>
                    </div>
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
                {/* The goal filter, last and gold, so it reads as something other than a fourth kind.
                    Its count is how MANY exercises work on the goal, not how many are left, because
                    the question it answers is "is there anywhere to go with this". */}
                {selectedGoal !== null && (
                    <button
                        type={"button"}
                        className={`dash-exercise-filter dash-exercise-filter--goal${goalOnly ? " dash-exercise-filter--active" : ""}`}
                        data-type={"goal"}
                        aria-pressed={goalOnly}
                        onClick={() => setGoalOnly(!goalOnly)}
                    >
                        <FontAwesomeIcon icon={faBullseye} className={"dash-exercise-filter__icon"} />
                        <span className={"dash-exercise-filter__label"}>{t("dashboard-goal-filter")}</span>
                        <span className={"dash-exercise-filter__count"}>{goalCount}</span>
                    </button>
                )}
            </div>

            {/* One line, only in the ordinary view, saying where the goal exercises are. It replaces
                nothing: the list underneath is untouched, and the line disappears the moment the
                filter is on because then the answer is on the screen already. */}
            {!goalOnly && selectedGoal !== null && (
                <p className={"dash-exercises__goal-hint"}>
                    <FontAwesomeIcon icon={faBullseye} aria-hidden />
                    <span>{t("dashboard-goal-hint")}</span>
                </p>
            )}

            {/* Which goal the filter is filtering for. Only while it is on: off, the list is simply
                the list and there is nothing to explain. With one goal it reads as a statement; with
                several it is the switch between them. */}
            {goalOnly && selectedGoal !== null && (
                <div className={"dash-exercises__goal-focus"}>
                    <span className={"dash-exercises__goal-focus-label"}>{t("dashboard-goal-showing")}</span>
                    {goals.length === 1 ? (
                        <span className={"dash-exercises__goal-focus-single"}>
                            <FontAwesomeIcon icon={getCategoryDef(selectedGoal.category).icon} aria-hidden />
                            {describeGoal(selectedGoal, asTranslate(t))}
                        </span>
                    ) : (
                        <div className={"dash-exercises__goal-focus-list"} role={"group"} aria-label={t("dashboard-goal-showing")}>
                            {goals.map((goal) => {
                                const selected = goal.id === selectedGoal.id;
                                return (
                                    <button
                                        key={goal.id}
                                        type={"button"}
                                        className={`dash-goal-chip${selected ? " dash-goal-chip--active" : ""}`}
                                        aria-pressed={selected}
                                        onClick={() => setFocusGoalId(goal.id)}
                                    >
                                        <FontAwesomeIcon icon={getCategoryDef(goal.category).icon} aria-hidden />
                                        <span className={"dash-goal-chip__label"}>{describeGoal(goal, asTranslate(t))}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

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
                {visible.length === 0 && (
                    <li>
                        <p className={"dash-exercises__goal-empty"}>{t("dashboard-goal-empty")}</p>
                    </li>
                )}
                {visible.map((entry) => {
                    const done = isDone(entry.id);
                    const meta = exerciseTypeMeta(entry.exerciseType);
                    const fit: GoalFit | null = fitHints.get(entry.id) ?? null;
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
                                {/* The exercises that might move the goal, where the student has to
                                    judge the method themselves. Words, not a bare glyph: a circle with
                                    a magnifier in it read as "search" and as a question mark, and
                                    neither is what it means. */}
                                {fit === "figureOut" && (
                                    <span
                                        className={"dash-exercise__depends"}
                                        title={t("dashboard-goal-figure-out-hint")}
                                    >
                                        {t("dashboard-goal-figure-out")}
                                    </span>
                                )}
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
