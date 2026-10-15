// Insight for aiming one of your own goals at something the profile says you avoid.
//
// The rule is "a goal the student picked, whose category matches a weakness they currently have",
// and every part of it is a guard that could silently stop working: the origin, the fact that hints
// and errors is not an avoidance dimension, the per-goal idempotency, and the daily ceiling. A
// regression in any of them either pays nobody or pays on every re-save, and neither is visible
// from the screen. So this walks it against the real endpoint with real profile data.
//
// Writes to the database and restores what it touched; follow it with restore-baseline.mjs anyway.

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DB = path.join(ROOT, 'webapi/Data/databases/students.db');
const API = 'http://localhost:7273';
const STUDENT = 8;

const conn = new DatabaseSync(DB);

const before = conn.prepare(
    'SELECT InsightXP, LifetimeAgencyXP FROM StudentProgress WHERE StudentId = ?'
).get(STUDENT);
const insightOf = () => conn.prepare('SELECT InsightXP FROM StudentProgress WHERE StudentId = ?').get(STUDENT).InsightXP;

const goals = ['probe-a', 'probe-b', 'probe-c', 'probe-d', 'probe-e', 'probe-f', 'probe-g'];

function clean() {
    conn.prepare(`DELETE FROM ActiveGoals WHERE StudentId = ? AND Id IN (${goals.map(() => '?').join(',')})`).run(STUDENT, ...goals);
    conn.prepare("DELETE FROM AgencyLog WHERE StudentId = ? AND Source = 'targeted-weak-area' AND RefId IN (" + goals.map(() => '?').join(',') + ")").run(STUDENT, ...goals);
    conn.prepare("DELETE FROM StudentEvent WHERE StudentId = ? AND RefId IN (" + goals.map(() => '?').join(',') + ")").run(STUDENT, ...goals);
}

clean();
conn.prepare('UPDATE StudentProgress SET InsightXP = ?, LifetimeAgencyXP = ? WHERE StudentId = ?')
    .run(before.InsightXP, before.LifetimeAgencyXP, STUDENT);

async function setGoal(goalId, category, origin) {
    const was = insightOf();
    const response = await fetch(`${API}/student-progress/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentId: STUDENT, id: goalId, category, focus: '', metric: 'exercises',
            target: 3, quality: '', maxPerExercise: 0, createdAt: new Date().toISOString(), origin,
        }),
    });
    return { status: response.status, paid: insightOf() - was };
}

const results = [];
function check(name, ok, detail) {
    results.push(ok);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const profile = await (await fetch(`${API}/anchor-tracking/profile/${STUDENT}`)).json();
console.log('student', STUDENT, 'gaps:', profile.gaps.map((g) => g.element).join(', '), '\n');

// A goal the assistant proposed earns nothing, whatever it aims at.
let r = await setGoal('probe-c', 'selfExplanation', 'assistant');
check('a goal taken from a suggestion pays no Insight', r.paid === 0, `paid ${r.paid}`);

// Hints and errors is a measurement, not an avoidance dimension, so it is not a weakness here.
r = await setGoal('probe-d', 'hintsAndErrors', 'student');
check('a goal about hints/errors is not "a weakness"', r.paid === 0, `paid ${r.paid}`);

// The case this exists for: aiming your own goal at something you avoid.
r = await setGoal('probe-a', 'solveOnOwn', 'student');
check('your own goal aimed at a weakness pays 8 Insight', r.paid === 8, `paid ${r.paid}`);

// Re-saving it must not pay again. This is the hole the client-side version had: it paid on every
// save of the plan, so the same goal could be saved for the same eight points.
r = await setGoal('probe-a', 'solveOnOwn', 'student');
check('re-saving the same goal pays nothing more', r.paid === 0, `paid ${r.paid}`);

// A second and third weakness goal in the same sitting are each doing the thing being rewarded.
r = await setGoal('probe-b', 'method', 'student');
check('a second weakness goal today pays 8', r.paid === 8, `paid ${r.paid}`);
r = await setGoal('probe-e', 'exerciseType', 'student');
check('a third weakness goal today pays 8', r.paid === 8, `paid ${r.paid}`);

// Beyond that it is adding goals to collect, so it stops. Three is the ceiling the award had when it
// lived on the client, where one plan save could pay 8 per goal up to 24.
r = await setGoal('probe-f', 'selfExplanation', 'student');
check('a fourth weakness goal today pays nothing', r.paid === 0, `paid ${r.paid}`);

// And the ledger says why, so the award is auditable. Three rows, each naming its goal.
const logged = conn.prepare(
    "SELECT XpType, Amount, Source, RefId FROM AgencyLog WHERE StudentId = ? AND Source = 'targeted-weak-area' ORDER BY Id"
).all(STUDENT);
check('three ledger rows, each naming its own goal',
    logged.length === 3 && logged.map((r2) => r2.RefId).sort().join(',') === 'probe-a,probe-b,probe-e',
    JSON.stringify(logged.map((r2) => r2.RefId)));
check('every ledger row is 8 Insight',
    logged.every((r2) => r2.XpType === 'insight' && r2.Amount === 8 && r2.Source === 'targeted-weak-area'),
    JSON.stringify(logged[0]));

clean();
conn.prepare('UPDATE StudentProgress SET InsightXP = ?, LifetimeAgencyXP = ? WHERE StudentId = ?')
    .run(before.InsightXP, before.LifetimeAgencyXP, STUDENT);
const after = conn.prepare('SELECT InsightXP, LifetimeAgencyXP FROM StudentProgress WHERE StudentId = ?').get(STUDENT);
console.log('\nrestored:', JSON.stringify(after) === JSON.stringify(before) ? 'yes' : `NO — ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);

const failed = results.filter((ok) => !ok).length;
console.log(failed === 0 ? `\n${results.length} checks passed.` : `\n${failed} of ${results.length} FAILED.`);
process.exit(failed === 0 ? 0 : 1);
