/**
 * Runs N virtual students against the server at the same time.
 *
 * THE MODEL
 * Each virtual student is a loop: do a full session, wait, do another. Think time inside the session
 * is what makes this different from an endpoint load test — a real cohort of 120 produces a low
 * average request rate with quiet periods and bursts, not a constant stream of parallel requests.
 * "120 students at the same time" means 120 of these loops, not 120 requests in flight.
 *
 * WHY TIME IS SCALED RATHER THAN REMOVED
 * `timeScale` shortens the pauses. It does NOT reduce the number of students — it makes each one
 * generate load faster, so a run at `timeScale: 0.2` with 120 students is really 600 students' worth
 * of traffic. That is a legitimate way to test headroom, and a misleading way to answer "can 120
 * people use this". The report says which one was measured.
 */

import { runStudentSession } from "./session.mjs";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The counter keys a session returns, so one session's result can be summed into the run's. */
const COUNTER_KEYS = [
    "attempts", "attemptsMax",
    "goalCompletions", "goalCompletionsMax",
    "goalsAdded", "goalsAddedMax",
    "goalsRemoved", "goalsRemovedMax",
    "reflections", "reflectionsMax",
    "agencyRows", "agencyRowsMax",
    "exerciseCompletions", "exerciseCompletionsMax",
    "tutorialSteps", "tutorialStepsMax",
    "nudgeRecords", "nudgeRecordsMax",
];

/**
 * Turns the run's counters into the expected row counts the integrity checks compare against.
 *
 * The two ends of each range are not symmetric, which is why this is done here rather than at the
 * call site:
 *
 * - `min` assumes every write whose reply was lost DID commit, and every delete whose reply was lost
 *   did NOT. That is the fewest rows the database could legitimately hold.
 * - `max` assumes the opposite. That is the most.
 *
 * Anything outside the range is a genuine lost or duplicated write, and nothing inside it can be
 * accused either way — which is the honest position, because the client cannot know.
 */
function expectationsFrom(counters) {
    const activeGoals = counters.goalsAdded - counters.goalsRemovedMax;
    const activeGoalsMax = counters.goalsAddedMax - counters.goalsRemoved;

    return {
        attempts: counters.attempts,
        attemptsMax: counters.attemptsMax,
        goalCompletions: counters.goalCompletions,
        goalCompletionsMax: counters.goalCompletionsMax,
        activeGoals: Math.max(0, activeGoals),
        activeGoalsMax: Math.max(Math.max(0, activeGoals), activeGoalsMax),
        // Each completed reflection writes two history turns, and always exactly two.
        reflectionTurns: counters.reflections * 2,
        reflectionTurnsMax: counters.reflectionsMax * 2,
        agencyRows: counters.agencyRows,
        agencyRowsMax: counters.agencyRowsMax,
        // The exercise-completion route is idempotent, so the session already reduced its own calls to
        // DISTINCT tuples. These are rows, not calls — nothing more to derive here.
        exerciseCompletions: counters.exerciseCompletions,
        exerciseCompletionsMax: counters.exerciseCompletionsMax,
        // One appended tutorial key per call.
        tutorialSteps: counters.tutorialSteps,
        tutorialStepsMax: counters.tutorialStepsMax,
        // One `NudgeOutcome:` row per attempt, since the attempt id is fresh each session.
        nudgeRecords: counters.nudgeRecords,
        nudgeRecordsMax: counters.nudgeRecordsMax,
    };
}

export async function simulate({
    client,
    ids,
    accounts,
    durationSeconds,
    timeScale = 1,
    language = "en",
    includeAi = false,
    onEvent = () => { },
}) {
    const deadline = performance.now() + durationSeconds * 1000;
    const started = performance.now();

    let stop = false;

    /** Think time. Scaled, but never interrupted — a session that stops mid-way would fire its
     *  remaining requests in a burst and report latencies for a load nobody produced. */
    const pause = (ms) => sleep(Math.max(0, ms * timeScale));

    /** Idle time between sessions, which IS interruptible so a run can end promptly. */
    async function idle(ms) {
        const until = performance.now() + Math.max(0, ms * timeScale);
        while (performance.now() < until && !stop) {
            await sleep(Math.min(250, Math.max(0, until - performance.now())));
        }
    }

    // `completionSent` / `completionConfirmed` live on the per-student state, not in the counters,
    // because the exercise-completion route is idempotent per (student, tuple) — a tuple already
    // written in an earlier session must not be counted again by a later one.
    const state = new Map(accounts.map((account) => [account.username, {
        goals: [],
        completionSent: new Set(),
        completionConfirmed: new Set(),
    }]));
    const counters = Object.fromEntries(COUNTER_KEYS.map((key) => [key, 0]));
    const errors = [];

    let completedSessions = 0;
    let sessionsInFlight = 0;

    async function studentLoop(account) {
        // Staggered arrivals. A cohort does not all appear in the same millisecond, and a thundering
        // herd at t=0 would measure the ramp rather than the steady state a class actually produces.
        await idle(Math.random() * 25_000);

        while (!stop && performance.now() < deadline) {
            sessionsInFlight += 1;

            try {
                const result = await runStudentSession({
                    api: (name) => client.forScenario(`student/${name}`),
                    account,
                    ids,
                    pause,
                    state: state.get(account.username),
                    options: { language, includeAi },
                });

                for (const key of COUNTER_KEYS) counters[key] += result[key] ?? 0;

                completedSessions += 1;
                sessionsInFlight -= 1;

                onEvent({
                    type: "session",
                    username: account.username,
                    completedSessions,
                    students: accounts.length,
                    counters: { ...counters },
                    elapsed: (performance.now() - started) / 1000,
                });
            } catch (error) {
                // One student hitting an unexpected response must not end the run: the failure is
                // recorded and the other 119 carry on, which is what a real cohort does anyway.
                sessionsInFlight -= 1;
                errors.push(`${account.username}: ${error?.message ?? error}`);
            }

            await idle(20_000 + Math.random() * 70_000);
        }
    }

    // A periodic tick so a UI can show progress without waiting for a whole session to finish.
    // A session takes minutes of real think time, so session-complete events alone are far too sparse.
    const ticker = setInterval(() => {
        const elapsed = (performance.now() - started) / 1000;

        onEvent({
            type: "tick",
            elapsed,
            durationSeconds,
            completedSessions,
            students: accounts.length,
            inFlight: sessionsInFlight,
            counters: { ...counters },
        });

        if (elapsed >= durationSeconds) stop = true;
    }, 2000);

    try {
        await Promise.all(accounts.map(studentLoop));
    } finally {
        clearInterval(ticker);
    }

    return {
        counters,
        expectations: expectationsFrom(counters),
        completedSessions,
        students: accounts.length,
        errors,
        wallSeconds: (performance.now() - started) / 1000,
    };
}
