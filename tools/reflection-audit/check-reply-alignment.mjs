// Does the reply match the verdict, and does it stay inside the question?
//
// The reply is the only place a student learns whether their answer matched, so this drives the REAL
// endpoint across the answer shapes that occur in practice and checks two things on every reply:
//
//   1. VERDICT. Aligned pays Insight because the answer is right, so the reply may not hedge or
//      suggest otherwise. A tap the record contradicts must not be argued with in the reply either.
//   2. SCOPE. The question on screen is the only thing the reply may be about. A question about
//      comparing two methods must not mention the solution, the mistake count or the hint count.
//
// The chips and question ids are read back from the endpoint rather than assumed, so this keeps
// working when the bank changes. Judgements below are the ones the app itself would make, stated as
// word lists: a machine cannot read tone, but it can catch every phrase that has actually gone wrong.
//
//   node check-reply-alignment.mjs [en|de|ja]

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const conn = new DatabaseSync(path.join(ROOT, 'webapi/Data/databases/students.db'));
const API = 'http://localhost:7273';
const STUDENT = 7;
const LANGUAGE = process.argv[2] ?? 'en';

const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

// ── The bans ────────────────────────────────────────────────────────────────
//
// Every one of these is a phrase that reached a student and was wrong. They are grouped by what they
// break, so a failure says which of the two things went wrong rather than just "bad words".

const REPORT_TONE = [
    /\bthe data\b/i,
    /\baccording to\b/i,
    /\bthe record (shows|says)\b/i,
    /\byour (performance )?data\b/i,
];

// Said while the answer was scored as correct. The Insight badge says one thing and these say another.
const CONTRADICTS_AN_ALIGNED_VERDICT = [
    /\bdifferent story\b/i,
    /\bdoesn'?t (quite )?match\b/i,
    /\bnot quite (what|right)\b/i,
    /\bdoes not (quite )?match\b/i,
    /\bnot aligned\b/i,
];

// A telling-off, whatever the verdict. The student is told what they chose elsewhere; the reply is
// not the place to mark them down.
const TELLING_OFF = [
    /\bbut you\b/i,
    /\byou didn'?t\b/i,
    /\bwasn'?t quite what you did\b/i,
    /\byou were shown\b/i,
];

// Credits them with something the record line does not say they did.
const INVENTS_ENGAGEMENT = [
    /\byou (took the time to |)read (the|an) (explanation|solution)\b/i,
    /\byou (opened|studied|looked at) the (explanation|solution)\b/i,
    /\byou saw the (explanation|solution)\b/i,
];

// Narrating the badge. A student sees what they earned on the badge itself, and a reply that talks
// about it turns a reflection into a scoreboard.
//
// Kept deliberately narrow, and the first version of this list was wrong: banning the bare word
// "point" fired on ordinary English ("a fair point", "the key point of each method") and reported ten
// failures that were nothing. "choice" and "resolve" are excluded for the same reason — this app says
// "explain my choice" and "resolve the equation".
const AWARD_LANGUAGE = [
    /\binsight\b/i,
    /\bxp\b/i,
    /\baward/i,
    /\bearn(ed)?\b/i,
];

// Out of scope: the question was about something else. Keyed by what the question is about.
const SCOPE = {
    compare: [/\bsolution\b/i, /\berrors?\b/i, /\bmistakes?\b/i, /\bhints?\b/i, /\bexplain\b/i],
    explain: [/\bsolution\b/i, /\berrors?\b/i, /\bmistakes?\b/i, /\bhints?\b/i, /\bcompar/i],
    promise: [/\byou asked\b/i, /\byou chose to see\b/i, /\basked to be shown\b/i, /\byou were shown\b/i],
};

// ── Seeding ─────────────────────────────────────────────────────────────────

const items = [];
let itemId = 9000;

function seedExercise(exerciseType, decisions, errors = 2, hints = 1) {
    const label = `${exerciseType} check ${++itemId}`;
    conn.prepare(
        'INSERT INTO ReflectionQueue (StudentId, ItemType, ItemId, ItemLabel, Status, Errors, Hints, PippinMessages, Method, Decisions, Focus, Evidence, AttemptId, CompletedAt) ' +
        "VALUES (?, 'exercise', ?, ?, 'pending', ?, ?, 0, ?, ?, '', '', 0, ?)"
    ).run(STUDENT, exerciseType, label, errors, hints, exerciseType, decisions, stamp());

    const id = conn.prepare('SELECT Id FROM ReflectionQueue WHERE StudentId = ? ORDER BY Id DESC LIMIT 1').get(STUDENT).Id;
    items.push({ id, exerciseType, decisions, label });
    return id;
}

async function evaluate(queueItemId, questionNumber, questionId, choice, choiceLabel, answer, mode = 'self') {
    const response = await fetch(`${API}/student-progress/reflection/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentId: STUDENT, queueItemId, questionNumber, questionId,
            choice, choiceLabel, answer, mode, language: LANGUAGE, subjectTerms: [],
        }),
    });

    if (!response.ok) return { error: `HTTP ${response.status}` };
    return response.json();
}

// ── The audit ───────────────────────────────────────────────────────────────

const results = [];
const failures = [];

function check(title, reply, verdict) {
    const text = reply ?? '';
    const broke = [];

    for (const pattern of REPORT_TONE) if (pattern.test(text)) broke.push(`report tone (${pattern})`);
    for (const pattern of TELLING_OFF) if (pattern.test(text)) broke.push(`tells them off (${pattern})`);
    for (const pattern of INVENTS_ENGAGEMENT) if (pattern.test(text)) broke.push(`invents what they did (${pattern})`);
    for (const pattern of AWARD_LANGUAGE) if (pattern.test(text)) broke.push(`narrates the badge (${pattern})`);

    if (verdict.aligned && verdict.insightXp > 0)
        for (const pattern of CONTRADICTS_AN_ALIGNED_VERDICT)
            if (pattern.test(text)) broke.push(`contradicts the +${verdict.insightXp} it paid (${pattern})`);

    // A rejected answer is the ONE case where a question mark is right: the notice asks them to write
    // it again, and the modal shows this text as that notice. Everything else is a complete statement,
    // and an empty reply is only wrong here because there would then be nothing to show at all.
    if (verdict.needsRetry) {
        if (!text.trim()) broke.push('retry notice was empty');
    } else {
        if (!text.trim()) broke.push('empty reply');
        if (/\?\s*$/.test(text.trim())) broke.push('ends with a question');
    }

    results.push({ title, verdict: verdict.aligned ? 'aligned' : 'not aligned', xp: verdict.insightXp, broke });

    if (broke.length) {
        failures.push({ title, verdict, text, broke });
        console.log(`FAIL  ${title}\n      ${verdict.aligned ? 'aligned' : 'not aligned'} +${verdict.insightXp} XP, broke: ${broke.join('; ')}\n      "${text}"`);
    }
}

function checkScope(title, reply, questionId, verdict, inContext = []) {
    const kind = questionId === 'q2-compared' ? 'compare'
        : questionId === 'q2-explained' ? 'explain'
        : questionId === 'q3-next-action' ? 'promise'
        : null;

    if (kind === null) return;

    const text = reply ?? '';
    const out = SCOPE[kind].filter(pattern => pattern.test(text) && !inContext.some(word => pattern.test(word)));

    if (out.length) check(title, reply, verdict);
}

// Which question a reply is about, so the scope rules know what to look for.

// ── The cases ───────────────────────────────────────────────────────────────
//
// Three exercises, one per type, each with a different decision on the record: Suitability where they
// skipped the comparison and worked the solution out alone, Efficiency where they skipped the
// explanation, and Matching where they explained. Between them that covers every branch the reply
// builder has, and the two shapes that actually went wrong in testing.

seedExercise('Suitability', 'MethodComparison=Declined;SolveOnOwn=Engaged', 1, 0);
seedExercise('Efficiency', 'SelfExplanation=Declined;SolveOnOwn=Engaged', 2, 1);
seedExercise('Matching', 'SelfExplanation=Engaged;SolveOnOwn=Declined', 0, 0);

const FREE_TEXT = [
    ['vague, still on topic', 'it was fine i think'],
    ['names a real thing', 'i put the x term on the other side first'],
    ['ignored it', 'i ignored that part'],
    ['off topic', 'blah blah keyboard smash zzz'],
];

for (const item of items) {
    const queue = await (await fetch(`${API}/student-progress/reflection-queue/${STUDENT}`)).json();
    const entry = queue.find(q => q.id === item.id);
    if (!entry) { console.log(`SKIP  ${item.label}: not in the queue`); continue; }

    console.log(`\n### ${item.exerciseType} — ${item.label}  (decisions: ${item.decisions})`);

    for (let index = 0; index < entry.questions.length; index++) {
        const question = entry.questions[index];
        const number = index + 1;
        const title = (suffix) => `${item.exerciseType} Q${number} ${question.id} — ${suffix}`;

        // Every chip, because the two verdicts need different handling and which chip is which is
        // decided by the record, not by us.
        for (const chip of question.chips) {
            const result = await evaluate(item.id, number, question.id, chip.id, chip.textKey, '');
            if (result.error) { console.log(`SKIP  ${title('chip ' + chip.id)}: ${result.error}`); continue; }
            check(title(`tap "${chip.id}"`), result.feedback, result);
            checkScope(title(`tap "${chip.id}"`), result.feedback, question.id, result);
        }

        for (const [label, answer] of FREE_TEXT) {
            const result = await evaluate(item.id, number, question.id, '', '', answer);
            if (result.error) { console.log(`SKIP  ${title(label)}: ${result.error}`); continue; }
            check(title(`wrote "${label}"`), result.feedback, result);
            checkScope(title(`wrote "${label}"`), result.feedback, question.id, result);
        }

        // "Pippin, tell me" is the mode that used to answer with the past whatever was asked.
        const pippin = await evaluate(item.id, number, question.id, '', '', '', 'pippin');
        if (!pippin.error) {
            check(title('pressed Pippin, tell me'), pippin.feedback, pippin);
            checkScope(title('pressed Pippin, tell me'), pippin.feedback, question.id, pippin);
        }
    }
}

// ── Goals ───────────────────────────────────────────────────────────────────
//
// A goal's questions are built from a window worked out when the goal COMPLETES, so the item has to be
// created through log-goal. A queue row written by hand carries no window, falls back to the plain
// questions, and would test nothing about the goal questions at all.
//
// The reply path is shared with exercises, so what this adds is the part that is goal-only: the
// what-went-well menu, the pattern question, and the commitment menu.

const goalAttempts = [];

function seedAttempt(exerciseType, method, errors, hints, decisions = {}) {
    const info = conn.prepare(
        'INSERT INTO FlexibilityAttempt (StudentId, ExerciseType, ExerciseId, SelectedMethod, AgentCondition, IsStudy, StartedAt, CompletedAt, TotalTime, TotalErrors, TotalHints) ' +
        "VALUES (?, ?, ?, ?, '2', 0, ?, ?, 40, ?, ?)"
    ).run(STUDENT, exerciseType, 1, method, stamp(), stamp(), errors, hints);

    const id = Number(info.lastInsertRowid);
    goalAttempts.push(id);

    for (const [name, choice] of Object.entries(decisions)) {
        conn.prepare(
            'INSERT INTO AnchorRecord (AttemptId, StudentId, Name, Choice, MessageType, Actions, Time, Errors, Hints, UpdatedAt) ' +
            "VALUES (?, ?, ?, ?, NULL, '', 0, 0, 0, ?)"
        ).run(id, STUDENT, name, choice, stamp());
    }

    return id;
}

async function completeGoal(category, focus, quality = '', limit = 0) {
    await fetch(`${API}/student-progress/log-goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentId: STUDENT, goalId: category, goalLabel: `check ${category}`, xpEarned: 5,
            exerciseType: '', totalErrors: 0, totalHints: 0,
            since: '', focus, quality, maxPerExercise: limit,
        }),
    });
}

function clearGoalItems() {
    conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(STUDENT);
    conn.prepare('DELETE FROM ReflectionHistory WHERE StudentId = ?').run(STUDENT);
    for (const id of goalAttempts) {
        conn.prepare('DELETE FROM AnchorRecord WHERE AttemptId = ?').run(id);
        conn.prepare('DELETE FROM FlexibilityAttempt WHERE Id = ?').run(id);
    }
    goalAttempts.length = 0;
}

// One goal per shape that matters: an exercise-type goal (menu, pattern question and commitment menu),
// a solve-on-own goal whose window is mixed, and the hints goal that sets a per-exercise limit.
const GOALS = [
    ['exerciseType', 'Suitability', '', 0, [
        ['Suitability', 'Substitution', 2, 1],
        ['Suitability', 'Elimination', 0, 0],
    ]],
    ['solveOnOwn', '', '', 0, [
        ['Efficiency', 'Substitution', 3, 1, { FirstSolutionChoice: 'No' }],
        ['Efficiency', 'Elimination', 0, 0, { FirstSolutionChoice: 'Yes' }],
    ]],
    ['hintsAndErrors', '', 'hints', 1, [
        ['Matching', 'Elimination', 1, 1],
        ['Matching', 'Elimination', 0, 0],
    ]],
];

for (const [category, focus, quality, limit, attempts] of GOALS) {
    clearGoalItems();
    for (const [type, method, errors, hints, decisions] of attempts) seedAttempt(type, method, errors, hints, decisions);

    await completeGoal(category, focus, quality, limit);

    const queue = await (await fetch(`${API}/student-progress/reflection-queue/${STUDENT}`)).json();
    const entry = queue.find(q => q.itemType === 'goal');
    if (!entry) { console.log(`SKIP  goal ${category}: no item queued`); continue; }

    console.log(`\n### goal — ${category} ${focus || quality}  (window: ${attempts.length} exercises)`);

    for (let index = 0; index < entry.questions.length; index++) {
        const question = entry.questions[index];
        const number = index + 1;
        const title = (suffix) => `goal ${category} Q${number} ${question.id} — ${suffix}`;

        // First and last chip, which between them cover both verdicts for every menu.
        for (const chip of [question.chips[0], question.chips[question.chips.length - 1]]) {
            if (!chip) continue;
            const result = await evaluate(entry.id, number, question.id, chip.id, chip.textKey, '');
            if (result.error) { console.log(`SKIP  ${title(chip.id)}: ${result.error}`); continue; }
            check(title(`tap "${chip.id}"`), result.feedback, result);
            checkScope(title(`tap "${chip.id}"`), result.feedback, question.id, result);
        }

        const pippin = await evaluate(entry.id, number, question.id, '', '', '', 'pippin');
        if (!pippin.error) {
            check(title('pressed Pippin, tell me'), pippin.feedback, pippin);
            checkScope(title('pressed Pippin, tell me'), pippin.feedback, question.id, pippin);
        }
    }
}

clearGoalItems();

console.log(`\n${results.length} replies checked, ${failures.length} with something wrong.`);

// The queue and history rows this check created are not the student's own, so they go.
conn.prepare('DELETE FROM ReflectionHistory WHERE StudentId = ?').run(STUDENT);
conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(STUDENT);
conn.close();

process.exit(failures.length === 0 ? 0 : 1);
