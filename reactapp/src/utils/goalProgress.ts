import axios from "axios";
import type { GoalEvent, GoalProgress, StudyGoal } from "@/types/student/goal.ts";
import { GOAL_RESOLVE_XP, MAX_MINUTES_PER_EXERCISE } from "@utils/goalCatalog.ts";
import { addResolveXP } from "@utils/agencyUtils.ts";
import { removeGoals } from "@utils/activeGoals.ts";

const BACKEND = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7273";

// ── Timestamps ────────────────────────────────────────────────────────────────
//
// The server writes stamps as "yyyy-MM-ddTHH:mm:ss" in UTC, with no zone marker — the shape
// SQLite's datetime functions and the existing tables already use. Two consequences, both of which
// have to be handled here rather than at the call sites:
//
//   1. String comparison is safe and cheap, because every stamp is the same width and the same
//      zone. That is why the comparisons below are ordinal rather than parsed.
//   2. `new Date("2026-10-02T10:00:00")` is read as LOCAL time by JavaScript. Left alone, that
//      silently shifts every timestamp by the browser's offset, so the zone marker is reattached
//      on the way in and stripped on the way out.

/** Converts a server stamp into a Date, treating it as UTC. */
function serverToDate(stamp: string): Date {
    // Stamps with a zone already are already unambiguous; adding "Z" again would corrupt them.
    const hasZone = /[Zz]|[+-]\d{2}:?\d{2}$/.test(stamp);
    return new Date(hasZone ? stamp : `${stamp}Z`);
}

/** Converts a Date into the server's stamp format, in UTC. */
export function dateToServerStamp(date: Date): string {
    return date.toISOString().slice(0, 19);
}

/** The earliest of the goals' start times, as a server stamp — the point progress can be counted from. */
export function earliestGoalStart(goals: StudyGoal[]): string | null {
    if (goals.length === 0) return null;

    let earliest = new Date(goals[0].createdAt).getTime();
    for (const goal of goals) {
        const at = new Date(goal.createdAt).getTime();
        if (Number.isFinite(at) && at < earliest) earliest = at;
    }

    if (!Number.isFinite(earliest)) return null;
    return dateToServerStamp(new Date(earliest));
}

// ── Reading the facts ─────────────────────────────────────────────────────────

/**
 * Fetches the student's completed exercises, oldest first.
 *
 * Returns an empty list on failure rather than throwing. Every caller treats "we could not check"
 * and "nothing has happened yet" the same way — leave the goals alone — and a goal system that
 * throws errors at a student for a failed request would be worse than one that quietly waits.
 */
export async function fetchGoalEvents(studentId: number, since?: string | null): Promise<GoalEvent[]> {
    try {
        const { data } = await axios.get<GoalEvent[]>(`${BACKEND}/anchor-tracking/goal-events/${studentId}`, {
            params: since ? { since } : undefined,
        });
        return data ?? [];
    } catch {
        return [];
    }
}

// ── Scoring a goal ────────────────────────────────────────────────────────────

/** Whether one completed exercise counts towards this goal. */
function matches(goal: StudyGoal, event: GoalEvent): boolean {
    switch (goal.category) {
        case "method":
            // A null focus means "any method", which includes exercises where no method was ever
            // recorded — a student who opened an exercise and closed it still spent the time.
            return goal.focus === null || event.method === goal.focus;

        case "exerciseType":
            return goal.focus === null || event.exerciseType === goal.focus;

        case "selfExplanation":
            return event.selfExplanation;

        case "methodComparison":
            return event.methodComparison;

        case "solveOnOwn":
            return event.solveOnOwn;

        case "hintsAndErrors": {
            const limit = goal.maxPerExercise ?? 0;
            return goal.quality === "errors" ? event.errors <= limit : event.hints <= limit;
        }
    }
}

/**
 * Measures one goal against the student's completed exercises.
 *
 * Counting is bounded by the goal's own start: work done before the goal existed does not count.
 * The alternative — counting from the beginning of time — means a student with any history
 * completes a freshly set goal the instant they set it, which measures nothing and teaches that
 * goals are decoration.
 */
export function computeProgress(goal: StudyGoal, events: GoalEvent[]): GoalProgress {
    const since = dateToServerStamp(new Date(goal.createdAt));

    // Ordinal comparison is valid because every stamp is the same width in the same zone.
    const eligible = events.filter((event) => event.at >= since && matches(goal, event));

    let current: number;
    if (goal.metric === "minutes") {
        const seconds = eligible.reduce((sum, event) => sum + Math.min(event.seconds, MAX_MINUTES_PER_EXERCISE * 60), 0);
        current = Math.round((seconds / 60) * 10) / 10;
    } else {
        current = eligible.length;
    }

    const percent = goal.target > 0 ? Math.min(100, Math.round((current / goal.target) * 100)) : 0;

    return {
        current,
        target: goal.target,
        percent,
        complete: current >= goal.target,
        unit: goal.metric,
    };
}

/** True once the goal's target has been reached. */
export function isGoalMet(goal: StudyGoal, events: GoalEvent[]): boolean {
    return computeProgress(goal, events).complete;
}

// ── Checking after an exercise ────────────────────────────────────────────────

/**
 * Waits for the exercise that just finished to appear in the store, then returns everything.
 *
 * There is an unavoidable race here. The tracker posts the completed attempt immediately before it
 * hands control back to the caller, and that post is not awaited, so a read issued straight away can
 * land first and come back without the attempt the student just did. The retries close that window.
 *
 * The whole wait is bounded, and giving up is safe: the goal simply stays active and is caught on
 * the next completed exercise or the next dashboard load. Missing the celebration once is a far
 * smaller problem than making a student sit through an unbounded wait at the end of every exercise.
 */
export async function fetchGoalEventsAfterExercise(
    studentId: number,
    since: string | null,
    options: { attempts?: number; delayMs?: number; timeoutMs?: number } = {}
): Promise<GoalEvent[]> {
    // Generous on purpose. This is the only place a completed goal is celebrated, so giving up
    // early does not merely delay the celebration — it loses it, and the dashboard then completes
    // the goal silently. The wait only happens when a goal is active.
    const attempts = options.attempts ?? 8;
    const delayMs = options.delayMs ?? 600;
    const timeoutMs = options.timeoutMs ?? 8000;

    const deadline = Date.now() + timeoutMs;
    const recentWindowMs = 5 * 60_000;

    let last: GoalEvent[] = [];

    for (let attempt = 0; attempt < attempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        if (Date.now() > deadline) break;

        last = await fetchGoalEvents(studentId, since);
        if (Date.now() > deadline) break;

        const newest = last[last.length - 1];
        const landed = newest && Date.now() - serverToDate(newest.at).getTime() < recentWindowMs;
        if (landed) return last;
    }

    return last;
}

// ── Completing a goal ─────────────────────────────────────────────────────────

/**
 * Goals already awarded in this page's lifetime.
 *
 * Two checks run for the same completion — one straight after the exercise, one when the dashboard
 * loads — and they are both asynchronous. Removing the goal from storage is what normally prevents
 * a double award, but the two checks can overlap in the window before either write lands. This
 * guard closes that window; it is not a store, only a guard.
 */
const awarded = new Set<string>();

/** Resets the guard. Exported for tests and for a full page reload in development. */
export function resetAwardedGoals(): void {
    awarded.clear();
}

/** Records the completion on the server so it survives a cleared browser. Best-effort by design. */
async function logCompletion(studentId: number, goal: StudyGoal, label: string, event: GoalEvent | null): Promise<void> {
    try {
        await axios.post(`${BACKEND}/student-progress/log-goal`, {
            studentId,
            goalId: goal.category,
            goalLabel: label,
            xpEarned: GOAL_RESOLVE_XP,
            exerciseType: event?.exerciseType ?? "",
            totalErrors: event?.errors ?? 0,
            totalHints: event?.hints ?? 0,
        });
    } catch {
        // The student keeps the XP locally either way; only the server-side record is lost.
    }
}

export interface CompletionResult {
    goal: StudyGoal;
    /** The exercise that happened to be the one that tipped the goal over, when there is one. */
    trigger: GoalEvent | null;
}

/**
 * Finds the goals that have just been reached, awards Resolve XP for each and takes them out of
 * the active list.
 *
 * Resolve is the right currency: the goal was set by the student and this is them following through
 * on it. Nothing here awards Insight — facing something you have been avoiding is a different act
 * and is recognised where the nudge is offered, not here.
 *
 * `label` is the goal's already-translated one-line summary, passed in rather than built here
 * because translation belongs to the UI layer.
 */
export async function claimCompletedGoals(
    studentId: number,
    goals: StudyGoal[],
    events: GoalEvent[],
    label: (goal: StudyGoal) => string
): Promise<CompletionResult[]> {
    const completed: CompletionResult[] = [];

    for (const goal of goals) {
        if (awarded.has(goal.id)) continue;
        if (!isGoalMet(goal, events)) continue;

        // Claimed synchronously, before any await, so an overlapping check cannot get past this line.
        awarded.add(goal.id);

        const since = dateToServerStamp(new Date(goal.createdAt));
        const trigger = [...events].reverse().find((e) => e.at >= since) ?? null;

        addResolveXP(studentId, GOAL_RESOLVE_XP, "goal-completed");
        completed.push({ goal, trigger });
    }

    if (completed.length > 0) {
        // Taken off the server before the completions are logged. The goals are the thing that must
        // not survive: a finished goal left active would be claimed again on the next page load.
        await removeGoals(studentId, completed.map((c) => c.goal.id));

        // Recording the completions is a side concern: if it fails the student still has the XP and
        // the goal is still finished, so it must never delay or block the celebration.
        await Promise.allSettled(
            completed.map((c) => logCompletion(studentId, c.goal, label(c.goal), c.trigger))
        );
    }

    return completed;
}
