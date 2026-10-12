// Asks the real endpoint for the reflection questions of each exercise type and each goal
// category, and prints what it returns.
//
// The harness checks the bank in isolation; this checks it through the controller, where the
// evidence is assembled from the database. Both have to agree, and only this one can catch a
// mistake in how the evidence is built.

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DB = path.join(ROOT, 'webapi/Data/databases/students.db');
const API = 'http://localhost:7273';
const STUDENT = 7;

const conn = new DatabaseSync(DB);
const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

// Two completed attempts with the anchor records that make up the steps, so the step question
// has something real to read.
conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(STUDENT);

function seed(itemType, itemId, options = {}) {
    conn.prepare(
        'INSERT INTO ReflectionQueue (StudentId, ItemType, ItemId, ItemLabel, Status, Errors, Hints, PippinMessages, Method, Decisions, Focus, Evidence, CompletedAt) ' +
        "VALUES (?, ?, ?, ?, 'pending', ?, ?, 0, ?, ?, ?, ?, ?)"
    ).run(
        STUDENT, itemType, itemId, itemId,
        options.errors ?? 3,
        options.hints ?? 1,
        options.method ?? '',
        options.decisions ?? '',
        options.focus ?? '',
        options.evidence ?? '',
        stamp(),
    );
}

// For an exercise row the Method column carries the EXERCISE TYPE, which is what the real
// completion call stores there, and what decides which question the exercise gets.
const queue = [
    ['exercise', 'Suitability', { decisions: 'MethodComparison=Engaged', method: 'Suitability' }],
    ['exercise', 'Efficiency', { decisions: 'SelfExplanation=Engaged;SolveOnOwn=Engaged', method: 'Efficiency' }],
    ['exercise', 'Matching', { decisions: 'SolveOnOwn=Declined', method: 'Matching' }],
    ['goal', 'method', { focus: 'elimination', evidence: 'set=3;errors=4;hints=1;clean=1;hintfree=3;solo=2;explain=0;compare=1;focus=2' }],
    ['goal', 'exerciseType', { evidence: 'set=3;errors=4;hints=1;clean=1;hintfree=3;solo=2;explain=0;compare=1;focus=0' }],
    ['goal', 'selfExplanation', { evidence: 'set=3;errors=4;hints=1;clean=1;hintfree=3;solo=2;explain=2;compare=1;focus=0' }],
    ['goal', 'methodComparison', { evidence: 'set=3;errors=4;hints=1;clean=1;hintfree=3;solo=2;explain=0;compare=2;focus=0' }],
    ['goal', 'solveOnOwn', { evidence: 'set=3;errors=4;hints=1;clean=1;hintfree=3;solo=1;explain=0;compare=1;focus=0' }],
    ['goal', 'hintsAndErrors', { evidence: 'set=3;errors=4;hints=1;clean=1;hintfree=2;solo=2;explain=0;compare=1;focus=0' }],
];

// The question each item must get, so a wrong route fails instead of printing.
const expected = {
    'exercise/Suitability': { q2: 'reflection-q2-compared', q3: 'reflection-q3-compare' },
    'exercise/Efficiency': { q2: 'reflection-q2-explained', q3: 'reflection-q3-explain' },
    'exercise/Matching': { q2: 'reflection-q2-explained', q3: 'reflection-q3-explain' },
    'exercise/Suitability-2': { q2: 'reflection-q2-compared', q3: 'reflection-q3-compare' },
    'goal/method': { q2: 'reflection-q2-count-focus', q3: 'reflection-q3-method' },
    'goal/exerciseType': { q2: 'reflection-q2-count-clean', q3: 'reflection-q3-solo' },
    'goal/selfExplanation': { q2: 'reflection-q2-count-explained', q3: 'reflection-q3-explain' },
    'goal/methodComparison': { q2: 'reflection-q2-count-compared', q3: 'reflection-q3-compare' },
    'goal/solveOnOwn': { q2: 'reflection-q2-count-solo', q3: 'reflection-q3-solo' },
    'goal/hintsAndErrors': { q2: 'reflection-q2-count-hintfree', q3: 'reflection-q3-target' },
};

const failures = [];

for (const [type, id, options] of queue) seed(type, id, options);

// The endpoint keeps only the three most recent pending items, so the queue is checked a
// batch at a time rather than all at once.
const batches = [];
for (let at = 0; at < queue.length; at += 3) batches.push(queue.slice(at, at + 3));

const leaked = [];

for (const batch of batches) {
    conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(STUDENT);
    for (const [type, id, options] of batch) seed(type, id, options);

    const response = await fetch(`${API}/student-progress/reflection-queue/${STUDENT}`);
    const items = await response.json();

    console.log(`status ${response.status}, ${items.length} of ${batch.length} item(s)\n`);

    for (const item of items) {
        const key = `${item.itemType}/${item.itemId}`;
        const want = expected[key];

        console.log(`${key}${item.focus ? ` focus=${item.focus}` : ''}`);
        for (const question of item.questions ?? []) {
            console.log(`   ${question.id.padEnd(16)} ${question.kind.padEnd(12)} ${question.textKey}`);
            if (Object.keys(question.values ?? {}).length) console.log(`      values ${JSON.stringify(question.values)}`);
            if (Object.keys(question.slots ?? {}).length) console.log(`      slots  ${JSON.stringify(question.slots)}`);
            console.log(`      chips  ${question.chips.map(c => c.id).join(', ')}`);
            leaked.push(...[question].filter(q => 'alignedChipIds' in q || 'partialChipIds' in q || 'expectation' in q));
        }

        if (want) {
            const q2 = item.questions?.[1]?.textKey;
            const q3 = item.questions?.[2]?.textKey;
            if (q2 !== want.q2) failures.push(`${key}: Q2 was ${q2}, expected ${want.q2}`);
            if (q3 !== want.q3) failures.push(`${key}: Q3 was ${q3}, expected ${want.q3}`);
        }

        console.log();
    }
}

for (const failure of failures) console.log(`FAIL  ${failure}`);

console.log(leaked.length === 0
    ? 'PASS  the answer key is absent from every response'
    : `FAIL  the answer key leaked on ${leaked.length} question(s)`);

conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(STUDENT);
console.log('queue cleared');
process.exit(failures.length + leaked.length === 0 ? 0 : 1);
