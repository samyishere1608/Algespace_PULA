import axios from "axios";

const BACKEND = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7273";

/**
 * Which screen a student was looking at, and for how long.
 *
 * The dashboard has five tabs, a goal-setting dialog and the companion shop on top of them, and until
 * now the only thing that was recorded was what the student DID (an exercise, a goal, a reflection) —
 * never that they sat on the analytics page for six minutes reading their own numbers. That is a
 * different kind of behaviour and it was invisible.
 *
 * A visit is written when the student LEAVES a screen, carrying the seconds it was open, so one row is
 * one finished visit. The alternative — a row on arrival and then arithmetic across the table — makes
 * every question about dwell time a window function, and loses the last screen of every session.
 *
 * Visits shorter than `MIN_LOGGED_SECONDS` are dropped: a student flicking through five tabs would
 * otherwise look like they had studied five screens.
 */

/** Screens that are tracked. Anything else is ignored rather than sent. */
export type TrackedScreen = "main" | "exercises" | "analytics" | "leaderboard" | "tree" | "goals" | "shop";

/**
 * A screen entered and left inside a second is a misclick, not a visit.
 *
 * Measured from when the screen became the visible one, which for a tab is the click and for the goal
 * dialog is the moment it opened over the dashboard.
 */
const MIN_LOGGED_SECONDS = 2;

export function logScreenView(studentId: number | string, screen: TrackedScreen, seconds: number, language?: string): void {
    // Guests are not students. A demo session has no row to attach this to.
    if (typeof studentId !== "number" || studentId <= 0) return;
    if (seconds < MIN_LOGGED_SECONDS) return;

    try {
        void axios
            .post(`${BACKEND}/student-progress/screen-view`, {
                studentId,
                screen,
                seconds: Math.round(seconds),
                language: language ?? "",
            })
            .catch(() => {
                // Non-critical: this is research telemetry, never something the student is waiting on.
                // Failing to record a visit must not surface anywhere in the UI.
            });
    } catch {
        // Same.
    }
}

/**
 * Sends the visit that just ended, if there was one worth sending.
 *
 * Kept as a plain function rather than a hook so the caller owns the effect: the dashboard already has
 * one place that knows which screen is on top, and a hook that guessed at it would need the same
 * knowledge again.
 */
export function flushScreenVisit(
    visit: { screen: TrackedScreen; startedAt: number } | null,
    studentId: number | string,
    language?: string,
    now: number = Date.now()
): void {
    if (!visit) return;
    logScreenView(studentId, visit.screen, (now - visit.startedAt) / 1000, language);
}
