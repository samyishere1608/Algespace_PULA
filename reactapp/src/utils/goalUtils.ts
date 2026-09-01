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

// ── Solo/AI daily counters (for session summary) ─────────────────────────────
const SOLO_TODAY_KEY = "solo_exercises";

export function getSoloExerciseCountToday(studentId: number | string): number {
    const today = new Date().toISOString().slice(0, 10);
    return parseInt(localStorage.getItem(`${SOLO_TODAY_KEY}_${studentId}_${today}`) ?? "0", 10);
}

export function incrementSoloExerciseCountToday(studentId: number | string): number {
    const today = new Date().toISOString().slice(0, 10);
    const next = getSoloExerciseCountToday(studentId) + 1;
    localStorage.setItem(`${SOLO_TODAY_KEY}_${studentId}_${today}`, String(next));
    return next;
}

const PIPPIN_TODAY_KEY = "pippin_exercises";

export function getPippinExerciseCountToday(studentId: number | string): number {
    const today = new Date().toISOString().slice(0, 10);
    return parseInt(localStorage.getItem(`${PIPPIN_TODAY_KEY}_${studentId}_${today}`) ?? "0", 10);
}

export function incrementPippinExerciseCountToday(studentId: number | string): number {
    const today = new Date().toISOString().slice(0, 10);
    const next = getPippinExerciseCountToday(studentId) + 1;
    localStorage.setItem(`${PIPPIN_TODAY_KEY}_${studentId}_${today}`, String(next));
    return next;
}

// ── Time tracking for normal exercises ────────────────────────────────────────
const EXERCISE_TIMES_KEY = "exercise_times";

export function getExerciseTimesToday(studentId: number | string): number[] {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(`${EXERCISE_TIMES_KEY}_${studentId}_${today}`);
    return raw ? JSON.parse(raw) as number[] : [];
}

export function addExerciseTimeToday(studentId: number | string, seconds: number): void {
    const today = new Date().toISOString().slice(0, 10);
    const times = getExerciseTimesToday(studentId);
    times.push(seconds);
    localStorage.setItem(`${EXERCISE_TIMES_KEY}_${studentId}_${today}`, JSON.stringify(times));
}

// ── Suitability exercise counter (cumulative, persisted per student) ───────────
const SUITABILITY_COUNT_KEY = "suitability_exercise_count";

export function getSuitabilityExerciseCount(studentId: number | string): number {
    const key = `${SUITABILITY_COUNT_KEY}_${studentId}`;
    return parseInt(localStorage.getItem(key) ?? "0", 10);
}

export function incrementSuitabilityExerciseCount(studentId: number | string): number {
    const next = getSuitabilityExerciseCount(studentId) + 1;
    const key = `${SUITABILITY_COUNT_KEY}_${studentId}`;
    localStorage.setItem(key, String(next));
    return next;
}

// ── Efficiency exercise counter (cumulative, for Master Efficiency goal) ───────
const EFFICIENCY_COUNT_KEY = "efficiency_exercise_count";

export function getEfficiencyExerciseCount(studentId: number | string): number {
    const key = `${EFFICIENCY_COUNT_KEY}_${studentId}`;
    return parseInt(localStorage.getItem(key) ?? "0", 10);
}

export function incrementEfficiencyExerciseCount(studentId: number | string): number {
    const next = getEfficiencyExerciseCount(studentId) + 1;
    const key = `${EFFICIENCY_COUNT_KEY}_${studentId}`;
    localStorage.setItem(key, String(next));
    return next;
}

// ── Matching exercise counter (cumulative, for Master Matching goal) ───────────
const MATCHING_COUNT_KEY = "matching_exercise_count";

export function getMatchingExerciseCount(studentId: number | string): number {
    const key = `${MATCHING_COUNT_KEY}_${studentId}`;
    return parseInt(localStorage.getItem(key) ?? "0", 10);
}

export function incrementMatchingExerciseCount(studentId: number | string): number {
    const next = getMatchingExerciseCount(studentId) + 1;
    const key = `${MATCHING_COUNT_KEY}_${studentId}`;
    localStorage.setItem(key, String(next));
    return next;
}

// ── Solo exercise counter (cumulative, persisted per student) ──────────────────
const SOLO_COUNT_KEY = "solo_exercise_count";

export function getSoloExerciseCount(studentId: number | string): number {
    const key = `${SOLO_COUNT_KEY}_${studentId}`;
    return parseInt(localStorage.getItem(key) ?? "0", 10);
}

export function incrementSoloExerciseCount(studentId: number | string): number {
    const next = getSoloExerciseCount(studentId) + 1;
    const key = `${SOLO_COUNT_KEY}_${studentId}`;
    localStorage.setItem(key, String(next));
    return next;
}

// ── Session method tracker (for Method Explorer goal) ─────────────────────────
const SESSION_METHODS_KEY = "session_methods";

export function getSessionMethods(studentId: number | string): Set<string> {
    const key = `${SESSION_METHODS_KEY}_${studentId}`;
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
}

export function addSessionMethod(studentId: number | string, method: string): Set<string> {
    const methods = getSessionMethods(studentId);
    methods.add(method);
    const key = `${SESSION_METHODS_KEY}_${studentId}`;
    localStorage.setItem(key, JSON.stringify([...methods]));
    return methods;
}

export function clearSessionMethods(studentId: number | string): void {
    const key = `${SESSION_METHODS_KEY}_${studentId}`;
    localStorage.removeItem(key);
}

// ── Weakness tracker (for Face Your Weakness goal) ────────────────────────────
const WEAKNESS_TARGET_KEY = "weakness_target_type";
const WEAKNESS_COUNT_KEY = "weakness_exercise_count";

/** Store which exercise type the student needs to target for Face Your Weakness. */
export function setWeaknessTargetType(studentId: number | string, exerciseType: string): void {
    localStorage.setItem(`${WEAKNESS_TARGET_KEY}_${studentId}`, exerciseType);
}

/** Get the target exercise type for Face Your Weakness. */
export function getWeaknessTargetType(studentId: number | string): string | null {
    return localStorage.getItem(`${WEAKNESS_TARGET_KEY}_${studentId}`);
}

/** Get how many exercises of the weakness target type have been completed. */
export function getWeaknessExerciseCount(studentId: number | string, exerciseType: string): number {
    const key = `${WEAKNESS_COUNT_KEY}_${studentId}_${exerciseType}`;
    return parseInt(localStorage.getItem(key) ?? "0", 10);
}

/** Increment the weakness exercise counter. Returns the new count. */
export function incrementWeaknessExerciseCount(studentId: number | string, exerciseType: string): number {
    const next = getWeaknessExerciseCount(studentId, exerciseType) + 1;
    const key = `${WEAKNESS_COUNT_KEY}_${studentId}_${exerciseType}`;
    localStorage.setItem(key, String(next));
    return next;
}

/** Clear weakness tracking for a student (when goal is completed or session ends). */
export function clearWeaknessTracking(studentId: number | string): void {
    localStorage.removeItem(`${WEAKNESS_TARGET_KEY}_${studentId}`);
    // Also clear all possible type counters
    ["Suitability", "Efficiency", "Matching"].forEach((t) => {
        localStorage.removeItem(`${WEAKNESS_COUNT_KEY}_${studentId}_${t}`);
    });
}

// ── Consecutive solo counter (for Perfect Solo Session) ──────────────────────
const CONSEC_SOLO_KEY = "consecutive_solo";

export function getConsecutiveSoloCount(studentId: number | string): number {
    return parseInt(localStorage.getItem(`${CONSEC_SOLO_KEY}_${studentId}`) ?? "0", 10);
}

export function incrementConsecutiveSoloCount(studentId: number | string): number {
    const next = getConsecutiveSoloCount(studentId) + 1;
    localStorage.setItem(`${CONSEC_SOLO_KEY}_${studentId}`, String(next));
    return next;
}

export function resetConsecutiveSoloCount(studentId: number | string): void {
    localStorage.setItem(`${CONSEC_SOLO_KEY}_${studentId}`, "0");
}

// ── Rolling accuracy (for Sharp Shooter + dashboard KPI) ─────────────────────
const ACCURACY_KEY = "accuracy_last5";

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

// ── Goal condition checking ────────────────────────────────────────────────────

export interface ExerciseCompletionData {
    exerciseType: string;   // "Suitability" | "Efficiency" | "Matching"
    totalErrors: number;
    totalHints: number;
    pippinMessages: number;
    isSolo: boolean;        // true if student chose "Solve on my own"
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
        // ── Tier 1: First Steps ──────────────────────────────────────────
        case "try-suitability":
            return data.exerciseType === "Suitability";

        case "try-efficiency":
            return data.exerciseType === "Efficiency";

        case "try-matching":
            return data.exerciseType === "Matching";

        case "choose-solo-once":
            return data.isSolo && data.pippinMessages === 0;

        // ── Tier 2: Growing Independence ──────────────────────────────────
        case "hint-free-run":
            return data.totalHints === 0 && data.pippinMessages === 0;

        case "no-ai-day": {
            if (studentId === undefined) return false;
            return data.pippinMessages === 0 && getPippinFreeCount(studentId) >= 2;
        }

        case "method-explorer":
            if (studentId === undefined) return false;
            const methods = getSessionMethods(studentId);
            return methods.has("Substitution") && methods.has("Elimination") && methods.has("Equalization");

        case "three-day-streak":
            // Checked via streak counter on dashboard — not per-exercise
            return false;

        // ── Tier 3: Decision Mastery ─────────────────────────────────────
        case "master-suitability":
            if (studentId === undefined) return false;
            return data.exerciseType === "Suitability" && getSuitabilityExerciseCount(studentId) >= 3;

        case "master-efficiency":
            if (studentId === undefined) return false;
            return data.exerciseType === "Efficiency" && getEfficiencyExerciseCount(studentId) >= 3;

        case "master-matching":
            if (studentId === undefined) return false;
            return data.exerciseType === "Matching" && getMatchingExerciseCount(studentId) >= 3;

        case "perfect-solo-session":
            if (studentId === undefined) return false;
            return data.isSolo && getConsecutiveSoloCount(studentId) >= 3;

        case "accuracy-sharp":
            if (studentId === undefined) return false;
            return getAccuracyLast5(studentId) >= 80;

        // ── Tier 4: Self-Directed Growth ──────────────────────────────────
        case "set-and-complete-plan":
        case "seven-day-streak":
        case "reflect-and-improve":
            // Milestone goals — checked at dashboard level, not per-exercise
            return false;

        case "independence-champion":
            if (studentId === undefined) return false;
            return data.isSolo && getSoloExerciseCount(studentId) >= 10;

        case "face-your-weakness": {
            if (studentId === undefined) return false;
            const targetType = getWeaknessTargetType(studentId);
            if (!targetType) return false;
            return data.exerciseType === targetType && getWeaknessExerciseCount(studentId, targetType) >= 3;
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
 * For single-exercise goals (try-suitability, hint-free-run, choose-solo-once)
 * progress is binary (0 or 100%) — show as "In progress".
 * For multi-step goals it returns real counts.
 */
export function getGoalProgress(
    goalId: string,
    studentId: number | string,
    _totalXP: number,
    streakDays: number
): GoalProgress {
    switch (goalId) {
        case "no-ai-day": {
            const current = getPippinFreeCount(studentId);
            const total = 2;
            return {
                current, total,
                percent: Math.min(100, Math.round((current / total) * 100)),
                label: `${current} / ${total} exercises`,
            };
        }
        case "three-day-streak": {
            const current = Math.min(streakDays, 3);
            return {
                current, total: 3,
                percent: Math.min(100, Math.round((current / 3) * 100)),
                label: `${current} / 3 days`,
            };
        }
        case "seven-day-streak": {
            const current = Math.min(streakDays, 7);
            return {
                current, total: 7,
                percent: Math.min(100, Math.round((current / 7) * 100)),
                label: `${current} / 7 days`,
            };
        }
        case "master-suitability": {
            const current = Math.min(getSuitabilityExerciseCount(studentId), 3);
            return {
                current, total: 3,
                percent: Math.min(100, Math.round((current / 3) * 100)),
                label: `${current} / 3 exercises`,
            };
        }
        case "independence-champion": {
            const current = Math.min(getSoloExerciseCount(studentId), 10);
            return {
                current, total: 10,
                percent: Math.min(100, Math.round((current / 10) * 100)),
                label: `${current} / 10 solo exercises`,
            };
        }
        default:
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

export async function logExerciseCompletion(studentId: number, exerciseType: string, errors = 0, hints = 0): Promise<void> {
    try {
        await axios.post(`${BACKEND}/student-progress/log-exercise`, { studentId, exerciseType, errors, hints });
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
    solvingMethodCounts: { method: string; value: number }[];
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

// ── AI Goal Suggestions ──────────────────────────────────────────────────────

export interface GoalSuggestion {
    id: string;
    reason: string;
}

export interface GoalPlanResponse {
    planTitle: string;
    planNarrative: string;
    goals: GoalSuggestion[];
}

export async function fetchAIGoalSuggestions(studentId: number): Promise<GoalPlanResponse | null> {
    try {
        const response = await axios.post<GoalPlanResponse>(`${BACKEND}/student-progress/suggest-goals/${studentId}`);
        return response.data ?? null;
    } catch {
        // AI unavailable — return null, caller shows fallback
        return null;
    }
}

// ── AI Reflection ────────────────────────────────────────────────────────────

export interface ReflectionResponse {
    feedback: string;
    category: string;  // "practice" | "goal" | "unclear"
}

export async function requestReflection(studentId: number, reflectionText: string): Promise<ReflectionResponse> {
    try {
        const response = await axios.post<ReflectionResponse>(
            `${BACKEND}/student-progress/reflect-on-stats/${studentId}`,
            { studentReflection: reflectionText }
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

// ── AI-Suggested Goal Tracking ───────────────────────────────────────────────

const AISuggestedKey = (studentId: number | string) => `ai_suggested_goals_${studentId}`;

export function setAISuggestedGoals(studentId: number | string, goalIds: string[]): void {
    localStorage.setItem(AISuggestedKey(studentId), JSON.stringify(goalIds));
}

export function getAISuggestedGoals(studentId: number | string): Set<string> {
    try {
        const raw = localStorage.getItem(AISuggestedKey(studentId));
        return new Set(raw ? JSON.parse(raw) as string[] : []);
    } catch {
        return new Set();
    }
}

export function isGoalAISuggested(studentId: number | string, goalId: string): boolean {
    return getAISuggestedGoals(studentId).has(goalId);
}
