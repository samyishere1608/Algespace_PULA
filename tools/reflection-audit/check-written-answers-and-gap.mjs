// Two things the reflection module kept getting wrong, checked against the real endpoints.
//
//   1. A WRITTEN answer. The verdict and the sentence beside it have to agree, and a written answer
//      is paid only when the facts confirm it. The failing case this was written for: a goal on hints
//      where all three exercises had no hints, answered with "I didn't use hints at all", came back as
//      "this reads a little differently" next to +3.
//   2. Insight for facing a gap. One award per gap episode: working on the thing next time must pay
//      nothing until the student has fallen back into avoiding it.
//
//   node check-written-answers-and-gap.mjs            (live AI)
//   $env:OpenAI__ApiKey='broken'  +  API restarted    (offline pass: a written answer must pay nothing)
//
// Always followed by restore-baseline.mjs.

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const conn = new DatabaseSync(path.join(ROOT, 'webapi/Data/databases/students.db'));
const API = 'http://localhost:7273';
const STUDENT = 7;
const GAP_STUDENT = 99001;
const OFFLINE = process.argv.includes('--offline');

const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const failures = [];
let checks = 0;

function expect(title, ok, detail = '') {
    checks++;
    if (!ok) {
        failures.push(title);
        console.log(`FAIL  ${title}${detail ? `\n      ${detail}` : ''}`);
    }
}

function seedAttempt(student, type, method, errors, hints, decisions = {}) {
    const info = conn.prepare(
        'INSERT INTO FlexibilityAttempt (StudentId, ExerciseType, ExerciseId, SelectedMethod, AgentCondition, IsStudy, StartedAt, CompletedAt, TotalTime, TotalErrors, TotalHints) ' +
        "VALUES (?, ?, ?, ?, '2', 0, ?, ?, 40, ?, ?)"
    ).run(student, type, 1, method, stamp(), stamp(), errors, hints);
    const id = Number(info.lastInsertRowid);
    for (const [name, choice] of Object.entries(decisions)) {
        conn.prepare(
            'INSERT INTO AnchorRecord (AttemptId, StudentId, Name, Choice, MessageType, Actions, Time, Errors, Hints, UpdatedAt) ' +
            "VALUES (?, ?, ?, ?, NULL, '', 0, 0, 0, ?)"
        ).run(id, student, name, choice, stamp());
    }
    return id;
}

function clearStudent(student) {
    const ids = conn.prepare('SELECT Id FROM FlexibilityAttempt WHERE StudentId = ?').all(student).map(r => r.Id);
    for (const id of ids) conn.prepare('DELETE FROM AnchorRecord WHERE AttemptId = ?').run(id);
    conn.prepare('DELETE FROM FlexibilityAttempt WHERE StudentId = ?').run(student);
    try { conn.prepare('DELETE FROM InsightGapAward WHERE StudentId = ?').run(student); } catch { /* table is created on first use */ }
    conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(student);
    conn.prepare('DELETE FROM ReflectionHistory WHERE StudentId = ?').run(student);
}

async function post(url, body) {
    const response = await fetch(`${API}${url}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return response.ok ? response.json() : { error: response.status };
}

const HEDGE = /differently|different from|(a |the )?(little|bit|touch|slightly)( bit)? different|not (quite|exactly)|second (glance|look)|however|in reality|but actually/i;
const CONFIRMS = /spot on|exactly (what|right|as)|that matches|matches what|you'?re (absolutely |completely )?right|that'?s (absolutely |completely )?(right|correct)|nailed it/i;
const AWARD = /\b(insight|xp|award(ed)?|earn(ed)?)\b/i;

// ── 1. Written answers ──────────────────────────────────────────────────────

async function goalItem(category, quality, limit, attempts) {
    clearStudent(STUDENT);
    for (const [type, method, errors, hints, decisions] of attempts) seedAttempt(STUDENT, type, method, errors, hints, decisions);

    await post('/student-progress/log-goal', {
        studentId: STUDENT, goalId: category, goalLabel: `check ${category}`, xpEarned: 5,
        exerciseType: '', totalErrors: 0, totalHints: 0, since: '', focus: '', quality, maxPerExercise: limit,
    });

    const queue = await (await fetch(`${API}/student-progress/reflection-queue/${STUDENT}`)).json();
    return queue.find(q => q.itemType === 'goal');
}

async function written(entry, number, question, answer) {
    // The provider rate-limits, and every written answer is two calls. Spacing them keeps a live run
    // from silently turning into the offline path, which would prove nothing about the judge.
    if (!OFFLINE) await new Promise(resolve => setTimeout(resolve, 2500));
    return post('/student-progress/reflection/evaluate', {
        studentId: STUDENT, queueItemId: entry.id, questionNumber: number, questionId: question.id,
        choice: '', choiceLabel: '', answer, mode: 'self', language: 'en', subjectTerms: [],
    });
}

// What each written answer ought to be judged as, for a goal on hints where all three exercises had none.
const CASES_NO_HINTS = [
    ['claims no hints, true', 'i didnt use hints at all', true],
    ['claims no hints, true (worded differently)', 'I got through all of them without using a single hint', true],
    ['claims lots of hints, false', 'I needed loads of hints on every exercise', false],
    ['a verdict only', 'it was fine i think', false],
];

console.log('### Goal on hints, 3 exercises, no hints');
const hintGoal = await goalItem('hintsAndErrors', 'hints', 1, [
    ['Matching', 'Elimination', 0, 0],
    ['Matching', 'Elimination', 1, 0],
    ['Matching', 'Substitution', 0, 0],
]);

if (!hintGoal) {
    expect('the hints goal reached the queue', false);
} else {
    const q2 = hintGoal.questions[1];

    // A question about "which method took the most hints" has no answer when there were none.
    expect('Q2 of a hint-free goal is not a "which method took the most hints" question',
        q2.id === 'q2-count' && q2.textKey === 'reflection-q2-count-hintfree',
        `got ${q2.id} / ${q2.textKey}`);

    for (const [index, question] of hintGoal.questions.slice(0, 2).entries()) {
        for (const [label, answer, shouldMatch] of CASES_NO_HINTS) {
            const result = await written(hintGoal, index + 1, question, answer);
            const title = `${question.id} — ${label}`;
            if (result.error) { console.log(`SKIP  ${title}: ${result.error}`); continue; }
            if (result.needsRetry) continue;

            const text = result.feedback ?? '';
            expect(`${title}: the badge pays only when the reply confirms`, (result.insightXp > 0) === result.aligned, `aligned=${result.aligned} xp=${result.insightXp} "${text}"`);
            expect(`${title}: no award language`, !AWARD.test(text), `"${text}"`);
            if (result.aligned) expect(`${title}: a confirmed answer is not hedged`, !HEDGE.test(text), `"${text}"`);
            else expect(`${title}: an unconfirmed answer is not confirmed`, !CONFIRMS.test(text), `"${text}"`);

            if (OFFLINE) {
                expect(`${title}: offline, a written answer pays nothing`, result.insightXp === 0 && !result.aligned, `xp=${result.insightXp}`);
            } else if (label.startsWith('claims no hints, true') && question.id === 'q2-count') {
                expect(`${title}: the live judge confirms a true claim`, result.aligned === shouldMatch, `aligned=${result.aligned} "${text}"`);
            } else if (label === 'claims lots of hints, false') {
                expect(`${title}: the live judge does not confirm a false claim`, !result.aligned, `aligned=${result.aligned} "${text}"`);
            }
        }
    }
}

// ── 2. Insight for facing a gap ─────────────────────────────────────────────

console.log('\n### Insight for facing a gap');
clearStudent(GAP_STUDENT);

const DECLINE = { FirstSolutionChoice: 'No' };
const ENGAGE = { FirstSolutionChoice: 'Yes' };

async function ask(attemptId, element = 'SolveOnOwn') {
    const result = await post('/student-progress/insight-gap-award', { studentId: GAP_STUDENT, element, attemptId });
    return result.amount ?? -1;
}

for (let i = 0; i < 6; i++) seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 1, 0, DECLINE);

const first = seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 0, 0, ENGAGE);
expect('the first engagement after a run of declines is paid', (await ask(first)) > 0);
expect('the same exercise is not paid twice', (await ask(first)) === 0);

// The old rule paid each of these while the all-time rate caught up.
for (let i = 0; i < 3; i++) {
    const next = seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 0, 0, ENGAGE);
    expect(`engagement ${i + 2} after the award pays nothing`, (await ask(next)) === 0);
}

// THE EXPLOIT: decline on purpose, straight away, then engage. The element is being monitored, so five
// quick declines buy nothing: a week has to pass as well.
for (let i = 0; i < 6; i++) seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 1, 0, DECLINE);
const quick = seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 0, 0, ENGAGE);
expect('declining on purpose straight after an award, then engaging, pays nothing', (await ask(quick)) === 0);

// A week later, with the deficit still there over the last five opportunities, it is paid again.
conn.prepare('UPDATE InsightGapAward SET AwardedAt = ? WHERE StudentId = ?')
    .run(new Date(Date.now() - 8 * 86_400_000).toISOString().slice(0, 19), GAP_STUDENT);
const later = seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 0, 0, ENGAGE);
expect('after a week of monitoring with the deficit back, it pays again', (await ask(later)) > 0);

// A week passes but the student has been doing it: no deficit, nothing to pay.
conn.prepare('UPDATE InsightGapAward SET AwardedAt = ? WHERE StudentId = ?')
    .run(new Date(Date.now() - 8 * 86_400_000).toISOString().slice(0, 19), GAP_STUDENT);
for (let i = 0; i < 5; i++) seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 0, 0, ENGAGE);
const kept = seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 0, 0, ENGAGE);
expect('a week later but doing it regularly: no deficit, no award', (await ask(kept)) === 0);

// Five opportunities, a deficit, but less than a week: still monitored.
clearStudent(GAP_STUDENT);
for (let i = 0; i < 6; i++) seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 1, 0, DECLINE);
const firstAgain = seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 0, 0, ENGAGE);
await ask(firstAgain);
for (let i = 0; i < 5; i++) seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 1, 0, DECLINE);
conn.prepare('UPDATE InsightGapAward SET AwardedAt = ? WHERE StudentId = ?')
    .run(new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 19), GAP_STUDENT);
const early = seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 0, 0, ENGAGE);
expect('a deficit after only three days is still inside the monitoring period', (await ask(early)) === 0);

// Each element is monitored on its own.
const other = seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 0, 0, { SelfExplanationChoice: 'Yes' });
expect('an element that was never avoided is not paid because another one was', (await ask(other, 'SelfExplanation')) === 0);

// A student who has never avoided it is not paid.
clearStudent(GAP_STUDENT);
for (let i = 0; i < 4; i++) seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 0, 0, ENGAGE);
const never = seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 0, 0, ENGAGE);
expect('a student who always does it is not paid', (await ask(never)) === 0);

// Too little history to call it avoidance.
clearStudent(GAP_STUDENT);
for (let i = 0; i < 2; i++) seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 0, 0, DECLINE);
const tooSoon = seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 0, 0, ENGAGE);
expect('two declines are not yet avoidance', (await ask(tooSoon)) === 0);

// An element that cannot be a gap is never paid.
expect('an unknown element is not paid', (await ask(tooSoon, 'Method')) === 0);

clearStudent(GAP_STUDENT);
clearStudent(STUDENT);
conn.close();

console.log(`\n${checks} checks, ${failures.length} failed.`);
process.exit(failures.length === 0 ? 0 : 1);
