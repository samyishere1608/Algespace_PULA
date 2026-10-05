/**
 * One student's session, request for request, in the order the real application makes them.
 *
 * WHY THIS EXISTS
 * An endpoint load test answers "can this route take traffic". It cannot answer "can 120 students
 * use this", because the load a cohort produces is not a number of parallel requests — it is 120
 * people doing a sequence of things, each taking their own time. This file is that sequence.
 *
 * The order and the bodies below are taken from the client, not invented: `StudentDashboard`,
 * `useFlexibilityTracker`, `progressUtils`, `reflectionUtils`, `agencyUtils`, `activeGoals` and
 * `goalProgress`. If any of them changes, this file has to change with it or the test stops
 * measuring the real thing.
 *
 * WHAT IS DELIBERATELY NOT HERE
 * `reflection/evaluate` calls OpenAI on every request. Including it would both spend real money and
 * put seconds of model latency into a measurement of the database, so it is opt-in via
 * `options.includeAi` and marked in the report when it is on.
 */

import { EXERCISE_TYPE, CHOICE_PHASE, PHASE, ACTION_PHASE } from "./fixtures.mjs";

/** A pause that can be scaled, so a run can be compressed without changing the mix of actions. */
function thinkTime(pause, minMs, maxMs) {
    return pause(minMs + Math.random() * (maxMs - minMs));
}

const REFLECTION_ANSWER =
    "I chose Elimination because the coefficients of x are equal, so subtracting one equation " +
    "from the other removes x in a single step and leaves y directly.";

/**
 * Runs one full session for one student.
 *
 * Returns the row counts this session believes it created, so the integrity checks can compare them
 * against the database. That comparison is the point of the whole exercise: a write that silently
 * vanishes under load still returns `200`, and only the row count disagrees.
 */
export async function runStudentSession({ api, account, ids, pause, state, options }) {
    const counters = {
        attempts: 0, attemptsMax: 0,
        goalCompletions: 0, goalCompletionsMax: 0,
        goalsAdded: 0, goalsAddedMax: 0,
        goalsRemoved: 0, goalsRemovedMax: 0,
        reflections: 0, reflectionsMax: 0,
        agencyRows: 0, agencyRowsMax: 0,
        exerciseCompletions: 0, exerciseCompletionsMax: 0,
        tutorialSteps: 0, tutorialStepsMax: 0,
        nudgeRecords: 0, nudgeRecordsMax: 0,
    };

    /**
     * Counts a write.
     *
     * Every write is counted TWICE: once as "sent", and once as "confirmed" when the server said so.
     * The gap is the requests whose reply never arrived, and a write like that may or may not have
     * committed — the client cannot tell. The integrity checks need both ends of that range, because
     * a single expected number would report a timed-out write as a lost one, or a lost one as fine.
     */
    const wrote = (result, key) => {
        counters[`${key}Max`] += 1;
        if (result.ok) counters[key] += 1;
    };

    const base = { userId: account.id, username: account.username, studyId: 0 };
    const scope = (name) => api(name);

    // ── 1. Dashboard ────────────────────────────────────────────────────────
    // What `StudentDashboard` fires on mount. All reads; a student does this every time they arrive.
    {
        const dashboard = scope("dashboard");
        await dashboard.get(`/student-progress/${account.id}`, "progress");
        await dashboard.get(`/student-progress/weakness/${account.id}`, "weakness");
        await dashboard.get(`/student-progress/tutorial/${account.id}`, "tutorial");
        await dashboard.get(`/student-progress/reflection-queue/${account.id}`, "reflection-queue");
        await dashboard.get(`/student-progress/goals/${account.id}`, "goals");
        await dashboard.get(`/student-progress/exercises/${account.id}`, "completed-exercises");

        // Only fetched when goals exist — `refreshGoals` returns early otherwise.
        if (state.goals.length > 0) {
            await dashboard.get(`/anchor-tracking/goal-events/${account.id}`, "goal-events");
        }

        await thinkTime(pause, 4000, 9000);
    }

    // ── 1b. Onboarding state ──────────────────────────────────────────────
    // `setOnboardingStep` is the only caller of the tutorial route, so it fires while a student is
    // still ONBOARDING and never again. Most sessions skip it — but the ones that do not are exactly
    // the students a class has just created, and they all do it at once, so it belongs in the model.
    //
    // The key is unique per call on purpose: the endpoint appends the key to a JSON array and is a
    // read-modify-write, so a unique key makes every call countable in the result.
    if (Math.random() < 0.15) {
        const tutorial = scope("tutorial");
        const key = `sim-tut-${Math.random().toString(36).slice(2, 10)}`;

        wrote(await tutorial.post(`/student-progress/tutorial/${account.id}`, {
            studentId: account.id,
            onboardingStep: "complete",
            tutorialKey: key,
        }, "tutorial-step"), "tutorialSteps");
    }

    // ── 2. Occasionally set a goal ──────────────────────────────────────────
    // A student decides what to work on. Kept below the cap the picker implies.
    if (state.goals.length < 2 && Math.random() < 0.25) {
        const goals = scope("goals");
        const id = `sim-${account.id}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
        const target = 1 + Math.floor(Math.random() * 3);

        const added = await goals.post("/student-progress/goals", {
            studentId: account.id,
            id,
            category: "method",
            focus: "Elimination",
            metric: "exercises",
            target,
            quality: null,
            maxPerExercise: 0,
            createdAt: new Date().toISOString(),
        }, "add");

        wrote(added, "goalsAdded");

        if (added.ok) {
            state.goals.push({ id, target, createdAt: new Date().toISOString() });

            // Setting your own goal is a Choice act, and it is paid through the agency log.
            wrote(await goals.post("/student-progress/log-agency-xp", {
                studentId: account.id, xpType: "choice", amount: 5, source: "goal-set",
            }, "log-agency-xp"), "agencyRows");

            await thinkTime(pause, 4000, 12000);
        }
    }

    // ── 3. Pick an exercise ─────────────────────────────────────────────────
    const type = [EXERCISE_TYPE.Suitability, EXERCISE_TYPE.Efficiency, EXERCISE_TYPE.Matching][
        Math.floor(Math.random() * 3)];
    const routeFor = {
        [EXERCISE_TYPE.Suitability]: "getSuitabilityExercise",
        [EXERCISE_TYPE.Efficiency]: "getEfficiencyExercise",
        [EXERCISE_TYPE.Matching]: "getMatchingExercise",
    };
    const pool = ids.byType[type];
    const exerciseId = pool.length > 0
        ? pool[Math.floor(Math.random() * pool.length)]
        : ids.entryIds[0] ?? 1;

    {
        const picker = scope("exercise-load");
        await picker.get("/flexibility-training/getFlexibilityExercises", "catalogue");
        await picker.get(`/flexibility-training/${options.language}/${routeFor[type]}/${exerciseId}`, "exercise");
        await thinkTime(pause, 3000, 8000);
    }

    // ── 4. The exercise itself ──────────────────────────────────────────────
    // One attempt, then the tracker's writes as the student works: named actions, phase closes,
    // decisions, and the classifier output. This block is why the suite exists — it is where almost
    // every write in the system happens, and it is where concurrency shows up first.
    const exercise = scope("exercise");

    // Kept outside the `if` so the nudge record further down can reuse it.
    let attemptId = null;

    const created = await exercise.put("/anchor-tracking/createEntry", {
        ...base,
        flexibilityId: exerciseId,
        exerciseId,
        exerciseType: type,
        agentCondition: 2,      // MotivationalAgent — what the plain module hardcodes
        isStudy: false,
    }, "createEntry");

    counters.attemptsMax += 1;

    if (created.ok && typeof created.json === "number") {
        counters.attempts += 1;

        attemptId = created.json;

        const attempt = { ...base, id: created.json };

        await thinkTime(pause, 2000, 5000);

        // Selected method first — this is the write that denormalises onto the attempt row.
        await exercise.post("/anchor-tracking/addActionToEntry",
            { ...attempt, phase: ACTION_PHASE.SelectedMethod, action: "Elimination" }, "addAction");
        await exercise.post("/anchor-tracking/completePhaseTracking",
            { ...attempt, phase: PHASE.Comparison, time: 8.4, errors: 0, hints: 0, choice: null }, "completePhase");

        await thinkTime(pause, 3000, 9000);

        await exercise.post("/anchor-tracking/addActionToEntry",
            { ...attempt, phase: ACTION_PHASE.TransformationActions, action: "transformed" }, "addAction");
        await exercise.post("/anchor-tracking/completePhaseTracking",
            { ...attempt, phase: PHASE.SelfExplanation, time: 22.1, errors: 1, hints: 0, choice: "Yes" }, "completePhase");

        // A decision point. The app asks "would you like to work this out yourself?"; answering yes
        // is what the avoidance profile and the goal about solving on your own both count.
        await thinkTime(pause, 2000, 6000);
        await exercise.post("/anchor-tracking/trackChoice",
            { ...attempt, phase: CHOICE_PHASE.FirstSolutionChoice, choice: "Yes" }, "trackChoice");

        await exercise.post("/anchor-tracking/addActionToEntry",
            { ...attempt, phase: ACTION_PHASE.FirstSolutionActions, action: "solved" }, "addAction");
        await exercise.post("/anchor-tracking/completePhaseTracking",
            { ...attempt, phase: PHASE.FirstSolution, time: 31.7, errors: 1, hints: 1, choice: "Yes" }, "completePhase");

        await thinkTime(pause, 3000, 10000);

        // Solving it alone is recognised immediately, as Insight, when the element was a gap.
        wrote(await exercise.post("/student-progress/log-agency-xp",
            { studentId: account.id, xpType: "insight", amount: 8, source: "solo-solve" }, "log-agency-xp"), "agencyRows");

        await exercise.post("/anchor-tracking/addActionToEntry",
            { ...attempt, phase: ACTION_PHASE.SecondSolutionActions, action: "solved" }, "addAction");
        await exercise.post("/anchor-tracking/completePhaseTracking",
            { ...attempt, phase: PHASE.SecondSolution, time: 18.9, errors: 0, hints: 0, choice: "Yes" }, "completePhase");

        await exercise.post("/anchor-tracking/trackChoice",
            { ...attempt, phase: CHOICE_PHASE.SecondSolutionChoice, choice: "Yes" }, "trackChoice");
        await exercise.post("/anchor-tracking/trackType",
            { ...attempt, phase: CHOICE_PHASE.StudentTypeSelfExplanation, type: 3 }, "trackType");

        // Suitability ends on the comparison step; the other two end on the solution.
        if (type === EXERCISE_TYPE.Suitability) {
            await thinkTime(pause, 4000, 9000);
            await exercise.post("/anchor-tracking/trackChoice",
                { ...attempt, phase: CHOICE_PHASE.ComparisonChoice, choice: "Yes to Elimination" }, "trackChoice");
            await exercise.post("/anchor-tracking/trackType",
                { ...attempt, phase: CHOICE_PHASE.StudentTypeComparison, type: 2 }, "trackType");
        }

        await exercise.post("/anchor-tracking/completeTracking",
            { ...attempt, phase: PHASE.SecondSolution, time: 96.4, errors: 2, hints: 1 }, "completeAttempt");
    }

    // ── 5. Finishing the exercise ───────────────────────────────────────────
    // Counters, the durable record, and the goal check, in the order `buildHandleEnd` does them.
    const finish = scope("exercise-finish");

    await finish.post("/student-progress/log-exercise", {
        studentId: account.id,
        exerciseType: type === EXERCISE_TYPE.Suitability ? "Suitability"
            : type === EXERCISE_TYPE.Efficiency ? "Efficiency" : "Matching",
        errors: 2,
        hints: 1,
        decisions: "SolveOnOwn=Accepted",
    }, "log-exercise");

    // The method the student solved with is recorded against the completed exercise
    // (`logFlexibilityMethodChoice`, called by all five exercise components when they finish).
    //
    // The endpoint is IDEMPOTENT on (studentId, category, exerciseKey, exerciseId) — it SELECTs first
    // and only INSERTs when nothing matches. So the expected row count is not the number of calls, it
    // is the number of DISTINCT tuples, which is why this tracks the tuple set rather than a counter.
    {
        const marked = scope("exercise-marked");
        const tuple = `flexibility|elimination|${exerciseId}`;

        if (!state.completionSent.has(tuple)) {
            state.completionSent.add(tuple);
            counters.exerciseCompletionsMax += 1;
        }

        const result = await marked.post(`/student-progress/exercises/${account.id}`, {
            studentId: account.id,
            category: "flexibility",
            exerciseKey: "elimination",
            exerciseId: String(exerciseId),
        }, "mark-completed");

        if (result.ok && !state.completionConfirmed.has(tuple)) {
            state.completionConfirmed.add(tuple);
            counters.exerciseCompletions += 1;
        }
    }

    // Opting into the reflection is itself a Choice act, awarded before the reflection happens.
    wrote(await finish.post("/student-progress/log-agency-xp",
        { studentId: account.id, xpType: "choice", amount: 5, source: "reflection-opt-in" }, "log-agency-xp"), "agencyRows");

    // The goal check reads its own event feed, and if a goal is now met it completes and is claimed.
    if (state.goals.length > 0) {
        const events = await finish.get(`/anchor-tracking/goal-events/${account.id}`, "goal-events");

        if (events.ok && Array.isArray(events.json)) {
            for (const goal of [...state.goals]) {
                const eligible = events.json.filter((event) => event.at >= goal.createdAt.slice(0, 19)).length;

                if (eligible < goal.target) continue;

                // Completing a goal is Resolve, then the goal is removed and logged. The order
                // matches `claimCompletedGoals`: take it off the server first, then record it.
                wrote(await finish.post("/student-progress/log-agency-xp",
                    { studentId: account.id, xpType: "resolve", amount: 5, source: "goal-completed" }, "log-agency-xp"),
                    "agencyRows");

                const removed = await finish.post("/student-progress/goals/remove",
                    { studentId: account.id, goalIds: [goal.id] }, "goal-remove");

                const logged = await finish.post("/student-progress/log-goal", {
                    studentId: account.id,
                    goalId: "method",
                    goalLabel: "3 Elimination exercises",
                    xpEarned: 5,
                    exerciseType: "Suitability",
                    totalErrors: 2,
                    totalHints: 1,
                }, "log-goal");

                wrote(removed, "goalsRemoved");
                wrote(logged, "goalCompletions");

                if (removed.ok) {
                    state.goals = state.goals.filter((entry) => entry.id !== goal.id);

                    await thinkTime(pause, 2000, 5000);
                }
            }
        }
    }

    await thinkTime(pause, 2000, 6000);

    // ── 5b. Declining a nudge ───────────────────────────────────────────────
    // Recorded under a caller-chosen name (`NudgeOutcome:<element>`). This goes through the SAME
    // `TrackChoice` service call as `trackChoice`, so it is not a new write path — but the route and
    // the name are new, and the row lands in `AnchorRecord` under the (attempt, name) unique index.
    //
    // Rare by nature: it needs a sustained gap to exist before a nudge is even offered.
    if (attemptId !== null && Math.random() < 0.12) {
        const nudge = scope("nudge");

        wrote(await nudge.post("/anchor-tracking/trackRecord", {
            userId: account.id,
            id: attemptId,
            name: "NudgeOutcome:selfExplanation",
            choice: "No",
        }, "trackRecord"), "nudgeRecords");
    }

    // ── 6. Reflection ───────────────────────────────────────────────────────
    // Most students write something. This is a real write path — history rows plus the queue update —
    // and it is not cheap, so it belongs in the model rather than being skipped as a detail.
    if (Math.random() < 0.7) {
        const reflection = scope("reflection");

        const queue = await reflection.get(`/student-progress/reflection-queue/${account.id}`, "queue");

        if (queue.ok && Array.isArray(queue.json) && queue.json.length > 0) {
            const item = queue.json[0];

            if (options.includeAi) {
                await thinkTime(pause, 20000, 45000);
                await reflection.post("/student-progress/reflection/evaluate", {
                    studentId: account.id,
                    queueItemId: item.id,
                    questionNumber: 1,
                    mode: "self",
                    answer: REFLECTION_ANSWER,
                    language: options.language,
                }, "evaluate");
            }

            await thinkTime(pause, 15000, 40000);

            const history = [
                { questionNumber: 1, role: "student", text: REFLECTION_ANSWER, insightXp: 0 },
                { questionNumber: 1, role: "model", text: "That is the right reasoning.", insightXp: 0 },
            ];

            const completed = await reflection.post("/student-progress/reflection/complete", {
                studentId: account.id,
                queueItemId: item.id,
                skip: false,
                history,
            }, "complete");

            wrote(completed, "reflections");
        }
    }

    return counters;
}
