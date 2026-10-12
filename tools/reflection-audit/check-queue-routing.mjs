// Asks the real endpoint for the reflection questions of every exercise type and every goal
// category, prints the wording a student would actually read, and fails when a question lands
// on the wrong moment.
//
// The bank harness checks which keys each case produces. This checks the SENTENCES, which is the
// only way to see whether a question names something the student actually did, and whether the
// chips sitting under it are an answer to it.

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DB = path.join(ROOT, 'webapi/Data/databases/students.db');
const API = 'http://localhost:7273';
const STUDENT = 7;

const locale = process.argv[2] ?? 'en';
const read = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, `reactapp/src/assets/translations/${locale}/${name}.json`), 'utf8'));
const words = read('student');
// A slot can name a key from another namespace ("flexibility:elimination-method"), which is how the
// server names a method without keeping a copy of the exercise module's wording.
const namespaces = { student: words, flexibility: read('flexibility') };

const conn = new DatabaseSync(DB);
const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

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
    ['exercise', 'Matching', { decisions: 'SelfExplanation=Declined;SolveOnOwn=Declined', method: 'Matching' }],
    ['goal', 'method', { focus: 'elimination', evidence: 'set=3;errors=4;hints=1;clean=1;hintfree=3;solo=2;explain=0;compare=1;focus=2' }],
    ['goal', 'exerciseType', { evidence: 'set=3;errors=4;hints=1;clean=1;hintfree=3;solo=2;explain=0;compare=1;focus=0' }],
    ['goal', 'selfExplanation', { evidence: 'set=3;errors=4;hints=1;clean=1;hintfree=3;solo=2;explain=2;compare=1;focus=0' }],
    ['goal', 'methodComparison', { evidence: 'set=3;errors=4;hints=1;clean=1;hintfree=3;solo=2;explain=0;compare=2;focus=0' }],
    ['goal', 'solveOnOwn', { evidence: 'set=3;errors=4;hints=1;clean=1;hintfree=3;solo=1;explain=0;compare=1;focus=0' }],
    ['goal', 'hintsAndErrors', { evidence: 'set=3;errors=4;hints=1;clean=1;hintfree=2;solo=2;explain=0;compare=1;focus=0' }],
];

const expected = {
    'exercise/Suitability': { q2: 'reflection-q2-compared', q3: 'reflection-q3-compare' },
    'exercise/Efficiency': { q2: 'reflection-q2-explained-efficiency', q3: 'reflection-q3-explain-efficiency' },
    'exercise/Matching': { q2: 'reflection-q2-explained-matching', q3: 'reflection-q3-explain-matching' },
    // A COMPLETED GOAL CANNOT BE ASKED ABOUT ITS OWN CRITERION. "Practise the elimination method three
    // times" cannot complete without three exercises solved with elimination, so the question asks
    // about working it out unaided instead, which the goal does not prove. The exception is the goal
    // that IS about working unaided, which asks about hints.
    'goal/method': { q2: 'reflection-q2-count-solo', q3: 'reflection-q3-method' },
    'goal/exerciseType': { q2: 'reflection-q2-count-solo', q3: 'reflection-q3-solo' },
    'goal/selfExplanation': { q2: 'reflection-q2-count-solo', q3: 'reflection-q3-explain' },
    'goal/methodComparison': { q2: 'reflection-q2-count-solo', q3: 'reflection-q3-compare' },
    'goal/solveOnOwn': { q2: 'reflection-q2-count-hintfree', q3: 'reflection-q3-solo' },
    'goal/hintsAndErrors': { q2: 'reflection-q2-count-solo', q3: 'reflection-q3-target' },
};

const failures = [];
const unresolved = [];

function lookup(key) {
    const colon = key.indexOf(':');
    if (colon < 0) return words[key];
    const ns = key.slice(0, colon);
    const name = key.slice(colon + 1);
    return namespaces[ns]?.[name];
}

function say(textKey, values = {}, slots = {}) {
    let text = lookup(textKey);
    if (!text) { unresolved.push(textKey); return `<<${textKey}>>`; }
    for (const [name, value] of Object.entries(values)) text = text.replaceAll(`{{${name}}}`, value);
    for (const [name, key] of Object.entries(slots)) {
        const word = lookup(key);
        if (!word) unresolved.push(key);
        text = text.replaceAll(`{{${name}}}`, word ?? `<<${key}>>`);
    }
    if (text.includes('{{')) unresolved.push(`${textKey} left a placeholder: ${text}`);
    return text;
}

// The endpoint keeps only the three most recent pending items, so the queue is checked a
// batch at a time rather than all at once.
for (let at = 0; at < queue.length; at += 3) {
    const batch = queue.slice(at, at + 3);

    conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(STUDENT);
    for (const [type, id, options] of batch) seed(type, id, options);

    const response = await fetch(`${API}/student-progress/reflection-queue/${STUDENT}`);
    const items = await response.json();

    for (const item of items) {
        const key = `${item.itemType}/${item.itemId}`;
        const want = expected[key];

        console.log(`\n### ${key}${item.focus ? `  (narrowed to ${item.focus})` : ''}`);

        item.questions?.forEach((question, index) => {
            const labels = question.chips.map(c => `"${say(c.textKey)}"`);
            console.log(`  Q${index + 1}  ${say(question.textKey, question.values, question.slots)}`);
            console.log(`      ${labels.join('   ')}`);
        });

        if (!want) continue;

        const q2 = item.questions?.[1]?.textKey;
        const q3 = item.questions?.[2]?.textKey;
        if (q2 !== want.q2) failures.push(`${key}: Q2 was ${q2}, expected ${want.q2}`);
        if (q3 !== want.q3) failures.push(`${key}: Q3 was ${q3}, expected ${want.q3}`);

        // A next-action question must offer the same dimension it asks about, or a student promises
        // one thing and is checked on another.
        const dimensions = [...new Set((item.questions?.[2]?.chips ?? []).map(c => c.id.replace(/^act-/, '').split('-')[0]))];
        const wanted = {
            'reflection-q3-target': 'target',
            'reflection-q3-method': 'method',
            'reflection-q3-compare': 'compare',
            'reflection-q3-solo': 'solo',
        }[want.q3] ?? 'explain';

        if (dimensions.length !== 1 || dimensions[0] !== wanted)
            failures.push(`${key}: Q3 chips are ${dimensions.join('/')}, expected ${wanted}`);
    }
}

for (const failure of failures) console.log(`\nFAIL  ${failure}`);
for (const key of [...new Set(unresolved)]) console.log(`\nFAIL  ${locale} is missing or mishandles ${key}`);

conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(STUDENT);
console.log();

if (failures.length + unresolved.length === 0) {
    console.log(`${locale}: every question lands on the right moment and every word resolves.`);
    process.exit(0);
}

console.log(`${failures.length + unresolved.length} problem(s).`);
process.exit(1);
