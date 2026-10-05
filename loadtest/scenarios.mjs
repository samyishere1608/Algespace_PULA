/**
 * The scenario catalogue: one scenario per feature area of the student-facing backend.
 *
 * HOW A SCENARIO IS SHAPED
 * `run` performs one realistic unit of work through the API and returns the row counts it believes it
 * created. The runner sums those across every iteration and hands them to the integrity checks, so a
 * write that silently vanished under concurrency is caught as a number that does not match — which is
 * the only way to see a lost write, since a lost write still returns 200.
 *
 * `weight` is the share of iterations this scenario gets. The distribution approximates a real
 * session: many reads, and a write chain only at the end of an exercise.
 *
 * NOT COVERED, DELIBERATELY: the `flexibility-study` and `ck-study` controllers. Those belong to the
 * separate study module, which needs a study and a participant set up in studies.db that this suite
 * does not create. They also write to a different database from the student app, so they are not
 * where the contention this suite exists to find would appear.
 */

import { EXERCISE_TYPE, CHOICE_PHASE, PHASE, ACTION_PHASE } from "./lib/fixtures.mjs";

/** A unique goal id per call, so concurrent workers cannot add and remove each other's goals. */
let goalSequence = 0;
const uniqueGoalId = () => `loadtest-${Date.now().toString(36)}-${(goalSequence++).toString(36)}`;

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export const SCENARIOS = [
    // ── Reading exercises ────────────────────────────────────────────────────
    {
        name: "exercises.catalogue",
        area: "Exercise loading",
        kind: "read",
        weight: 6,
        description: "The full flexibility exercise index, as the training overview loads it.",
        async run({ api }) {
            await api.get("/flexibility-training/getFlexibilityExercises", "catalogue");
            return {};
        },
    },
    {
        name: "exercises.detail",
        area: "Exercise loading",
        kind: "read",
        weight: 10,
        description: "One exercise by id, per type — the heaviest read in the app (JSON blob + deserialise).",
        skipIf: (ids) =>
            ids.byType[EXERCISE_TYPE.Suitability].length === 0 ||
            ids.byType[EXERCISE_TYPE.Efficiency].length === 0 ||
            ids.byType[EXERCISE_TYPE.Matching].length === 0,
        async run({ api, ids }) {
            await api.get(`/flexibility-training/en/getSuitabilityExercise/${pick(ids.byType[EXERCISE_TYPE.Suitability])}`, "suitability");
            await api.get(`/flexibility-training/en/getEfficiencyExercise/${pick(ids.byType[EXERCISE_TYPE.Efficiency])}`, "efficiency");
            await api.get(`/flexibility-training/en/getMatchingExercise/${pick(ids.byType[EXERCISE_TYPE.Matching])}`, "matching");
            return {};
        },
    },
    {
        name: "exercises.ck",
        area: "Exercise loading",
        kind: "read",
        weight: 4,
        description: "Conceptual-knowledge and bartering exercise lists, plus one exercise from each.",
        skipIf: (ids) => (ids.ck?.equalization?.length ?? 0) === 0,
        async run({ api, ids }) {
            await api.get("/equalization/conceptual-knowledge/exercises/getExercises", "ck-list");
            await api.get("/substitution/conceptual-knowledge/exercises/getExercises", "ck-list");
            await api.get("/elimination/conceptual-knowledge/exercises/getExercises", "ck-list");
            await api.get(`/equalization/conceptual-knowledge/exercises/getExercise/${pick(ids.ck.equalization)}`, "ck-detail");
            await api.get(`/substitution/bartering/exercises/getExercise/${pick(ids.ck.bartering)}`, "ck-detail");
            return {};
        },
    },

    // ── Reading state ────────────────────────────────────────────────────────
    {
        name: "dashboard.load",
        area: "Dashboard",
        kind: "read",
        weight: 6,
        description: "What the dashboard fetches on open: progress, weakness analysis, tutorial state.",
        async run({ api, student }) {
            await api.get(`/student-progress/${student.id}`, "progress");
            await api.get(`/student-progress/weakness/${student.id}`, "weakness");
            await api.get(`/student-progress/tutorial/${student.id}`, "tutorial");
            return {};
        },
    },
    {
        name: "anchors.read",
        area: "Adaptive anchors",
        kind: "read",
        weight: 6,
        description: "The avoidance profile and the goal event feed — read by the nudge and by every goal.",
        async run({ api, student }) {
            await api.get(`/anchor-tracking/profile/${student.id}`, "profile");
            await api.get(`/anchor-tracking/goal-events/${student.id}`, "goal-events");
            return {};
        },
    },
    {
        name: "goals.read",
        area: "Goals",
        kind: "read",
        weight: 4,
        description: "The student's active goals.",
        async run({ api, student }) {
            await api.get(`/student-progress/goals/${student.id}`, "list");
            return {};
        },
    },
    {
        name: "reflection.read",
        area: "Reflection",
        kind: "read",
        weight: 3,
        description: "The pending reflection queue, polled by the dashboard.",
        async run({ api, student }) {
            await api.get(`/student-progress/reflection-queue/${student.id}`, "queue");
            return {};
        },
    },

    // ── Writing ──────────────────────────────────────────────────────────────
    {
        name: "anchors.exercise",
        area: "Adaptive anchors",
        kind: "write",
        weight: 4,
        description: "The full in-exercise write chain: open an attempt, six tracking points, then close it.",
        async run({ api, student, ids }) {
            const type = pick([EXERCISE_TYPE.Suitability, EXERCISE_TYPE.Efficiency, EXERCISE_TYPE.Matching]);
            const exerciseId = pick(ids.byType[type]) ?? ids.entryIds[0] ?? 1;

            const created = await api.put("/anchor-tracking/createEntry", {
                userId: student.id,
                username: student.username,
                studyId: 0,
                flexibilityId: exerciseId,
                exerciseId,
                exerciseType: type,
                agentCondition: 2,
                isStudy: false,
            }, "createEntry");

            // Counted as CREATED, not as completed: the row appears when the attempt is opened, so an
            // abandoned attempt still exists and must be expected. `attemptsMax` covers the other
            // half — a createEntry whose response never arrived may or may not have committed, and
            // the client cannot tell which. Returning a range is the only honest answer.
            const counters = { attempts: created.ok ? 1 : 0, attemptsMax: 1 };

            if (!created.ok || typeof created.json !== "number") return counters;

            const attempt = created.json;
            const base = { userId: student.id, username: student.username, studyId: 0, id: attempt };

            // Named phases, in the order the tracker emits them. `SelectedMethod` is the one that
            // denormalises onto the attempt row, so it is the write most likely to contend.
            await api.post("/anchor-tracking/addActionToEntry", { ...base, phase: ACTION_PHASE.SelectedMethod, action: "Equalization" }, "addAction");
            await api.post("/anchor-tracking/addActionToEntry", { ...base, phase: ACTION_PHASE.TransformationActions, action: "transformed" }, "addAction");
            await api.post("/anchor-tracking/addActionToEntry", { ...base, phase: ACTION_PHASE.FirstSolutionActions, action: "solved" }, "addAction");
            await api.post("/anchor-tracking/trackChoice", { ...base, phase: CHOICE_PHASE.FirstSolutionChoice, choice: "Yes" }, "trackChoice");
            await api.post("/anchor-tracking/trackChoice", { ...base, phase: CHOICE_PHASE.SelfExplanationChoice, choice: "Yes" }, "trackChoice");
            await api.post("/anchor-tracking/trackType", { ...base, phase: CHOICE_PHASE.StudentTypeSelfExplanation, type: 3 }, "trackType");
            await api.post("/anchor-tracking/completePhaseTracking", { ...base, phase: PHASE.FirstSolution, time: 12.5, errors: 1, hints: 0, choice: null }, "completePhase");
            await api.post("/anchor-tracking/completeTracking", { ...base, phase: PHASE.SecondSolution, time: 41, errors: 2, hints: 1 }, "completeAttempt");

            return counters;
        },
    },
    {
        name: "progress.exercise",
        area: "Progress",
        kind: "write",
        weight: 3,
        description: "The counters written when an exercise ends: exercise log, streak, agency XP.",
        async run({ api, student }) {
            await api.post("/student-progress/log-exercise", {
                studentId: student.id,
                exerciseType: "Suitability",
                errors: 1,
                hints: 0,
                decisions: "SolveOnOwn=Accepted",
            }, "log-exercise");

            await api.post("/student-progress/log-agency-xp", {
                studentId: student.id,
                xpType: "insight",
                amount: 8,
                source: "loadtest",
            }, "log-agency-xp");

            return {};
        },
    },
    {
        name: "goals.crud",
        area: "Goals",
        kind: "write",
        weight: 2,
        description: "Set a goal and remove it again. Net zero, so what is left behind is a lost write.",
        async run({ api, student }) {
            const id = uniqueGoalId();

            const added = await api.post("/student-progress/goals", {
                studentId: student.id,
                id,
                category: "selfExplanation",
                focus: null,
                metric: "exercises",
                target: 5,
                quality: null,
                maxPerExercise: 0,
                createdAt: new Date().toISOString(),
            }, "add");

            if (!added.ok) return { activeGoals: 0, activeGoalsMax: 1 };

            const removed = await api.post("/student-progress/goals/remove", { studentId: student.id, goalIds: [id] }, "remove");

            // The goal is normally gone again, so nothing is expected to survive. If either request
            // did not return, one goal may be left behind and only the upper bound is known.
            return { activeGoals: 0, activeGoalsMax: removed.ok ? 0 : 1 };
        },
    },
    {
        name: "progress.goal",
        area: "Goals",
        kind: "write",
        weight: 1,
        description: "Log a completed goal. Also drives the reflection queue, whose cap is a read-modify-write.",
        async run({ api, student }) {
            const logged = await api.post("/student-progress/log-goal", {
                studentId: student.id,
                goalId: "selfExplanation",
                goalLabel: "Explain your reasoning",
                xpEarned: 5,
                exerciseType: "Suitability",
                totalErrors: 1,
                totalHints: 0,
            }, "log-goal");

            return { goalCompletions: logged.ok ? 1 : 0, goalCompletionsMax: 1 };
        },
    },
    {
        name: "auth.login",
        area: "Authentication",
        kind: "write",
        weight: 1,
        description: "Sign in — hashing plus a database read, on the path every session starts with.",
        async run({ api, student, password }) {
            await api.post("/student/authenticate", { username: student.username, password }, "authenticate");
            return {};
        },
    },

    // ── Costs real money, so it is opt-in ────────────────────────────────────
    {
        name: "ai.chat",
        area: "AI tutor",
        kind: "write",
        weight: 1,
        externalCost: true,
        description: "The Pippin chat. Calls OpenAI on every request — enable with --include-ai.",
        async run({ api }) {
            await api.post("/chat/flexibility", {
                studentId: 0,
                message: "Can you give me a hint for the first step?",
                language: "en",
                exerciseType: "Suitability",
                exerciseId: 1,
                exercisePhase: "FirstSolution",
            }, "chat");
            return {};
        },
    },
];

/**
 * Scenarios that can run against the given discovery result.
 *
 * A scenario whose data was not found is skipped rather than run: a request that 404s measures the
 * fixture, not the server, and would appear in the report as though the server had a problem.
 */
export function selectable(scenarios, ids) {
    return scenarios.filter((scenario) => !scenario.skipIf || !scenario.skipIf(ids));
}
