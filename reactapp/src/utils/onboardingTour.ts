/**
 * The dashboard tour a student sees once, after the initial concept onboarding is finished.
 *
 * This is NOT the same thing as `OnboardingStep` in storageUtils (bartering -> equalization ->
 * elimination). That one teaches the three solving methods inside the games. This one picks up
 * exactly where it stops: the student has just landed on the dashboard for the first time and has
 * never seen it.
 *
 * Steps are plain data so the overlay component stays free of content, and every string is a
 * translation key resolved at render time. Each step names the route it belongs to, because the tour
 * SPANS routes — it walks the student from the dashboard to the flexibility training list and on to
 * a read-only preview of an exercise.
 *
 * A step may also name an ANCHOR: a selector for the real element it is talking about. The overlay
 * dims the page and cuts a lit hole around that element, so the student reads the sentence while
 * looking at the thing itself rather than at a picture of it.
 */

import { Paths } from "@routes/paths.ts";

/** Where the tour is being run from, so the several entry points can share one component. */
export const TOUR_STORAGE_PREFIX = "algespace-dashboard-tour";

/**
 * The version of the tour a student has already seen.
 *
 * Versioned on purpose: if the dashboard is rearranged later, bumping this re-shows the tour once
 * for everyone without touching the concept-onboarding keys, which track real learning progress and
 * must never be reset for a cosmetic reason.
 */
export const TOUR_VERSION = 3;

export const TOUR_COMPLETED_KEY = (studentId: number | string): string =>
    `${TOUR_STORAGE_PREFIX}-v${TOUR_VERSION}-done-${studentId}`;

/** The step the tour is on. Kept in sessionStorage so it survives the route changes the tour causes. */
export const TOUR_STEP_KEY = `${TOUR_STORAGE_PREFIX}-step`;

/**
 * Whether a tour is running at this moment.
 *
 * The overlay has to be re-mounted on every route the tour visits, because a component inside the
 * router is unmounted the moment the tour navigates. The step index alone is not enough to decide
 * that — a student who has simply landed on the flexibility list must not be shown a tour — so the
 * fact that one is in progress is recorded separately.
 */
export const TOUR_ACTIVE_KEY = `${TOUR_STORAGE_PREFIX}-active`;

/** Which side of the spotlighted element the callout prefers. */
export type TourPlacement = "top" | "bottom" | "left" | "right" | "center";

/**
 * A small graphic shown inside the callout.
 *
 * Used by the opening steps, which teach concepts rather than point at things — there is no element
 * to spotlight yet, and a wall of text is a poor way to explain what a growth tree is. Each one is
 * built from the app's own parts (the real `GrowingTree`, the real agency colours and icons), so it
 * cannot drift from what the student later sees on the dashboard.
 */
export type TourVisual = "buddy" | "methods" | "currency" | "xp" | "tree" | "exercise-types";

/**
 * The read-only goal picker screen a step needs on screen behind it.
 *
 * The picker is a three-screen flow (`choose` -> category grid -> builder), so a step has to say
 * which screen it is describing. Absent means the picker is closed.
 */
export type TourPickerStep = "choose" | "own" | "builder";

/**
 * A real dashboard modal a step needs on screen behind it.
 *
 * Same reasoning as `TourPickerStep`: the tour points at the ACTUAL character chooser and the
 * actual wardrobe rather than at a mock-up of them, so the explanation cannot drift from the screens
 * the student opens later. Both are handed no-op handlers while the tour is running, so a
 * demonstration cannot change the student's companion or equip anything.
 */
export type TourBuddyModal = "chooser" | "shop";

export interface TourStep {
    /** Stable id, also the translation-key stem: `tour-<id>-title` / `tour-<id>-body`. */
    id: string;
    /**
     * Where the student has to be for this step to make sense.
     *
     * The tour navigates to this route when the step becomes active, which is what makes the
     * explanation arrive in the right place rather than describing a screen the student cannot see.
     */
    route: string;
    /**
     * Selector for the real element to light up. Absent means a centred card with no spotlight.
     *
     * The FIRST match that is actually visible is used, so the same attribute can sit on two
     * alternatives (a button that only renders in one of two states) without the tour having to
     * know which state the student is in.
     */
    anchor?: string;
    placement?: TourPlacement;
    /** Opens the real goal picker, read-only, on this screen of it. */
    picker?: TourPickerStep;
    /** Opens the real character chooser or wardrobe, read-only, behind this step. */
    buddyModal?: TourBuddyModal;
    /**
     * Shows one sample goal card that was never saved.
     *
     * The point of the goal leg is the whole arc, and the arc ends with the goal appearing on the
     * dashboard. Nothing was written, so the card has to be drawn from data instead.
     */
    showSampleGoal?: boolean;
    /** A small graphic to draw inside the callout. */
    visual?: TourVisual;
    /** Optional extra line rendered under the body, in the smaller note style. */
    noteKey?: string;
}

const DASHBOARD = Paths.StudentDashboardPath;
const FLEXIBILITY = Paths.FlexibilityPath;
const PREVIEW = Paths.TourFlexibilityPreviewPath;

/**
 * The whole walkthrough: the dashboard, then setting a goal on it, then where that goal is earned.
 *
 * The order is the student's own loop rather than the app's menu structure — you arrive, you decide
 * what you are working on, and then you go and do it. The two centre-card steps (`welcome`,
 * `to-training`, `done`) are the only ones with no spotlight; they are the seams between legs.
 */
export const TOUR_STEPS: TourStep[] = [
    // ── Getting to know the place ────────────────────────────────────────────
    // These five come FIRST and are the only ones with a graphic instead of a spotlight. The student
    // is being told what the platform is for before being shown around it — a tour that opens by
    // pointing at a progress bar explains the interface and not the point of it.
    { id: "buddy", route: DASHBOARD, placement: "center", visual: "buddy" },
    { id: "platform", route: DASHBOARD, placement: "center", visual: "methods" },
    { id: "agency-intro", route: DASHBOARD, placement: "center", visual: "currency" },
    { id: "xp", route: DASHBOARD, placement: "center", visual: "xp" },
    { id: "tree", route: DASHBOARD, placement: "center", visual: "tree", noteKey: "tour-tree-note" },

    // ── The dashboard ────────────────────────────────────────────────────────
    { id: "dashboard-intro", route: DASHBOARD, placement: "center" },
    { id: "agency", route: DASHBOARD, anchor: '[data-tour="nav-agency"]', placement: "bottom", noteKey: "tour-agency-note" },
    { id: "stats", route: DASHBOARD, anchor: '[data-tour="stats"]', placement: "top" },
    { id: "tabs", route: DASHBOARD, anchor: '[data-tour="tabs"]', placement: "right" },

    // ── Companions, and what unlocks them ────────────────────────────────────
    // XP is not only a number that goes up. It is what opens new companions and new looks, and that
    // is the whole reason the three agency wallets exist — but none of it is visible from the
    // dashboard, where the locked characters simply look absent.
    { id: "buddy-corner", route: DASHBOARD, anchor: '[data-tour="buddy-widget"]', placement: "left" },
    { id: "characters", route: DASHBOARD, anchor: '[data-tour="characters"]', placement: "left", buddyModal: "chooser", noteKey: "tour-characters-note" },
    { id: "outfits", route: DASHBOARD, anchor: '[data-tour="outfits"]', placement: "left", buddyModal: "shop", noteKey: "tour-outfits-note" },

    // ── Setting a goal, start to finish ──────────────────────────────────────
    { id: "goals", route: DASHBOARD, anchor: '[data-tour="goals-panel"]', placement: "bottom" },
    { id: "goals-click", route: DASHBOARD, anchor: '[data-tour="goals-cta"]', placement: "top" },
    { id: "picker-ways", route: DASHBOARD, anchor: '[data-tour="goals-choose"]', placement: "top", picker: "choose" },
    { id: "picker-categories", route: DASHBOARD, anchor: '[data-tour="goals-categories"]', placement: "top", picker: "own" },
    { id: "picker-target", route: DASHBOARD, anchor: '[data-tour="goals-builder"]', placement: "right", picker: "builder", noteKey: "tour-picker-target-note" },
    { id: "picker-where", route: DASHBOARD, anchor: '[data-tour="goals-where"]', placement: "left", picker: "builder" },
    { id: "picker-add", route: DASHBOARD, anchor: '[data-tour="goals-confirm"]', placement: "top", picker: "builder" },
    { id: "goal-set", route: DASHBOARD, anchor: '[data-tour="goals-panel"]', placement: "bottom", showSampleGoal: true },

    // ── Where a goal actually gets earned ────────────────────────────────────
    { id: "to-training", route: DASHBOARD, placement: "center" },
    { id: "flex-list", route: FLEXIBILITY, anchor: '[data-tour="flex-list"]', placement: "right" },
    { id: "flex-info", route: FLEXIBILITY, anchor: '[data-tour="flex-info"]', placement: "bottom" },
    { id: "flex-types", route: FLEXIBILITY, placement: "center", visual: "exercise-types" },

    // ── Inside an exercise (the REAL one, read-only — see FlexibilityPreview.tsx) ─
    { id: "ex-task", route: PREVIEW, anchor: '[data-tour="ex-task"]', placement: "bottom" },
    { id: "ex-system", route: PREVIEW, anchor: ".linear-system", placement: "bottom" },
    { id: "ex-choose", route: PREVIEW, anchor: ".method-selection", placement: "bottom" },
    { id: "ex-help", route: PREVIEW, anchor: ".flexibility-hint-button", placement: "bottom" },
    { id: "done", route: PREVIEW, placement: "center" },
];

/** True once this student has completed the current version of the tour. */
export function hasCompletedTour(studentId: number | string): boolean {
    try {
        return localStorage.getItem(TOUR_COMPLETED_KEY(studentId)) === "1";
    } catch {
        // Storage can be unavailable (private mode, blocked cookies). Treating that as "already
        // seen" is the safe direction: better to skip a tour than to show it on every navigation.
        return true;
    }
}

/** Records the tour as seen, and takes the overlay down with it. */
export function markTourCompleted(studentId: number | string): void {
    try {
        localStorage.setItem(TOUR_COMPLETED_KEY(studentId), "1");
        sessionStorage.removeItem(TOUR_STEP_KEY);
        sessionStorage.removeItem(TOUR_ACTIVE_KEY);
    } catch { /* non-critical */ }
}

/** Clears the "seen" flag so the student can run the tour again on demand. */
export function resetTour(studentId: number | string): void {
    try {
        localStorage.removeItem(TOUR_COMPLETED_KEY(studentId));
        sessionStorage.removeItem(TOUR_STEP_KEY);
        sessionStorage.removeItem(TOUR_ACTIVE_KEY);
    } catch { /* non-critical */ }
}

/** Whether the overlay should be mounted at all. Read by the pages the tour passes through. */
export function isTourActive(): boolean {
    try {
        return sessionStorage.getItem(TOUR_ACTIVE_KEY) === "1";
    } catch {
        return false;
    }
}

/** Ends the tour without recording it as seen — used when a page unmounts mid-walkthrough. */
export function clearTourActive(): void {
    try {
        sessionStorage.removeItem(TOUR_ACTIVE_KEY);
    } catch { /* non-critical */ }
}

/**
 * Begins the tour at step one.
 *
 * Used by the replay button and by the auto-start, so both produce exactly the same state — a
 * student who replays the tour gets the walkthrough, not a corner of it.
 */
export function startTour(studentId: number | string): void {
    try {
        localStorage.removeItem(TOUR_COMPLETED_KEY(studentId));
        sessionStorage.setItem(TOUR_ACTIVE_KEY, "1");
        sessionStorage.setItem(TOUR_STEP_KEY, "0");
    } catch { /* non-critical */ }
}

export function readTourStep(): number {
    try {
        const raw = sessionStorage.getItem(TOUR_STEP_KEY);
        const value = raw === null ? 0 : Number(raw);
        return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch {
        return 0;
    }
}

export function writeTourStep(step: number): void {
    try {
        sessionStorage.setItem(TOUR_STEP_KEY, String(step));
    } catch { /* non-critical */ }
}

/**
 * Whether the tour should start on its own for this student.
 *
 * Requires the concept onboarding to be COMPLETE. A student who is still being walked through
 * bartering/equalization/elimination has enough to absorb; the dashboard tour would otherwise
 * interrupt the sequence the research design depends on.
 *
 * A tour that is ALREADY UNDER WAY is never restarted. This matters because the walkthrough navigates
 * away from the dashboard and back, which unmounts and re-mounts the dashboard — and the thing that
 * starts a tour also resets it to step one. Without this check, a student who pressed Back partway
 * through would find themselves at the beginning again, having done nothing wrong.
 */
export function shouldAutoStartTour(studentId: number | string, onboardingStep: string | null): boolean {
    if (isTourActive()) return false;
    return onboardingStep === "complete" && !hasCompletedTour(studentId);
}
