// Drives one real Efficiency reflection through the live endpoint and prints the model's reply
// for each of the three questions, so the tone can be judged from actual output rather than
// from the prompt. Writes to the database; follow with restore-baseline.mjs.

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const conn = new DatabaseSync(path.join(ROOT, 'webapi/Data/databases/students.db'));
const API = 'http://localhost:7273';
const STUDENT = 7;

function seedEfficiency(decisions) {
    conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(STUDENT);
    conn.prepare(
        'INSERT INTO ReflectionQueue (StudentId, ItemType, ItemId, ItemLabel, Status, Errors, Hints, PippinMessages, Method, Decisions, Focus, Evidence, CompletedAt) ' +
        "VALUES (?, 'exercise', 'Efficiency', 'Efficiency', 'pending', 2, 1, 0, 'Efficiency', ?, '', '', datetime('now'))"
    ).run(STUDENT, decisions);
    return conn.prepare('SELECT Id FROM ReflectionQueue WHERE StudentId = ? ORDER BY Id DESC LIMIT 1').get(STUDENT).Id;
}

async function evaluate(queueItemId, questionNumber, questionId, choice, choiceLabel) {
    const response = await fetch(`${API}/student-progress/reflection/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentId: STUDENT,
            queueItemId,
            questionNumber,
            questionId,
            choice,
            choiceLabel,
            subjectTerms: [],
            mode: 'self',
            language: 'en',
        }),
    });
    return await response.json();
}

async function turn(title, decisions, questionNumber, questionId, choice, choiceLabel) {
    const id = seedEfficiency(decisions);
    const result = await evaluate(id, questionNumber, questionId, choice, choiceLabel);
    console.log(`\n=== ${title}`);
    console.log(`student tapped "${choiceLabel}"`);
    console.log(`verdict: aligned=${result.aligned} insightXp=${result.insightXp}`);
    console.log(`reply:   ${result.feedback}`);
    if (result.nextStep) console.log(`next:    ${result.nextStep}`);
}

await turn('Q2, honest and aligned', 'SelfExplanation=Engaged;SolveOnOwn=Engaged',
    2, 'q2-explained', 'yn-yes', 'I did it myself');

await turn('Q2, answered not aligned', 'SelfExplanation=Declined;SolveOnOwn=Engaged',
    2, 'q2-explained', 'yn-yes', 'I did it myself');

// The chip an honest student has to choose when they did not explain it. The reply has to state that
// without ever writing "you asked to be shown" — the guard rejects that phrasing outright, so this is
// the case that catches a prompt which puts the phrase in front of the model.
await turn('Q2, the student let it be shown', 'SelfExplanation=Declined;SolveOnOwn=Engaged',
    2, 'q2-explained', 'yn-explain-shown', 'I asked to be shown it');

await turn('Q3, promise', 'SelfExplanation=Engaged;SolveOnOwn=Engaged',
    3, 'q3-next-action', 'act-explain-hint', 'Explain it myself, and take a hint if I need one');

await turn('Pippin answers Q2 for them', 'SelfExplanation=Engaged;SolveOnOwn=Engaged',
    2, 'q2-explained', '', '');

conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(STUDENT);
console.log('\nqueue cleared');
