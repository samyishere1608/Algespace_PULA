// Checks that a reflection reads ITS OWN attempt, not whichever one happens to be newest.
//
// Two completed attempts are created for a throwaway student, with different step profiles, and the
// queue row names the OLDER one. The questions must describe the older one. Before this was stored,
// the reader took the student's most recent completed attempt, so it would describe the newer one —
// and if the two attempts were different exercise TYPES, the step chips would not even belong to the
// exercise the reflection named.
//
// Uses student 999999, which is a throwaway sentinel, so no real student's data is touched.

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const conn = new DatabaseSync(path.join(ROOT, 'webapi/Data/databases/students.db'));
const API = 'http://localhost:7273';
const STUDENT = 999999;

const failures = [];
const check = (ok, name, detail) => {
    if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

function cleanup() {
    conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(STUDENT);
    conn.prepare('DELETE FROM AnchorRecord WHERE StudentId = ?').run(STUDENT);
    conn.prepare('DELETE FROM FlexibilityAttempt WHERE StudentId = ?').run(STUDENT);
}

cleanup();

const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

function attempt(exerciseType, steps, errors, hints) {
    const info = conn.prepare(
        'INSERT INTO FlexibilityAttempt (StudentId, ExerciseType, ExerciseId, SelectedMethod, AgentCondition, IsStudy, StartedAt, CompletedAt, TotalTime, TotalErrors, TotalHints) ' +
        "VALUES (?, ?, 1, 'Elimination', 2, 0, ?, ?, 60, ?, ?)"
    ).run(STUDENT, exerciseType, stamp(), stamp(), errors, hints);

    const id = Number(info.lastInsertRowid);
    for (const [name, time, stepErrors, stepHints] of steps) {
        conn.prepare(
            'INSERT INTO AnchorRecord (AttemptId, StudentId, Name, Choice, MessageType, Actions, Time, Errors, Hints, UpdatedAt) ' +
            "VALUES (?, ?, ?, '', NULL, '', ?, ?, ?, ?)"
        ).run(id, STUDENT, name, time, stepErrors, stepHints, stamp());
    }
    return id;
}

// The attempt the reflection is ABOUT: two steps that fold onto DIFFERENT steps of the question
// vocabulary (setup and solve), both clean. Names that fold onto the same step would leave only one
// step and produce the fallback question, which would make this check unable to tell the two
// attempts apart.
const about = attempt('Efficiency', [
    ['EquationSelection', 5000, 0, 0],
    ['FirstSolution', 9000, 0, 0],
], 0, 0);

// A LATER attempt with three different steps, all dirty. This is the one the old code would have
// described, because it is the most recent.
const later = attempt('Matching', [
    ['SelectedMethod', 1000, 2, 1],
    ['Transformation', 1000, 3, 2],
    ['SelfExplanation', 1000, 4, 3],
], 9, 6);

console.log(`attempt about=${about} (Efficiency, 2 clean steps: setup + solve)`);
console.log(`attempt later=${later} (Matching, 3 dirty steps: choose + setup + explain)\n`);

conn.prepare(
    'INSERT INTO ReflectionQueue (StudentId, ItemType, ItemId, ItemLabel, Status, Errors, Hints, PippinMessages, Method, Decisions, Focus, Evidence, AttemptId, CompletedAt) ' +
    "VALUES (?, 'exercise', 'Efficiency', 'Efficiency', 'pending', 0, 0, 0, 'Efficiency', '', '', '', ?, datetime('now'))"
).run(STUDENT, about);

const [item] = await (await fetch(`${API}/student-progress/reflection-queue/${STUDENT}`)).json();
const chips = (item?.questions?.[0]?.chips ?? []).map(c => c.id);

console.log(`Q1 chips: ${chips.join(', ') || '(none)'}`);
check(item?.questions?.[0]?.textKey === 'reflection-q1-step-sure',
    'a clean step in the named attempt produced the positive question',
    `textKey=${item?.questions?.[0]?.textKey}`);
check(chips.includes('step-setup') && chips.includes('step-solve'),
    'the chips are exactly the steps of the attempt the row names',
    `chips=${chips.join(',')}`);
check(!chips.includes('step-choose') && !chips.includes('step-explain'),
    'the chips do NOT include the steps only the newer attempt has',
    `chips=${chips.join(',')}`);

// A row with no attempt recorded must still work, since rows written before this shipped carry 0.
// It falls back to the newest attempt, which here is the OTHER one, so the chips must change.
conn.prepare('UPDATE ReflectionQueue SET AttemptId = 0 WHERE StudentId = ?').run(STUDENT);
const [fallback] = await (await fetch(`${API}/student-progress/reflection-queue/${STUDENT}`)).json();
const fallbackChips = (fallback?.questions?.[0]?.chips ?? []).map(c => c.id);
console.log(`\nwith AttemptId = 0 (an older row), Q1 chips: ${fallbackChips.join(', ')}`);
check(fallbackChips.includes('step-choose') && fallbackChips.includes('step-explain'),
    'an older row falls back to the newest attempt instead of failing',
    `chips=${fallbackChips.join(',')}`);
check(fallbackChips.length !== chips.length,
    'the two attempts really do produce different questions, so the check can tell them apart',
    `named=${chips.length} steps, fallback=${fallbackChips.length} steps`);

cleanup();
console.log('\nthrowaway student cleaned up');
console.log();

if (failures.length === 0) {
    console.log('All attempt-linkage checks passed.');
    process.exit(0);
}

console.log(`${failures.length} FAILURE(S):`);
for (const failure of failures) console.log(`  - ${failure}`);
process.exit(1);
