import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCheck, faLightbulb, faPlus, faRotateRight, faSliders, faSpinner, faTimes } from "@fortawesome/free-solid-svg-icons";
import { ReactElement, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import type { GoalCategory, GoalMetric, QualityDimension, StudyGoal } from "@/types/student/goal.ts";
import { GOAL_CATEGORIES, GOAL_RESOLVE_XP, METHOD_FOCUS_NOTES, asTranslate, describeGoal, getCategoryDef, groupInExercise, newGoalId } from "@utils/goalCatalog.ts";
import { fetchGoalSuggestions, suggestionToGoal, type GoalPlan } from "@utils/goalSuggestions.ts";
import type { TourPickerStep } from "@utils/onboardingTour.ts";
import "@styles/views/goals.scss";

/**
 * Who chose the goal.
 *
 * "assistant" exists so the caller can decline to award Choice for it. Choice is for deciding, and
 * accepting a suggestion the system made is not deciding — see `choiceAwards.ts`.
 */
export type GoalOrigin = "student" | "assistant";

interface Props {
    studentId: number | string;
    /** Opens straight into this category's builder, skipping the method step. */
    initialCategory?: GoalCategory | null;
    onAdd: (goal: StudyGoal, origin: GoalOrigin) => void;
    onClose: () => void;
    /**
     * Runs the picker as a DEMONSTRATION.
     *
     * Nothing is saved — the caller passes no-op handlers — and the screen on show is dictated by
     * the walkthrough rather than by the student's taps, because the student cannot tap anything.
     * This exists so the tour can point at the REAL picker instead of at a copy of it that would
     * drift the moment the picker changed.
     */
    demo?: boolean;
    /** Which of the picker's screens to show while `demo` is set. */
    demoStep?: TourPickerStep;
}

/**
 * The three screens of the picker.
 *
 * "choose" always comes first, because there are two genuinely different ways to arrive at a goal and
 * the student is the one who knows which suits them. The AI offer used to be a line of small text
 * under the footer: easy to miss, and it made the system's suggestion look like the normal way to set
 * a goal rather than one of two ways. It is now one of the two, side by side with the other, and it
 * is offered nowhere else.
 */
type GoalStep = "choose" | "own" | "ai";

/**
 * The goal picker.
 *
 * Offered as a menu of concrete choices rather than a free-text box. A student writing "get better
 * at maths" cannot be measured, and a goal that cannot be measured cannot be completed, which
 * teaches that goals are decorative. Every option here is checkable against what the anchor store
 * already records, so a student is never able to set something the system cannot see.
 */
/**
 * The category the demonstration opens the builder on.
 *
 * "method" because it is the one category that shows every part of the builder — a focus row, a
 * choice of metric, and the note about which exercises can move it. A category without focuses would
 * demonstrate a shorter form than most students will actually meet.
 */
const DEMO_CATEGORY: GoalCategory = "method";

function demoStepToStep(demoStep: TourPickerStep | undefined): GoalStep {
    return demoStep === "choose" || demoStep === undefined ? "choose" : "own";
}

export default function SetGoalsModal({ studentId, initialCategory = null, demo = false, demoStep, onAdd, onClose }: Props): ReactElement {
    const { t, i18n } = useTranslation(TranslationNamespaces.Student);

    // In a demonstration the screen is not the student's to choose, so it starts from the walkthrough's
    // step — and the effect below keeps it there as the walkthrough moves on.
    const [category, setCategory] = useState<GoalCategory | null>(
        demo ? (demoStep === "builder" ? DEMO_CATEGORY : null) : initialCategory);
    const [step, setStep] = useState<GoalStep>(
        demo ? demoStepToStep(demoStep) : (initialCategory ? "own" : "choose"));

    // ── Suggestions ──────────────────────────────────────────────────────────
    const [plan, setPlan] = useState<GoalPlan | null>(null);
    const [asking, setAsking] = useState(false);
    const [askFailed, setAskFailed] = useState(false);
    const [taken, setTaken] = useState<Set<number>>(new Set());

    // The walkthrough moves through the picker's three screens without anyone pressing anything, so
    // the component follows the step it is TOLD to be on rather than the taps it receives.
    useEffect(() => {
        if (!demo) return;
        setStep(demoStepToStep(demoStep));
        setCategory(demoStep === "builder" ? DEMO_CATEGORY : null);
    }, [demo, demoStep]);

    async function handleAsk(): Promise<void> {
        // Never call the model during a demonstration: it would cost a request and produce an answer
        // that only a student who is not allowed to act on it would ever see.
        if (demo) return;
        if (typeof studentId !== "number" || studentId <= 0) return;

        setAsking(true);
        setAskFailed(false);
        setPlan(null);
        setTaken(new Set());

        // The plan comes back as prose, so it has to be asked for in the language on screen.
        const result = await fetchGoalSuggestions(studentId, i18n.language?.slice(0, 2) ?? "en");

        // A plan with no goals is the server saying it does not know them well enough yet — that is
        // an answer, not a failure, so it is shown rather than replaced with an error.
        if (result === null) setAskFailed(true);
        else setPlan(result);

        setAsking(false);
    }

    function takeSuggestion(index: number, suggestion: GoalPlan["goals"][number]): void {
        const goal = suggestionToGoal(suggestion);
        if (goal === null) return;

        onAdd(goal, "assistant");
        setTaken((prev) => new Set(prev).add(index));
    }

    const translate = asTranslate(t);

    return (
        <div className={"dash-modal-backdrop"} onClick={onClose}>
            <div className={"dash-modal setgoals"} onClick={(e) => e.stopPropagation()}>
                <div className={"dash-modal__header"}>
                    <h3>{t("goals-picker-title")}</h3>
                    <button className={"dash-modal__close"} onClick={onClose} aria-label={t("dashboard-modal-close")}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                {step === "choose" && <p className={"dash-modal__subtitle"}>{t("goals-picker-subtitle")}</p>}

                <div className={"setgoals__body"}>
                    {/* No list of the student's existing goals here, and no delete buttons.

                        This panel is for ADDING. Deleting already lives on the dashboard cards,
                        where the goal is actually visible with its progress, so repeating it here
                        gave the same job two homes and made the picker look like a management
                        screen. A student who opened it to add a goal met a list they did not ask
                        for. */}

                    {step === "choose" && (
                        <MethodChooser
                            onPick={(next) => {
                                setStep(next);
                                // Chosen, so ask straight away — being made to press a second button
                                // to confirm the choice you just made is the step this redesign is
                                // removing. Re-entering reuses the plan already fetched.
                                if (next === "ai" && plan === null) void handleAsk();
                            }}
                        />
                    )}

                    {step === "own" && (
                        category === null
                            ? <CategoryChooser onPick={setCategory} onBack={() => setStep("choose")} />
                            : (
                                <GoalBuilder
                                    category={category}
                                    onBack={() => setCategory(null)}
                                    onConfirm={(goal) => {
                                        onAdd(goal, "student");
                                        setCategory(null);
                                    }}
                                />
                            )
                    )}

                    {step === "ai" && (
                        <div className={"setgoals__ai"}>
                            <button type={"button"} className={"setgoals__back"} onClick={() => setStep("choose")}>
                                <FontAwesomeIcon icon={faArrowLeft} /> {t("goals-method-back")}
                            </button>

                            {asking && (
                                <p className={"setgoals__ai-state"}>
                                    <FontAwesomeIcon icon={faSpinner} spin /> {t("goals-ask-ai-loading")}
                                </p>
                            )}

                            {!asking && askFailed && (
                                <div className={"setgoals__ai-state setgoals__ai-state--failed"}>
                                    <p>{t("goals-ask-ai-failed")}</p>
                                    <button type={"button"} className={"setgoals__retry"} onClick={() => void handleAsk()}>
                                        <FontAwesomeIcon icon={faRotateRight} /> {t("goals-suggestions-retry")}
                                    </button>
                                </div>
                            )}

                            {!asking && plan && (
                                <div className={"setgoals__plan"}>
                                    <div className={"setgoals__plan-head"}>
                                        <FontAwesomeIcon icon={faLightbulb} className={"setgoals__plan-icon"} />
                                        <span className={"setgoals__plan-title"}>
                                            {plan.planTitle || t("goals-suggestions-heading")}
                                        </span>
                                    </div>
                                    <p className={"setgoals__plan-narrative"}>{plan.planNarrative}</p>

                                    {plan.goals.map((suggestion, index) => {
                                        const goal = suggestionToGoal(suggestion);
                                        const isTaken = taken.has(index);

                                        return (
                                            <div key={index} className={"setgoals__plan-row"}>
                                                <div className={"setgoals__plan-row-body"}>
                                                    <span className={"setgoals__plan-row-label"}>
                                                        {goal ? describeGoal(goal, translate) : t("goals-suggestions-unavailable")}
                                                    </span>
                                                    <span className={"setgoals__plan-row-reason"}>{suggestion.reason}</span>
                                                </div>
                                                <button
                                                    type={"button"}
                                                    className={"setgoals__plan-take"}
                                                    title={t("goals-add")}
                                                    aria-label={t("goals-add")}
                                                    disabled={goal === null || isTaken}
                                                    onClick={() => takeSuggestion(index, suggestion)}
                                                >
                                                    {isTaken ? <FontAwesomeIcon icon={faCheck} /> : <FontAwesomeIcon icon={faPlus} />}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className={"dash-modal__footer"}>
                    <button className={"dash-modal__action-btn"} onClick={onClose}>
                        <FontAwesomeIcon icon={faCheck} /> {t("goals-done")}
                    </button>
                    <span className={"dash-modal__default-note"}>
                        {t("goals-resolve-note", { xp: GOAL_RESOLVE_XP })}
                    </span>
                </div>
            </div>
        </div>
    );
}

/**
 * The first step: how the student wants to arrive at a goal.
 *
 * Two full-width cards rather than a menu and a link, so neither way reads as the fallback for the
 * other. The AI card says what it will look at; the other says what the student decides. Nothing here
 * is pre-selected, because the point of the step is the decision.
 */
function MethodChooser({ onPick }: { onPick: (step: "own" | "ai") => void }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Student);

    return (
        <div className={"setgoals__methods"} data-tour={"goals-choose"}>
            <button type={"button"} className={"setgoals__method setgoals__method--ai"} onClick={() => onPick("ai")}>
                <span className={"setgoals__method-icon"} aria-hidden>
                    <FontAwesomeIcon icon={faLightbulb} />
                </span>
                <span className={"setgoals__method-body"}>
                    <span className={"setgoals__method-label"}>{t("goals-ask-ai")}</span>
                    <span className={"setgoals__method-desc"}>{t("goals-method-ai-desc")}</span>
                </span>
            </button>

            <button type={"button"} className={"setgoals__method"} onClick={() => onPick("own")}>
                <span className={"setgoals__method-icon"} aria-hidden>
                    <FontAwesomeIcon icon={faSliders} />
                </span>
                <span className={"setgoals__method-body"}>
                    <span className={"setgoals__method-label"}>{t("goals-method-own")}</span>
                    <span className={"setgoals__method-desc"}>{t("goals-method-own-desc")}</span>
                </span>
            </button>
        </div>
    );
}

function CategoryChooser({ onPick, onBack }: { onPick: (category: GoalCategory) => void; onBack: () => void }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Student);

    return (
        <div className={"setgoals__own"}>
            <button type={"button"} className={"setgoals__back"} onClick={onBack}>
                <FontAwesomeIcon icon={faArrowLeft} /> {t("goals-method-back")}
            </button>

            <div className={"setgoals__categories"} data-tour={"goals-categories"}>
                {GOAL_CATEGORIES.map((def) => (
                    <button
                        key={def.category}
                        type={"button"}
                        className={"setgoals__category"}
                        onClick={() => onPick(def.category)}
                    >
                        <span className={"setgoals__category-icon"} aria-hidden>
                            <FontAwesomeIcon icon={def.icon} />
                        </span>
                        <span className={"setgoals__category-body"}>
                            <span className={"setgoals__category-label"}>{t(def.labelKey)}</span>
                            <span className={"setgoals__category-desc"}>{t(def.descriptionKey)}</span>
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

interface BuilderProps {
    category: GoalCategory;
    onBack: () => void;
    onConfirm: (goal: StudyGoal) => void;
}

/**
 * The second step: narrow the chosen category down to one measurable goal.
 *
 * Defaults are filled in so a student who does not care about the details can press Add and get
 * something sensible, rather than being stopped by a half-answered form.
 */
function GoalBuilder({ category, onBack, onConfirm }: BuilderProps): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Student);
    const def = useMemo(() => getCategoryDef(category), [category]);

    const [focus, setFocus] = useState<string | null>(null);
    const [metric, setMetric] = useState<GoalMetric>(def.metrics[0]);
    const [target, setTarget] = useState<number>(def.targets[def.metrics[0]][1] ?? def.targets[def.metrics[0]][0]);
    const [quality, setQuality] = useState<QualityDimension>(def.qualities?.[0] ?? "hints");
    const [limit, setLimit] = useState<number>(def.qualityLimits?.[1] ?? 0);

    const whereRows = useMemo(() => groupInExercise(def), [def]);

    // The focus notes describe how ONE named method is reached, so they are meaningless while the
    // goal is still about all three: "Any method" shows none of them.
    const focusLabelKey = def.category === "method" && focus !== null
        ? def.focuses.find((option) => option.value === focus)?.labelKey ?? null
        : null;

    // Looked up rather than indexed because two categories share an exercise-type constant, and only
    // the method goal has focus notes at all.
    const focusNoteKeys = useMemo(() => {
        const map = new Map<string, string>();
        if (def.category === "method") for (const note of METHOD_FOCUS_NOTES) map.set(note.type, note.key);
        return map;
    }, [def]);

    // Targets differ per metric, so a swing from exercises to minutes has to move the selection to
    // something that exists — otherwise the builder would be holding a target the student cannot see.
    function changeMetric(next: GoalMetric): void {
        setMetric(next);
        const options = def.targets[next];
        if (options.length > 0 && !options.includes(target)) setTarget(options[0]);
    }

    function confirm(): void {
        onConfirm({
            id: newGoalId(),
            category,
            focus: def.focuses.length > 0 ? focus : null,
            metric,
            target,
            ...(def.qualities ? { quality, maxPerExercise: limit } : {}),
            createdAt: new Date().toISOString(),
        });
    }

    return (
        <div className={"setgoals__builder"} data-tour={"goals-builder"}>
            <div className={"setgoals__builder-head"}>
                <button type={"button"} className={"setgoals__back"} onClick={onBack}>
                    <FontAwesomeIcon icon={faArrowLeft} /> {t("goals-back")}
                </button>
                <span className={"setgoals__builder-title"}>
                    <FontAwesomeIcon icon={def.icon} className={"setgoals__builder-icon"} />
                    {t(def.labelKey)}
                </span>
            </div>
            <p className={"setgoals__builder-desc"}>{t(def.descriptionKey)}</p>

            {def.focuses.length > 0 && (
                <Field label={t("goals-focus-label")}>
                    <OptionRow
                        options={[
                            { value: null, label: t(def.anyFocusKey) },
                            ...def.focuses.map((f) => ({ value: f.value, label: t(f.labelKey) })),
                        ]}
                        selected={focus}
                        onSelect={setFocus}
                    />
                </Field>
            )}

            {/* Which exercises actually move this goal, and what the student has to do inside each one.

                The compare-two-methods step exists only in Suitability and the explain-your-reasoning
                step only in Efficiency and Matching, and none of that is visible from the picker.
                Without saying so, a student sets "compare methods five times", practises Matching,
                and concludes the goal is broken.

                The per-type notes go a step further, because "this goal can be worked on here" is not
                the same as "you get to act here". The method goal is the case that matters: Suitability
                hands the student all three methods, Efficiency accepts only the one that fits the
                system, and Matching names the method and asks about the system instead. That sits
                AFTER the focus row on purpose, so narrowing to a method updates the guidance the
                student is reading rather than pushing it off screen. */}
            <div className={"setgoals__where"} data-tour={"goals-where"}>
                <span className={"setgoals__where-label"}>{t("goals-where-label")}</span>
                <p className={"setgoals__where-note"}>{t(def.whereKey)}</p>

                {whereRows.map((row) => {
                    // A narrowed method goal only reaches the focus notes for Efficiency and Matching;
                    // Suitability needs none, because the student picks the method there themselves.
                    const focusKey = focusLabelKey === null
                        ? undefined
                        : row.types.map((type) => focusNoteKeys.get(type.value)).find((key) => key !== undefined);

                    return (
                        <div key={row.key} className={"setgoals__where-row"}>
                            <span className={"setgoals__where-types"}>
                                {row.types.map((type) => (
                                    <span key={type.value} className={"setgoals__where-type"}>{t(type.labelKey)}</span>
                                ))}
                            </span>
                            <p className={"setgoals__where-note"}>{t(row.key)}</p>
                            {focusKey !== undefined && (
                                <p className={"setgoals__where-focus"}>
                                    {t(focusKey, { method: t(focusLabelKey as string) })}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {def.metrics.length > 1 && (
                <Field label={t("goals-metric-label")}>
                    <OptionRow
                        options={def.metrics.map((m) => ({ value: m, label: t(`goal-unit-${m}`) }))}
                        selected={metric}
                        onSelect={(value) => value && changeMetric(value)}
                    />
                </Field>
            )}

            {def.qualities && (
                <>
                    <Field label={t("goals-quality-label")}>
                        <OptionRow
                            options={def.qualities.map((q) => ({ value: q, label: t(`goal-quality-${q}`) }))}
                            selected={quality}
                            onSelect={(value) => value && setQuality(value)}
                        />
                    </Field>
                    <Field label={t("goals-limit-label")}>
                        <OptionRow
                            options={(def.qualityLimits ?? []).map((n) => ({ value: n, label: String(n) }))}
                            selected={limit}
                            onSelect={setLimit}
                        />
                    </Field>
                </>
            )}

            <Field label={t("goals-target-label")}>
                <OptionRow
                    options={def.targets[metric].map((n) => ({
                        value: n,
                        label: `${n} ${t(`goal-unit-${metric}`)}`,
                    }))}
                    selected={target}
                    onSelect={setTarget}
                />
            </Field>

            <button type={"button"} className={"setgoals__confirm"} data-tour={"goals-confirm"} onClick={confirm}>
                <FontAwesomeIcon icon={faPlus} /> {t("goals-add")}
            </button>
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactElement }): ReactElement {
    return (
        <div className={"setgoals__field"}>
            <span className={"setgoals__field-label"}>{label}</span>
            {children}
        </div>
    );
}

function OptionRow<T extends string | number | null>({ options, selected, onSelect }: {
    options: { value: T; label: string }[];
    selected: T;
    onSelect: (value: T) => void;
}): ReactElement {
    return (
        <div className={"setgoals__options"}>
            {options.map((option) => (
                <button
                    key={String(option.value)}
                    type={"button"}
                    className={`setgoals__option${option.value === selected ? " setgoals__option--selected" : ""}`}
                    onClick={() => onSelect(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
