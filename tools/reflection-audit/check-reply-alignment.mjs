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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const conn = new DatabaseSync(path.join(ROOT, 'webapi/Data/databases/students.db'));
const API = 'http://localhost:7273';
const STUDENT = 7;
const LANGUAGE = process.argv[2] ?? 'en';

const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

// Where the timeline had got to before this run, so the guard check at the end reads only the verdict
// events this run wrote. Null when the database predates the timeline table.
const eventMark = (() => {
    try { return conn.prepare('SELECT COALESCE(MAX(Id), 0) AS m FROM StudentEvent').get().m; }
    catch { return null; }
})();

// ── The bans ────────────────────────────────────────────────────────────────
//
// Every one of these is a phrase that reached a student and was wrong. They are grouped by what they
// break, so a failure says which of the two things went wrong rather than just "bad words".

const REPORT_TONE = [
    /\bthe record (shows|says)\b/i,
    /\bthe (data|facts) (show|says|shows|say)\b/i,
    /\baccording to\b/i,
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
    goalPattern: [/\bsolution\b/i, /\bshown\b/i, /\basked (to|for)\b/i],
    goalPick: [/\ball (three|3|of them|the exercises)\b/i, /\bevery (single )?(time|exercise)\b/i, /\beach (time|exercise)\b/i],
    promise: [/\byou asked\b/i, /\byou chose to see\b/i, /\basked to be shown\b/i, /\byou were shown\b/i],
};

// ── Seeding ─────────────────────────────────────────────────────────────────

const items = [];
let itemId = 9000;
let stepAttemptId = 0;

// Every FlexibilityAttempt row this run creates, so they can all be removed at the end. Declared here
// rather than beside the goal seeding because the exercise seeding runs first.
const seededAttempts = [];

/**
 * A completed exercise with a PER-STEP breakdown, which is what the step questions are built from.
 *
 * The plain seed below writes a queue row with no attempt behind it, so `q1-step-sure` and
 * `q1-step-fight` never appear in this run at all — and a real fault lived there for exactly that
 * reason. The student made three errors in one part, tapped "choosing the method" on the question
 * asking which part they felt most sure about, and was told about two parts they had not mentioned.
 */
function seedSteps(exerciseType, method, stepErrors) {
    const total = Object.values(stepErrors).reduce((sum, n) => sum + n, 0);
    const info = conn.prepare(
        'INSERT INTO FlexibilityAttempt (StudentId, ExerciseType, ExerciseId, SelectedMethod, AgentCondition, IsStudy, StartedAt, CompletedAt, TotalTime, TotalErrors, TotalHints) ' +
        "VALUES (?, ?, 1, ?, '2', 0, ?, ?, 40, ?, 0)"
    ).run(STUDENT, exerciseType, method, stamp(), stamp(), total);

    stepAttemptId = Number(info.lastInsertRowid);
    seededAttempts.push(stepAttemptId);

    for (const [name, errors] of Object.entries(stepErrors)) {
        conn.prepare(
            'INSERT INTO AnchorRecord (AttemptId, StudentId, Name, Choice, MessageType, Actions, Time, Errors, Hints, UpdatedAt) ' +
            "VALUES (?, ?, ?, '', NULL, '', 5, ?, 0, ?)"
        ).run(stepAttemptId, STUDENT, name, errors, stamp());
    }

    return stepAttemptId;
}

function seedExercise(exerciseType, decisions, errors = 2, hints = 1, attemptId = 0) {
    const label = `${exerciseType} check ${++itemId}`;
    conn.prepare(
        'INSERT INTO ReflectionQueue (StudentId, ItemType, ItemId, ItemLabel, Status, Errors, Hints, PippinMessages, Method, Decisions, Focus, Evidence, AttemptId, CompletedAt) ' +
        "VALUES (?, 'exercise', ?, ?, 'pending', ?, ?, 0, ?, ?, '', '', ?, ?)"
    ).run(STUDENT, exerciseType, label, errors, hints, exerciseType, decisions, attemptId, stamp());

    const id = conn.prepare('SELECT Id FROM ReflectionQueue WHERE StudentId = ? ORDER BY Id DESC LIMIT 1').get(STUDENT).Id;
    items.push({ id, exerciseType, decisions, label });
    return id;
}

/**
 * The words a chip actually shows the student.
 *
 * The client resolves each chip's text key against its own locale files before rendering, and sends
 * those resolved words as the label. This used to send the raw key instead — so the audit handed the
 * model "flexibility:elimination-method" where the real client hands it "elimination method", and got
 * replies like "You tapped flexibility:elimination-method" back. The model was blamed for reading what
 * it was given, and the rejection count this file reports was inflated by a fault of the harness.
 */
function labelFor(textKey) {
    if (!textKey) return '';
    const [namespace = 'student', key = textKey] = textKey.includes(':') ? textKey.split(':') : ['student', textKey];
    const file = path.join(ROOT, `reactapp/src/assets/translations/${LANGUAGE}/${namespace}.json`);
    try {
        const value = JSON.parse(readFileSync(file, 'utf8'))[key];
        return typeof value === 'string' ? value : textKey;
    } catch {
        return textKey;
    }
}

async function evaluate(queueItemId, questionNumber, questionId, choice, choiceLabel, mode = 'self') {
    const response = await fetch(`${API}/student-progress/reflection/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentId: STUDENT, queueItemId, questionNumber, questionId,
            choice, choiceLabel, mode, language: LANGUAGE, subjectTerms: [],
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

    // There is no off-topic retry any more — nothing is typed, so nothing can be unrelated to the
    // question. Every reply is a complete statement, and an empty one would leave the student with
    // nothing to read at all.
    if (!text.trim()) broke.push('empty reply');
    if (/\?\s*$/.test(text.trim())) broke.push('ends with a question');

    results.push({ title, verdict: verdict.aligned ? 'aligned' : 'not aligned', xp: verdict.insightXp, broke });
    if (process.env.SHOW && title.startsWith('goal')) console.log(`SHOW  ${title}\n      ${verdict.aligned ? 'aligned' : 'not aligned'} +${verdict.insightXp}: "${text}"`);

    if (broke.length) {
        failures.push({ title, verdict, text, broke });
        console.log(`FAIL  ${title}\n      ${verdict.aligned ? 'aligned' : 'not aligned'} +${verdict.insightXp} XP, broke: ${broke.join('; ')}\n      "${text}"`);
    }
}

function checkScope(title, reply, questionId, verdict, inContext = []) {
    const kind = questionId === 'q2-compared' ? 'compare'
        : questionId === 'q2-explained' ? 'explain'
        : questionId === 'q3-next-action' ? 'promise'
        : questionId === 'goal-q1-went-well' ? 'goalPattern'
        : questionId === 'goal-q2-pattern' ? 'goalPick'
        : null;

    if (kind === null) return;

    const text = reply ?? '';
    const out = SCOPE[kind].filter(pattern => pattern.test(text) && !inContext.some(word => pattern.test(word)));

    if (out.length) check(title, reply, verdict);
}

// A reply to an answer that did NOT match has to say the answer back first.
//
// This is the fault the researcher hit in a real session: they answered "I compared them myself" on an
// exercise where they had declined the comparison, the badge correctly went quiet, and the reply was
// "You went straight on without comparing the two methods" — a bare fact about something they had never
// claimed, with no sign that anything they said had been read. The grading was right and the reply was
// useless. The shape is now three beats, their answer then the fact then why it matters, and this checks
// only the first beat, because it is the one whose absence makes the other two unreadable.
const ACKNOWLEDGES_THE_ANSWER =
    /\byou (said|say|told me|mentioned|answered|went with|picked|pick|chose|choose|put|wrote|marked|described)\b|\byour answer\b|\bwhat you (said|say|picked|chose|answered|went with|mentioned)\b|\bthe answer you gave\b/i;

function checkAcknowledgesAnswer(title, reply, kind, verdict) {
    // Only the graded kinds, and only when the answer did not match. A next-action or session question
    // has no verdict to deliver and nothing to acknowledge.
    if (kind !== 'observation' && kind !== 'judgement') return;
    if (verdict.aligned) return;
    if (!(reply ?? '').trim()) return;

    if (!ACKNOWLEDGES_THE_ANSWER.test(reply)) {
        failures.push({ title, verdict, text: reply, broke: ['does not say their answer back'] });
        console.log(`FAIL  ${title}\n      the answer did not match, but the reply never refers to what they said\n      "${reply}"`);
        return;
    }
    results.push({ title: `${title} (acknowledges)`, verdict: 'ok', xp: verdict.insightXp, broke: [] });
}

// The step questions must name the step the student chose, and no other.
//
// Real fault, from a real exercise: three errors spread over four parts, tapped "choosing the method"
// on the question asking which part they felt most sure about, and the reply named TWO parts — including
// one they had never mentioned. The fact string listed every clean step joined with "and", whatever was
// tapped, so the reply answered a different question than the one on screen and read, after three
// errors, as a claim about the whole exercise.
//
// Only checked when the answer matched, because when it did not the fact deliberately names the part
// that actually cost them instead of the one they picked — that is the reply doing its job.
const STEP_GLOSS = {
    choose: 'the part where the method is chosen',
    setup: 'the part where the method is set up',
    solve: 'the part where the solution is found',
    explain: 'the part where the reasoning is written out',
};

function checkStepAnswer(title, reply, questionId, choice, verdict) {
    if (questionId !== 'q1-step-sure') return;
    if (!String(choice).startsWith('step-')) return;
    if (!verdict.aligned) return;

    const mine = choice.slice(5);
    const text = reply ?? '';
    const broke = [];

    // The model paraphrases the gloss often enough to matter — "you got through THAT PART without a
    // mistake", "you worked through the method selection on your own" — so there is no reliable positive
    // test for "names their step". The hard assertion is the NEGATIVE one: it must not name a part they
    // did not pick, because that is the fault itself. The fact-level fix is what guarantees their own
    // part is the one being described.
    for (const [id, gloss] of Object.entries(STEP_GLOSS)) {
        if (id !== mine && text.includes(gloss)) broke.push(`names a part they did not pick ("${gloss}")`);
    }

    if (broke.length) {
        failures.push({ title, verdict, text, broke });
        console.log(`FAIL  ${title}\n      ${broke.join('; ')}\n      "${text}"`);
        return;
    }
    results.push({ title: `${title} (names their step only)`, verdict: 'ok', xp: verdict.insightXp, broke: [] });
}

// Which question a reply is about, so the scope rules know what to look for.

// ── The cases ───────────────────────────────────────────────────────────────
//
// Three exercises, one per type, each with a different decision on the record: Suitability where they
// skipped the comparison and worked the solution out alone, Efficiency where they skipped the
// explanation, and Matching where they explained. Between them that covers every branch the reply
// builder has, and the shapes that actually went wrong in testing.
//
// The Suitability one carries a real PER-STEP breakdown, because without it `q1-step-sure` and
// `q1-step-fight` never appear in this run at all — and a real fault lived there for exactly that
// reason. A student made three errors in one part, tapped "choosing the method" on the question asking
// which part they felt most sure about, and the reply named two parts, one of which they had never
// mentioned. `SelectedMethod` and `Transformation` are the "choose" and "setup" steps, `Substitution`
// is the setup step's work, and the two solutions are the "solve" step.
const stepSeed = seedSteps('Suitability', 'Substitution', {
    SelectedMethod: 0,
    Transformation: 0,
    Substitution: 3,
    EquationSelection: 0,
    FirstSolution: 0,
    SecondSolution: 0,
});

seedExercise('Suitability', 'MethodComparison=Declined;SolveOnOwn=Engaged', 3, 0, stepSeed);
seedExercise('Efficiency', 'SelfExplanation=Declined;SolveOnOwn=Engaged', 2, 1);
seedExercise('Matching', 'SelfExplanation=Engaged;SolveOnOwn=Declined', 0, 0);

// ONLY_GOALS=1 skips the exercise cases, for a quicker run when only a goal question changed.
if (process.env.ONLY_GOALS) items.length = 0;

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
            const result = await evaluate(item.id, number, question.id, chip.id, labelFor(chip.textKey));
            if (result.error) { console.log(`SKIP  ${title('chip ' + chip.id)}: ${result.error}`); continue; }
            check(title(`tap "${chip.id}"`), result.feedback, result);
            checkScope(title(`tap "${chip.id}"`), result.feedback, question.id, result);
            checkAcknowledgesAnswer(title(`tap "${chip.id}"`), result.feedback, question.kind, result);
            checkStepAnswer(title(`tap "${chip.id}"`), result.feedback, question.id, chip.id, result);
        }

        // "Pippin, tell me" is the mode that used to answer with the past whatever was asked.
        const pippin = await evaluate(item.id, number, question.id, '', '', 'pippin');
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

const goalAttempts = seededAttempts;

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
        ['Suitability', 'Equalization', 1, 0],
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

        // Every chip: the two reported failures were a chip whose reply was about a different fact, and a
        // count stated as "all" that the record did not support. Neither shows on the first or last chip alone.
        for (const chip of question.chips) {
            if (!chip) continue;
            const result = await evaluate(entry.id, number, question.id, chip.id, labelFor(chip.textKey));
            if (result.error) { console.log(`SKIP  ${title(chip.id)}: ${result.error}`); continue; }
            check(title(`tap "${chip.id}"`), result.feedback, result);
            checkScope(title(`tap "${chip.id}"`), result.feedback, question.id, result, category === 'solveOnOwn' ? ['solution', 'shown', 'asked to'] : []);
            checkAcknowledgesAnswer(title(`tap "${chip.id}"`), result.feedback, question.kind, result);
        }

        const pippin = await evaluate(entry.id, number, question.id, '', '', 'pippin');
        if (!pippin.error) {
            check(title('pressed Pippin, tell me'), pippin.feedback, pippin);
            checkScope(title('pressed Pippin, tell me'), pippin.feedback, question.id, pippin);
        }
    }
}

clearGoalItems();

console.log(`\n${results.length} replies checked, ${failures.length} with something wrong.`);

// ── How often the reply guard threw the model's work away ────────────────────
//
// The guard sends a reply back once and, if it is wrong again, shows the offline text instead. Its
// "only hands their answer back" rule counted full stops and demanded two, which rejected 55 of 130
// good replies in a measured run — every one of them the fact-then-reason shape the prompt asks for,
// joined by a comma. The student then read generic text on one answer in seven, and the model took the
// blame for a rule that was reading its punctuation. This reads the verdict events the run just wrote,
// so the check is on what happened rather than on a regex written here.
if (eventMark !== null) {
    try {
        const verdicts = conn.prepare(
            "SELECT Value FROM StudentEvent WHERE StudentId = ? AND Id > ? AND EventType = 'reflection.verdict'"
        ).all(STUDENT, eventMark);
        const thrownAway = verdicts.filter(row => row.Value === 'reply-rejected-twice').length;
        const rate = verdicts.length === 0 ? 0 : thrownAway / verdicts.length;
        const summary = `${thrownAway} of ${verdicts.length} judged answers fell back to the offline text`;
        // A provider that is down produces fallbacks too, but those arrive as their own outcomes
        // (no-provider-configured, model-unreachable, model-unreadable) and are not counted here.
        if (verdicts.length >= 20 && rate > 0.1) {
            console.log(`FAIL  the reply guard ${summary} (${Math.round(rate * 100)}% — over the 10% ceiling)`);
            process.exitCode = 1;
        } else {
            console.log(`ok    the reply guard let the model's reply through — ${summary}`);
        }
    } catch {
        console.log('NOTE  no timeline table, so the guard rate was not measured');
    }
}

// The queue and history rows this check created are not the student's own, so they go.
conn.prepare('DELETE FROM ReflectionHistory WHERE StudentId = ?').run(STUDENT);
conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(STUDENT);
conn.close();

process.exit(failures.length === 0 && !process.exitCode ? 0 : 1);
