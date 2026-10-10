import type { FlexibilityExerciseResponse } from "@/types/flexibility/flexibilityExerciseResponse.ts";
import { Paths } from "@routes/paths.ts";

/**
 * Where one flexibility exercise lives, and what the exercise screen needs in order to open it.
 *
 * Shared by the two lists that show these exercises — the training page and the dashboard's
 * Exercises tab — because the exercise screen cannot be opened from a URL alone. It reads
 * `exerciseType` and `exerciseId` out of router state and refuses to render without them, so a list
 * that navigates with the wrong shape drops the student on an error screen instead of in their
 * exercise. Two separate copies of that payload would eventually disagree about one of the three
 * fields; this is the one copy.
 *
 * `allExerciseIds` is the FULL ordered list, not just the exercise being opened. The exercise screen
 * uses it to place the student ("Exercise 3 of 33"), so passing only the one id would leave that
 * count blank.
 */
export function exerciseNavTarget(
    entry: FlexibilityExerciseResponse,
    allExerciseIds: number[]
): { path: string; state: { exerciseType: FlexibilityExerciseResponse["exerciseType"]; exerciseId: number; exercises: number[] } } {
    return {
        path: `${Paths.FlexibilityPath}${Paths.ExercisesSubPath}${entry.id}`,
        state: {
            exerciseType: entry.exerciseType,
            exerciseId: entry.exerciseId,
            exercises: allExerciseIds,
        },
    };
}
