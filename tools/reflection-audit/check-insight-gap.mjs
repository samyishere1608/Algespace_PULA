// Insight for facing a gap, checked against the real endpoint.
//
// One award per gap episode: working on the thing next time must pay nothing until the student has
// fallen back into avoiding it, and a grace of three attempts is shared with the nudge.
//
//   node check-insight-gap.mjs
//
// Always followed by restore-baseline.mjs.
//
// This file used to carry a second half about WRITTEN reflection answers. There is no free text in the
// reflection any more, so there is nothing left in it to check: a chip is graded from the record before
// the model is called, and check-reply-alignment.mjs drives every chip of every question.

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

// ── Insight for facing a gap ────────────────────────────────────────────────

console.log('### Insight for facing a gap');
clearStudent(GAP_STUDENT);

const DECLINE = { FirstSolutionChoice: 'No' };
const ENGAGE = { FirstSolutionChoice: 'Yes' };

async function ask(attemptId, element = 'SolveOnOwn') {
    const result = await post('/student-progress/insight-gap-award', { studentId: GAP_STUDENT, element, attemptId });
    return result.amount ?? -1;
}

// The record: twenty declines, then the first engagement. A huge deficit, so the old rule kept paying.
for (let i = 0; i < 20; i++) seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 1, 0, DECLINE);

async function nudgeSeesAGap(element = 'SolveOnOwn') {
    // The nudge reads the profile's gaps, so this is what it would act on.
    const profile = await (await fetch(`${API}/anchor-tracking/profile/${GAP_STUDENT}`)).json();
    return (profile.gaps ?? []).some(g => g.element === element);
}

expect('before any award the nudge sees the gap', await nudgeSeesAGap());

const first = seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 0, 0, ENGAGE);
expect('the first engagement after a run of declines is paid', (await ask(first)) > 0);
expect('the same exercise is not paid twice', (await ask(first)) === 0);
expect('right after the award the nudge no longer sees a gap', !(await nudgeSeesAGap()));

// GRACE: the next three opportunities are not a deficit, whether they are taken or declined, and
// however large the historical deficit still is (one engagement in twenty-one).
const graceChoices = [ENGAGE, DECLINE, DECLINE];
for (const [i, choice] of graceChoices.entries()) {
    // The nudge and the award both fire at the moment of the decision, when only the EARLIER attempts
    // are recorded, so that is the moment the profile is read.
    expect(`attempt ${i + 1} after the award: the nudge sees no gap`, !(await nudgeSeesAGap()));
    const next = seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 0, 0, choice);
    expect(`attempt ${i + 1} after the award pays nothing`, (await ask(next)) === 0);
}

// After the third, the weakness counts again: the deficit is still there, so the nudge returns and the
// next engagement is paid again.
expect('after three attempts the nudge sees the gap again', await nudgeSeesAGap());
const again = seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 0, 0, ENGAGE);
expect('and the next engagement is paid again', (await ask(again)) > 0);

// ...and that award starts a new grace period.
const graceAgain = seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 0, 0, ENGAGE);
expect('the award after that starts its own three-attempt grace', (await ask(graceAgain)) === 0);

// Each element has its own grace: one weakness being paid does not silence another.
clearStudent(GAP_STUDENT);
for (let i = 0; i < 20; i++) seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 1, 0, { FirstSolutionChoice: 'No', SelfExplanationChoice: 'No' });
const both = seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 0, 0, { FirstSolutionChoice: 'Yes', SelfExplanationChoice: 'Yes' });
expect('solve on own is paid', (await ask(both, 'SolveOnOwn')) > 0);
expect('self-explanation, a different weakness, is paid too', (await ask(both, 'SelfExplanation')) > 0);
const bothNext = seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 0, 0, { FirstSolutionChoice: 'Yes', SelfExplanationChoice: 'Yes' });
expect('each is then in its own grace', (await ask(bothNext, 'SolveOnOwn')) === 0 && (await ask(bothNext, 'SelfExplanation')) === 0);
const unrelated = seedAttempt(GAP_STUDENT, 'Suitability', 'Elimination', 0, 0, { ComparisonChoice: 'Yes' });
expect('a weakness that was never avoided is not paid because others were', (await ask(unrelated, 'MethodComparison')) === 0);

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
console.log('Now run: node restore-baseline.mjs');
process.exit(failures.length === 0 ? 0 : 1);
