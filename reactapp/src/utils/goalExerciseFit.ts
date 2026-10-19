import type { GoalCategory, StudyGoal } from "@/types/student/goal.ts";
import { FlexibilityStudyExerciseType } from "@/types/studies/enums.ts";

/**
 * How well one exercise suits one goal.
 *
 * `fits` means the exercise can move the goal. `figureOut` means it can, but only if the method the
 * student is practising is the one that happens to suit that exercise, and which method that is, is
 * the exercise's own graded decision, so it has to come from them.
 *
 * Neither is returned when the exercise cannot move the goal at all.
 *
 * The distinction matters because a method goal is reachable in an Efficiency exercise only if the
 * student picks the method that is quickest there. Saying "this one counts" would tell them the
 * answer from the list, so those rows are marked `figureOut` instead: the pointer without the
 * verdict.
 *
 * A goal that EVERY exercise can move is `fits` everywhere rather than "nothing to say". The list
 * filters by these values, so a null would hide the whole list from a student whose goal simply is
 * not narrow — "practise any method" and "solve it on your own" would both read as "no exercises for
 * this goal", which is the opposite of the truth.
 */
export type GoalFit = "fits" | "figureOut";

export interface GoalFitHint {
    fit: GoalFit;
    /** For a test id and for keying a marker that must not repeat itself. */
    goalId: string;
    category: GoalCategory;
    /** Translation key of the marker itself. */
    labelKey: string;
}

const FIT_LABEL = {
    fits: "dashboard-goal-fit",
    figureOut: "dashboard-goal-figure-out",
} as const;

/**
 * The types a category can be worked on in, as recorded in the goal catalogue.
 *
 * Kept here as plain values rather than read from `GOAL_CATEGORIES` because this is a decision about
 * one exercise row, not a rendering of the catalogue, and it has to answer without the picker's
 * options in hand.
 */
function fitsFor(goal: StudyGoal, type: FlexibilityStudyExerciseType, method?: string | null): GoalFit | null {
    const name = FlexibilityStudyExerciseType[type];

    switch (goal.category) {
        case "method": {
            // "Any method" is reachable everywhere, and so is any method in a Suitability exercise,
            // where the student picks it themselves.
            if (goal.focus === null) return "fits";
            if (type === FlexibilityStudyExerciseType.Suitability) return "fits";

            if (type === FlexibilityStudyExerciseType.Efficiency) {
                // Never `fits`: see the note on `GoalFit`.
                return "figureOut";
            }

            if (type === FlexibilityStudyExerciseType.Matching) {
                return method === goal.focus ? "fits" : null;
            }

            return null;
        }

        case "exerciseType":
            if (goal.focus === null) return "fits";
            return name === goal.focus ? "fits" : null;

        case "selfExplanation":
            // Only the two kinds that ask the student to explain a decision.
            return type === FlexibilityStudyExerciseType.Efficiency || type === FlexibilityStudyExerciseType.Matching
                ? "fits"
                : null;

        case "methodComparison":
            // Comparing two methods exists in Suitability only.
            return type === FlexibilityStudyExerciseType.Suitability ? "fits" : null;

        case "solveOnOwn":
        case "hintsAndErrors":
            // Every exercise can move these.
            return "fits";

        default:
            return null;
    }
}

/**
 * The one marker an exercise row should carry, or null.
 *
 * One, not one per goal: a student with three active goals would otherwise get three chips on thirty
 * rows. A certain fit outranks a "work it out", and among equals the goal set first wins, so the list
 * keeps a stable order between renders.
 */
export function goalFitHint(
    goals: readonly StudyGoal[],
    type: FlexibilityStudyExerciseType,
    method?: string | null
): GoalFitHint | null {
    let fallback: GoalFitHint | null = null;

    for (const goal of goals) {
        const fit = fitsFor(goal, type, method);
        if (fit === null) continue;

        const hint: GoalFitHint = { fit, goalId: goal.id, category: goal.category, labelKey: FIT_LABEL[fit] };
        if (fit === "fits") return hint;
        if (fallback === null) fallback = hint;
    }

    return fallback;
}
