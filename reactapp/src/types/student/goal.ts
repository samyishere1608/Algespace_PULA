/**
 * The six things a student can set a goal about.
 *
 * These are deliberately the SAME six dimensions the avoidance profile measures. A student who
 * consistently declines to compare methods is told so, and can then set a goal about comparing
 * methods — the gap and the goal name the same behaviour, which is what makes the nudge make sense
 * to them. Adding a seventh category here without adding it to the profile (or vice versa) would
 * break that correspondence, so the two lists should always be changed together.
 */
export type GoalCategory =
    | "method"
    | "exerciseType"
    | "selfExplanation"
    | "methodComparison"
    | "solveOnOwn"
    | "hintsAndErrors";

/**
 * The same six dimensions, under the names the server records them by.
 *
 * These strings must match `AnchorElement` in `webapi/Models/Anchors/AvoidanceProfile.cs`. They live
 * here rather than being spelled out at each use site because a typo in a string that is only ever
 * compared against server data fails silently: the lookup returns nothing and the feature simply
 * does not happen, with no error anywhere.
 */
export const ANCHOR_ELEMENT = {
    Method: "Method",
    ExerciseType: "ExerciseType",
    SelfExplanation: "SelfExplanation",
    MethodComparison: "MethodComparison",
    SolveOnOwn: "SolveOnOwn",
    HintsAndErrors: "HintsAndErrors",
} as const;

/** The goal category that addresses a given element. */
export const CATEGORY_FOR_ELEMENT: Record<string, GoalCategory> = {
    [ANCHOR_ELEMENT.Method]: "method",
    [ANCHOR_ELEMENT.ExerciseType]: "exerciseType",
    [ANCHOR_ELEMENT.SelfExplanation]: "selfExplanation",
    [ANCHOR_ELEMENT.MethodComparison]: "methodComparison",
    [ANCHOR_ELEMENT.SolveOnOwn]: "solveOnOwn",
    [ANCHOR_ELEMENT.HintsAndErrors]: "hintsAndErrors",
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
