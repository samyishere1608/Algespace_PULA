// Does a goal's reflection get the goal's own data, and only that? Checked at the source: the window
// the server stores on the queue row when the goal completes, which is what every goal question and
// every reply is built from.
//
// What a goal's window must be:
//   - only exercises completed at or after the goal's start ("since"), never older ones;
//   - narrowed the way the goal was measured: one method for a method goal, one type for a type goal;
//   - the newest five at most, oldest first;
//   - each exercise carrying its own method, mistakes, hints, and the decisions taken in IT.
//
//   node check-goal-window.mjs
//
// Uses its own student id, so nothing here touches the baseline student.

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const conn = new DatabaseSync(path.join(ROOT, 'webapi/Data/databases/students.db'));
const API = 'http://localhost:7273';
const STUDENT = 99002;

const METHOD = { Equalization: 0, Substitution: 1, Elimination: 2 };
const TYPE = { Efficiency: 1, Suitability: 2, Matching: 3 };

const server = (date) => date.toISOString().slice(0, 19);
const minutesAgo = (n) => server(new Date(Date.now() - n * 60_000));

let checks = 0;
const failures = [];
function expect(title, ok, detail = '') {
    checks++;
    if (!ok) { failures.push(title); console.log(`FAIL  ${title}${detail ? `\n      ${detail}` : ''}`); }
}

function clear() {
    for (const row of conn.prepare('SELECT Id FROM FlexibilityAttempt WHERE StudentId = ?').all(STUDENT))
        conn.prepare('DELETE FROM AnchorRecord WHERE AttemptId = ?').run(row.Id);
    conn.prepare('DELETE FROM FlexibilityAttempt WHERE StudentId = ?').run(STUDENT);
    conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(STUDENT);
    conn.prepare('DELETE FROM GoalCompletions WHERE StudentId = ?').run(STUDENT);
    conn.prepare('DELETE FROM StudentProgress WHERE StudentId = ?').run(STUDENT);
}

function attempt({ type, method, errors, hints, decisions = {}, at }) {
    const info = conn.prepare(
        'INSERT INTO FlexibilityAttempt (StudentId, ExerciseType, ExerciseId, SelectedMethod, AgentCondition, IsStudy, StartedAt, CompletedAt, TotalTime, TotalErrors, TotalHints) ' +
        "VALUES (?, ?, ?, ?, '2', 0, ?, ?, 40, ?, ?)"
    ).run(STUDENT, type, 1, method, at, at, errors, hints);
    const id = Number(info.lastInsertRowid);
    for (const [name, choice] of Object.entries(decisions)) {
        conn.prepare(
            'INSERT INTO AnchorRecord (AttemptId, StudentId, Name, Choice, MessageType, Actions, Time, Errors, Hints, UpdatedAt) ' +
            "VALUES (?, ?, ?, ?, NULL, '', 0, 0, 0, ?)"
        ).run(id, STUDENT, name, choice, at);
    }
    return id;
}

async function complete(category, { focus = '', quality = '', limit = 0, since }) {
    conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(STUDENT);
    await fetch(`${API}/student-progress/log-goal`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentId: STUDENT, goalId: category, goalLabel: `window ${category}`, xpEarned: 5,
            exerciseType: '', totalErrors: 0, totalHints: 0, since, focus, quality, maxPerExercise: limit,
        }),
    });
    const row = conn.prepare('SELECT Evidence FROM ReflectionQueue WHERE StudentId = ? ORDER BY Id DESC LIMIT 1').get(STUDENT);
    return row?.Evidence ? JSON.parse(row.Evidence) : null;
}

clear();

// The goal started 30 minutes ago. Two exercises are from before it, which must never appear.
const since = minutesAgo(30);
attempt({ type: 'Suitability', method: 'Elimination', errors: 9, hints: 9, at: minutesAgo(90), decisions: { FirstSolutionChoice: 'No' } });
attempt({ type: 'Efficiency', method: 'Substitution', errors: 8, hints: 8, at: minutesAgo(60) });

// Inside the goal: a mix of methods and types, each with its own numbers and decisions.
attempt({ type: 'Suitability', method: 'Elimination', errors: 1, hints: 0, at: minutesAgo(25), decisions: { FirstSolutionChoice: 'Yes', SelfExplanationChoice: 'No' } });
attempt({ type: 'Suitability', method: 'Substitution', errors: 0, hints: 2, at: minutesAgo(20), decisions: { FirstSolutionChoice: 'No', ComparisonChoice: 'Yes' } });
attempt({ type: 'Efficiency', method: 'Elimination', errors: 3, hints: 1, at: minutesAgo(15), decisions: { SelfExplanationChoice: 'Yes' } });
attempt({ type: 'Matching', method: 'Equalization', errors: 0, hints: 0, at: minutesAgo(10) });
attempt({ type: 'Suitability', method: 'Elimination', errors: 2, hints: 0, at: minutesAgo(5), decisions: { FirstSolutionChoice: 'Yes' } });
attempt({ type: 'Matching', method: 'Elimination', errors: 0, hints: 1, at: minutesAgo(2) });

console.log('### an open goal (hints): the newest five since the start, oldest first');
let window = await complete('hintsAndErrors', { quality: 'hints', limit: 1, since });
expect('the window exists', window !== null);
if (window) {
    const rows = window.Exercises;
    expect('capped at five', rows.length === 5, `got ${rows.length}`);
    expect('nothing from before the goal started', rows.every(e => e.Errors < 8 && e.Hints < 8), JSON.stringify(rows.map(e => [e.Errors, e.Hints])));
    expect('oldest first, ending on the newest', rows[0].Errors === 0 && rows[0].Hints === 2 && rows[4].Errors === 0 && rows[4].Hints === 1,
        JSON.stringify(rows.map(e => [e.Errors, e.Hints])));
    expect('the limit and the quality travel with it', window.Limit === 1 && window.Quality === 'hints');
    expect('each exercise keeps its own method', rows.map(e => e.Method).join() === [METHOD.Substitution, METHOD.Elimination, METHOD.Equalization, METHOD.Elimination, METHOD.Elimination].join(),
        JSON.stringify(rows.map(e => e.Method)));
}

console.log('### a method goal: only that method');
window = await complete('method', { focus: 'Elimination', since });
if (window) {
    expect('every exercise used the goal method', window.Exercises.every(e => e.Method === METHOD.Elimination), JSON.stringify(window.Exercises.map(e => e.Method)));
    expect('still nothing from before the goal', window.Exercises.every(e => e.Errors < 8));
    expect('all four in-window eliminations are there', window.Exercises.length === 4, `got ${window.Exercises.length}`);
}

console.log('### a type goal: only that type');
window = await complete('exerciseType', { focus: 'Suitability', since });
if (window) {
    expect('every exercise is the goal type', window.Exercises.every(e => e.ExerciseType === TYPE.Suitability), JSON.stringify(window.Exercises.map(e => e.ExerciseType)));
    expect('the three in-window Suitability exercises are there, none older', window.Exercises.length === 3, `got ${window.Exercises.length}`);
}

console.log('### decisions belong to their own exercise');
window = await complete('selfExplanation', { since });
if (window) {
    const rows = window.Exercises;
    const byNumbers = (errors, hints) => rows.find(e => e.Errors === errors && e.Hints === hints);
    const shown = byNumbers(0, 2);
    const explained = byNumbers(3, 1);
    const own = byNumbers(2, 0);
    expect('asked-to-be-shown is recorded on its own exercise, with the comparison it also took', !!shown && shown.WasShown && !shown.Own && shown.Compared, JSON.stringify(shown));
    expect('explaining is recorded on its own exercise only', !!explained && explained.Explained && !explained.Own && !explained.WasShown, JSON.stringify(explained));
    expect('working it out alone is recorded on the exercise it happened in', !!own && own.Own && !own.WasShown && !own.Explained, JSON.stringify(own));
    expect('an exercise with no recorded decision claims none', rows.filter(e => e.Errors === 0 && e.Hints === 0).every(e => !e.Own && !e.WasShown && !e.Explained && !e.Compared));
}

console.log('### a goal started AFTER every exercise has an empty window');
window = await complete('hintsAndErrors', { quality: 'hints', limit: 1, since: minutesAgo(-5) });
expect('nothing is invented for an empty window', window === null || window.Exercises.length === 0, window ? `got ${window.Exercises.length}` : '');

clear();
conn.close();
console.log(`\n${checks} checks, ${failures.length} failed.`);
process.exit(failures.length === 0 ? 0 : 1);
