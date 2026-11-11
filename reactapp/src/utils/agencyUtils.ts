// ── Agency XP System ─────────────────────────────────────────────────────────
// Three separate XP wallets replacing the old unified XP + coins system.
// Persisted in localStorage for instant UI updates, synced to backend for durability.

import axios from "axios";
import { pushState } from "@utils/studentState.ts";

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

export function addChoiceXP(
    studentId: number | string,
    amount: number,
    source: string = "",
    refId: string = ""
): number {
    const next = getChoiceXP(studentId) + amount;
    localStorage.setItem(choiceKey(studentId), String(next));
    addLifetimeAgency(studentId, amount);
    // Sync to backend (fire-and-forget)
    syncToBackend(studentId, "choice", amount, source, refId);
    return next;
}

/**
 * Takes Choice back, for an award that the app can prove was not earned.
 *
 * The only caller is a goal being deleted: the award for setting a goal is reversible by design, and
 * the reversal is what stops goals being added and deleted in a loop for points. The server does the
 * same subtraction and clamps at zero; this moves the browser's own copy so the number the student is
 * watching follows, and the next `syncAgencyFromBackend` reconciles the two.
 */
export function revokeChoiceXP(studentId: number | string, amount: number): number {
    const next = Math.max(0, getChoiceXP(studentId) - amount);
    bumpWalletVersion(studentId, "choice");
    localStorage.setItem(choiceKey(studentId), String(next));
    // The server takes the amount back out of the lifetime figure as well, so the browser's copy has
    // to follow it down. Leaving it alone made the local lifetime slowly exceed the server's, and the
    // next `syncAgencyFromBackend` then corrected it downward — a drop with nothing behind it.
    const lifetime = parseInt(localStorage.getItem(lifetimeKey(studentId)) ?? "0", 10) || 0;
    localStorage.setItem(lifetimeKey(studentId), String(Math.max(0, lifetime - amount)));
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

// ── XP the server has already written down ───────────────────────────────────

const XP_KEYS: Record<string, (studentId: number | string) => string> = {
    choice: choiceKey,
    insight: insightKey,
    resolve: resolveKey,
};

/**
 * Moves the browser's own copy forward for an award the SERVER has already recorded.
 *
 * WHY THIS EXISTS SEPARATELY FROM addInsightXP. Those functions write to localStorage AND post the award
 * to the backend, which is right for an award the browser decided. But for an award the server decides —
 * and now writes, in the same request — posting it back would pay twice: the server has the ledger row
 * already and would take the second one as a new award.
 *
 * The display still has to move, because the dashboard renders from localStorage. So this does the local
 * half only and leaves the ledger alone. It is also self-correcting: `syncAgencyFromBackend` overwrites
 * these values from the server on the next dashboard load, so a mistake here cannot outlive a reload.
 */
export function creditAwardAlreadyRecorded(
    studentId: number | string,
    xpType: "choice" | "insight" | "resolve",
    amount: number
): number {
    const key = XP_KEYS[xpType];
    const next = (parseInt(localStorage.getItem(key(studentId)) ?? "0", 10) || 0) + amount;

    bumpWalletVersion(studentId, xpType);
    localStorage.setItem(key(studentId), String(next));
    addLifetimeAgency(studentId, amount);
    // Mirrors the write paths it stands in for: choice is not tracked per day, insight and resolve are.
    if (xpType !== "choice") incrementTodayXp(studentId, xpType, amount);

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
    /** "practice" | "goal" | "review" | "skip" | null. */
    choice: string | null;
    /**
     * LEGACY. The free-text plan, from when the check-in also offered "Something else…". Nothing
     * writes it any more — the three options replaced it — but a row stored before that change still
     * carries it, and reading it back costs nothing.
     */
    customText: string;
    /** LEGACY, as above: the category the model put that free text into. */
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
    // Mirrored, so "you already answered this today" is the student's fact rather than the machine's —
    // otherwise the check-in is asked again on every seat in the lab.
    pushState(studentId, dailyKey(studentId), JSON.stringify(intention));
}

export function markIntentionFollowedThrough(studentId: number | string): void {
    const intention = getDailyIntention(studentId);
    if (intention) {
        intention.followedThrough = true;
        localStorage.setItem(dailyKey(studentId), JSON.stringify(intention));
        pushState(studentId, dailyKey(studentId), JSON.stringify(intention));
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
            // LEGACY. Written only by the old "Something else…" option, which the three plans replaced.
            // Kept because a student who set one before that change still has it for today, and the
            // category is the only thing that can judge a plan written in words.
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
        // "review" deliberately falls through, and pays nothing on its own: looking at your numbers
        // commits you to nothing. The dashboard follows that choice up with one question — "what do
        // you want to work on today?" — and RE-RECORDS the intention as `goal` or `practice`, which
        // are the two cases above. So the decision is still tracked; it just is not made twice.
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

// ── Backend sync (fire-and-forget, with a retry for awards the server refused) ─

/**
 * How many local credits each wallet has taken since this page loaded.
 *
 * The server answers an award with the wallet's new total, and that number is worth keeping because it
 * is the record. But a response can arrive after the student has earned something else, and adopting
 * an older total then would take the newer award off the screen. Bumping this counter on every local
 * credit lets a response tell "nothing else happened, adopt the server's figure" from "a newer award is
 * already on screen, leave it".
 */
const walletVersions = new Map<string, number>();

function versionKey(studentId: number | string, xpType: string): string {
    return `${studentId}:${xpType}`;
}

function walletVersion(studentId: number | string, xpType: string): number {
    return walletVersions.get(versionKey(studentId, xpType)) ?? 0;
}

function bumpWalletVersion(studentId: number | string, xpType: string): number {
    const next = walletVersion(studentId, xpType) + 1;
    walletVersions.set(versionKey(studentId, xpType), next);
    return next;
}

// ── Awards the server did not take ───────────────────────────────────────────

/**
 * Awards the server refused outright, kept until they land.
 *
 * WHY THIS EXISTS. The wallet is credited here first and posted afterwards, so that the number moves
 * the moment the student earns it. When that post failed it was swallowed — and the dashboard then
 * overwrites the wallet from the server on the next load, which quietly deleted the award from the
 * student's view. Reported from the second session: "my XP went down". Nothing was ever lost from the
 * ledger of awards the server accepted; what was lost was the ones it never saw.
 *
 * Only awards the server ANSWERED are kept. A request that never got a response (no network, tab
 * closed mid-flight) might still have been applied, and posting it again would pay twice, so those are
 * left alone rather than risk double-counting a student's XP. An HTTP error, by contrast, is the
 * server saying it did not take the award — 429s on a busy school network are the realistic case.
 */
interface QueuedAward {
    xpType: string;
    amount: number;
    source: string;
    refId: string;
    attempts: number;
}

const queueKey = (studentId: number | string) => `algespace_xp_queue_${studentId}`;

const MAX_AWARD_ATTEMPTS = 4;

function readQueue(studentId: number | string): QueuedAward[] {
    try {
        const raw = localStorage.getItem(queueKey(studentId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as QueuedAward[]) : [];
    } catch {
        return [];
    }
}

function writeQueue(studentId: number | string, queue: QueuedAward[]): void {
    try {
        if (queue.length === 0) localStorage.removeItem(queueKey(studentId));
        else localStorage.setItem(queueKey(studentId), JSON.stringify(queue));
    } catch { /* the award is already on screen; a full disk is not worth an error */ }
}

function enqueueAward(studentId: number | string, award: Omit<QueuedAward, "attempts">): void {
    const queue = readQueue(studentId);
    const existing = queue.find((entry) =>
        entry.xpType === award.xpType && entry.amount === award.amount &&
        entry.source === award.source && entry.refId === award.refId);
    if (existing) return;
    queue.push({ ...award, attempts: 0 });
    writeQueue(studentId, queue);
}

/**
 * Sends the awards the server refused earlier. Call it where the student is already waiting on the
 * server — the dashboard load — so a retry costs no extra waiting that they can feel.
 */
export async function flushXpQueue(studentId: number): Promise<void> {
    const queue = readQueue(studentId);
    if (queue.length === 0) return;

    const remaining: QueuedAward[] = [];
    for (const award of queue) {
        try {
            await axios.post(`${BACKEND}/student-progress/log-agency-xp`, {
                studentId,
                xpType: award.xpType,
                amount: award.amount,
                source: award.source,
                refId: award.refId,
            });
        } catch (error) {
            const answered = typeof error === "object" && error !== null && "response" in error;
            if (answered && award.attempts + 1 < MAX_AWARD_ATTEMPTS) {
                remaining.push({ ...award, attempts: award.attempts + 1 });
            }
            // Otherwise it is dropped: either the server has now taken it, or it has refused this
            // award often enough that it is not going to, and holding it forever helps nobody.
        }
    }
    writeQueue(studentId, remaining);
}

function syncToBackend(studentId: number | string, xpType: string, amount: number, source: string, refId: string = ""): void {
    if (typeof studentId !== "number" || studentId <= 0) return;

    const version = bumpWalletVersion(studentId, xpType);

    try {
        axios.post(`${BACKEND}/student-progress/log-agency-xp`, {
            studentId,
            xpType,
            amount,
            source,
            // What the award was for, when it can be named. The source column is a category and must
            // never carry an id; this is where a goal id travels so the award can be found and
            // reversed when the goal is deleted.
            refId,
        }).then((response) => {
            // The server answered with the wallet's new total. Adopt it, so the browser and the record
            // cannot drift apart between one dashboard load and the next — but only while nothing
            // newer has been credited here, or an older response would wipe a fresher award.
            const total = typeof response?.data === "number" ? response.data : undefined;
            if (total === undefined || walletVersion(studentId, xpType) !== version) return;
            const key = XP_KEYS[xpType];
            if (key) localStorage.setItem(key(studentId), String(total));
        }).catch((error) => {
            // The server answered with an error, so it did not take this award; keep it and try again
            // on the next dashboard load rather than letting the next sync delete it from the wallet.
            const answered = typeof error === "object" && error !== null && "response" in error;
            if (answered) enqueueAward(studentId, { xpType, amount, source, refId });
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
