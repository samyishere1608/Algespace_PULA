// End-to-end check of the reflection follow-through award.
//
// Seeds a promise row directly, then finishes an exercise through the real endpoint and
// reads back what the server paid. This is the only way to check the rule, because the
// promise is settled inside the same transaction as the exercise completion.

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Resolved from this file, so the check works from any working directory.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DB = path.join(ROOT, 'webapi/Data/databases/students.db');
const API = 'http://localhost:7273';
const STUDENT = 7;

const conn = new DatabaseSync(DB);

const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

function progress() {
    return conn.prepare(
        'SELECT ResolveXP, InsightXP, LifetimeAgencyXP FROM StudentProgress WHERE StudentId = ?'
    ).get(STUDENT);
}

function log() {
    return conn.prepare(
        "SELECT Id, Amount, Source, LoggedAt FROM AgencyLog WHERE StudentId = ? AND XpType = 'resolve' ORDER BY Id DESC"
    ).all(STUDENT);
}

function seedPromise(choice, itemType = 'exercise', itemId = 'Efficiency') {
    const before = conn.prepare('SELECT COUNT(*) AS n FROM ReflectionHistory WHERE StudentId = ?').get(STUDENT).n;
    conn.prepare(
        "INSERT INTO ReflectionHistory (StudentId, ItemType, ItemId, Role, Text, InsightXp, CreatedAt, QuestionId, Choice, FollowedUp) " +
        "VALUES (?, ?, ?, 'student', 'e2e promise', 0, ?, 'q3-next-action', ?, 0)"
    ).run(STUDENT, itemType, itemId, stamp(), choice);
    const id = conn.prepare(
        'SELECT Id FROM ReflectionHistory WHERE StudentId = ? ORDER BY Id DESC LIMIT 1'
    ).get(STUDENT).Id;
    return { id, countBefore: before };
}

function promiseRow(id) {
    return conn.prepare('SELECT Id, Choice, FollowedUp FROM ReflectionHistory WHERE Id = ?').get(id);
}

async function logExercise(decisions, hints, { errors = 1, exerciseType = 'Efficiency', attemptId = 0 } = {}) {
    const response = await fetch(`${API}/student-progress/log-exercise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentId: STUDENT,
            exerciseType,
            errors,
            hints,
            decisions,
            attemptId,
        }),
    });
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { status: response.status, body };
}

// A completed attempt, so the promises that are about WHICH method can be checked the way the app
// checks them: from the attempt's own row rather than from the request.
const seededAttempts = [];

function attempt(exerciseType, method, errors = 1, hints = 0) {
    const info = conn.prepare(
        'INSERT INTO FlexibilityAttempt (StudentId, ExerciseType, ExerciseId, SelectedMethod, AgentCondition, IsStudy, StartedAt, CompletedAt, TotalTime, TotalErrors, TotalHints) ' +
        "VALUES (?, ?, 1, ?, '2', 0, ?, ?, 30, ?, ?)"
    ).run(STUDENT, exerciseType, method, stamp(), stamp(), errors, hints);

    const id = Number(info.lastInsertRowid);
    seededAttempts.push(id);
    return id;
}

const results = [];
function check(name, ok, detail) {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

// ── 1. A kept promise pays Resolve ───────────────────────────────────────────

let before = progress();
let seeded = seedPromise('act-solo-myself');
let res = await logExercise('SolveOnOwn=Engaged', 0);
let after = progress();

check('kept promise is acknowledged by the endpoint',
    res.status === 200 && res.body?.resolveAwarded === 5,
    `status ${res.status}, resolveAwarded=${res.body?.resolveAwarded}`);
check('kept promise adds 5 Resolve',
    after.ResolveXP - before.ResolveXP === 5,
    `${before.ResolveXP} -> ${after.ResolveXP}`);
check('kept promise adds 5 to the lifetime total',
    after.LifetimeAgencyXP - before.LifetimeAgencyXP === 5,
    `${before.LifetimeAgencyXP} -> ${after.LifetimeAgencyXP}`);
check('kept promise is written to the agency log',
    log().some(row => row.Source === 'reflection-follow-through' && row.Amount === 5),
    JSON.stringify(log().slice(0, 2)));
check('kept promise is closed so it cannot pay twice',
    promiseRow(seeded.id)?.FollowedUp === 1,
    `FollowedUp=${promiseRow(seeded.id)?.FollowedUp}`);

// ── 2. The same promise cannot pay a second time ─────────────────────────────

before = progress();
res = await logExercise('SolveOnOwn=Engaged', 0);
after = progress();
check('a promise already kept pays nothing again',
    res.body?.resolveAwarded === 0 && after.ResolveXP === before.ResolveXP,
    `resolveAwarded=${res.body?.resolveAwarded}, ResolveXP ${before.ResolveXP} -> ${after.ResolveXP}`);

// ── 3. A broken promise pays nothing but is still closed ─────────────────────

before = progress();
seeded = seedPromise('act-solo-myself');
res = await logExercise('SolveOnOwn=Declined', 0);
after = progress();
check('a broken promise pays nothing',
    res.body?.resolveAwarded === 0 && after.ResolveXP === before.ResolveXP,
    `resolveAwarded=${res.body?.resolveAwarded}, ResolveXP ${before.ResolveXP} -> ${after.ResolveXP}`);
check('a broken promise is closed anyway',
    promiseRow(seeded.id)?.FollowedUp === 1,
    `FollowedUp=${promiseRow(seeded.id)?.FollowedUp}`);

// ── 4. A promise to be shown pays nothing, even when it comes true ───────────

before = progress();
seeded = seedPromise('act-solo-shown');
res = await logExercise('SolveOnOwn=Declined', 0);
after = progress();
check('a promise to be shown pays nothing',
    res.body?.resolveAwarded === 0 && after.ResolveXP === before.ResolveXP,
    `resolveAwarded=${res.body?.resolveAwarded}, ResolveXP ${before.ResolveXP} -> ${after.ResolveXP}`);
check('a promise to be shown is closed',
    promiseRow(seeded.id)?.FollowedUp === 1,
    `FollowedUp=${promiseRow(seeded.id)?.FollowedUp}`);

// ── 5. Engaging through a hint still keeps the promise ───────────────────────

before = progress();
seeded = seedPromise('act-solo-hint');
res = await logExercise('SolveOnOwn=Engaged', 1);
after = progress();
check('taking a hint does not break a promise to try it yourself',
    res.body?.resolveAwarded === 5 && after.ResolveXP - before.ResolveXP === 5,
    `resolveAwarded=${res.body?.resolveAwarded}, ResolveXP ${before.ResolveXP} -> ${after.ResolveXP}`);

// ── 6. The hint target promise ───────────────────────────────────────────────

before = progress();
seedPromise('act-target-none');
res = await logExercise('SolveOnOwn=Engaged', 2);
after = progress();
check('"no hints next time" fails when two hints were taken',
    res.body?.resolveAwarded === 0 && after.ResolveXP === before.ResolveXP,
    `resolveAwarded=${res.body?.resolveAwarded}`);

before = progress();
seedPromise('act-target-none');
res = await logExercise('SolveOnOwn=Engaged', 0);
after = progress();
check('"no hints next time" pays when no hint was taken',
    res.body?.resolveAwarded === 5 && after.ResolveXP - before.ResolveXP === 5,
    `resolveAwarded=${res.body?.resolveAwarded}, ResolveXP ${before.ResolveXP} -> ${after.ResolveXP}`);

// ── 7. A method promise is recorded but never paid ───────────────────────────

before = progress();
seeded = seedPromise('act-method-same');
res = await logExercise('SolveOnOwn=Engaged', 0);
after = progress();
check('a method promise pays nothing (the chip does not name the method)',
    res.body?.resolveAwarded === 0 && after.ResolveXP === before.ResolveXP,
    `resolveAwarded=${res.body?.resolveAwarded}`);
check('a method promise is still closed',
    promiseRow(seeded.id)?.FollowedUp === 1,
    `FollowedUp=${promiseRow(seeded.id)?.FollowedUp}`);

// ── 8. The goal commitments, which used to be closed unjudged ────────────────
//
// Every id the goal menus offer falls through the old switch to `_ => false`, so the promise was closed
// the moment the next exercise was logged and Resolve was never paid. These are the flat ones.

before = progress();
seedPromise('act-no-hints', 'goal', 'hintsAndErrors');
res = await logExercise('', 2);
after = progress();
check('"use no hints" fails when a hint was taken',
    res.body?.resolveAwarded === 0,
    `resolveAwarded=${res.body?.resolveAwarded}`);

before = progress();
seedPromise('act-no-hints', 'goal', 'hintsAndErrors');
res = await logExercise('', 0);
after = progress();
check('"use no hints" pays when no hint was taken',
    res.body?.resolveAwarded === 5 && after.ResolveXP - before.ResolveXP === 5,
    `resolveAwarded=${res.body?.resolveAwarded}`);

before = progress();
seedPromise('act-solve-alone', 'goal', 'solveOnOwn');
res = await logExercise('SolveOnOwn=Engaged', 0);
after = progress();
check('"work it out myself" pays when they did',
    res.body?.resolveAwarded === 5 && after.ResolveXP - before.ResolveXP === 5,
    `resolveAwarded=${res.body?.resolveAwarded}`);

before = progress();
seedPromise('act-compare', 'goal', 'methodComparison');
res = await logExercise('MethodComparison=Declined', 0);
after = progress();
check('"compare the methods" fails when they declined',
    res.body?.resolveAwarded === 0,
    `resolveAwarded=${res.body?.resolveAwarded}`);

// "Make fewer mistakes than my average" is read against the average they carried when they promised,
// which excludes the run that is settling it. This student has no history here, so two runs are laid
// down first: the newest is the one being settled, and the average is taken over the ones before it.
attempt('Efficiency', 'Elimination', 3, 0);
attempt('Efficiency', 'Elimination', 4, 0);

before = progress();
seedPromise('act-beat-average', 'goal', 'method');
res = await logExercise('', 0, { errors: 9 });
after = progress();
check('"beat my average" fails on a run worse than the average',
    res.body?.resolveAwarded === 0,
    `resolveAwarded=${res.body?.resolveAwarded}`);

before = progress();
seedPromise('act-beat-average', 'goal', 'method');
res = await logExercise('', 0, { errors: 0 });
after = progress();
check('"beat my average" pays on a clean run',
    res.body?.resolveAwarded === 5 && after.ResolveXP - before.ResolveXP === 5,
    `resolveAwarded=${res.body?.resolveAwarded}`);

// ── 9. One chip id, two different promises ──────────────────────────────────
//
// "pick-elimination" is offered by a method-comparison goal and by a solve-on-own one, and it promises
// something different in each. The chip id alone cannot tell them apart, so the category has to.

let eliminationAttempt = attempt('Efficiency', 'Elimination');
before = progress();
seedPromise('pick-elimination', 'goal', 'methodComparison');
res = await logExercise('MethodComparison=Engaged', 0, { attemptId: eliminationAttempt });
after = progress();
check('"compare in elimination next" pays when they compared in elimination',
    res.body?.resolveAwarded === 5 && after.ResolveXP - before.ResolveXP === 5,
    `resolveAwarded=${res.body?.resolveAwarded}`);

eliminationAttempt = attempt('Efficiency', 'Elimination');
before = progress();
seedPromise('pick-elimination', 'goal', 'solveOnOwn');
res = await logExercise('MethodComparison=Engaged', 0, { attemptId: eliminationAttempt });
after = progress();
check('a solve-on-own method promise is NOT kept by comparing the methods',
    res.body?.resolveAwarded === 0,
    `resolveAwarded=${res.body?.resolveAwarded}`);

eliminationAttempt = attempt('Efficiency', 'Elimination');
before = progress();
seedPromise('pick-elimination', 'goal', 'solveOnOwn');
res = await logExercise('SolveOnOwn=Engaged', 0, { attemptId: eliminationAttempt });
after = progress();
check('a solve-on-own method promise pays when they worked it out in that method',
    res.body?.resolveAwarded === 5 && after.ResolveXP - before.ResolveXP === 5,
    `resolveAwarded=${res.body?.resolveAwarded}`);

// A promise about a method they did not use cannot be kept by accident.
const substitutionAttempt = attempt('Efficiency', 'Substitution');
before = progress();
seedPromise('pick-elimination', 'goal', 'solveOnOwn');
res = await logExercise('SolveOnOwn=Engaged', 0, { attemptId: substitutionAttempt });
after = progress();
check('a promise about elimination is not kept by a substitution exercise',
    res.body?.resolveAwarded === 0,
    `resolveAwarded=${res.body?.resolveAwarded}`);

// "Pick a suitable method" is settled against the exercise's own list of allowed methods, which lives in
// the exercises database. Read it here so the expectation comes from the same place the server reads it
// from, rather than from a guess.
const algeSpace = new DatabaseSync(path.join(ROOT, 'webapi/Data/databases/algespace.db'));
const METHOD_VALUE = { Equalization: 0, Substitution: 1, Elimination: 2 };

function allowedMethods(type, exerciseId) {
    const table = type === 'Suitability' ? 'SuitabilityExercises' : 'EfficiencyExercises';
    const column = type === 'Suitability' ? 'SuitableMethods' : 'EfficientMethods';
    const row = algeSpace.prepare(`SELECT ${column} AS methods FROM ${table} WHERE Id = ?`).get(exerciseId);

    if (!row?.methods) return null;
    try { return JSON.parse(row.methods); } catch { return null; }
}

const suitabilityAllowed = allowedMethods('Suitability', 1);
const eliminates = suitabilityAllowed?.includes(METHOD_VALUE.Elimination) === true;
const suitabilityAttempt = attempt('Suitability', 'Elimination');
before = progress();
seedPromise('act-suitable-choice', 'goal', 'exerciseType');
res = await logExercise('', 0, { exerciseType: 'Suitability', attemptId: suitabilityAttempt });
after = progress();

if (suitabilityAllowed === null) {
    console.log('SKIP  "pick a suitable method" positive case (exercise 1 is not in the exercises database)');
} else {
    check(`"pick a suitable method" is judged by the exercise's own method list (elimination ${eliminates ? 'is' : 'is not'} allowed here)`,
        res.body?.resolveAwarded === (eliminates ? 5 : 0),
        `resolveAwarded=${res.body?.resolveAwarded}, expected ${eliminates ? 5 : 0}`);
}

// The promise is about a Suitability exercise, so an Efficiency one cannot keep it whatever the method.
const efficiencyAttempt = attempt('Efficiency', 'Elimination');
before = progress();
seedPromise('act-suitable-choice', 'goal', 'exerciseType');
res = await logExercise('', 0, { exerciseType: 'Efficiency', attemptId: efficiencyAttempt });
after = progress();
check('"pick a suitable method" cannot be kept by an exercise of another type',
    res.body?.resolveAwarded === 0 && after.ResolveXP === before.ResolveXP,
    `resolveAwarded=${res.body?.resolveAwarded}`);

// ── The end ──────────────────────────────────────────────────────────────────
//
// The attempts this check lays down are a fixture, not the student's history: the fixture row is
// recognisable by its 30-second stamp, so it is removed here rather than left for the student to find
// on their own dashboard. The history and queue rows the API created are restore-baseline.mjs's job.

for (const id of seededAttempts) conn.prepare('DELETE FROM FlexibilityAttempt WHERE Id = ?').run(id);
for (const id of seededAttempts) conn.prepare('DELETE FROM AnchorRecord WHERE AttemptId = ?').run(id);

const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed} of ${results.length} checks passed.`);
console.log('final progress:', JSON.stringify(progress()));
console.log('resolve log rows:', JSON.stringify(log()));
process.exit(failed === 0 ? 0 : 1);
