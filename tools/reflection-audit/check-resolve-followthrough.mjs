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

function seedPromise(choice) {
    const before = conn.prepare('SELECT COUNT(*) AS n FROM ReflectionHistory WHERE StudentId = ?').get(STUDENT).n;
    conn.prepare(
        "INSERT INTO ReflectionHistory (StudentId, ItemType, ItemId, Role, Text, InsightXp, CreatedAt, QuestionId, Choice, FollowedUp) " +
        "VALUES (?, 'exercise', 'Efficiency', 'student', 'e2e promise', 0, ?, 'q3-next-action', ?, 0)"
    ).run(STUDENT, stamp(), choice);
    const id = conn.prepare(
        'SELECT Id FROM ReflectionHistory WHERE StudentId = ? ORDER BY Id DESC LIMIT 1'
    ).get(STUDENT).Id;
    return { id, countBefore: before };
}

function promiseRow(id) {
    return conn.prepare('SELECT Id, Choice, FollowedUp FROM ReflectionHistory WHERE Id = ?').get(id);
}

async function logExercise(decisions, hints) {
    const response = await fetch(`${API}/student-progress/log-exercise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentId: STUDENT,
            exerciseType: 'Efficiency',
            errors: 1,
            hints,
            decisions,
        }),
    });
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { status: response.status, body };
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

// ── The end ──────────────────────────────────────────────────────────────────

const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed} of ${results.length} checks passed.`);
console.log('final progress:', JSON.stringify(progress()));
console.log('resolve log rows:', JSON.stringify(log()));
process.exit(failed === 0 ? 0 : 1);
