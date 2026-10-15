// Puts the test students back to the recorded baseline after a run.
//
// Baseline for student 7: Choice 15 / Insight 40 / Resolve 0 / lifetime 55, no reflection
// rows, no queue rows, no agency rows, no timeline rows. A test that leaves its own state
// behind makes the next test measure the leftovers.
//
// Student 999901 is the self-contained FIXTURE student (see `fixture.mjs`): the panel and
// award checks build their own attempt and queue row on it rather than pointing at a real
// student's data, which they used to do. It has no baseline to restore — every trace of it
// is the check's own — so it is emptied completely. Cleaned here as well as by the checks
// themselves, so a run that crashes half way through leaves nothing behind either.

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DB = path.join(ROOT, 'webapi/Data/databases/students.db');
const STUDENT = 7;
export const SCRATCH = 999901;

const conn = new DatabaseSync(DB);

/** How many timeline rows this student has. Zero on a database that predates the table. */
function timelineRows() {
    try {
        return conn.prepare('SELECT COUNT(*) AS n FROM StudentEvent WHERE StudentId = ?').get(STUDENT).n;
    } catch {
        return 'n/a';
    }
}

console.log('before:', JSON.stringify(conn.prepare(
    'SELECT ChoiceXP, InsightXP, ResolveXP, LifetimeAgencyXP FROM StudentProgress WHERE StudentId = ?'
).get(STUDENT)));
console.log('rows:', JSON.stringify({
    history: conn.prepare('SELECT COUNT(*) AS n FROM ReflectionHistory WHERE StudentId = ?').get(STUDENT).n,
    queue: conn.prepare('SELECT COUNT(*) AS n FROM ReflectionQueue WHERE StudentId = ?').get(STUDENT).n,
    agency: conn.prepare('SELECT COUNT(*) AS n FROM AgencyLog WHERE StudentId = ?').get(STUDENT).n,
    timeline: timelineRows(),
}));

conn.prepare('DELETE FROM ReflectionHistory WHERE StudentId = ?').run(STUDENT);
conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(STUDENT);
conn.prepare('DELETE FROM AgencyLog WHERE StudentId = ?').run(STUDENT);

// The timeline is new, and every audit that drives an endpoint now writes to it: the alignment check
// alone left 836 rows behind. They are not the student's own actions, so they go the same way the
// reflection rows do. The table is created on first use, so a database that predates it is not an error.
conn.prepare('DELETE FROM StudentEvent WHERE StudentId = ?').run(STUDENT);
conn.prepare('DELETE FROM StudentSession WHERE StudentId = ?').run(STUDENT);

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

// The fixture student is emptied rather than restored: everything it holds was written by a check, so
// there is no baseline to put back. Its attempt is deleted too, so the next run seeds a fresh one.
for (const table of ['ReflectionHistory', 'ReflectionQueue', 'AgencyLog', 'StudentEvent', 'StudentSession', 'AnchorRecord', 'FlexibilityAttempt']) {
    conn.prepare(`DELETE FROM ${table} WHERE StudentId = ?`).run(SCRATCH);
}
conn.prepare('UPDATE StudentProgress SET ChoiceXP = 0, InsightXP = 0, ResolveXP = 0, LifetimeAgencyXP = 0 WHERE StudentId = ?')
    .run(SCRATCH);

console.log('after: ', JSON.stringify(conn.prepare(
    'SELECT ChoiceXP, InsightXP, ResolveXP, LifetimeAgencyXP, ExercisesCompleted FROM StudentProgress WHERE StudentId = ?'
).get(STUDENT)));
console.log('residue:', JSON.stringify({
    history: conn.prepare('SELECT COUNT(*) AS n FROM ReflectionHistory WHERE StudentId = ?').get(STUDENT).n,
    queue: conn.prepare('SELECT COUNT(*) AS n FROM ReflectionQueue WHERE StudentId = ?').get(STUDENT).n,
    agency: conn.prepare('SELECT COUNT(*) AS n FROM AgencyLog WHERE StudentId = ?').get(STUDENT).n,
    timeline: timelineRows(),
    fixture: conn.prepare('SELECT COUNT(*) AS n FROM StudentEvent WHERE StudentId = ?').get(SCRATCH).n
        + conn.prepare('SELECT COUNT(*) AS n FROM ReflectionQueue WHERE StudentId = ?').get(SCRATCH).n
        + conn.prepare('SELECT COUNT(*) AS n FROM AgencyLog WHERE StudentId = ?').get(SCRATCH).n
        + conn.prepare('SELECT COUNT(*) AS n FROM FlexibilityAttempt WHERE StudentId = ?').get(SCRATCH).n,
}));
