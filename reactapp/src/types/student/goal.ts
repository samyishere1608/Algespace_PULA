/**
 * The six things a student can set a goal about.
 *
 * FIVE of these are the dimensions the avoidance profile measures: method, exercise type, explaining
 * your reasoning, comparing methods and working it out yourself. A student who consistently declines
 * to compare methods is told so, and can then set a goal about comparing methods — the gap and the
 * goal name the same behaviour, which is what makes the nudge make sense to them.
 *
 * `hintsAndErrors` is the exception and is NOT an avoidance dimension. It measures accuracy rather
 * than a decision, so it is absent from `ANCHOR_ELEMENT` below and from the server's
 * `AnchorElement`. It is still a goal worth setting — the server proposes it from the average hints
 * and errors — but it has no gap behind it and is never nudged.
 *
 * So the two lists to keep in step are the five avoidance dimensions and their five categories, NOT
 * all six categories.
 */
export type GoalCategory =
    | "method"
    | "exerciseType"
    | "selfExplanation"
    | "methodComparison"
    | "solveOnOwn"
    | "hintsAndErrors";

/**
 * The five avoidance dimensions, under the names the server records them by.
 *
 * These strings must match `AnchorElement` in `webapi/Models/Anchors/AvoidanceProfile.cs`. They live
 * here rather than being spelled out at each use site because a typo in a string that is only ever
 * compared against server data fails silently: the lookup returns nothing and the feature simply
 * does not happen, with no error anywhere.
 *
 * There is no `HintsAndErrors` here on purpose. It is a goal category, not something the profile
 * measures, so nothing can ever be recorded against it as an element.
 */
export const ANCHOR_ELEMENT = {
    Method: "Method",
    ExerciseType: "ExerciseType",
    SelfExplanation: "SelfExplanation",
    MethodComparison: "MethodComparison",
    SolveOnOwn: "SolveOnOwn",
} as const;

/**
 * The goal category that addresses a given avoidance element.
 *
 * Every element has one, and every one of them is an element, so a lookup can never miss. Only three
 * of the five appear in `DECLINABLE` in `anchorDecisions.ts` — a student cannot decline a method or
 * an exercise type, they simply pick another — but all five are measured by the profile.
 */
export const CATEGORY_FOR_ELEMENT: Record<string, GoalCategory> = {
    [ANCHOR_ELEMENT.Method]: "method",
    [ANCHOR_ELEMENT.ExerciseType]: "exerciseType",
    [ANCHOR_ELEMENT.SelfExplanation]: "selfExplanation",
    [ANCHOR_ELEMENT.MethodComparison]: "methodComparison",
    [ANCHOR_ELEMENT.SolveOnOwn]: "solveOnOwn",
};

/**
 * How the goal is counted.
 *
 * "minutes" is only offered for method and exercise type, because those are the only two we can
 * time meaningfully — we know how long an exercise took, not how long the student spent on the
 * specific act of comparing two methods.
 */
export type GoalMetric = "exercises" | "minutes";

/** For the hints-and-errors goal: whether the limit is on hints taken or on errors made. */
export type QualityDimension = "hints" | "errors";

/**
 * One goal a student has chosen.
 *
 * Stored in the database (`ActiveGoals`), read and written by `utils/activeGoals.ts`. The CATALOGUE
 * — what a goal means, how it is counted, which exercise types can advance it — stays on the client,
 * so this shape can change without a migration. The server stores the choice; it does not interpret
 * it, which is why `category` is validated here and not there.
 */
export interface StudyGoal {
    /** Instance id. Two goals can share a category, so the category alone is not an identity. */
    id: string;

    category: GoalCategory;

    /**
     * The specific method or exercise type the goal is about, or null meaning "any".
     * Unused by the four yes/no categories, which have nothing to narrow down.
     */
    focus: string | null;

    metric: GoalMetric;

    /** How many exercises, or how many minutes, the student is aiming for. */
    target: number;

    /** hintsAndErrors only: which of the two the limit applies to. */
    quality?: QualityDimension;

    /** hintsAndErrors only: the per-exercise limit the student has to stay within. */
    maxPerExercise?: number;

    /**
     * When the student set the goal, as a UTC ISO-8601 string ending in "Z".
     *
     * Progress only ever counts work done after this moment. Without it, setting a goal would
     * instantly complete it for a student with any history — the goal would measure nothing.
     *
     * The zone marker is required rather than cosmetic: this value is parsed with `new Date(...)`,
     * which reads a stamp without one as LOCAL time and would shift the goal's start by the
     * browser's offset — counting exercises towards a goal that did not exist yet.
     */
    createdAt: string;
}

/** How far along a student is on one goal, as of a given set of completed exercises. */
export interface GoalProgress {
    /** Exercises counted, or minutes accumulated (rounded to one decimal for minutes). */
    current: number;
    target: number;

    /** 0–100, clamped. */
    percent: number;

    /** True once `current` has reached `target`. */
    complete: boolean;

    /** What `current` and `target` are counting, so the caller can label them. */
    unit: GoalMetric;
}

/**
 * One completed exercise, as the server recorded it.
 *
 * Returned as one row per exercise rather than as totals, because a goal like "five exercises with
 * at most two hints" needs the raw per-exercise numbers. Aggregating server-side would mean
 * inventing thresholds there that this file would then have to agree with.
 */
export interface GoalEvent {
    id: number;
    /** Completion time, "yyyy-MM-ddTHH:mm:ss" in UTC. */
    at: string;
    exerciseType: string;
    /** The solving method chosen. Empty when none was recorded. */
    method: string;
    selfExplanation: boolean;
    methodComparison: boolean;
    solveOnOwn: boolean;
    errors: number;
    hints: number;
    /** Whole-exercise time in seconds. */
    seconds: number;
}
