// End-to-end check of the end-of-session reflection.
//
// The bank harness (`dotnet run`) proves the two questions are ungraded and that nothing they offer
// pays Insight. What it cannot reach is everything around them: that opening one does not disturb the
// queue, that the promise the second question records is the promise the settlement reads back, and
// that Resolve is paid exactly once, the next day, when the intention matches.
//
// So this walks the real endpoints. Writes to the database; always follow it with restore-baseline.mjs.

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DB = path.join(ROOT, 'webapi/Data/databases/students.db');
const API = 'http://localhost:7273';
const STUDENT = 7;

const conn = new DatabaseSync(DB);

const stamp = (daysAgo = 0) =>
    new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

function progress() {
    return conn.prepare(
        'SELECT ChoiceXP, InsightXP, ResolveXP, LifetimeAgencyXP FROM StudentProgress WHERE StudentId = ?'
    ).get(STUDENT);
}

function agency(type = 'resolve') {
    return conn.prepare(
        'SELECT Id, Amount, Source FROM AgencyLog WHERE StudentId = ? AND XpType = ? ORDER BY Id DESC'
    ).all(STUDENT, type);
}

function historyRows() {
    return conn.prepare(
        'SELECT Id, ItemType, ItemId, QuestionId, Role, Choice, Text, FollowedUp, CreatedAt ' +
        'FROM ReflectionHistory WHERE StudentId = ? ORDER BY Id'
    ).all(STUDENT);
}

// Clean start, so the script can be re-run without measuring its own leftovers. The queue and history
// rows it writes are its own; nothing here belongs to another check.
conn.exec('DELETE FROM ReflectionHistory WHERE StudentId = ' + STUDENT);
conn.exec('DELETE FROM ReflectionQueue WHERE StudentId = ' + STUDENT);
conn.exec("DELETE FROM AgencyLog WHERE StudentId = " + STUDENT);
conn.prepare('UPDATE StudentProgress SET ResolveXP = 0 WHERE StudentId = ?').run(STUDENT);

const results = [];
function check(name, ok, detail) {
    results.push({ name, ok });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function post(url, body) {
    const response = await fetch(`${API}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = text; }
    return { status: response.status, body: parsed };
}

async function get(url) {
    const response = await fetch(`${API}${url}`);
    return { status: response.status, body: await response.json().catch(() => null) };
}

/** A promise made yesterday, as the history would hold it after the reflection was completed. */
let promiseSequence = 0;
/**
 * A promise row written the way the app writes one: the chosen chip on the student's own row, and the
 * reply on the companion's.
 *
 * A no-chip promise is still seedable, because the settlement has to survive a row it cannot match —
 * that is the boundary the last check in this file is about.
 */
function seedPromise(choice, text = "", daysAgo = 1) {
    const itemId = `seed-session-${++promiseSequence}`;

    const insert = (role, choiceId, body) =>
        conn.prepare(
            'INSERT INTO ReflectionHistory (StudentId, ItemType, ItemId, Role, Text, InsightXp, CreatedAt, QuestionId, Choice, FollowedUp) ' +
            "VALUES (?, 'session', ?, ?, ?, 0, ?, 'session-q2-next', ?, 0)"
        ).run(STUDENT, itemId, role, body, stamp(daysAgo), choiceId);

    insert('student', choice, text);
    insert('pippin', '', 'e2e reply');

    const rows = conn.prepare(
        'SELECT Id, FollowedUp FROM ReflectionHistory WHERE StudentId = ? AND ItemId = ? ORDER BY Id'
    ).all(STUDENT, itemId);

    return { itemId, rows, closed: () => rows.every((r) => promiseRow(r.Id)?.FollowedUp === 1) };
}

function promiseRow(id) {
    return conn.prepare('SELECT FollowedUp FROM ReflectionHistory WHERE Id = ?').get(id);
}

const settle = (intentionChoice, detectedCategory = "", intentionText = "") =>
    post('/student-progress/session-reflection/settle', {
        studentId: STUDENT,
        intentionChoice,
        intentionText,
        detectedCategory,
    });

// ── 1. The item the end-session dialog gets ──────────────────────────────────

let started = await post(`/student-progress/session-reflection/${STUDENT}?label=Today's%20session`);
const item = started.body;
const questions = item?.questions ?? [];

check('the session reflection opens', started.status === 200 && item?.itemType === 'session',
    `status ${started.status}, itemType=${item?.itemType}`);
check('it asks two questions, not three', questions.length === 2, `got ${questions.length}`);
check('the first question is the session one, not a graded observation',
    questions[0]?.kind === 'session' && questions[0]?.textKey === 'reflection-session-q1',
    `${questions[0]?.kind} / ${questions[0]?.textKey}`);
check('the second asks for a commitment',
    questions[1]?.kind === 'next-action' && questions[1]?.textKey === 'reflection-session-q2',
    `${questions[1]?.kind} / ${questions[1]?.textKey}`);
check('every question offers chips', questions.every((q) => (q.chips ?? []).length >= 2),
    questions.map((q) => (q.chips ?? []).length).join(', '));

// The answer key is the one thing the design keeps off the wire: a student who opened devtools could
// read which chip is right. For these questions there must be nothing to read.
check('no answer key is sent to the client',
    questions.every((q) => !('alignedChipIds' in q) && !('partialChipIds' in q)),
    JSON.stringify(Object.keys(questions[0] ?? {})));

// ── 2. Nothing the student taps there pays Insight ───────────────────────────

const answer = (questionNumber, questionId, choice, label) =>
    post('/student-progress/reflection/evaluate', {
        studentId: STUDENT,
        queueItemId: item.id,
        questionNumber,
        mode: 'self',
        language: 'en',
        questionId,
        choice,
        choiceLabel: label,
        subjectTerms: [],
    });

const q1Chip = questions[0].chips[0];
let graded = await answer(1, questions[0].id, q1Chip.id, 'e2e');

check('a chip on the session question pays no Insight',
    graded.status === 200 && graded.body?.insightXp === 0,
    `insightXp=${graded.body?.insightXp}`);
check('the reply is not a verdict on an ungraded answer', graded.body?.aligned === false,
    `aligned=${graded.body?.aligned}`);

const q2Chip = questions[1].chips.find((c) => c.id === 'session-next-practice') ?? questions[1].chips[0];
const beforeCommit = progress();
graded = await answer(2, questions[1].id, q2Chip.id, 'e2e');

check('a chip on the promise question pays no Insight',
    graded.status === 200 && graded.body?.insightXp === 0,
    `insightXp=${graded.body?.insightXp}`);
check('and it does not touch Insight either way',
    progress().InsightXP === beforeCommit.InsightXP,
    `insight ${beforeCommit.InsightXP} -> ${progress().InsightXP}`);

// A commitment pays Choice the moment it is made, which is what the exercise promise question already
// does. Checked here because the rule reads the question's KIND, and a rule that only fired on the
// third question of an item would have silently stopped paying for this one — which is the second.
check('making the commitment pays Choice',
    progress().ChoiceXP - beforeCommit.ChoiceXP === 2,
    `choice ${beforeCommit.ChoiceXP} -> ${progress().ChoiceXP}`);

// ── 3. The promise is recorded ───────────────────────────────────────────────

await post('/student-progress/reflection/complete', {
    studentId: STUDENT,
    queueItemId: item.id,
    skip: false,
    history: [
        { role: 'student', text: 'I want to get more practice in', insightXp: 0, itemType: 'session', itemId: item.itemId, questionId: 'session-q2-next', choice: q2Chip.id },
        { role: 'pippin', text: 'e2e reply', insightXp: 0, itemType: 'session', itemId: item.itemId, questionId: 'session-q2-next', choice: q2Chip.id },
    ],
});

const rows = historyRows();
check('the promise is written with the question it answered',
    rows.some((r) => r.ItemType === 'session' && r.QuestionId === 'session-q2-next' && r.Choice === q2Chip.id),
    JSON.stringify(rows.map((r) => `${r.ItemType}/${r.QuestionId}/${r.Choice}`)));
check('the item is closed once it is answered',
    conn.prepare('SELECT Status FROM ReflectionQueue WHERE Id = ?').get(item.id)?.Status === 'done');
check('the promise is filed under its own session, not a shared id',
    rows.some((r) => r.ItemId.startsWith('session-') && r.ItemId !== 'session'),
    rows[0]?.ItemId);

// ── 4. A session reflection never disturbs the queue ─────────────────────────
//
// It used to be capped with everything else, so opening one would have skipped the oldest unanswered
// exercise reflection — the student's own work, quietly thrown away by opening a dialog.

conn.prepare(
    'INSERT INTO ReflectionQueue (StudentId, ItemType, ItemId, ItemLabel, Status, Errors, Hints, PippinMessages, Method, Decisions, Focus, Evidence, AttemptId, CompletedAt) ' +
    "VALUES (?, 'exercise', 'Efficiency', 'e2e pending exercise', 'pending', 0, 0, 0, 'Efficiency', '', '', '', 0, ?)"
).run(STUDENT, stamp());

await post(`/student-progress/session-reflection/${STUDENT}?label=Today's%20session`);

const queue = (await get(`/student-progress/reflection-queue/${STUDENT}`)).body ?? [];
check('the queue does not offer the session reflection',
    queue.every((q) => q.itemType !== 'session'),
    JSON.stringify(queue.map((q) => q.itemType)));
check('opening a session reflection leaves the pending exercise alone',
    queue.some((q) => q.itemType === 'exercise'),
    JSON.stringify(queue.map((q) => q.itemLabel)));

// ── 5. The settlement ────────────────────────────────────────────────────────

// 5a. A chosen intention matching the chosen promise.
let seeded = seedPromise('session-next-practice');
let before = progress();
let settled = await settle('practice');

check('a matching intention pays 5 Resolve',
    settled.body?.resolveAwarded === 5 && progress().ResolveXP - before.ResolveXP === 5,
    `resolveAwarded=${settled.body?.resolveAwarded}, ${before.ResolveXP} -> ${progress().ResolveXP}`);
check('the award is written to the agency log',
    agency().some((r) => r.Source === 'session-promise-kept' && r.Amount === 5),
    JSON.stringify(agency().slice(0, 2)));
check('a settled promise is closed', seeded.closed(),
    JSON.stringify(seeded.rows.map((r) => promiseRow(r.Id)?.FollowedUp)));

// 5b. The same promise cannot pay twice, even if the intention is set again.
before = progress();
settled = await settle('practice');
check('a promise already settled pays nothing again',
    settled.body?.resolveAwarded === 0 && progress().ResolveXP === before.ResolveXP,
    `resolveAwarded=${settled.body?.resolveAwarded}`);

// 5c. The wrong intention pays nothing, and the promise is still closed.
seeded = seedPromise('session-next-goal');
before = progress();
settled = await settle('practice');
check('an intention that is not the promise pays nothing',
    settled.body?.resolveAwarded === 0 && progress().ResolveXP === before.ResolveXP,
    `resolveAwarded=${settled.body?.resolveAwarded}`);
check('a promise that was not kept is still closed', seeded.closed());

// 5d. A written intention the AI placed in no single category still settles a chip promise.
seeded = seedPromise('session-next-goal');
before = progress();
settled = await settle('custom', 'both', 'a bit of both I think');
check('a written intention that names both things keeps a goal promise',
    settled.body?.resolveAwarded === 5 && progress().ResolveXP - before.ResolveXP === 5,
    `resolveAwarded=${settled.body?.resolveAwarded}`);

// 5e. A promise made today is not judged today.
//
// The intention is set at the start of a session and the promise is made at the end of one, so judging
// them on the same date would pay a student for promising what they are already doing.
seeded = seedPromise('session-next-practice', '', 0);
before = progress();
settled = await settle('practice');
check('a promise made today is left for tomorrow',
    settled.body?.resolveAwarded === 0 && progress().ResolveXP === before.ResolveXP,
    `resolveAwarded=${settled.body?.resolveAwarded}`);
check('and it stays open rather than being closed unjudged', !seeded.closed());

// 5f. Skipping the check-in is not breaking the promise.
seeded = seedPromise('session-next-practice');
before = progress();
settled = await settle('skip');
check('skipping the intention neither pays nor closes the promise',
    settled.body?.resolveAwarded === 0 && progress().ResolveXP === before.ResolveXP && !seeded.closed(),
    `resolveAwarded=${settled.body?.resolveAwarded}`);

// 5g. A promise with no chip at all is left open rather than closed unpaid.
//
// There is no free text in the reflection any more, so a promise always arrives as a chip id and the
// match is settled by the record. What is still worth asserting is the boundary: a commitment row that
// carries no chip — a row written before chips-only, or one the app could not resolve — must not be
// closed as "not kept", because "the record cannot say" and "the student did not do it" are different
// facts and only one of them is a promise that was broken.
seeded = seedPromise('', '');
before = progress();
settled = await settle('custom', 'unclear', '');
check('a commitment with no chip is left open rather than closed as not kept',
    settled.body?.resolveAwarded === 0 && !seeded.closed(),
    `resolveAwarded=${settled.body?.resolveAwarded}, ResolveXP ${before.ResolveXP} -> ${progress().ResolveXP}`);

// ── Report ───────────────────────────────────────────────────────────────────

const failed = results.filter((r) => !r.ok);
console.log();
console.log(`${results.length - failed.length} of ${results.length} checks passed.`);
if (failed.length > 0) {
    console.log('failed:');
    for (const r of failed) console.log(`   ${r.name}`);
}
console.log('Now run: node restore-baseline.mjs');
process.exit(failed.length === 0 ? 0 : 1);
