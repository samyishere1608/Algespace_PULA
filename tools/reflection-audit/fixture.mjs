// A self-contained reflection fixture, on a scratch student.
//
// WHY THIS EXISTS. The panel and award checks used to run against student 1 — a real student with real
// data — by pointing a queue row at one of that student's own attempts. That worked, and it wrote into
// their timeline: `reflection.asked`, `reflection.answered`, `reflection.verdict` and `xp.awarded` events
// all went into a real participant's record, and two of them moved their wallet. A research database is
// not a place to find out afterwards that a check left marks on a participant.
//
// So the fixture builds everything the reflection reads — its own attempt, its own phase rows, its own
// queue row — for a FAKE student. Nothing real is read and nothing real is written, which is also why the
// numbers asserted in the checks can be exact: they are ours, not whatever a student happened to do.
//
// `restore-baseline.mjs` resets this student completely, so leftovers from a crashed run are cleaned by
// the standard restore rather than accumulating.

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DB_PATH = path.join(ROOT, 'webapi/Data/databases/students.db');
export const API = 'http://localhost:7273';

/**
 * A student that exists only for tests.
 *
 * Same high-id shape as the other fixtures already in this database (999998, 999900006), and NOT student
 * 7 — that one is the reply-alignment student, whose rows the alignment check also writes.
 */
export const SCRATCH_STUDENT = 999901;

export const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

/**
 * The phases of the fixture exercise, and what they make the record say.
 *
 * Chosen so the bank produces questions with known answers rather than questions guessed at:
 *
 *   choose  — no rows at all, so the step is absent and cannot be offered as a chip
 *   setup   — 2 s + 8 s, 3 mistakes and 1 hint: the step that cost the most
 *   solve   — 5 s + 3 s, no mistakes and no hints: THE ONE CLEAN STEP
 *   no explain rows, so the self-explanation question is not the one this item gets
 *
 * Two steps present is the threshold for a step question, and a clean step present is what makes it the
 * "which part were you most sure about" variant rather than the "which cost the most" one. So the chips
 * are the three step names, `step-solve` is the chip the record backs, and `step-setup` is the one it
 * does not — which is the pair the award check needs.
 */
const PHASES = [
    { name: 'Transformation', errors: 0, hints: 0, time: 2.0 },
    { name: 'Substitution', errors: 3, hints: 1, time: 8.0 },
    { name: 'FirstSolution', errors: 0, hints: 0, time: 5.0 },
    { name: 'SecondSolution', errors: 0, hints: 0, time: 3.0 },
];

/** What the fixture exercise came to altogether, asserted against in the panel check. */
export const FIXTURE = {
    errors: 3,
    hints: 1,
    method: 'Substitution',
    exerciseType: 'Suitability',
    // setup 2 + 8, solve 5 + 3 — the two steps the bank folds the phase rows into.
    setupSeconds: 10,
    solveSeconds: 8,
    payingChip: 'step-solve',
    wrongChip: 'step-setup',
};

/**
 * A completed method goal's window, with the attempt ids the panel reads its phases from.
 *
 * PascalCase because this is what `JsonSerializer.Serialize` writes without options and what
 * `Deserialize` reads back. The client's camelCase comes from MVC's own options and does not apply here:
 * on the queue row this is an opaque string.
 */
export function goalWindow(attemptIds, mistakes) {
    return {
        Quality: '',
        Limit: 0,
        Exercises: mistakes.map((errors, index) => ({
            Method: 2,              // Elimination
            ExerciseType: 2,        // Suitability
            Errors: errors,
            Hints: 0,
            Time: [78.1, 67.2, 34.4][index] ?? 30,
            Own: true,
            Explained: false,
            Compared: false,
            WasShown: false,
            Correct: true,
        })),
        OtherMethodExercises: [],
        PriorSkippedExplanation: [],
        PriorSkippedComparison: [],
        PriorSystem: [],
        AttemptIds: attemptIds,
    };
}

/**
 * Writes the fixture exercise — its attempt and its phase rows — and returns the attempt id.
 *
 * Idempotent enough to re-run: anything already there for this student and label is removed first.
 */
export function seedAttempt(conn) {
    const label = 'fixture exercise';

    conn.prepare(`DELETE FROM FlexibilityAttempt WHERE StudentId = ? AND AgentCondition = ?`)
        .run(SCRATCH_STUDENT, label);
    conn.prepare('DELETE FROM AnchorRecord WHERE StudentId = ? AND AttemptId NOT IN (SELECT Id FROM FlexibilityAttempt WHERE StudentId = ?)')
        .run(SCRATCH_STUDENT, SCRATCH_STUDENT);

    const attemptId = Number(conn.prepare(
        'INSERT INTO FlexibilityAttempt ' +
        '(StudentId, ExerciseType, ExerciseId, SelectedMethod, AgentCondition, IsStudy, StartedAt, CompletedAt, TotalTime, TotalErrors, TotalHints) ' +
        "VALUES (?, ?, 1, ?, ?, 0, ?, ?, ?, ?, ?)"
    ).run(
        SCRATCH_STUDENT, FIXTURE.exerciseType, FIXTURE.method, label,
        stamp(), stamp(), 18, FIXTURE.errors, FIXTURE.hints
    ).lastInsertRowid);

    const record = conn.prepare(
        'INSERT INTO AnchorRecord (StudentId, AttemptId, Name, Choice, Errors, Hints, Time) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    for (const phase of PHASES) {
        record.run(SCRATCH_STUDENT, attemptId, phase.name, '', phase.errors, phase.hints, phase.time);
    }

    // The decision the exercise recorded: they declined the comparison, which is what makes Q2 a question
    // the record can settle rather than a guess.
    record.run(SCRATCH_STUDENT, attemptId, 'ComparisonChoice', 'No to Elimination', 0, 0, 0);

    return attemptId;
}

/** A queue row for the fixture exercise, as the reflection endpoint reads it. */
export function seedExerciseItem(conn, label) {
    return Number(conn.prepare(
        'INSERT INTO ReflectionQueue (StudentId, ItemType, ItemId, ItemLabel, Status, Errors, Hints, PippinMessages, Method, Decisions, Focus, Evidence, AttemptId, CompletedAt) ' +
        "VALUES (?, 'exercise', ?, ?, 'pending', ?, ?, 0, ?, 'ComparisonChoice=No to Elimination', '', '', ?, ?)"
    ).run(
        SCRATCH_STUDENT, FIXTURE.exerciseType, label, FIXTURE.errors, FIXTURE.hints,
        FIXTURE.exerciseType, seedLastAttempt(conn), stamp()
    ).lastInsertRowid);
}

/** A queue row for a goal, over a window whose attempt ids are real rows for this student. */
export function seedGoalItem(conn, label, category, focus, attemptIds, mistakes) {
    return Number(conn.prepare(
        'INSERT INTO ReflectionQueue (StudentId, ItemType, ItemId, ItemLabel, Status, Errors, Hints, PippinMessages, Method, Decisions, Focus, Evidence, AttemptId, CompletedAt) ' +
        "VALUES (?, 'goal', ?, ?, 'pending', ?, 0, 0, '', '', ?, ?, 0, ?)"
    ).run(
        SCRATCH_STUDENT, category, label, mistakes[0], focus,
        JSON.stringify(goalWindow(attemptIds, mistakes)), stamp()
    ).lastInsertRowid);
}

function seedLastAttempt(conn) {
    const row = conn.prepare(
        'SELECT Id FROM FlexibilityAttempt WHERE StudentId = ? ORDER BY Id DESC LIMIT 1'
    ).get(SCRATCH_STUDENT);
    return row?.Id ?? 0;
}

/** Everything the fixture writes, removed. Leftovers survive a crash without polluting anything real. */
export function clearFixture(conn) {
    conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(SCRATCH_STUDENT);
    conn.prepare('DELETE FROM AgencyLog WHERE StudentId = ?').run(SCRATCH_STUDENT);
    conn.prepare('DELETE FROM StudentEvent WHERE StudentId = ?').run(SCRATCH_STUDENT);
    conn.prepare('DELETE FROM StudentSession WHERE StudentId = ?').run(SCRATCH_STUDENT);
    conn.prepare('DELETE FROM AnchorRecord WHERE StudentId = ?').run(SCRATCH_STUDENT);
    conn.prepare('DELETE FROM FlexibilityAttempt WHERE StudentId = ?').run(SCRATCH_STUDENT);
    conn.prepare('INSERT OR IGNORE INTO StudentProgress (StudentId, TotalXP, ExercisesCompleted, StreakDays, LastExerciseDate, ChoiceXP, InsightXP, ResolveXP, LifetimeAgencyXP) ' +
        'VALUES (?, 0, 0, 0, ?, 0, 0, 0, 0)').run(SCRATCH_STUDENT, '');
    conn.prepare('UPDATE StudentProgress SET ChoiceXP = 0, InsightXP = 0, ResolveXP = 0, LifetimeAgencyXP = 0 WHERE StudentId = ?')
        .run(SCRATCH_STUDENT);
}

export function openDb() {
    const conn = new DatabaseSync(DB_PATH);
    conn.exec('PRAGMA foreign_keys = ON');
    return conn;
}

/** A tiny check runner, so both checks report the same way. */
export function makeChecker() {
    const results = [];
    return {
        results,
        check(name, ok, detail) {
            results.push({ name, ok });
            console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` \u2014 ${detail}` : ''}`);
        },
        finish(suffix = '') {
            const failed = results.filter((r) => !r.ok).length;
            console.log();
            console.log(failed === 0
                ? `${results.length} checks passed.${suffix}`
                : `${failed} of ${results.length} checks FAILED.${suffix}`);
            console.log('Now run: node restore-baseline.mjs');
            process.exit(failed === 0 ? 0 : 1);
        },
    };
}
