import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
    faBrain,
    faBullseye,
    faCalculator,
    faCommentDots,
    faScaleBalanced,
    faShapes,
} from "@fortawesome/free-solid-svg-icons";
import type { GoalCategory, GoalMetric, QualityDimension, StudyGoal } from "@/types/student/goal.ts";

/**
 * The catalogue of goals a student can pick.
 *
 * Everything the picker needs is here, so the picker itself contains no knowledge of what a goal
 * is — it renders whatever this file describes. Adding a target size or a new focus option is a
 * change to this file alone.
 */

/** Resolve XP awarded for following through on a goal, whatever the goal was. */
export const GOAL_RESOLVE_XP = 5;

/**
 * The most any single exercise can contribute to a minutes goal.
 *
 * Without a cap, one long exercise completes the whole goal, and the goal stops measuring
 * persistence. Should the goal be to spend ten minutes, an exercise of twenty-five minutes should
 * not settle it in one go — the cap is what makes "minutes" mean "time on task" rather than
 * "longest single sitting".
 */
export const MAX_MINUTES_PER_EXERCISE = 10;

export interface GoalFocusOption {
    /** The value as recorded in the anchor store: "Elimination", "Suitability". */
    value: string;
    /** Translation key for the option's name. */
    labelKey: string;
}

/**
 * One line of "how this goal shows up in this kind of exercise".
 *
 * `availableIn` says WHICH exercise types can move a goal. This says what the student actually has to
 * do once they are inside one, because the same goal is reached through a different moment in each
 * type. The method goal is the clearest case: Suitability lets the student choose any of the three
 * methods, Efficiency accepts only the single method that fits the system, and Matching names the
 * method itself and asks the student to pick the system instead.
 *
 * Without this a student who narrowed a goal to Elimination and then practised Matching would finish
 * the exercise, see the goal unmoved, and conclude the goal was broken. It was never reachable there
 * in the way they assumed.
 */
export interface GoalExerciseNote {
    /** Must match a `value` in the same category's `availableIn`. */
    type: string;
    /** Translation key describing the moment the student gets to act, in that exercise type. */
    key: string;
}

export interface GoalCategoryDef {
    category: GoalCategory;
    /**
     * The category's mark, from the same FontAwesome family the rest of the app uses.
     *
     * An icon rather than an emoji: emoji are chosen by the font, differ between platforms, ignore
     * the colour of the text beside them and cannot be sized or tinted. These are the marks the
     * student meets in the picker, on the dashboard and in the celebration, so they have to look the
     * same in all three.
     */
    icon: IconDefinition;
    labelKey: string;
    descriptionKey: string;

    /** The counting methods this category offers. Order is the order shown. */
    metrics: GoalMetric[];

    /**
     * The target sizes offered per metric. Targets are a fixed menu rather than a free number: a
     * goal the student can tune arbitrarily invites picking "1" and calling it done.
     */
    targets: Record<GoalMetric, number[]>;

    /**
     * The values the goal can be narrowed to, or empty when there is nothing to narrow.
     * A null focus means "any", which the picker always offers first.
     */
    focuses: GoalFocusOption[];

    /**
     * The exercise types this goal can actually be worked on in.
     *
     * NOT every dimension exists in every exercise type, and a student cannot tell that from the
     * picker: the compare-two-methods step only exists in Suitability, and the explain-your-reasoning
     * step only exists in Efficiency and Matching. Settling "compare methods 5 times" and then
     * practising Matching would look like the goal was broken. It is not broken — it was never
     * reachable there. The picker says so, and the dashboard repeats it for the goals that are
     * restricted, so the student knows which exercises to spend their time on.
     *
     * Derived from the exercise state machines, not from the copy: `selfExplanation` follows
     * `SuitabilityExerciseState` (which has no explanation state) and `methodComparison` follows
     * `ComparisonIntervention`, whose only renderer is `SuitabilityExercise`.
     */
    availableIn: GoalFocusOption[];

    /**
     * What the student has to do inside each exercise type listed in `availableIn`.
     *
     * Types that behave identically share one key, and `groupInExercise` folds them back into a single
     * line, so a goal that works the same way everywhere is described once rather than three times.
     */
    inExercise: GoalExerciseNote[];

    /** One sentence saying what `availableIn` means in practice. */
    whereKey: string;

    /**
     * Short form for a goal card on the dashboard, shown ONLY when the goal is not available in every
     * exercise type. Empty for the four that are, so the common case adds nothing to the card.
     */
    restrictionKey: string;

    /** Translation key describing what "any" means for this category. Empty when `focuses` is empty. */
    anyFocusKey: string;

    /** hintsAndErrors only: hints or errors. */
    qualities?: QualityDimension[];

    /** hintsAndErrors only: the per-exercise limits offered. */
    qualityLimits?: number[];
}

const METHODS: GoalFocusOption[] = [
    { value: "Elimination", labelKey: "method-elimination" },
    { value: "Substitution", labelKey: "method-substitution" },
    { value: "Equalization", labelKey: "method-equalization" },
];

const SUITABILITY: GoalFocusOption = { value: "Suitability", labelKey: "exercise-type-suitability" };
const EFFICIENCY: GoalFocusOption = { value: "Efficiency", labelKey: "exercise-type-efficiency" };
const MATCHING: GoalFocusOption = { value: "Matching", labelKey: "exercise-type-matching" };

const EXERCISE_TYPES: GoalFocusOption[] = [SUITABILITY, EFFICIENCY, MATCHING];

/**
 * The six categories, in the order they are shown.
 *
 * Ordered from the most concrete to the most reflective: what you practise, then how you practise
 * it, then how you think about it. A student scanning the list meets the easy choices first.
 */
export const GOAL_CATEGORIES: GoalCategoryDef[] = [
    {
        category: "method",
        icon: faCalculator,
        labelKey: "goals-cat-method",
        descriptionKey: "goals-cat-method-desc",
        metrics: ["exercises", "minutes"],
        targets: { exercises: [3, 5, 10], minutes: [10, 20, 30] },
        focuses: METHODS,
        anyFocusKey: "goals-focus-any-method",
        availableIn: EXERCISE_TYPES,
        inExercise: [
            { type: SUITABILITY.value, key: "goals-in-method-suitability" },
            { type: EFFICIENCY.value, key: "goals-in-method-efficiency" },
            { type: MATCHING.value, key: "goals-in-method-matching" },
        ],
        whereKey: "goals-where-method",
        restrictionKey: "",
    },
    {
        category: "exerciseType",
        icon: faShapes,
        labelKey: "goals-cat-exercise-type",
        descriptionKey: "goals-cat-exercise-type-desc",
        metrics: ["exercises", "minutes"],
        targets: { exercises: [3, 5, 10], minutes: [10, 20, 30] },
        focuses: EXERCISE_TYPES,
        anyFocusKey: "goals-focus-any-exercise-type",
        availableIn: EXERCISE_TYPES,
        inExercise: EXERCISE_TYPES.map((type) => ({ type: type.value, key: "goals-in-exercise-type" })),
        whereKey: "goals-where-exercise-type",
        restrictionKey: "",
    },
    {
        category: "selfExplanation",
        icon: faCommentDots,
        labelKey: "goals-cat-self-explanation",
        descriptionKey: "goals-cat-self-explanation-desc",
        metrics: ["exercises"],
        targets: { exercises: [3, 5, 10], minutes: [] },
        focuses: [],
        anyFocusKey: "",
        availableIn: [EFFICIENCY, MATCHING],
        inExercise: [
            { type: EFFICIENCY.value, key: "goals-in-self-explanation-efficiency" },
            { type: MATCHING.value, key: "goals-in-self-explanation-matching" },
        ],
        whereKey: "goals-where-self-explanation",
        restrictionKey: "goals-only-self-explanation",
    },
    {
        category: "methodComparison",
        icon: faScaleBalanced,
        labelKey: "goals-cat-method-comparison",
        descriptionKey: "goals-cat-method-comparison-desc",
        metrics: ["exercises"],
        targets: { exercises: [3, 5, 10], minutes: [] },
        focuses: [],
        anyFocusKey: "",
        availableIn: [SUITABILITY],
        inExercise: [{ type: SUITABILITY.value, key: "goals-in-method-comparison" }],
        whereKey: "goals-where-method-comparison",
        restrictionKey: "goals-only-method-comparison",
    },
    {
        category: "solveOnOwn",
        icon: faBrain,
        labelKey: "goals-cat-solve-on-own",
        descriptionKey: "goals-cat-solve-on-own-desc",
        metrics: ["exercises"],
        targets: { exercises: [3, 5, 10], minutes: [] },
        focuses: [],
        anyFocusKey: "",
        availableIn: EXERCISE_TYPES,
        inExercise: EXERCISE_TYPES.map((type) => ({ type: type.value, key: "goals-in-solve-on-own" })),
        whereKey: "goals-where-solve-on-own",
        restrictionKey: "",
    },
    {
        category: "hintsAndErrors",
        icon: faBullseye,
        labelKey: "goals-cat-hints-errors",
        descriptionKey: "goals-cat-hints-errors-desc",
        metrics: ["exercises"],
        targets: { exercises: [3, 5, 10], minutes: [] },
        focuses: [],
        anyFocusKey: "",
        qualities: ["hints", "errors"],
        qualityLimits: [0, 1, 2],
        availableIn: EXERCISE_TYPES,
        inExercise: EXERCISE_TYPES.map((type) => ({ type: type.value, key: "goals-in-hints-and-errors" })),
        whereKey: "goals-where-hints-and-errors",
        restrictionKey: "",
    },
];

/**
 * Extra line shown once a METHOD goal has been narrowed to one method.
 *
 * The general note for Efficiency and Matching already says that the student does not get a free
 * choice there. That is enough to understand the exercise in general, but not enough to understand
 * the goal they just set: "practise Elimination five times" is only reachable in an Efficiency
 * exercise whose system fits Elimination, and in a Matching exercise that happens to use it. Both
 * facts are properties of the individual exercise, which the student cannot see from the picker, so
 * they are stated here rather than left to be discovered. Suitability is absent because a narrowed
 * method goal is always reachable there: the student chooses the method themselves.
 */
export const METHOD_FOCUS_NOTES: GoalExerciseNote[] = [
    { type: EFFICIENCY.value, key: "goals-focus-method-efficiency" },
    { type: MATCHING.value, key: "goals-focus-method-matching" },
];

export function getCategoryDef(category: GoalCategory): GoalCategoryDef {
    const found = GOAL_CATEGORIES.find((c) => c.category === category);
    if (!found) throw new Error(`Unknown goal category: ${category}`);
    return found;
}

/** One row of the "where you can do this" panel: a note, and the exercise types it applies to. */
export interface GoalExerciseRow {
    /** The exercise types that share this note, in the order they appear in `availableIn`. */
    types: GoalFocusOption[];
    /** Translation key for the note itself. */
    key: string;
}

/**
 * Collapses a category's `inExercise` notes into one row per distinct note.
 *
 * Driven by `availableIn` rather than by `inExercise` so a note can never describe an exercise type
 * the goal cannot actually be advanced in, and so an exercise type added to `availableIn` without a
 * note is silently skipped here instead of rendering an unlabelled row.
 */
export function groupInExercise(def: GoalCategoryDef): GoalExerciseRow[] {
    const rows: GoalExerciseRow[] = [];

    for (const option of def.availableIn) {
        const note = def.inExercise.find((entry) => entry.type === option.value);
        if (!note) continue;

        const existing = rows.find((row) => row.key === note.key);
        if (existing) existing.types.push(option);
        else rows.push({ types: [option], key: note.key });
    }

    return rows;
}

/**
 * Builds the translation arguments for a goal's one-line summary.
 *
 * The caller passes this to `t(summaryKey(goal), args)` rather than being handed a finished string,
 * so the wording stays in the translation files — word order differs between German, English and
 * Japanese and cannot be assembled from fragments.
 */
export function goalSummaryKey(goal: StudyGoal): string {
    // hints and errors share one template because only the noun changes.
    if (goal.category === "hintsAndErrors") return "goals-summary-hints-errors";

    if (goal.category === "method" || goal.category === "exerciseType") {
        // "any method" cannot be slotted into "{{target}} {{focus}} exercises" without producing
        // "5 Any method exercises", so the unnarrowed case gets its own sentence.
        const suffix = goal.focus === null ? "-any" : "";
        return `goals-summary-${goal.category}-${goal.metric}${suffix}`;
    }

    return `goals-summary-${goal.category}`;
}

export function goalSummaryArgs(goal: StudyGoal): Record<string, string | number> {
    const def = getCategoryDef(goal.category);

    return {
        target: goal.target,
        focus: goal.focus ?? def.anyFocusKey,
        max: goal.maxPerExercise ?? 0,
        // "hints" | "errors" — the caller resolves it through `goal-quality-*`.
        quality: goal.quality ?? "hints",
        // "exercises" | "minutes" — the caller resolves it through `goal-unit-*`.
        unit: goal.metric,
    };
}

/** Stable, collision-resistant id for a new goal. */
export function newGoalId(): string {
    // crypto.randomUUID needs a secure context; the app is served over http in development, so a
    // fallback is required rather than optional.
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `goal-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * The shape of i18next's translate function, narrowed to what the goal code needs.
 *
 * `t` is passed around rather than imported so the goal modules stay free of framework types and
 * remain plain functions. `asTranslate` is the one place the cast happens.
 */
export type Translate = (key: string, options?: Record<string, unknown>) => string;

export function asTranslate(t: unknown): Translate {
    return t as Translate;
}

/**
 * The sentence a student reads for a goal, e.g. "5 Elimination exercises".
 *
 * The summary args carry KEYS ("method-elimination"), not text, which is why they are resolved
 * here rather than where the goal is built.
 */
export function describeGoal(goal: StudyGoal, t: Translate): string {
    const args = goalSummaryArgs(goal);

    return t(goalSummaryKey(goal), {
        ...args,
        focus: t(String(args.focus)),
        quality: t(`goal-quality-${args.quality}`),
        unit: t(`goal-unit-${args.unit}`),
    });
}
