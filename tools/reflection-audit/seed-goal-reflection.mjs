// Seeds a completed method goal so the goal reflection can be read on screen.

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const conn = new DatabaseSync(path.join(ROOT, 'webapi/Data/databases/students.db'));

conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = 7').run();

conn.prepare(
    'INSERT INTO ReflectionQueue (StudentId, ItemType, ItemId, ItemLabel, Status, Errors, Hints, PippinMessages, Method, Decisions, Focus, Evidence, AttemptId, CompletedAt) ' +
    "VALUES (7, 'goal', 'method', 'Practise the elimination method', 'pending', 4, 1, 0, '', '', 'elimination', " +
    "'set=3;errors=4;hints=1;clean=1;hintfree=3;solo=2;explain=0;compare=1;focus=2', 0, datetime('now'))"
).run();

console.log(JSON.stringify(conn.prepare('SELECT Id, ItemType, ItemId, Focus, Evidence FROM ReflectionQueue WHERE StudentId = 7').all()));
