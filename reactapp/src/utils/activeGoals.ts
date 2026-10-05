import axios from "axios";
import type { GoalCategory, GoalMetric, QualityDimension, StudyGoal } from "@/types/student/goal.ts";
import { GOAL_CATEGORIES } from "@utils/goalCatalog.ts";

/**
 * The student's current goals. They live in the database, in `ActiveGoals`.
 *
 * WHY NOT THE BROWSER
 * A goal is a commitment, and everything it is measured against — completed exercises, methods,
 * hints, errors — is already server-side. Kept in localStorage the two could disagree: clearing
 * storage erased the commitment while every exercise that had counted towards it stayed, and the
 * same student on a second device saw an empty goal list while their progress towards those goals
 * kept being counted. A goal is therefore a record, not a preference.
 *
 * The CATALOGUE still lives on the client (`goalCatalog.ts`) — what a goal means, how it is
 * counted, which exercise types can advance it. This module only moves the student's own choice to
 * and from the database, which is what lets a category be renamed without a migration.
 */

const BACKEND = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7273";

/** The server's row shape. Matches `ActiveGoalRecord` in the webapi. */
interface ActiveGoalRow {
    id: string;
    category: string;
    focus: string;
    metric: string;
    target: number;
    quality: string;
    maxPerExercise: number;
    createdAt: string;
}

/**
 * The last list the server gave us, per student.
 *
 * A failed request must not blank the dashboard: "we could not read your goals" and "you have no
 * goals" look identical on screen and only one of them is true. Falling back to the last known
 * list leaves the goal cards where they were until the next successful read. Keyed by student, so a
 * logout followed by a different login on the same machine cannot show one student another's goals.
 */
const lastKnown = new Map<number, StudyGoal[]>();

/** Goals are per student, so a guest — who has no id — has nothing to read or write. */
function isPersistable(studentId: number): boolean {
    return Number.isFinite(studentId) && studentId > 0;
}

/** The last list we saw for this student, for when a request fails. */
function fallback(studentId: number): StudyGoal[] {
    return lastKnown.get(studentId) ?? [];
}

/** Converts a server response into goals, remembering it as the last known list. */
function toGoals(rows: ActiveGoalRow[] | undefined, studentId: number): StudyGoal[] {
    const goals = (rows ?? []).map(toGoal).filter((goal): goal is StudyGoal => goal !== null);
    lastKnown.set(studentId, goals);
    return goals;
}

/** One server row, as a goal this build can measure — or null if it cannot. */
function toGoal(row: ActiveGoalRow): StudyGoal | null {
    const goal: StudyGoal = {
        id: row.id,
        category: row.category as GoalCategory,
        // The schema stores an absent narrowing as empty text, because a column DEFAULT never applies
        // to an explicitly supplied value. Turn it back into the null the model actually means.
        focus: row.focus === "" ? null : row.focus,
        metric: row.metric as GoalMetric,
        target: row.target,
        quality: row.quality === "" ? undefined : (row.quality as QualityDimension),
        maxPerExercise: row.maxPerExercise,
        createdAt: row.createdAt,
    };

    return isValidGoal(goal) ? goal : null;
}

/**
 * Deletes the goals an older build left in this browser.
 *
 * Nothing reads those keys any more, so this is only so that a stale list cannot be mistaken for
 * live state by anyone inspecting devtools. Best-effort — storage can be disabled.
 */
function discardBrowserGoals(studentId: number): void {
    try {
        localStorage.removeItem(`algespace_goals_${studentId}`);
    } catch {
        // Storage disabled or blocked. There is nothing to clean up in that case anyway.
    }
}

/**
 * Reads the goals, discarding anything that no longer fits the model.
 *
 * Storage outlives code: goals set before a category was renamed, or written by an older build,
 * would otherwise be read back and handed to the progress logic as though they were current. A
 * malformed goal is dropped rather than repaired, because a half-understood goal would be scored
 * against the wrong events and quietly report a wrong number.
 */
/**
 * Reads the student's goals, oldest first.
 *
 * Never throws. Every caller treats "we could not read them" and "there are none" the same way —
 * leave the screen as it is — and a goal system that showed an error to a student because a request
 * failed would be worse than one that quietly waits for the next one.
 */
export async function getActiveGoals(studentId: number): Promise<StudyGoal[]> {
    if (!isPersistable(studentId)) return [];

    discardBrowserGoals(studentId);

    try {
        const { data } = await axios.get<ActiveGoalRow[]>(`${BACKEND}/student-progress/goals/${studentId}`);
        return toGoals(data, studentId);
    } catch {
        return fallback(studentId);
    }
}

function isValidGoal(value: unknown): value is StudyGoal {
    if (typeof value !== "object" || value === null) return false;
    const goal = value as Partial<StudyGoal>;

    if (typeof goal.id !== "string" || goal.id === "") return false;
    if (typeof goal.createdAt !== "string" || goal.createdAt === "") return false;
    if (typeof goal.target !== "number" || !Number.isFinite(goal.target) || goal.target <= 0) return false;
    if (goal.metric !== "exercises" && goal.metric !== "minutes") return false;

    const def = GOAL_CATEGORIES.find((c) => c.category === goal.category);
    if (!def) return false;

    // The category must still offer the metric it was set with. Without this check, a metric that
    // was later removed from a category would keep being counted from a field nothing writes.
    if (!def.metrics.includes(goal.metric)) return false;

    if (goal.focus !== null && typeof goal.focus !== "string") return false;

    if (goal.category === "hintsAndErrors") {
        if (goal.quality !== "hints" && goal.quality !== "errors") return false;
        if (typeof goal.maxPerExercise !== "number" || goal.maxPerExercise < 0) return false;
    }

    return true;
}

/**
 * Adds a goal, replacing any existing goal with the same id. Returns the new list.
 *
 * A goal that fails our own validation is never sent: the server cannot check a category it does
 * not own, so a goal the client cannot measure would be stored and then counted against the wrong
 * events. Refusing it here keeps the table to goals that mean something.
 */
export async function addGoal(studentId: number, goal: StudyGoal): Promise<StudyGoal[]> {
    if (!isPersistable(studentId) || !isValidGoal(goal)) return fallback(studentId);

    try {
        const { data } = await axios.post<ActiveGoalRow[]>(`${BACKEND}/student-progress/goals`, {
            studentId,
            id: goal.id,
            category: goal.category,
            focus: goal.focus ?? "",
            metric: goal.metric,
            target: goal.target,
            quality: goal.quality ?? "",
            maxPerExercise: goal.maxPerExercise ?? 0,
            createdAt: goal.createdAt,
        });

        return toGoals(data, studentId);
    } catch {
        // The goal was NOT stored, so the honest result is the list without it. The caller renders
        // exactly this, which means a failed save leaves the goal off the screen rather than
        // showing it as set when the next page load would not find it.
        return fallback(studentId);
    }
}

/** Removes one goal by id. Returns the new list. */
export async function removeGoal(studentId: number, goalId: string): Promise<StudyGoal[]> {
    if (!isPersistable(studentId)) return [];

    try {
        const { data } = await axios.post<ActiveGoalRow[]>(`${BACKEND}/student-progress/goals/remove`, {
            studentId,
            goalIds: [goalId],
        });

        return toGoals(data, studentId);
    } catch {
        return fallback(studentId);
    }
}

/**
 * Removes several goals at once, used when a goal is completed and celebrated.
 *
 * Single removal goes through the same call rather than its own route: the server accepts only
 * GET/PUT/POST, so a DELETE would be refused by CORS before it ever reached the table.
 */
export async function removeGoals(studentId: number, goalIds: Iterable<string>): Promise<StudyGoal[]> {
    const ids = [...goalIds];
    if (!isPersistable(studentId) || ids.length === 0) return fallback(studentId);

    try {
        const { data } = await axios.post<ActiveGoalRow[]>(`${BACKEND}/student-progress/goals/remove`, {
            studentId,
            goalIds: ids,
        });

        return toGoals(data, studentId);
    } catch {
        // The goals are still active on the server, so they will be claimed again on the next check.
        // `claimCompletedGoals` guards against paying twice in that window.
        return fallback(studentId);
    }
}
