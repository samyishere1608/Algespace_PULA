// Plays one complete student session and prints the timeline it produces.
//
// This exists to answer "what will the record actually look like" - not as a test. It drives the real
// endpoints in the order a student would: open the dashboard, choose a plan, set a goal, open an
// exercise, answer the decisions inside it, finish it, get a reflection, answer it, end the session.
//
// It uses its own student id, so nothing here touches a real student's record or the audit baseline.
//
//   node replay-session.mjs            play the session and print the timeline
//   node replay-session.mjs --clean    remove this student's rows afterwards
//
// The timeline is what the StudentEvent table is for: one ordered list of what happened, each row
// pointing at the table that holds the detail.

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const conn = new DatabaseSync(path.join(ROOT, 'webapi/Data/databases/students.db'));
const API = 'http://localhost:7273';
// A student of its own, so the demo never mixes with a real record.
const STUDENT = 99010;

const send = async (method, url, body) => {
    const response = await fetch(`${API}${url}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`${method} ${url} -> ${response.status} ${await response.text()}`);
    return response.json().catch(() => ({}));
};

const post = (url, body) => send('POST', url, body);
const put = (url, body) => send('PUT', url, body);

function clean() {
    const attempts = conn.prepare('SELECT Id FROM FlexibilityAttempt WHERE StudentId = ?').all(STUDENT).map((r) => r.Id);
    for (const id of attempts) conn.prepare('DELETE FROM AnchorRecord WHERE AttemptId = ?').run(id);
    conn.prepare('DELETE FROM FlexibilityAttempt WHERE StudentId = ?').run(STUDENT);
    conn.prepare('DELETE FROM StudentEvent WHERE StudentId = ?').run(STUDENT);
    conn.prepare('DELETE FROM StudentSession WHERE StudentId = ?').run(STUDENT);
    conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(STUDENT);
    conn.prepare('DELETE FROM ReflectionHistory WHERE StudentId = ?').run(STUDENT);
    conn.prepare('DELETE FROM AgencyLog WHERE StudentId = ?').run(STUDENT);
    conn.prepare('DELETE FROM GoalCompletions WHERE StudentId = ?').run(STUDENT);
    conn.prepare('DELETE FROM ActiveGoals WHERE StudentId = ?').run(STUDENT);
    conn.prepare('DELETE FROM StudentProgress WHERE StudentId = ?').run(STUDENT);
    conn.prepare('DELETE FROM StudentTourState WHERE StudentId = ?').run(STUDENT);
    conn.prepare('DELETE FROM InsightGapAward WHERE StudentId = ?').run(STUDENT);
}

// ── The session ─────────────────────────────────────────────────────────────

clean();

console.log('Playing one session...\n');

const started = await post('/student-progress/session/start', { studentId: STUDENT, language: 'en' });
console.log(`  1. opened the dashboard             -> session ${started.sessionId.slice(0, 14)}...`);

await post('/student-progress/session/intention', { studentId: STUDENT, plan: 'goal', followUp: false, language: 'en' });
console.log('  2. chose a plan for the day         -> "I want to work on a goal today"');

await post('/student-progress/goals', {
    studentId: STUDENT, id: 'g-1', category: 'solveOnOwn', focus: '', metric: 'exercises',
    target: 3, quality: '', maxPerExercise: 0, createdAt: new Date().toISOString().slice(0, 19),
});
console.log('  3. set a goal                       -> "3 exercises, working the solution out myself"');

// Exercise one: opened, decided on twice, finished.
// The enums travel as numbers: FlexibilityExerciseType Suitability=2, Matching=3; AgentCondition
// MotivationalAgent=2. The choice phases travel by name, which is what lands in AnchorRecord.
const first = await put('/anchor-tracking/createEntry', {
    userId: STUDENT, username: 'demo', studyId: 0, flexibilityId: 1, exerciseId: 3,
    exerciseType: 2, agentCondition: 2, isStudy: false,
});
console.log(`  4. opened an exercise               -> attempt ${first}`);

await post('/anchor-tracking/trackChoice', {
    userId: STUDENT, username: 'demo', studyId: 0, id: first,
    // FlexibilityExerciseChoicePhase: FirstSolutionChoice = 4
    phase: 4, choice: 'Yes',
});
console.log('  5. worked the solution out himself  -> Yes');

await post('/anchor-tracking/trackChoice', {
    userId: STUDENT, username: 'demo', studyId: 0, id: first,
    // ComparisonChoice = 2
    phase: 2, choice: 'No to Elimination',
});
console.log('  6. declined the method comparison   -> No to Elimination');

await post('/anchor-tracking/completeTracking', {
    userId: STUDENT, username: 'demo', studyId: 0, id: first, time: 104.5, errors: 2, hints: 1,
});
console.log('  7. finished it                      -> 104s, 2 mistakes, 1 hint');

// Exercise two: opened and walked away from. The session's end reports this one as abandoned.
const second = await put('/anchor-tracking/createEntry', {
    userId: STUDENT, username: 'demo', studyId: 0, flexibilityId: 1, exerciseId: 7,
    exerciseType: 3, agentCondition: 2, isStudy: false,
});
console.log(`  8. opened a second exercise         -> attempt ${second} (never finished)`);

await post('/student-progress/log-agency-xp', {
    studentId: STUDENT, xpType: 'choice', amount: 5, source: 'picked-solo',
});
console.log('  9. earned XP                        -> 5 Choice for working without the companion');

// Finishing the goal, which also queues its reflection.
await post('/student-progress/log-goal', {
    studentId: STUDENT, goalId: 'solveOnOwn', goalLabel: 'Work it out yourself, 3 times', xpEarned: 20,
    exerciseType: '', totalErrors: 0, totalHints: 0, since: '', focus: '', quality: '', maxPerExercise: 0,
});
console.log(' 10. completed the goal               -> the reflection is now waiting');

const queue = await (await fetch(`${API}/student-progress/reflection-queue/${STUDENT}`)).json();
const reflection = queue[0];
console.log(` 11. was asked to reflect             -> "${reflection.itemLabel}", ${reflection.questions.length} questions`);

const question = reflection.questions[0];
const chip = question.chips[0];
await post('/student-progress/reflection/evaluate', {
    studentId: STUDENT, queueItemId: reflection.id, questionNumber: 1, questionId: question.id,
    choice: chip.id, choiceLabel: chip.textKey, answer: '', mode: 'self', language: 'en', subjectTerms: [],
});
console.log(` 12. answered it                     -> tapped "${chip.id}"`);

await post('/student-progress/reflection/complete', {
    studentId: STUDENT,
    queueItemId: reflection.id,
    skip: false,
    history: [
        { role: 'student', text: '', insightXp: 0, itemType: 'goal', itemId: reflection.itemId, questionId: question.id, choice: chip.id },
        { role: 'pippin', text: '(the reply the student read)', insightXp: 3, itemType: 'goal', itemId: reflection.itemId, questionId: question.id, choice: chip.id },
    ],
});
console.log(' 13. finished the reflection          -> recorded as answered');

const ended = await post('/student-progress/session/end', { studentId: STUDENT, reason: 'end-session-button' });
console.log(` 14. pressed End Session              -> ${ended.abandonedExercises} exercise(s) reported as abandoned`);

// ── The timeline ────────────────────────────────────────────────────────────

const rows = conn.prepare(`
    SELECT e.OccurredAt, e.EventType, e.SessionId, e.AttemptId, e.RefId, e.Value, e.Amount, e.Data
    FROM StudentEvent e
    WHERE e.StudentId = ?
    ORDER BY e.OccurredAt, e.Id
`).all(STUDENT);

const session = conn.prepare('SELECT * FROM StudentSession WHERE StudentId = ?').get(STUDENT);

console.log(`\n${'='.repeat(120)}`);
console.log(`THE TIMELINE - student ${STUDENT}, session ${session.Id}`);
console.log(`${'='.repeat(120)}`);
console.log(`${'TIME (UTC)'.padEnd(25)}${'EVENT'.padEnd(23)}${'VALUE'.padEnd(24)}${'AMOUNT'.padStart(7)}  DETAIL`);
console.log('-'.repeat(120));

for (const row of rows) {
    const detail = row.Data === '{}' ? '' : row.Data.replace(/[{}"]/g, '').replace(/,/g, ', ');
    console.log(
        `${row.OccurredAt.padEnd(25)}${row.EventType.padEnd(23)}${String(row.Value).slice(0, 22).padEnd(24)}${String(row.Amount).padStart(7)}  ${detail.slice(0, 56)}`,
    );
}

console.log('-'.repeat(120));
console.log(`${rows.length} events, ${session.StartedAt} -> ${session.EndedAt}`);
console.log(`all filed under one session: ${new Set(rows.map((r) => r.SessionId)).size === 1 ? 'yes' : 'NO - something is not grouped'}`);

// Where the detail actually lives, so "the spine points at it" is visible rather than asserted.
const withAttempt = rows.filter((r) => r.AttemptId > 0).length;
console.log(`\n${withAttempt} of these point at an exercise attempt; its per-phase numbers are in AnchorRecord.`);
console.log('The reflection answers themselves are in ReflectionHistory - this table records that they were given,');
console.log('by whom, and how the answer was judged.');

if (process.argv.includes('--clean')) {
    clean();
    console.log('\nCleaned up.');
} else {
    console.log('\nRun with --clean to remove this student\'s rows.');
}

conn.close();
