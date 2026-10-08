import axios from "axios";

/**
 * Progress and reflection plumbing that outlived the old goal system.
 *
 * The old `goalUtils.ts` mixed three unrelated things: counters for the goal catalogue, the
 * student's progress/accuracy statistics, and the reflection API. Only the last two are still
 * used, so they live here under a name that says what they are. The goal catalogue's counters and
 * achievement checks are gone with the catalogue.
 *
 * The per-exercise error and hint counters survive because they feed the accuracy KPI and the
 * exercise-completion log, not because goals read them any more — goals read the anchor store.
 */

const BACKEND = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7273";

// ── Per-exercise error / hint counters ────────────────────────────────────────
//
// Module-level rather than stored: they describe the exercise currently open, and are reset the
// moment one finishes. Persisting them would let a half-finished exercise leak into the next one.

let _exerciseErrorCount = 0;
let _exerciseHintCount = 0;

export function resetExerciseErrorCount(): void { _exerciseErrorCount = 0; }
export function incrementExerciseErrorCount(): void { _exerciseErrorCount++; }
export function getExerciseErrorCount(): number { return _exerciseErrorCount; }

export function resetExerciseHintCount(): void { _exerciseHintCount = 0; }
export function incrementExerciseHintCount(): void { _exerciseHintCount++; }
export function getExerciseHintCount(): number { return _exerciseHintCount; }

// ── Per-exercise decision summary ─────────────────────────────────────────────
//
// What the student decided, as opposed to how many times they slipped. Held the same way as the
// counters above, and for the same reason: it describes the exercise currently open and is read
// once when it finishes, so a module-level value is exactly the right lifetime.
//
// The reflection needs it because errors and hints alone cannot tell "I found this easy" from "this
// was easy because I asked to be shown the answer". Without this, a student who took the help had
// nothing recorded that disagreed with them.

/** "Engaged" = they took the offer up. "Declined" = they asked for the help instead. */
export type DecisionOutcome = "Engaged" | "Declined";

const _exerciseDecisions = new Map<string, DecisionOutcome>();

export function resetExerciseDecisions(): void { _exerciseDecisions.clear(); }

/**
 * Records what the student did at one decision point.
 *
 * Declined wins when both happen for the same element. The two solution points both speak to working
 * it out yourself, so a student who tried the first and asked to be shown the second has taken help
 * on this exercise — and "declined" is the reading that keeps the reflection honest. Engaging wins
 * would let one independent moment paper over the help that followed.
 */
export function recordExerciseDecision(element: string, outcome: DecisionOutcome): void {
    if (_exerciseDecisions.get(element) === "Declined") return;
    _exerciseDecisions.set(element, outcome);
}

/**
 * The decisions as one line, e.g. `SolveOnOwn=Declined;MethodComparison=Engaged`.
 *
 * Empty when the student never reached a decision point, which callers must treat as "unknown"
 * rather than "engaged" — guessing would be worse than saying nothing.
 */
export function getExerciseDecisions(): string {
    return [..._exerciseDecisions].map(([element, outcome]) => `${element}=${outcome}`).join(";");
}

/** Parses the summary back into element/outcome pairs. Used by the server-side prompt builder. */
export function parseExerciseDecisions(summary: string): { element: string; outcome: DecisionOutcome }[] {
    if (!summary) return [];
    return summary.split(";").flatMap((part) => {
        const [element, outcome] = part.split("=");
        if (!element || (outcome !== "Engaged" && outcome !== "Declined")) return [];
        return [{ element, outcome }];
    });
}

// ── Rolling accuracy (dashboard KPI) ──────────────────────────────────────────

const ACCURACY_KEY = "accuracy_last5";

/**
 * Accuracy over the last five exercises, as a percentage.
 *
 * Hints count against it as well as errors. Both are "I needed help", and a student who finished
 * quickly by taking hints on every step has not done better than one who worked it out.
 */
export function getAccuracyLast5(studentId: number | string): number {
    const raw = localStorage.getItem(`${ACCURACY_KEY}_${studentId}`);
    if (!raw) return 100; // no data yet = 100% accuracy
    const parts = raw.split(",").map(Number);
    let errors = 0, hints = 0, exercises = 0;
    if (parts.length >= 3) {
        [errors, hints, exercises] = parts;
    } else if (parts.length === 2) {
        [errors, exercises] = parts; // legacy format: no hints tracked
    } else {
        return 100;
    }
    if (exercises <= 0) return 100;
    // Combined penalty: each error or hint counts against accuracy (max 5 units/exercise)
    const penalty = (errors + hints) / exercises;
    return Math.max(0, Math.round(100 - penalty * 20));
}

export interface AccuracyStats {
    errors: number;
    hints: number;
    exercises: number;
    avgErrors: number;
    avgHints: number;
}

/** Returns raw + averaged error/hint stats from the rolling accuracy tracker. */
export function getAccuracyStats(studentId: number | string): AccuracyStats {
    const raw = localStorage.getItem(`${ACCURACY_KEY}_${studentId}`);
    let errors = 0, hints = 0, exercises = 0;
    if (raw) {
        const p = raw.split(",").map(Number);
        if (p.length >= 3) {
            [errors, hints, exercises] = p;
        } else if (p.length === 2) {
            [errors, exercises] = p; // legacy: no hints recorded
        }
    }
    return {
        errors,
        hints,
        exercises,
        avgErrors: exercises > 0 ? Math.round((errors / exercises) * 10) / 10 : 0,
        avgHints: exercises > 0 ? Math.round((hints / exercises) * 10) / 10 : 0,
    };
}

export function addAccuracyEntry(studentId: number | string, errorCount: number, hintCount: number = 0): void {
    const key = `${ACCURACY_KEY}_${studentId}`;
    const raw = localStorage.getItem(key);
    let errors = 0, hints = 0, exercises = 0;
    if (raw) {
        const p = raw.split(",").map(Number);
        if (p.length >= 3) {
            [errors, hints, exercises] = p;
        } else if (p.length === 2) {
            [errors, exercises] = p; // legacy: no hints recorded
        }
    }
    errors += errorCount;
    hints += hintCount;
    exercises += 1;
    // Keep rolling window of last 5
    if (exercises > 5) { errors = errorCount; hints = hintCount; exercises = 1; }
    localStorage.setItem(key, `${errors},${hints},${exercises}`);
}

// ── Backend logging ───────────────────────────────────────────────────────────

/**
 * Records that an exercise was completed, which drives the exercises-completed count, the practice
 * streak, and the reflection the student will be offered afterwards.
 *
 * Failures are swallowed: this runs on the way out of an exercise, and a student should never be
 * blocked from leaving because a statistic could not be written.
 */
export async function logExerciseCompletion(
    studentId: number,
    exerciseType: string,
    errors = 0,
    hints = 0,
    decisions = ""
): Promise<void> {
    try {
        await axios.post(`${BACKEND}/student-progress/log-exercise`, {
            studentId, exerciseType, errors, hints, decisions
        });
    } catch {
        // Non-critical — don't block navigation
    }
}

// ── Dashboard data ────────────────────────────────────────────────────────────

export interface StudentProgressData {
    totalXP: number;
    exercisesCompleted: number;
    streakDays: number;
    methodCounts: { method: string; value: number }[];
    solvingMethodCounts: { method: string; value: number }[];
    /**
     * Goals completed per category, all time. Keyed by the same six category names the goal
     * catalogue uses. A category with no completions is simply absent, not sent as zero.
     */
    goalCountsByCategory: { category: string; count: number }[];
    dailyXp: { day: string; xp: number }[];
    goalsThisWeek: {
        id: number;
        studentId: number;
        goalId: string;
        goalLabel: string;
        xpEarned: number;
        exerciseType: string;
        totalErrors: number;
        totalHints: number;
        pippinMessages: number;
        completedAt: string;
    }[];
}

export async function fetchStudentProgress(studentId: number): Promise<StudentProgressData> {
    const response = await axios.get<StudentProgressData>(`${BACKEND}/student-progress/${studentId}`);
    return response.data;
}

// ── AI Reflection ────────────────────────────────────────────────────────────

export interface ReflectionResponse {
    feedback: string;
    /** "practice" | "goal" | "both" | "unclear" | "no_xp" */
    category: string;
}

/**
 * Asks the AI for feedback on a reflection the student wrote.
 *
 * Falls back to a fixed encouraging line rather than surfacing the failure. Reflection is the point
 * of the interaction; an error message about a model being unreachable would undercut it.
 */
export async function requestReflection(studentId: number, reflectionText: string, language = "en"): Promise<ReflectionResponse> {
    try {
        const response = await axios.post<ReflectionResponse>(
            `${BACKEND}/student-progress/reflect-on-stats/${studentId}`,
            { studentReflection: reflectionText, language }
        );
        return response.data ?? { feedback: "", category: "unclear" };
    } catch {
        return { feedback: "Keep reflecting on your progress — self-awareness is a powerful skill!", category: "unclear" };
    }
}

// ── Weak-Area Detection ──────────────────────────────────────────────────────

export interface WeaknessDimension {
    key: string;           // "decision-accuracy" | "efficiency-judgment" | "method-recognition" | "computational-skill" | "independence" | "consistency"
    label: string;
    score: number;         // 0–100
    maxScore: number;      // 100
    recommendedExercise: string;  // "Suitability" | "Efficiency" | "Matching"
}

export interface WeaknessResponse {
    dimensions: WeaknessDimension[];
    weakest: WeaknessDimension | null;
}

/** Fetch the student's weakness profile from the backend. */
export async function fetchWeakness(studentId: number | string): Promise<WeaknessResponse | null> {
    try {
        const response = await axios.get<WeaknessResponse>(
            `${BACKEND}/student-progress/weakness/${studentId}`
        );
        return response.data ?? null;
    } catch {
        return null;
    }
}
