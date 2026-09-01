// ── Agency XP System ─────────────────────────────────────────────────────────
// Three separate XP wallets replacing the old unified XP + coins system.
// Persisted in localStorage for instant UI updates, synced to backend for durability.

import axios from "axios";

const BACKEND = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7273";

// ── Wallet keys ──────────────────────────────────────────────────────────────

const choiceKey   = (studentId: number | string) => `algespace_choice_xp_${studentId}`;
const insightKey  = (studentId: number | string) => `algespace_insight_xp_${studentId}`;
const resolveKey  = (studentId: number | string) => `algespace_resolve_xp_${studentId}`;

// ── Lifetime total (never decreases — used for ranking) ─────────────────────

const lifetimeKey = (studentId: number | string) => `algespace_lifetime_agency_${studentId}`;

// ── Choice XP ────────────────────────────────────────────────────────────────

export function getChoiceXP(studentId: number | string): number {
    return parseInt(localStorage.getItem(choiceKey(studentId)) ?? "0", 10) || 0;
}

export function addChoiceXP(studentId: number | string, amount: number, source: string = ""): number {
    const next = getChoiceXP(studentId) + amount;
    localStorage.setItem(choiceKey(studentId), String(next));
    addLifetimeAgency(studentId, amount);
    // Sync to backend (fire-and-forget)
    syncToBackend(studentId, "choice", amount, source);
    return next;
}

// ── Insight XP ───────────────────────────────────────────────────────────────

export function getInsightXP(studentId: number | string): number {
    return parseInt(localStorage.getItem(insightKey(studentId)) ?? "0", 10) || 0;
}

export function addInsightXP(studentId: number | string, amount: number, source: string = ""): number {
    const next = getInsightXP(studentId) + amount;
    localStorage.setItem(insightKey(studentId), String(next));
    addLifetimeAgency(studentId, amount);
    incrementTodayXp(studentId, "insight", amount);
    syncToBackend(studentId, "insight", amount, source);
    return next;
}

// ── Resolve XP ───────────────────────────────────────────────────────────────

export function getResolveXP(studentId: number | string): number {
    return parseInt(localStorage.getItem(resolveKey(studentId)) ?? "0", 10) || 0;
}

export function addResolveXP(studentId: number | string, amount: number, source: string = ""): number {
    const next = getResolveXP(studentId) + amount;
    localStorage.setItem(resolveKey(studentId), String(next));
    addLifetimeAgency(studentId, amount);
    incrementTodayXp(studentId, "resolve", amount);
    syncToBackend(studentId, "resolve", amount, source);
    return next;
}

// ── Total agency (used for tree growth) ──────────────────────────────────────

export function getTotalAgencyXP(studentId: number | string): number {
    return getChoiceXP(studentId) + getInsightXP(studentId) + getResolveXP(studentId);
}

// ── Lifetime (never decreases — ranking) ─────────────────────────────────────

function addLifetimeAgency(studentId: number | string, amount: number): void {
    const current = parseInt(localStorage.getItem(lifetimeKey(studentId)) ?? "0", 10) || 0;
    localStorage.setItem(lifetimeKey(studentId), String(current + amount));
}

export function getLifetimeAgency(studentId: number | string): number {
    return parseInt(localStorage.getItem(lifetimeKey(studentId)) ?? "0", 10) || 0;
}

// ── Today's Agency XP (resets daily, for session summary) ────────────────────

function todayAgencyKey(studentId: number | string, xpType: string): string {
    const today = new Date().toISOString().slice(0, 10);
    return `algespace_today_${xpType}_${studentId}_${today}`;
}

function incrementTodayXp(studentId: number | string, xpType: string, amount: number): void {
    const current = parseInt(localStorage.getItem(todayAgencyKey(studentId, xpType)) ?? "0", 10) || 0;
    localStorage.setItem(todayAgencyKey(studentId, xpType), String(current + amount));
}

export function getTodayChoiceXP(studentId: number | string): number {
    return parseInt(localStorage.getItem(todayAgencyKey(studentId, "choice")) ?? "0", 10) || 0;
}
export function getTodayInsightXP(studentId: number | string): number {
    return parseInt(localStorage.getItem(todayAgencyKey(studentId, "insight")) ?? "0", 10) || 0;
}
export function getTodayResolveXP(studentId: number | string): number {
    return parseInt(localStorage.getItem(todayAgencyKey(studentId, "resolve")) ?? "0", 10) || 0;
}

// ── Daily Intention Check-In ─────────────────────────────────────────────────
// Key: daily_intention_${studentId}_${YYYY-MM-DD}

function dailyKey(studentId: number | string): string {
    const today = new Date().toISOString().slice(0, 10);
    return `daily_intention_${studentId}_${today}`;
}

export interface DailyIntention {
    /** "practice" | "goal" | "review" | "custom" | null */
    choice: string | null;
    /** Free-text if student chose "Something else..." */
    customText: string;
    /** For custom intentions: AI-detected category ("practice" | "goal" | "unclear") */
    detectedCategory: string;
    /** Whether student completed ≥2 exercises today (checked on dashboard load) */
    followedThrough: boolean;
    /** exercisesCompleted count when intention was set (for delta comparison) */
    exercisesAtSet: number;
}

export function getDailyIntention(studentId: number | string): DailyIntention | null {
    try {
        const raw = localStorage.getItem(dailyKey(studentId));
        if (!raw) return null;
        return JSON.parse(raw) as DailyIntention;
    } catch {
        return null;
    }
}

export function setDailyIntention(
    studentId: number | string,
    choice: string,
    customText: string = "",
    exercisesAtSet: number = 0,
    detectedCategory: string = "unclear"
): void {
    const intention: DailyIntention = {
        choice,
        customText,
        detectedCategory,
        followedThrough: false,
        exercisesAtSet,
    };
    localStorage.setItem(dailyKey(studentId), JSON.stringify(intention));
}

export function markIntentionFollowedThrough(studentId: number | string): void {
    const intention = getDailyIntention(studentId);
    if (intention) {
        intention.followedThrough = true;
        localStorage.setItem(dailyKey(studentId), JSON.stringify(intention));
    }
}

/**
 * Checks if the student followed through on today's intention.
 * Returns the Resolve XP to award (0 if no intention or not followed through yet).
 */
export function checkIntentionFollowThrough(
    studentId: number | string,
    currentExercisesCompleted: number,
    goalsCompletedToday: number
): number {
    const intention = getDailyIntention(studentId);
    if (!intention || intention.followedThrough) return 0;

    let resolved = false;
    switch (intention.choice) {
        case "practice":
            // Need ≥2 more exercises since setting intention
            resolved = (currentExercisesCompleted - intention.exercisesAtSet) >= 2;
            break;
        case "goal":
            // Need at least 1 goal completed today
            resolved = goalsCompletedToday >= 1;
            break;
        case "custom":
            // Use AI-detected category for follow-through
            if (intention.detectedCategory === "both") {
                // Both practice AND goal — must satisfy BOTH
                const practiceOk = (currentExercisesCompleted - intention.exercisesAtSet) >= 2;
                const goalOk = goalsCompletedToday >= 1;
                resolved = practiceOk && goalOk;
            } else if (intention.detectedCategory === "practice") {
                resolved = (currentExercisesCompleted - intention.exercisesAtSet) >= 2;
            } else if (intention.detectedCategory === "goal") {
                resolved = goalsCompletedToday >= 1;
            } else if (intention.detectedCategory === "no_xp") {
                resolved = false;  // off-topic — never award
            }
            // "unclear" → no Resolve XP, AI couldn't classify
            break;
        // "review" — handled separately later
    }

    if (resolved) {
        markIntentionFollowedThrough(studentId);
        return 5; // Resolve XP for following through on daily intention
    }
    return 0;
}

// ── Agency progress summary (for dashboard display) ──────────────────────────

export interface AgencyProgress {
    choiceXP: number;
    insightXP: number;
    resolveXP: number;
    totalXP: number;
    lifetimeXP: number;
}

export function getAgencyProgress(studentId: number | string): AgencyProgress {
    return {
        choiceXP: getChoiceXP(studentId),
        insightXP: getInsightXP(studentId),
        resolveXP: getResolveXP(studentId),
        totalXP: getTotalAgencyXP(studentId),
        lifetimeXP: getLifetimeAgency(studentId),
    };
}

// ── Backend sync (fire-and-forget) ───────────────────────────────────────────

function syncToBackend(studentId: number | string, xpType: string, amount: number, source: string): void {
    if (typeof studentId !== "number" || studentId <= 0) return;
    try {
        axios.post(`${BACKEND}/student-progress/log-agency-xp`, {
            studentId,
            xpType,
            amount,
            source,
        }).catch(() => {
            // Non-critical — localStorage is source of truth for UI
        });
    } catch {
        // Silently fail — UI already updated via localStorage
    }
}

/**
 * Pulls agency XP from the backend and syncs localStorage.
 * Call this on dashboard mount to reconcile any cross-device differences.
 */
export async function syncAgencyFromBackend(studentId: number): Promise<AgencyProgress> {
    try {
        const response = await axios.get(`${BACKEND}/student-progress/${studentId}`);
        const data = response.data;
        // Sync localStorage with backend values (backend is newer source of truth)
        if (data.choiceXP !== undefined) localStorage.setItem(choiceKey(studentId), String(data.choiceXP));
        if (data.insightXP !== undefined) localStorage.setItem(insightKey(studentId), String(data.insightXP));
        if (data.resolveXP !== undefined) localStorage.setItem(resolveKey(studentId), String(data.resolveXP));
        if (data.lifetimeAgencyXP !== undefined) localStorage.setItem(lifetimeKey(studentId), String(data.lifetimeAgencyXP));
        return getAgencyProgress(studentId);
    } catch {
        // Backend unreachable — fall back to localStorage
        return getAgencyProgress(studentId);
    }
}
