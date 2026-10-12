// A student who starts the calculation and then asks to be shown the answer has NOT solved it on their
// own. The two solution points are the same act offered twice inside one exercise, so a decline at
// either one has to win over a yes at the other.
//
// This checks the reading the GOAL counter uses, because that is the one that went wrong: a goal of
// "work out 3 solutions yourself" was completed by an exercise the student was eventually shown the
// answer to. `GET /anchor-tracking/goal-events` is what the client's goal maths reads, so the check goes
// through it rather than through the rule on its own.
//
//   node check-solve-on-own.mjs

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const conn = new DatabaseSync(path.join(ROOT, 'webapi/Data/databases/students.db'));
const API = 'http://localhost:7273';
const STUDENT = 999997;

const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
let failures = 0;

function cleanup() {
    conn.prepare('DELETE FROM AnchorRecord WHERE StudentId = ?').run(STUDENT);
    conn.prepare('DELETE FROM FlexibilityAttempt WHERE StudentId = ?').run(STUDENT);
}

/** One completed exercise where the student answered the solution points as given. */
function exercise(...answers) {
    const info = conn.prepare(
        'INSERT INTO FlexibilityAttempt (StudentId, ExerciseType, ExerciseId, SelectedMethod, AgentCondition, IsStudy, StartedAt, CompletedAt, TotalTime, TotalErrors, TotalHints) ' +
        "VALUES (?, 'Efficiency', ?, 'Elimination', '2', 0, ?, ?, 30, 0, 0)"
    ).run(STUDENT, Math.floor(Math.random() * 1000000) + 1, stamp(), stamp());

    const id = Number(info.lastInsertRowid);
    const names = ['FirstSolutionChoice', 'SecondSolutionChoice'];

    answers.forEach((choice, index) => {
        if (!choice) return;
        conn.prepare(
            'INSERT INTO AnchorRecord (AttemptId, StudentId, Name, Choice, MessageType, Actions, Time, Errors, Hints, UpdatedAt) ' +
            "VALUES (?, ?, ?, ?, NULL, '', 0, 0, 0, ?)"
        ).run(id, STUDENT, names[index], choice, stamp());
    });

    return id;
}

async function report(label, expected, ...answers) {
    cleanup();
    const id = exercise(...answers);

    const events = await (await fetch(`${API}/anchor-tracking/goal-events/${STUDENT}`)).json();
    const event = events.find((e) => e.id === id);
    const actual = event?.solveOnOwn;

    const shown = answers.filter(Boolean).join(' then ') || '(nothing reached)';
    const verdict = actual === expected ? 'ok  ' : 'FAIL';
    if (actual !== expected) failures++;

    console.log(`  ${verdict} ${label.padEnd(38)} ${shown.padEnd(24)} counted as solved on own: ${actual} (expected ${expected})`);
    return actual;
}

console.log('\nDoes an exercise count as "solved on their own"?\n');

cleanup();

// The user's case: they tried it, got it wrong, and asked to be shown the answer.
await report('tried it, then asked to be shown', false, 'Yes', 'No');

// The same decline at the first point, whatever they did afterwards.
await report('asked to be shown, then worked it out', false, 'No', 'Yes');
await report('asked to be shown at both points', false, 'No', 'No');

// Getting it done themselves is still what counts.
await report('worked it out, never asked', true, 'Yes');
await report('worked it out at both points', true, 'Yes', 'Yes');

// Never reached the second point, having done the first themselves.
await report('worked out the first, second not reached', true, 'Yes', '');

// A nudge that turns a decline into a retry records a yes, so this is engagement.
await report('declined, nudge persuaded them, wrote Yes', true, 'Yes');

console.log(failures === 0 ? '\nAll checks passed.\n' : `\n${failures} FAILURE(S).\n`);

cleanup();
conn.close();
process.exit(failures === 0 ? 0 : 1);
