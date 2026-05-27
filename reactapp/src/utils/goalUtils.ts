import axios from "axios";
import { StudyGoal, ALL_STUDY_GOALS } from "@views/student/dashboard/SetStudyPlanModal.tsx";

const BACKEND = "http://localhost:7273";

// ── Per-exercise Pippin counter ───────────────────────────────────────────────
const PIPPIN_COUNT_KEY = "pippin_exercise_count";

export function resetPippinExerciseCount(): void {
    localStorage.setItem(PIPPIN_COUNT_KEY, "0");
}

export function incrementPippinExerciseCount(): void {
    const current = parseInt(localStorage.getItem(PIPPIN_COUNT_KEY) ?? "0", 10);
    localStorage.setItem(PIPPIN_COUNT_KEY, String(current + 1));
}

export function getPippinExerciseCount(): number {
    return parseInt(localStorage.getItem(PIPPIN_COUNT_KEY) ?? "0", 10);
}

// ── Per-exercise error / hint counters ────────────────────────────────────────
let _exerciseErrorCount = 0;
let _exerciseHintCount = 0;

export function resetExerciseErrorCount(): void { _exerciseErrorCount = 0; }
export function incrementExerciseErrorCount(): void { _exerciseErrorCount++; }
export function getExerciseErrorCount(): number { return _exerciseErrorCount; }

export function resetExerciseHintCount(): void { _exerciseHintCount = 0; }
export function incrementExerciseHintCount(): void { _exerciseHintCount++; }
export function getExerciseHintCount(): number { return _exerciseHintCount; }

// ── Pippin-free day counter (persisted per student per calendar day) ───────────
// Key: `pippin_free_count_${studentId}_${YYYY-MM-DD}`
function todayKey(studentId: number | string): string {
    const today = new Date().toISOString().slice(0, 10);
    return `pippin_free_count_${studentId}_${today}`;
}

export function getPippinFreeCount(studentId: number | string): number {
    return parseInt(localStorage.getItem(todayKey(studentId)) ?? "0", 10);
}

export function incrementPippinFreeCount(studentId: number | string): number {
    const next = getPippinFreeCount(studentId) + 1;
    localStorage.setItem(todayKey(studentId), String(next));
    return next;
}

// ── Goal condition checking ────────────────────────────────────────────────────

export interface ExerciseCompletionData {
    exerciseType: string;   // "Suitability" | "Efficiency" | "Matching"
    totalErrors: number;
    totalHints: number;
    pippinMessages: number;
}

/**
 * Returns goals whose completion condition is now satisfied.
 * studentId is needed for goals that track cumulative cross-exercise progress.
 */
export function checkCompletedGoals(
    activeGoalIds: string[],
    data: ExerciseCompletionData,
    studentId?: number | string
): StudyGoal[] {
    const active = ALL_STUDY_GOALS.filter((g) => activeGoalIds.includes(g.id));
    return active.filter((goal) => isGoalMet(goal, data, studentId));
}

function isGoalMet(
    goal: StudyGoal,
    data: ExerciseCompletionData,
    studentId?: number | string
): boolean {
    switch (goal.id) {
        case "complete-any-exercise":
            return true;

        case "no-hints":
            return data.totalHints === 0 && data.pippinMessages === 0;

        case "master-substitution":
            return data.exerciseType === "Efficiency";

        case "no-ai-4": {
            // Requires 2 exercises today with zero Pippin messages.
            // The caller must have already incremented the counter for this exercise
            // when pippinMessages === 0, before calling checkCompletedGoals.
            if (studentId === undefined) return false;
            return data.pippinMessages === 0 && getPippinFreeCount(studentId) >= 2;
        }

        default:
            return false;
    }
}

// ── Goal progress (for dashboard progress bars) ───────────────────────────────

export interface GoalProgress {
    current: number;
    total: number;
    /** 0–100 */
    percent: number;
    label: string;  // e.g. "1 / 2 exercises"
}

/**
 * Returns how far along the student is on a given goal.
 * For single-exercise goals (complete-any-exercise, no-hints, master-substitution)
 * progress is binary (0 or 100%) — show as "In progress".
 * For multi-step goals it returns real counts.
 */
export function getGoalProgress(
    goalId: string,
    studentId: number | string,
    totalXP: number,
    streakDays: number
): GoalProgress {
    switch (goalId) {
        case "no-ai-4": {
            const current = getPippinFreeCount(studentId);
            const total = 2;
            return {
                current,
                total,
                percent: Math.min(100, Math.round((current / total) * 100)),
                label: `${current} / ${total} exercises`,
            };
        }
        case "xp-300": {
            // Show XP earned this week toward 300 — use total XP as proxy (resets weekly on backend)
            // Use the current session XP capped at 300
            const current = Math.min(totalXP, 300);
            return {
                current,
                total: 300,
                percent: Math.min(100, Math.round((current / 300) * 100)),
                label: `${current} / 300 XP`,
            };
        }
        case "streak-3": {
            const current = Math.min(streakDays, 3);
            return {
                current,
                total: 3,
                percent: Math.min(100, Math.round((current / 3) * 100)),
                label: `${current} / 3 days`,
            };
        }
        default:
            // Single-step goals: 0% until completed
            return { current: 0, total: 1, percent: 0, label: "Complete to unlock" };
    }
}

// ── Backend logging ───────────────────────────────────────────────────────────

export async function logGoalCompletion(
    studentId: number,
    goal: StudyGoal,
    data: ExerciseCompletionData
): Promise<number> {
    const response = await axios.post<number>(`${BACKEND}/student-progress/log-goal`, {
        studentId,
        goalId: goal.id,
        goalLabel: goal.label,
        xpEarned: goal.xpReward,
        exerciseType: data.exerciseType,
        totalErrors: data.totalErrors,
        totalHints: data.totalHints,
        pippinMessages: data.pippinMessages,
    });
    return response.data;  // new total XP
}

export async function logExerciseCompletion(studentId: number, exerciseType: string): Promise<void> {
    try {
        await axios.post(`${BACKEND}/student-progress/log-exercise`, { studentId, exerciseType });
    } catch {
        // Non-critical — don't block navigation
    }
}

/**
 * Deducts XP for a shop purchase. Returns the new total XP.
 * Throws if the student has insufficient XP or the request fails.
 */
export async function spendXP(studentId: number, amount: number): Promise<number> {
    const response = await axios.post<number>(`${BACKEND}/student-progress/spend-xp`, { studentId, amount });
    return response.data;
}

// ── Dashboard data ────────────────────────────────────────────────────────────

export interface StudentProgressData {
    totalXP: number;
    exercisesCompleted: number;
    streakDays: number;
    methodCounts: { method: string; value: number }[];
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
