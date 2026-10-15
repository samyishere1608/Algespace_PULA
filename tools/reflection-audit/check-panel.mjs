// The context panel, end to end through the real endpoints.
//
// The panel shows a DIFFERENT slice of the record than the chips are about, so the student has real
// evidence to reason with and still nothing to read the answer off. That rule lives in two places that can
// drift: the bank's `HiddenFacts` table, next to the rules that grade each question, and the assembly in
// `AssemblePanel`, which decides what a "safe" fact actually turns into.
//
// The harness (`dotnet run`) checks the first half — that the withheld kinds line up with each question's
// answer key. This checks the second, which the harness cannot reach because it needs a real queue row, a
// real attempt and the real step rows behind it. Verifying it matters more here than for most endpoints:
// the panel states what it shows as fact to an eleven-year-old, so a phase bar assembled from the wrong
// run is not a display bug, it is the app telling a child something untrue about their own work.
//
// Runs on the scratch fixture rather than on a real student — see `fixture.mjs` for why that matters.
// Writes to the database; always follow it with restore-baseline.mjs.

import { openDb, seedAttempt, seedExerciseItem, seedGoalItem, clearFixture, makeChecker, FIXTURE, SCRATCH_STUDENT, API } from './fixture.mjs';

const conn = openDb();
const { check, finish } = makeChecker();

clearFixture(conn);

const attemptId = seedAttempt(conn);
const usedAttempts = [attemptId];

const questionsFor = async (queueItemId) => {
    const rows = await (await fetch(`${API}/student-progress/reflection-queue/${SCRATCH_STUDENT}`)).json();
    const item = rows.find((row) => row.id === queueItemId);
    if (!item) throw new Error(`queue row ${queueItemId} did not come back — is the API running on ${API}?`);
    return item;
};

const answer = async (item, question, chipId) => {
    const response = await fetch(`${API}/student-progress/reflection/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentId: SCRATCH_STUDENT, queueItemId: item.id, questionNumber: 1, mode: 'self', language: 'en',
            questionId: question.id, choice: chipId, choiceLabel: 'panel check', subjectTerms: [],
        }),
    });
    return (await response.json()).panel;
};

const phaseNames = (panel) => (panel.phases ?? []).map((p) => p.labelKey);
const runMistakes = (panel) => (panel.runs ?? []).map((r) => r.mistakes);
const phaseOf = (panel, step) => panel.phases.find((p) => p.labelKey === `reflection-step-${step}`);

// ── An exercise ──────────────────────────────────────────────────────────────

{
    const item = await questionsFor(seedExerciseItem(conn, 'panel: exercise'));
    console.log(`exercise questions: ${item.questions.map((q) => q.textKey).join(', ')}\n`);

    const stepQuestion = item.questions.find((q) => q.id === 'q1-step-sure');
    const decisionQuestion = item.questions.find((q) => q.id === 'q2-compared');
    const promiseQuestion = item.questions.find((q) => q.textKey.startsWith('reflection-q3-'));

    check('the fixture produces the step question and the decision question',
        Boolean(stepQuestion && decisionQuestion), item.questions.map((q) => q.id).join(','));

    if (stepQuestion) {
        // The chips ARE the parts of the exercise, so the phase bars would be the answer sitting beside it.
        check('a step question withholds the phase bars',
            phaseNames(stepQuestion.panel).length === 0, phaseNames(stepQuestion.panel).join(','));
        check('a step question still says something', stepQuestion.panel.heldBack === true);
    }

    check('the decision question shows the phase bars',
        phaseNames(decisionQuestion.panel).length > 0, phaseNames(decisionQuestion.panel).join(','));

    // The two phases, against the numbers the fixture wrote: setup 2 + 8, solve 5 + 3.
    const setup = phaseOf(decisionQuestion.panel, 'setup');
    const solve = phaseOf(decisionQuestion.panel, 'solve');
    check('the phase bars carry this run\'s own times',
        setup?.seconds === FIXTURE.setupSeconds && solve?.seconds === FIXTURE.solveSeconds,
        `setup=${setup?.seconds} solve=${solve?.seconds}`);

    // The method is the one the attempt recorded, not the exercise type: "Suitability" is not a method and
    // has no wording of its own, so naming it would put a raw key in front of the student.
    check('the method named is the one used, not the exercise type',
        decisionQuestion.panel.methodLabelKey === 'flexibility:substitution-method',
        decisionQuestion.panel.methodLabelKey);

    check('the decision question withholds the decision', decisionQuestion.panel.heldBack === true);

    check('the promise question withholds nothing', promiseQuestion.panel.heldBack === false);
    check('the promise question shows the phase bars',
        phaseNames(promiseQuestion.panel).length > 0, phaseNames(promiseQuestion.panel).join(','));

    check('mistakes are shown where they are not the answer',
        decisionQuestion.panel.mistakes === FIXTURE.errors, String(decisionQuestion.panel.mistakes));
    check('hints are shown where they are not the answer',
        decisionQuestion.panel.hints === FIXTURE.hints, String(decisionQuestion.panel.hints));
    check('a single exercise says so in the total rather than drawing one circle',
        runMistakes(decisionQuestion.panel).length === 0 && decisionQuestion.panel.runCount === 1,
        `runs=${runMistakes(decisionQuestion.panel).join(',')} runCount=${decisionQuestion.panel.runCount}`);

    // ── Answering opens the record ──
    const opened = await answer(item, decisionQuestion, decisionQuestion.chips[0].id);
    check('answering opens the record', opened?.heldBack === false);
    check('the opened record keeps the phase bars',
        phaseNames(opened).length > 0, phaseNames(opened).join(','));

    // The step rows carry errors and hints as well as time. Only time is sent, and the model has no field
    // for the others, so this asserts the shape rather than a value.
    const phaseKeys = Object.keys(opened.phases[0]).sort().join(',');
    check('a phase carries a label and a time and nothing else', phaseKeys === 'labelKey,seconds', phaseKeys);
}

// ── A goal, whose phases come from its own window ────────────────────────────

{
    const mistakes = [1, 0, 0];
    const item = await questionsFor(seedGoalItem(conn, 'panel: method goal', 'method', 'Elimination', usedAttempts, mistakes));
    console.log(`\ngoal questions: ${item.questions.map((q) => q.textKey).join(', ')}\n`);

    const wentWell = item.questions.find((q) => q.id === 'goal-q1-went-well');
    const promiseQuestion = item.questions.find((q) => q.textKey.startsWith('reflection-goal-q3'));

    check('the fixture produces the goal\'s own questions', Boolean(wentWell && promiseQuestion),
        item.questions.map((q) => q.id).join(','));

    check('a narrowed method goal names the method it is about',
        wentWell.panel.methodLabelKey === 'flexibility:elimination-method', wentWell.panel.methodLabelKey);

    // The TOTAL is shown, the split is not: how much of the work was imperfect, without saying which runs
    // were. The split is what answers "my mistakes went down" and "I had a go with no mistakes".
    check('"what went well" shows the mistakes as a total',
        wentWell.panel.mistakes === mistakes.reduce((a, b) => a + b, 0), String(wentWell.panel.mistakes));
    check('"what went well" does not show the run-by-run split',
        runMistakes(wentWell.panel).length === 0, runMistakes(wentWell.panel).join(','));
    check('"what went well" says how many exercises the total covers',
        wentWell.panel.runCount === mistakes.length, String(wentWell.panel.runCount));
    check('"what went well" still withholds the hints',
        wentWell.panel.hints === null, String(wentWell.panel.hints));

    // One run only. Two would put the totals side by side, and the trend in those totals is one of the
    // chips on this very question.
    const phases = phaseNames(wentWell.panel);
    check('"what went well" shows one run\'s phases', phases.length > 0 && phases.length <= 4, phases.join(','));
    check('the phases are the window\'s LAST run, read from its attempt ids',
        phaseOf(wentWell.panel, 'setup')?.seconds === FIXTURE.setupSeconds
        && phaseOf(wentWell.panel, 'solve')?.seconds === FIXTURE.solveSeconds,
        `setup=${phaseOf(wentWell.panel, 'setup')?.seconds} solve=${phaseOf(wentWell.panel, 'solve')?.seconds}`);

    check('the goal promise question withholds nothing', promiseQuestion.panel.heldBack === false);

    const opened = await answer(item, wentWell, wentWell.chips[0].id);
    check('answering the goal question opens the split',
        opened?.heldBack === false && runMistakes(opened).join(',') === mistakes.join(','),
        `heldBack=${opened?.heldBack} runs=${runMistakes(opened).join(',')}`);
}

// ── A type goal names the TYPE, which is not a method ────────────────────────

{
    const item = await questionsFor(seedGoalItem(conn, 'panel: type goal', 'exerciseType', 'Suitability', usedAttempts, [1, 0]));
    const wentWell = item.questions.find((q) => q.id === 'goal-q1-went-well');

    check('a type goal names the type it was about, not a method',
        wentWell.panel.methodLabelKey === 'exercise-type-suitability', wentWell.panel.methodLabelKey);

    // A type goal's window holds several methods, so the method line would have to name one of them
    // arbitrarily — and the wording is a different sentence anyway, which is why the client picks the
    // template from the item type.
    check('the subject is the type, and carries no method wording',
        !wentWell.panel.methodLabelKey.includes('-method'), wentWell.panel.methodLabelKey);
}

// ── A window with no attempt ids gets no phase bars ──────────────────────────
//
// Windows recorded before the ids were kept have none, and those rows belong to real students — so a
// fixture that simply omits the field is the only safe way to cover it. The point is that the panel
// declines to guess rather than falling back to the newest attempts, which for a narrowed goal could be a
// run of a different method altogether.

{
    const item = await questionsFor(seedGoalItem(conn, 'panel: window without ids', 'method', 'Elimination', [], [1, 0]));
    const wentWell = item.questions.find((q) => q.id === 'goal-q1-went-well');

    check('a window with no attempt ids shows no phase bars',
        phaseNames(wentWell.panel).length === 0, phaseNames(wentWell.panel).join(','));
    check('and still shows what it can', wentWell.panel.mistakes === 1, String(wentWell.panel.mistakes));
}

clearFixture(conn);
conn.close();

finish();
