// Reproduces the goal evaluation problems the user reported: a reply that turned a three-exercise
// goal's totals into a count of something else, and a reply that agreed with an answer the record had
// already scored as wrong.
//
// Prints the reply for a matching claim and for a contradicting one, so both halves are visible.
// Writes to the database; follow with restore-baseline.mjs.

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const conn = new DatabaseSync(path.join(ROOT, 'webapi/Data/databases/students.db'));
const API = 'http://localhost:7273';
const STUDENT = 7;

// A three-exercise goal: three mistakes in total, TWO of them mistake-free, ONE worked out unaided.
// So the correct band for "how many went by without a single mistake" is "Most of them", and for
// "how many did you work out before seeing the answer" it is "Some of them".
const EVIDENCE = 'set=3;errors=3;hints=1;clean=2;hintfree=2;solo=1;explain=0;compare=0;focus=0';

function seedGoal() {
    conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(STUDENT);
    conn.prepare(
        'INSERT INTO ReflectionQueue (StudentId, ItemType, ItemId, ItemLabel, Status, Errors, Hints, PippinMessages, Method, Decisions, Focus, Evidence, AttemptId, CompletedAt) ' +
        "VALUES (?, 'goal', 'solveOnOwn', 'Work it out yourself 3 times', 'pending', 3, 1, 0, '', '', '', ?, 0, datetime('now'))"
    ).run(STUDENT, EVIDENCE);
    return conn.prepare('SELECT Id FROM ReflectionQueue WHERE StudentId = ? ORDER BY Id DESC LIMIT 1').get(STUDENT).Id;
}

async function ask(questionNumber, questionId, choice, choiceLabel) {
    const response = await fetch(`${API}/student-progress/reflection/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentId: STUDENT, queueItemId: seedGoal(), questionNumber, questionId, choice, choiceLabel,
            subjectTerms: [], mode: 'self', language: 'en',
        }),
    });
    return await response.json();
}

console.log('goal row: set=3 (three exercises), errors=3, clean=2, solo=1\n');
console.log('Q2 on a solve-on-own goal asks about accuracy: the goal proves working it out unaided,');
console.log('and says nothing about how many of them were mistake-free.\n');

console.log('--- answered CORRECTLY');
let result = await ask(2, 'q2-count', 'band-most', 'Most of them');
console.log('student tapped "Most of them"; the truth is 2 of 3');
console.log(`aligned=${result.aligned}  insightXp=${result.insightXp}`);
console.log(`reply: ${result.feedback}\n`);

console.log('--- answered WRONG: the reply must not agree');
result = await ask(2, 'q2-count', 'band-none', 'None of them');
console.log('student tapped "None of them"; the truth is 2 of 3');
console.log(`aligned=${result.aligned}  insightXp=${result.insightXp}`);
console.log(`reply: ${result.feedback}\n`);

const agreed = [/matches up perfectly/i, /that is right/i, /you got it right/i, /spot on/i]
    .find(pattern => pattern.test(result.feedback));
console.log(agreed
    ? `FAIL  the reply agreed with a wrong answer (matched ${agreed})`
    : 'PASS  the reply does not agree with a wrong answer');

conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(STUDENT);
