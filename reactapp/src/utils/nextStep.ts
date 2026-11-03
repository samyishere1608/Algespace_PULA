import axios from "axios";
import type { GoalProgress, StudyGoal } from "@/types/student/goal.ts";
import type { TrackedScreen } from "@utils/screenLog.ts";

// Optional chaining so the rule engine can be imported by a plain Node script for testing: under
// Vite `import.meta.env` is always there, and outside it the fallback keeps the module loadable.
const BACKEND = import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:7273";

/**
 * "What should I do next?" — the buddy leaning in.
 *
 * THE SIGNAL IS CHOSEN HERE, NOT ON THE SERVER. Everything a suggestion could be built from already
 * exists in this client: goal progress is scored from the exercise events by `goalProgress.ts`, and
 * today's count, the streak and the three wallets arrive with the progress fetch. Re-deciding it in C#
 * would mean a second implementation of goal scoring, and the two would disagree the first time either
 * changed. The server is asked for one thing only: the wording, because the model key cannot live in a
 * browser.
 *
 * That split is also what makes the feature safe. The rule engine below cannot invent a fact — it
 * picks from numbers already on screen — and the model cannot change what is suggested, only how the
 * sentence sounds. If the server is slow, unreachable or declines, the client's own sentence is shown
 * and nothing about the behaviour changes.
 */

/**
 * How long the student must be COMPLETELY idle before the buddy speaks up.
 *
 * Every pointer move, key press, scroll, tap and tab switch resets this, so it measures "has not
 * touched anything", not "has not clicked a button". The point is to catch the student who has opened
 * the dashboard and is deciding, not the one reading a chart — which is why the timer is paired with
 * `LONG_DWELL_SECONDS` rather than firing the moment something looks still.
 */
export const IDLE_BEFORE_HINT_MS = 20_000;

/** "Not now" buys five minutes of quiet. The buddy menu stays available throughout. */
export const NEXT_STEP_SNOOZE_MS = 5 * 60_000;

/**
 * How long a student must have been sitting on one screen before "you have been looking at this a
 * while" is worth saying. Longer than the idle timer on purpose: the idle timer decides WHEN to speak,
 * this decides whether there is anything worth saying.
 */
export const LONG_DWELL_SECONDS = 90;

export type NextStepSignal =
    | "goal-near-complete"
    | "goal-zero-progress"
    | "streak-at-risk"
    | "no-exercises-today"
    | "weakest-wallet"
    | "long-dwell"
    | "default";

/** Where the action button under the bubble takes the student. */
export type NextStepTarget = "exercises" | "goals";

export interface NextStepContext {
    goals: StudyGoal[];
    progress: Record<string, GoalProgress>;

    /**
     * Turns a goal into the name the student sees on its card.
     *
     * Passed in rather than rebuilt here: the label comes from the translation catalogue
     * (`describeGoal`), and a second implementation would eventually name the same goal two ways in
     * two places on one screen.
     */
    labelFor: (goal: StudyGoal) => string;

    exercisesToday: number;
    streakDays: number;
    choiceXP: number;
    insightXP: number;
    resolveXP: number;
    surface: TrackedScreen;
    dwellSeconds: number;
}

export interface NextStepSuggestion {
    signal: NextStepSignal;

    /**
     * The kind of thing being offered: one goal, one exercise today, one long sit, one weak area.
     *
     * Two signals of the same kind say the same thing — "finish your goal" and "start your goal" are
     * both the goal option — so only the first of each kind is offered. Without that, a student with
     * one unfinished goal would be shown the same advice three times in different words.
     */
    kind: "goal" | "today" | "dwell" | "wallet";

    /** i18n key for the sentence, used when the server has nothing better. */
    templateKey: string;
    templateParams: Record<string, string | number>;

    /**
     * The reason shown under the sentence — the supporting number, built from what the student can see
     * on the dashboard so it always agrees with the screen. This is the only line allowed to name an XP
     * wallet, because naming it is what makes the option checkable.
     */
    whyKey: string;
    whyParams: Record<string, string | number>;

    target: NextStepTarget;

    /** Parameters sent to the server so its sentence can mention the same specifics. */
    phraseParams: {
        goalLabel?: string;
        remaining?: number;
        streakDays?: number;
        wallet?: "choice" | "insight" | "resolve";
        dwellSeconds?: number;
    };
}

/** Screens worth commenting on. Forgetting where you are is not the same on every tab. */
const PATIENT_SCREENS: TrackedScreen[] = ["analytics", "tree", "leaderboard", "goals", "shop"];

/**
 * The options worth offering right now, best first, at most `max`.
 *
 * TWO OR THREE, NEVER ONE. The buddy's job is to help a student decide, so it puts choices in front of
 * them rather than issuing an instruction — a single "do this" is a task, and the point of the feature
 * is that the student is still the one choosing.
 *
 * Every option is filtered twice:
 *   * never the screen they are already on, or the offer would point at the thing they are looking at;
 *   * never two of the same kind, or one unfinished goal would fill all three slots in different words.
 *
 * It can come back with only one, or none. That is deliberate: padding the list to reach three would
 * mean inventing advice, and "here is one thing, because it is the only thing that is true" is better
 * than a full menu of noise.
 */
export function chooseNextSteps(context: NextStepContext, max = 3): NextStepSuggestion[] {
    const picked: NextStepSuggestion[] = [];
    const kinds = new Set<NextStepSuggestion["kind"]>();

    for (const candidate of candidateSuggestions(context)) {
        if (candidate.target === context.surface) continue;
        if (kinds.has(candidate.kind)) continue;

        kinds.add(candidate.kind);
        picked.push(candidate);
        if (picked.length >= max) break;
    }

    return picked;
}

/**
 * Every suggestion that is currently true, in priority order, before de-duplication.
 *
 * The order is the ranking: acting on a goal that is one step from done comes before a general "you
 * have not started yet", and a specific goal comes before a comment about the wallet, because a goal
 * has a name the student chose and a wallet does not.
 */
function candidateSuggestions(context: NextStepContext): NextStepSuggestion[] {
    const candidates: NextStepSuggestion[] = [];
    const goals = context.goals.filter((goal) => !context.progress[goal.id]?.complete);

    // 1. A goal one step from done. The most motivating thing on the whole dashboard, and the one
    //    option that is about something the student already decided to do.
    const almostDone = goals
        .map((goal) => ({ goal, progress: context.progress[goal.id] }))
        .filter((entry): entry is { goal: StudyGoal; progress: GoalProgress } =>
            entry.progress !== undefined && entry.progress.target > 0)
        .map((entry) => ({ ...entry, remaining: entry.progress.target - entry.progress.current }))
        .filter((entry) => entry.remaining > 0 && entry.remaining <= 1)
        .sort((a, b) => b.progress.percent - a.progress.percent)[0];

    if (almostDone) {
        const label = context.labelFor(almostDone.goal);
        candidates.push({
            signal: "goal-near-complete",
            kind: "goal",
            templateKey: "buddy-next-goal-near",
            templateParams: { goal: label },
            whyKey: "buddy-next-why-goal",
            whyParams: { goal: label, remaining: almostDone.remaining },
            target: "exercises",
            phraseParams: { goalLabel: label, remaining: almostDone.remaining },
        });
    }

    // 2. A goal set and still at zero.
    const untouched = goals
        .map((goal) => ({ goal, progress: context.progress[goal.id] }))
        .filter((entry): entry is { goal: StudyGoal; progress: GoalProgress } =>
            entry.progress !== undefined && entry.progress.current === 0 && entry.progress.target > 0)[0];

    if (untouched && context.exercisesToday === 0) {
        const label = context.labelFor(untouched.goal);
        candidates.push({
            signal: "goal-zero-progress",
            kind: "goal",
            templateKey: "buddy-next-goal-zero",
            templateParams: { goal: label },
            whyKey: "buddy-next-why-goal-zero",
            whyParams: { goal: label },
            target: "exercises",
            phraseParams: { goalLabel: label },
        });
    }

    // 3. A streak worth protecting. Only when it is already a streak — one day is not a habit yet, and
    //    "you might break your streak" on day one is a threat where there is nothing to lose.
    if (context.streakDays >= 3 && context.exercisesToday === 0) {
        candidates.push({
            signal: "streak-at-risk",
            kind: "today",
            templateKey: "buddy-next-streak",
            templateParams: { streak: context.streakDays },
            whyKey: "buddy-next-why-streak",
            whyParams: { streak: context.streakDays, today: context.exercisesToday },
            target: "exercises",
            phraseParams: { streakDays: context.streakDays },
        });
    }

    // 4. A day with nothing on it yet. The plainest true thing there is.
    if (context.exercisesToday === 0) {
        candidates.push({
            signal: "no-exercises-today",
            kind: "today",
            templateKey: "buddy-next-start",
            templateParams: {},
            whyKey: "buddy-next-why-none",
            whyParams: {},
            target: "exercises",
            phraseParams: {},
        });
    }

    // 5. A long sit on one screen without starting anything.
    if (PATIENT_SCREENS.includes(context.surface) && context.dwellSeconds >= LONG_DWELL_SECONDS) {
        const shopping = context.surface === "shop";
        candidates.push({
            signal: "long-dwell",
            kind: "dwell",
            templateKey: shopping ? "buddy-next-dwell-shop" : "buddy-next-dwell",
            templateParams: {},
            whyKey: "buddy-next-why-dwell",
            whyParams: { seconds: Math.round(context.dwellSeconds / 30) * 30 },
            target: "exercises",
            phraseParams: { dwellSeconds: Math.round(context.dwellSeconds / 30) * 30 },
        });
    }

    // 6. The weakest of the three. The only option that talks about a score, which is why its reason
    //    line says what MOVES that score rather than printing the three numbers — a student reading
    //    "Choice 725 · Insight 486 · Resolve 231" learns nothing about what to do.
    const wallets = [
        { name: "choice" as const, xp: context.choiceXP },
        { name: "insight" as const, xp: context.insightXP },
        { name: "resolve" as const, xp: context.resolveXP },
    ];
    const weakest = wallets.reduce((low, entry) => (entry.xp < low.xp ? entry : low));

    // Choice and Resolve both come from goals; Insight comes from the exercises themselves.
    candidates.push({
        signal: "weakest-wallet",
        kind: "wallet",
        templateKey: `buddy-next-weakest-${weakest.name}`,
        templateParams: {},
        whyKey: `buddy-next-why-wallet-${weakest.name}`,
        whyParams: {},
        target: weakest.name === "insight" ? "exercises" : "goals",
        phraseParams: { wallet: weakest.name },
    });

    return candidates;
}

/**
 * Asks the server for nicer sentences, one per option.
 *
 * Returns an array positionally matching `suggestions`, with null wherever nothing usable came back —
 * a timeout, a rate limit, an empty line or a rejected signal. The caller substitutes its own sentence
 * for that one option, so a single refusal never costs the student the whole offer.
 */
export async function phraseNextSteps(
    studentId: number | string,
    suggestions: NextStepSuggestion[],
    language: string
): Promise<(string | null)[]> {
    const empty = suggestions.map(() => null);
    if (typeof studentId !== "number" || studentId <= 0 || suggestions.length === 0) return empty;

    try {
        const { data } = await axios.post<{ headlines: string[] }>(
            `${BACKEND}/student-progress/next-step`,
            {
                studentId,
                language,
                options: suggestions.map((suggestion) => ({
                    signal: suggestion.signal,
                    goalLabel: suggestion.phraseParams.goalLabel ?? "",
                    remaining: suggestion.phraseParams.remaining ?? 0,
                    streakDays: suggestion.phraseParams.streakDays ?? 0,
                    wallet: suggestion.phraseParams.wallet ?? "",
                    dwellSeconds: suggestion.phraseParams.dwellSeconds ?? 0,
                })),
            },
            { timeout: 12000 }
        );

        const headlines = data?.headlines ?? [];
        return suggestions.map((_, index) => {
            const line = (headlines[index] ?? "").trim();
            return line.length > 0 ? line : null;
        });
    } catch {
        return empty;
    }
}
