// Checks the two behavioural fixes on the live endpoint:
//
//  1. A real answer is no longer discarded as off-topic. The exact sentence the gate used to reject
//     is sent, and the reply must not be the retry message.
//  2. A claim the record contradicts is no longer agreed with. The student taps "I worked it out
//     myself" on an attempt where they asked to be shown, and the reply must not congratulate them
//     for working it out.
//
// (2) is judged on the model's wording, so it is checked by looking for the giveaway phrases rather
// than for an exact string. Read the replies printed below and decide for yourself.
//
// Writes to the database; follow with restore-baseline.mjs.

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const conn = new DatabaseSync(path.join(ROOT, 'webapi/Data/databases/students.db'));
const API = 'http://localhost:7273';
const STUDENT = 7;

function seed(decisions, method = 'Efficiency') {
    conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(STUDENT);
    conn.prepare(
        'INSERT INTO ReflectionQueue (StudentId, ItemType, ItemId, ItemLabel, Status, Errors, Hints, PippinMessages, Method, Decisions, Focus, Evidence, CompletedAt) ' +
        "VALUES (?, 'exercise', ?, ?, 'pending', 2, 1, 0, ?, ?, '', '', datetime('now'))"
    ).run(STUDENT, method, method, method, decisions);
    return conn.prepare('SELECT Id FROM ReflectionQueue WHERE StudentId = ? ORDER BY Id DESC LIMIT 1').get(STUDENT).Id;
}

async function evaluate(queueItemId, questionNumber, questionId, choice, choiceLabel, answer) {
    const response = await fetch(`${API}/student-progress/reflection/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentId: STUDENT, queueItemId, questionNumber, questionId, choice, choiceLabel,
            subjectTerms: [], mode: 'self', answer, language: 'en',
        }),
    });
    return await response.json();
}

const failures = [];

// The message the gate shows when it rejects an answer, copied from OffTopicDetector so the
// comparison is exact rather than a guess about wording.
const OFF_TOPIC_RETRY =
    "Hmm, that didn't seem to be about the exercise you just did. "
    + 'Could you have another go and tell me how it went — what was tricky, or what felt easy?';

const check = (ok, name, detail) => {
    if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

// ── 1. A real answer survives the relevance gate ─────────────────────────────

console.log('\n=== A real answer that mentions the variable, on a not-aligned claim');
let id = seed('SelfExplanation=Engaged;SolveOnOwn=Engaged');
let result = await evaluate(id, 2, 'q2-explained', '', '', 'I wrote out why I moved the x term first');
console.log(`student wrote: "I wrote out why I moved the x term first"`);
console.log(`needsRetry=${result.needsRetry}  aligned=${result.aligned}  insightXp=${result.insightXp}`);
console.log(`reply: ${result.feedback}`);
check(result.needsRetry !== true, 'a sentence about the algebra is not discarded as off-topic',
    `needsRetry=${result.needsRetry}`);
check(result.feedback !== OFF_TOPIC_RETRY, 'the retry message is not what the student sees');

// ── 2. A claim the record contradicts is not agreed with ─────────────────────

console.log('\n=== Student claims they worked it out, record says they asked to be shown');
id = seed('SelfExplanation=Declined;SolveOnOwn=Declined');
result = await evaluate(id, 2, 'q2-explained', 'yn-explain-yes', 'I worked it out myself', '');
console.log(`student tapped: "I worked it out myself"  (record: SelfExplanation=Declined)`);
console.log(`aligned=${result.aligned}  insightXp=${result.insightXp}`);
console.log(`reply: ${result.feedback}`);
check(result.aligned === false && result.insightXp === 0, 'the contradicted claim pays nothing',
    `aligned=${result.aligned}, insightXp=${result.insightXp}`);

const agreements = [
    /trusted your own/i, /worked (it |the solution )?out (on your own|yourself|independently)/i,
    /since you (chose to )?(solve|work)/i, /your own instincts/i, /self[- ]reliance/i,
];
const agreed = agreements.find(pattern => pattern.test(result.feedback));
check(!agreed, 'the reply does not congratulate them for the claim they got wrong',
    agreed ? `matched ${agreed}` : '');

// ── 3. The same, for the third question, which carries no verdict ────────────

console.log('\n=== Q3 on a promise the record cannot satisfy');
id = seed('SelfExplanation=Declined');
result = await evaluate(id, 3, 'q3-next-action', 'act-explain-shown', 'Ask to see the explanation', '');
console.log(`reply: ${result.feedback}`);
console.log(`next:  ${result.nextStep}`);
check(result.insightXp === 0, 'a promise still pays no Insight', `insightXp=${result.insightXp}`);

conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(STUDENT);

console.log();
if (failures.length === 0) {
    console.log('All behavioural checks passed.');
} else {
    console.log(`${failures.length} FAILURE(S):`);
    for (const failure of failures) console.log(`  - ${failure}`);
}

process.exit(failures.length === 0 ? 0 : 1);
