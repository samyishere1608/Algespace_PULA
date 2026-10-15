// The goal a Q3 commitment proposes, end to end through the real endpoint.
//
// The bank harness proves the mapping itself — which chip proposes which goal, and that every field
// of it fits the catalogue. What it cannot reach is the wiring around it: that the server reads the
// narrowed method off the queue row and hands the catalogue the right form of it. That path is where
// a method goal's suggestion silently degraded to "any method": the focus was passed as the
// reflection's label key, the client could not find it in its own catalogue, and the student was
// shown a goal about methods in general. Nothing failed; the goal was just wrong.
//
// Writes to the database; always follow it with restore-baseline.mjs.

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DB = path.join(ROOT, 'webapi/Data/databases/students.db');
const API = 'http://localhost:7273';
const STUDENT = 7;

const conn = new DatabaseSync(DB);

const results = [];
function check(name, ok, detail) {
    results.push({ name, ok });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` â€” ${detail}` : ''}`);
}

const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

// Clean start, so the script can be re-run without measuring its own leftovers.
conn.exec('DELETE FROM ReflectionQueue WHERE StudentId = ' + STUDENT);

const insert = conn.prepare(
    'INSERT INTO ReflectionQueue (StudentId, ItemType, ItemId, ItemLabel, Status, Errors, Hints, PippinMessages, Method, Decisions, Focus, Evidence, AttemptId, CompletedAt) ' +
    "VALUES (?, 'goal', 'method', ?, 'pending', 0, 0, 0, '', '', ?, '', 0, ?)"
);

async function suggest(focus, choice) {
    const info = insert.run(STUDENT, `${focus} goal`, focus, stamp());
    const response = await fetch(`${API}/student-progress/reflection/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentId: STUDENT,
            queueItemId: Number(info.lastInsertRowid),
            questionNumber: 3,
            mode: 'self',
            language: 'en',
            questionId: '',
            choice,
            choiceLabel: 'smoke',
            subjectTerms: [],
        }),
    });
    return { status: response.status, body: await response.json() };
}

// ── Staying with the method the goal is narrowed to ──────────────────────────

for (const method of ['Elimination', 'Substitution', 'Equalization']) {
    const { status, body } = await suggest(method, 'act-method-same');

    check(`the server answers for a ${method} goal`, status === 200, `status ${status}`);
    check(`"stay with it" proposes a goal narrowed to ${method}`,
        body.suggestedGoal?.category === 'method' && body.suggestedGoal?.focus === method,
        JSON.stringify(body.suggestedGoal));
}

// ── The commitment the picker cannot express ─────────────────────────────────
//
// "Pick whichever method fits" is the Suitability exercise's own question, so the goal that measures
// it is the exercise TYPE. "Try a different method" names no method, so there is no goal that carries
// it and the honest answer is to propose nothing rather than pick one on the student's behalf.

const fit = await suggest('Elimination', 'act-method-fit');
check('"pick whichever fits" proposes the Suitability goal',
    fit.body.suggestedGoal?.category === 'exerciseType' && fit.body.suggestedGoal?.focus === 'Suitability',
    JSON.stringify(fit.body.suggestedGoal));

const other = await suggest('Elimination', 'act-method-other');
check('"try a different method" proposes nothing rather than picking one',
    !other.body.suggestedGoal,
    JSON.stringify(other.body.suggestedGoal));

conn.exec('DELETE FROM ReflectionQueue WHERE StudentId = ' + STUDENT);

const failed = results.filter((r) => !r.ok);
console.log();
console.log(failed.length === 0
    ? `${results.length} checks passed.`
    : `${failed.length} of ${results.length} checks FAILED.`);
console.log('Now run: node restore-baseline.mjs');
process.exit(failed.length === 0 ? 0 : 1);
