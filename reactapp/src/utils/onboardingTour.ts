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
import { TranslationNamespaces } from "@/i18n.ts";
import axios from "axios";
// The three exercise kinds, as they actually look. Screenshots rather than drawings: the student is
// being told what they are about to open, and a picture of the real screen is the only version of
// that which cannot be wrong. Filenames are the three kinds, spelled the same way as the enum.
import suitabilityImage from "@images/suitability.png";
import efficiencyImage from "@images/efficiency.png";
import matchingImage from "@images/matching.png";

/** Where the tour is being run from, so the several entry points can share one component. */
export const TOUR_STORAGE_PREFIX = "algespace-dashboard-tour";

const BACKEND = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7273";

/**
 * The parts of the walkthrough, each played when its part of the app is first opened.
 *
 * They are ordered as the student meets them, which is also the order of the steps below:
 *   core        — what the platform is for and how the dashboard is laid out. The only one that runs
 *                 by itself, on the first visit, because there is nothing to open first.
 *   companions  — the buddy, and what XP unlocks.
 *   goals       — setting a goal, start to finish.
 *   exercises   — where a goal is earned: the list, the three kinds, and inside an exercise.
 */
export type TourSection = "core" | "companions" | "goals" | "exercises";

export const TOUR_SECTIONS: TourSection[] = ["core", "companions", "goals", "exercises"];

/**
 * The version of the tour a student has already seen.
 *
 * Versioned on purpose: if the dashboard is rearranged later, bumping this re-shows the tour once
 * for everyone without touching the concept-onboarding keys, which track real learning progress and
 * must never be reset for a cosmetic reason.
 */
export const TOUR_VERSION = 4;

export const TOUR_COMPLETED_KEY = (studentId: number | string): string =>
    `${TOUR_STORAGE_PREFIX}-v${TOUR_VERSION}-done-${studentId}`;

/** Which sections have been offered, cached locally. The server's rows are the truth; see below. */
export const TOUR_OFFERED_KEY = (studentId: number | string): string =>
    `${TOUR_STORAGE_PREFIX}-v${TOUR_VERSION}-sections-${studentId}`;

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
export type TourVisual = "buddy" | "methods" | "currency" | "xp" | "tree";

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
     * Which section of the walkthrough this step belongs to.
     *
     * A section is played on its own, at the moment its part of the app is first opened, instead of
     * the whole thirty-odd steps running in one go on the first visit. The order of the sections is
     * the order they appear in `TOUR_STEPS`, and a section's steps must stay CONTIGUOUS — the overlay
     * finds the section's range by scanning for its first and last step.
     */
    section: TourSection;
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
    /**
     * A picture printed UNDER the explanation.
     *
     * The three exercise-kind steps show a screenshot of that kind of exercise. The overlay cannot
     * spotlight one — the student has not opened an exercise at this point — so a picture is the
     * only way to show them what the screen actually looks like.
     */
    image?: string;
    /**
     * Pull this step's title and/or body from somewhere other than `tour-<id>-title` / `-body`.
     *
     * The three exercise-kind steps have to be titled with the exercise module's OWN name for the
     * kind, and described with the sentence the exercise list already uses for it. Retyping either
     * into this namespace would leave two strings for one idea and two places to forget when the
     * German or Japanese wording is revised, so a step points at the original instead.
     */
    title?: { key: string; ns?: string };
    body?: { key: string; ns?: string };
    /** Optional extra line rendered under the body, in the smaller note style. */
    noteKey?: string;
    /**
     * One of the dashboard's side tabs that this step needs OPEN behind it.
     *
     * The exercise leg of the walkthrough lives on the dashboard now, and the exercise list is behind
     * the Exercises tab. A spotlight can only find an element that is mounted, so without this the
     * tour would search for a list that is not rendered, give up after its grace period, and fall
     * back to a centred card — telling the student about a list they cannot see.
     */
    tab?: "exercises";
}

const DASHBOARD = Paths.StudentDashboardPath;
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
    { id: "buddy", section: "core", route: DASHBOARD, placement: "center", visual: "buddy" },
    { id: "platform", section: "core", route: DASHBOARD, placement: "center", visual: "methods" },
    { id: "agency-intro", section: "core", route: DASHBOARD, placement: "center", visual: "currency" },
    { id: "xp", section: "core", route: DASHBOARD, placement: "center", visual: "xp" },
    { id: "tree", section: "core", route: DASHBOARD, placement: "center", visual: "tree", noteKey: "tour-tree-note" },

    // ── The dashboard ────────────────────────────────────────────────────────
    { id: "dashboard-intro", section: "core", route: DASHBOARD, placement: "center" },
    { id: "agency", section: "core", route: DASHBOARD, anchor: '[data-tour="nav-agency"]', placement: "bottom", noteKey: "tour-agency-note" },
    { id: "stats", section: "core", route: DASHBOARD, anchor: '[data-tour="stats"]', placement: "top" },
    { id: "tabs", section: "core", route: DASHBOARD, anchor: '[data-tour="tabs"]', placement: "right" },

    // ── Companions, and what unlocks them ────────────────────────────────────
    // XP is not only a number that goes up. It is what opens new companions and new looks, and that
    // is the whole reason the three agency wallets exist — but none of it is visible from the
    // dashboard, where the locked characters simply look absent.
    { id: "buddy-corner", section: "companions", route: DASHBOARD, anchor: '[data-tour="buddy-widget"]', placement: "left" },
    { id: "characters", section: "companions", route: DASHBOARD, anchor: '[data-tour="characters"]', placement: "left", buddyModal: "chooser", noteKey: "tour-characters-note" },
    { id: "outfits", section: "companions", route: DASHBOARD, anchor: '[data-tour="outfits"]', placement: "left", buddyModal: "shop", noteKey: "tour-outfits-note" },

    // ── Setting a goal, start to finish ──────────────────────────────────────
    { id: "goals", section: "goals", route: DASHBOARD, anchor: '[data-tour="goals-panel"]', placement: "bottom" },
    { id: "goals-click", section: "goals", route: DASHBOARD, anchor: '[data-tour="goals-cta"]', placement: "top" },
    { id: "picker-ways", section: "goals", route: DASHBOARD, anchor: '[data-tour="goals-choose"]', placement: "top", picker: "choose" },
    { id: "picker-categories", section: "goals", route: DASHBOARD, anchor: '[data-tour="goals-categories"]', placement: "top", picker: "own" },
    { id: "picker-target", section: "goals", route: DASHBOARD, anchor: '[data-tour="goals-builder"]', placement: "right", picker: "builder", noteKey: "tour-picker-target-note" },
    { id: "picker-where", section: "goals", route: DASHBOARD, anchor: '[data-tour="goals-where"]', placement: "left", picker: "builder" },
    { id: "picker-add", section: "goals", route: DASHBOARD, anchor: '[data-tour="goals-confirm"]', placement: "top", picker: "builder" },
    { id: "goal-set", section: "goals", route: DASHBOARD, anchor: '[data-tour="goals-panel"]', placement: "bottom", showSampleGoal: true },

    // ── Where a goal actually gets earned ────────────────────────────────────
    // All of this happens on the DASHBOARD, on its Exercises tab. The walkthrough used to walk the
    // student out to the standalone flexibility page and back, which taught them that the exercises
    // are a separate place. They are not: the dashboard is where a goal is set and where the
    // practising happens, and the two are one screen apart on purpose.
    { id: "to-training", section: "exercises", route: DASHBOARD, placement: "center" },
    { id: "flex-info", section: "exercises", route: DASHBOARD, tab: "exercises", anchor: '[data-tour="flex-info"]', placement: "bottom" },
    { id: "flex-list", section: "exercises", route: DASHBOARD, tab: "exercises", anchor: '[data-tour="flex-list"]', placement: "right" },
    { id: "flex-types", section: "exercises", route: DASHBOARD, tab: "exercises", placement: "center" },

    // ── The three kinds, one step each, each with a real screenshot ──────────
    // These were a single card listing all three. Three sentences side by side is a legend: it is
    // read once and remembered as "there are three of something". One card per kind, with the
    // actual screen printed underneath, gives each one somewhere to land before the next arrives.
    // The sentence about each kind is the exercise list's own, so a student who later reads the
    // filter chips on the dashboard meets exactly the words they were taught here.
    {
        id: "flex-type-suitability",
        section: "exercises",
        route: DASHBOARD,
        tab: "exercises",
        placement: "center",
        title: { key: "Suitability", ns: TranslationNamespaces.Flexibility },
        body: { key: "tour-visual-suitability-what" },
        image: suitabilityImage,
    },
    {
        id: "flex-type-efficiency",
        section: "exercises",
        route: DASHBOARD,
        tab: "exercises",
        placement: "center",
        title: { key: "Efficiency", ns: TranslationNamespaces.Flexibility },
        body: { key: "tour-visual-efficiency-what" },
        image: efficiencyImage,
    },
    {
        id: "flex-type-matching",
        section: "exercises",
        route: DASHBOARD,
        tab: "exercises",
        placement: "center",
        title: { key: "Matching", ns: TranslationNamespaces.Flexibility },
        body: { key: "tour-visual-matching-what" },
        image: matchingImage,
    },

    // ── Inside an exercise (the REAL one, read-only — see FlexibilityPreview.tsx) ─
    { id: "ex-task", section: "exercises", route: PREVIEW, anchor: '[data-tour="ex-task"]', placement: "bottom" },
    { id: "ex-system", section: "exercises", route: PREVIEW, anchor: ".linear-system", placement: "bottom" },
    { id: "ex-choose", section: "exercises", route: PREVIEW, anchor: ".method-selection", placement: "bottom" },
    { id: "ex-help", section: "exercises", route: PREVIEW, anchor: ".flexibility-hint-button", placement: "bottom" },
    { id: "done", section: "exercises", route: PREVIEW, placement: "center" },
];

/** True once this student has completed the core walkthrough (kept for the migration below). */
export function hasCompletedTour(studentId: number | string): boolean {
    try {
        return localStorage.getItem(TOUR_COMPLETED_KEY(studentId)) === "1";
    } catch {
        // Storage can be unavailable (private mode, blocked cookies). Treating that as "already
        // seen" is the safe direction: better to skip a tour than to show it on every navigation.
        return true;
    }
}

/**
 * The sections offered so far, as the server has them.
 *
 * A cache, not the truth: the truth is a row in the database, because a student changes device and
 * "already offered" has to follow them. This exists so the first paint never waits on the network,
 * and it is reconciled with the server the moment the dashboard loads.
 *
 * `null` means "we have never asked", which is different from an empty list and is what tells the
 * migration below that there is nothing local to migrate.
 */
export function readCachedSections(studentId: number | string): TourSection[] | null {
    try {
        const raw = localStorage.getItem(TOUR_OFFERED_KEY(studentId));
        if (raw === null) return null;
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        return parsed.filter((value): value is TourSection => TOUR_SECTIONS.includes(value as TourSection));
    } catch {
        return null;
    }
}

function writeCachedSections(studentId: number | string, sections: TourSection[]): void {
    try {
        localStorage.setItem(TOUR_OFFERED_KEY(studentId), JSON.stringify([...new Set(sections)]));
    } catch { /* non-critical */ }
}

/**
 * Replaces the cache with what the server holds, keeping anything recorded here that has not reached
 * it yet (a POST that failed, or one still in flight).
 */
export function syncOfferedSections(studentId: number | string): Promise<TourSection[]> {
    return axios
        .get<{ sections: string[] }>(`${BACKEND}/student-progress/tour-state/${studentId}`)
        .then(({ data }) => {
            const fromServer = (data?.sections ?? []).filter(
                (value): value is TourSection => TOUR_SECTIONS.includes(value as TourSection),
            );
            const merged = [...new Set([...fromServer, ...(readCachedSections(studentId) ?? [])])];
            writeCachedSections(studentId, merged);
            return merged;
        })
        .catch(() => readCachedSections(studentId) ?? []);
}

/**
 * Brings a student who watched the old single tour over to the new state.
 *
 * The tour used to be one flag in the browser. A student who set it has already seen everything, so
 * every section is recorded as offered — on the server, so it now follows them. Without this the
 * split would re-tour every existing student, which is not what "already seen" meant when they
 * agreed to it.
 */
function migrateCompletedTour(studentId: number | string): void {
    if (!hasCompletedTour(studentId)) return;
    if (readCachedSections(studentId) !== null) return;

    writeCachedSections(studentId, TOUR_SECTIONS);
    for (const section of TOUR_SECTIONS) void recordSectionOffered(studentId, section);
}

/** Whether this section has already been offered (and so must not be offered again). */
export function hasOfferedSection(studentId: number | string, section: TourSection): boolean {
    migrateCompletedTour(studentId);
    return (readCachedSections(studentId) ?? []).includes(section);
}

/** Tells the server a section has been offered. Idempotent there, so a repeat costs nothing. */
export function recordSectionOffered(studentId: number | string, section: TourSection): Promise<void> {
    const known = readCachedSections(studentId) ?? [];
    if (!known.includes(section)) writeCachedSections(studentId, [...known, section]);

    return axios
        .post(`${BACKEND}/student-progress/tour-state`, { studentId, section })
        .then(() => undefined)
        .catch(() => undefined);
}

/**
 * Whether a section should be OFFERED right now.
 *
 * Only when it has never been offered, and only once the concept onboarding is complete — a student
 * still being walked through bartering/equalization/elimination has enough to absorb.
 */
export function shouldOfferSection(
    studentId: number | string,
    section: TourSection,
    onboardingStep: string | null,
): boolean {
    if (onboardingStep !== "complete") return false;
    return !hasOfferedSection(studentId, section);
}

/** The first and last step index of a section, for playing it on its own. */
export function sectionBounds(section: TourSection): { from: number; to: number } {
    const indexes = TOUR_STEPS.map((step, index) => ({ step, index })).filter((entry) => entry.step.section === section);
    if (indexes.length === 0) return { from: 0, to: 0 };
    return { from: indexes[0].index, to: indexes[indexes.length - 1].index };
}

/**
 * Plays one section from its first step.
 *
 * Used by the offer ("Show me") and by the per-section "Show tutorial" button, so both produce the
 * same state. It records the section as offered, because a section that has been started has
 * certainly been offered — and saying "not now" records it the same way, which is what makes the
 * offer a one-off while the button keeps working.
 *
 * A replay writes nothing further: "do not offer again" was already true.
 */
export function startSectionTour(studentId: number | string, section: TourSection): void {
    try {
        sessionStorage.setItem(TOUR_ACTIVE_KEY, "1");
        sessionStorage.setItem(TOUR_STEP_KEY, String(sectionBounds(section).from));
    } catch { /* non-critical */ }

    void recordSectionOffered(studentId, section);
}

/**
 * Takes a finished or skipped section down.
 *
 * Nothing is recorded here: the section was already marked offered when it started, and a replay is
 * not a reason to change anything. The legacy single-tour flag is written so that a student who
 * watched the core walkthrough is still recognised as such if they later open the app on an older
 * build — and so the migration above has something to read on this one.
 */
export function finishSectionTour(studentId: number | string, section: TourSection): void {
    if (section === "core") {
        try { localStorage.setItem(TOUR_COMPLETED_KEY(studentId), "1"); } catch { /* non-critical */ }
    }

    try {
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
 * Whether the CORE section should start on its own for this student.
 *
 * Only the core section ever runs by itself, because it is the only one with nothing to open first —
 * every other section waits until the student opens its part, and then asks.
 *
 * A tour that is ALREADY UNDER WAY is never restarted. This matters because the walkthrough navigates
 * away from the dashboard and back, which unmounts and re-mounts the dashboard — and the thing that
 * starts a tour also resets it to step one. Without this check, a student who pressed Back partway
 * through would find themselves at the beginning again, having done nothing wrong.
 */
export function shouldAutoStartTour(studentId: number | string, onboardingStep: string | null): boolean {
    if (isTourActive()) return false;
    return shouldOfferSection(studentId, "core", onboardingStep);
}
