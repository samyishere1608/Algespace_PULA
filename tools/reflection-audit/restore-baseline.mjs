// Puts the test student back to the recorded baseline after the UI walkthrough.
//
// Baseline for student 7: Choice 15 / Insight 40 / Resolve 0 / lifetime 55, no reflection
// rows, no queue rows, no agency rows. A test that leaves its own state behind makes the
// next test measure the leftovers.

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DB = path.join(ROOT, 'webapi/Data/databases/students.db');
const STUDENT = 7;

const conn = new DatabaseSync(DB);

console.log('before:', JSON.stringify(conn.prepare(
    'SELECT ChoiceXP, InsightXP, ResolveXP, LifetimeAgencyXP FROM StudentProgress WHERE StudentId = ?'
).get(STUDENT)));
console.log('rows:', JSON.stringify({
    history: conn.prepare('SELECT COUNT(*) AS n FROM ReflectionHistory WHERE StudentId = ?').get(STUDENT).n,
    queue: conn.prepare('SELECT COUNT(*) AS n FROM ReflectionQueue WHERE StudentId = ?').get(STUDENT).n,
    agency: conn.prepare('SELECT COUNT(*) AS n FROM AgencyLog WHERE StudentId = ?').get(STUDENT).n,
}));

conn.prepare('DELETE FROM ReflectionHistory WHERE StudentId = ?').run(STUDENT);
conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(STUDENT);
conn.prepare('DELETE FROM AgencyLog WHERE StudentId = ?').run(STUDENT);

// The follow-through check finishes exercises, and finishing one writes rows here. Both the
// log rows and the counter have to go back, or the dashboard's own numbers lie after a run.
conn.prepare(
    'DELETE FROM ExerciseLog WHERE StudentId = ? AND CompletedAt >= ?'
).run(STUDENT, new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19));

conn.prepare(
    'UPDATE StudentProgress SET ExercisesCompleted = (SELECT COUNT(*) FROM ExerciseLog WHERE StudentId = ?) WHERE StudentId = ?'
).run(STUDENT, STUDENT);

conn.prepare(
    'UPDATE StudentProgress SET ChoiceXP = 15, InsightXP = 40, ResolveXP = 0, LifetimeAgencyXP = 55 WHERE StudentId = ?'
).run(STUDENT);

console.log('after: ', JSON.stringify(conn.prepare(
    'SELECT ChoiceXP, InsightXP, ResolveXP, LifetimeAgencyXP, ExercisesCompleted FROM StudentProgress WHERE StudentId = ?'
).get(STUDENT)));
console.log('residue:', JSON.stringify({
    history: conn.prepare('SELECT COUNT(*) AS n FROM ReflectionHistory WHERE StudentId = ?').get(STUDENT).n,
    queue: conn.prepare('SELECT COUNT(*) AS n FROM ReflectionQueue WHERE StudentId = ?').get(STUDENT).n,
    agency: conn.prepare('SELECT COUNT(*) AS n FROM AgencyLog WHERE StudentId = ?').get(STUDENT).n,
}));
