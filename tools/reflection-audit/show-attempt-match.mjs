// Is the attempt the questions describe actually the attempt the queue row is about?
// The evidence builder takes the student's MOST RECENT completed attempt, not the one the
// reflection was queued for. This prints both so they can be compared.

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const conn = new DatabaseSync(path.join(ROOT, 'webapi/Data/databases/students.db'));
const STUDENT = 7;

console.log('recent completed attempts (what the questions will be built from):');
console.table(conn.prepare(
    "SELECT Id, ExerciseType, SelectedMethod, TotalErrors, TotalHints, CompletedAt FROM FlexibilityAttempt " +
    'WHERE StudentId = ? AND CompletedAt <> \'\' ORDER BY Id DESC LIMIT 6'
).all(STUDENT));

console.log('the most recent one, step by step:');
console.table(conn.prepare(
    "SELECT Name, Time, Errors, Hints FROM AnchorRecord WHERE AttemptId = (SELECT Id FROM FlexibilityAttempt WHERE StudentId = ? AND CompletedAt <> '' ORDER BY Id DESC LIMIT 1) AND Name NOT LIKE '%Choice'"
).all(STUDENT));

console.log('student attempt totals by exercise type:');
console.table(conn.prepare(
    "SELECT ExerciseType, COUNT(*) AS completed FROM FlexibilityAttempt WHERE StudentId = ? AND CompletedAt <> '' GROUP BY ExerciseType"
).all(STUDENT));
