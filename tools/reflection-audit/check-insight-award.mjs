// Insight for a reflection answer is written by the SERVER, in the request that decides it.
//
// It used to be paid by the client: the evaluate endpoint answered with the amount, the browser added it to
// its running total, and then posted it back on a best-effort call that swallowed its own failure. An audit
// of the real database found six of one student's sixteen aligned answers in a single day with no award
// behind them, and the window is exactly the moment the server cannot be reached.
//
// So what is worth asserting is: a wrong answer pays nothing, an aligned answer is recorded without the
// browser asking, the points land in the wallet as well as the ledger, asking twice does not pay twice, and
// a second question on the same item is its own award rather than being blocked by the first.
//
// Runs on the scratch fixture rather than on a real student — see `fixture.mjs`.
// Writes to the database; always follow it with restore-baseline.mjs.

import { openDb, seedAttempt, seedExerciseItem, clearFixture, makeChecker, SCRATCH_STUDENT, API } from './fixture.mjs';

const conn = openDb();
const { check, finish } = makeChecker();

clearFixture(conn);

seedAttempt(conn);
const queueItemId = seedExerciseItem(conn, 'award check');

const questionsFor = async (id) => {
    const rows = await (await fetch(`${API}/student-progress/reflection-queue/${SCRATCH_STUDENT}`)).json();
    const item = rows.find((row) => row.id === id);
    if (!item) throw new Error(`queue row ${id} did not come back — is the API running on ${API}?`);
    return item;
};

const evaluate = async (question, choice, questionNumber = 1) => {
    const response = await fetch(`${API}/student-progress/reflection/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentId: SCRATCH_STUDENT, queueItemId, questionNumber, mode: 'self', language: 'en',
            questionId: question.id, choice, choiceLabel: 'award check', subjectTerms: [],
        }),
    });
    return response.json();
};

const wallet = () => conn.prepare(
    'SELECT InsightXP, LifetimeAgencyXP FROM StudentProgress WHERE StudentId = ?'
).get(SCRATCH_STUDENT);

const awardsFor = (refId) => conn.prepare(
    "SELECT Amount FROM AgencyLog WHERE StudentId = ? AND Source = 'reflection-aligned' AND RefId = ?"
).all(SCRATCH_STUDENT, refId);

/**
 * Answer one question with one chip, and report exactly what THAT CALL wrote.
 *
 * Measured around the call rather than around the whole run, because a question can have more than one
 * clean answer: walking the chips to find a wrong one would pass through a right one first, and the row it
 * wrote would then look like the wrong answer's doing.
 */
async function answerAndMeasure(question, chip, questionNumber = 1) {
    const ledgerBefore = awardsFor(`${queueItemId}:${question.id}`).length;
    const walletBefore = wallet();

    const result = await evaluate(question, chip, questionNumber);
    const walletAfter = wallet();

    return {
        chip,
        result,
        wroteLedgerRow: awardsFor(`${queueItemId}:${question.id}`).length > ledgerBefore,
        insightMoved: walletAfter.InsightXP - walletBefore.InsightXP,
        lifetimeMoved: walletAfter.LifetimeAgencyXP - walletBefore.LifetimeAgencyXP,
    };
}

const item = await questionsFor(queueItemId);
const first = item.questions.find((q) => q.id === 'q1-step-sure') ?? item.questions[0];
const refIdFirst = `${queueItemId}:${first.id}`;

// ── Find both kinds of chip by asking ────────────────────────────────────────
//
// Which chip the record backs is not assumed: the answer key is withheld from the payload on purpose, and
// a guess about it here would be testing this file rather than the endpoint.

let wrong = null;
let paid = null;
for (const chip of first.chips) {
    const attempt = await answerAndMeasure(first, chip.id);
    if (attempt.result.insightXp > 0) paid ??= attempt;
    else wrong ??= attempt;
}

if (!wrong) {
    console.log('skip  every chip on this question pays, so there is no wrong answer to test');
} else {
    check('a wrong answer is judged not aligned', wrong.result.aligned === false, `aligned=${wrong.result.aligned}`);
    check('a wrong answer pays no Insight', wrong.result.insightXp === 0, `insightXp=${wrong.result.insightXp}`);
    check('a wrong answer writes no award row', wrong.wroteLedgerRow === false);
    check('a wrong answer moves no points', wrong.insightMoved === 0, `moved=${wrong.insightMoved}`);
}

// ── An aligned answer pays, with nothing posting it ──────────────────────────

if (!paid) {
    check('some chip on this question is judged aligned', false, 'no chip paid anything');
} else {
    const rows = awardsFor(refIdFirst);

    check('an aligned answer is recorded by the server alone',
        paid.wroteLedgerRow === true && rows.length === 1, `rows=${rows.length}`);
    check('the amount recorded is the amount returned',
        rows[0]?.Amount === paid.result.insightXp,
        `ledger=${rows[0]?.Amount} returned=${paid.result.insightXp}`);
    check('the points reached the wallet, not only the ledger',
        paid.insightMoved === paid.result.insightXp,
        `moved=${paid.insightMoved} expected=${paid.result.insightXp}`);
    check('the lifetime total moved with it',
        paid.lifetimeMoved === paid.result.insightXp,
        `moved=${paid.lifetimeMoved} expected=${paid.result.insightXp}`);

    // ── The same answer again must not pay twice ─────────────────────────────
    //
    // A retried request is the realistic case: a flaky connection, or a student reloading mid-dialog.

    const replay = await answerAndMeasure(first, paid.chip);

    check('re-answering the same question pays nothing more', replay.wroteLedgerRow === false);
    check('re-answering does not move the wallet', replay.insightMoved === 0, `moved=${replay.insightMoved}`);

    // The verdict is still reported on the replay: the guard is on the MONEY, not on the answer. A student
    // who reloads and answers again must still be told what the record says.
    check('the replay still tells the student what the record says',
        replay.result.insightXp === paid.result.insightXp && (replay.result.feedback ?? '').length > 0,
        `insightXp=${replay.result.insightXp}, feedback=${(replay.result.feedback ?? '').length} chars`);
}

// ── A second question on the same item is its own award ──────────────────────
//
// The key is the queue item AND the question, so a reflection's three questions do not block one another.
// Keying on the item alone would pay for the first and silently drop the rest — which is the failure mode
// worth a check of its own, because the first question would still look right.

const second = item.questions.find((q) => q.id !== first.id && q.chips.length >= 2);

if (second) {
    let secondPaid = null;
    for (const chip of second.chips) {
        const attempt = await answerAndMeasure(second, chip.id, 2);
        if (attempt.result.insightXp > 0) { secondPaid = attempt; break; }
    }

    if (secondPaid) {
        check('a second question on the same item gets its own award', secondPaid.wroteLedgerRow === true);
        check('the first question\'s award is untouched by the second',
            awardsFor(refIdFirst).length === 1, `rows=${awardsFor(refIdFirst).length}`);
    } else {
        console.log('skip  the second question paid nothing on any chip, so it cannot test the key');
    }
}

// ── Nothing was written outside the scratch student ──────────────────────────

clearFixture(conn);
conn.close();

finish();
