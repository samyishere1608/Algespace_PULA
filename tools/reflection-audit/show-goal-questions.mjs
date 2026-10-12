// Prints every goal question as the endpoint actually returns it.
//
// Each category gets its own run: the attempts are laid down, then the goal is completed through the
// REAL log-goal call, so the window is built by the same code the app uses, and only then is the
// reflection read back. One category at a time matters, because a goal's window is a slice of that
// student's exercises and two fixtures would otherwise share one window.
//
// Everything here mirrors what the app records, so a question that reads oddly is the server's doing
// rather than the fixture's: exercise types and methods by NAME (the attempts table stores names, not
// numbers), and the anchor names from AnchorDimension — FirstSolutionChoice, SelfExplanationChoice,
// ComparisonChoice.
//
// Uses a throwaway student so nothing real is touched, and cleans up after itself.
//
//   node show-goal-questions.mjs [locale]

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const conn = new DatabaseSync(path.join(ROOT, 'webapi/Data/databases/students.db'));
const API = 'http://localhost:7273';
const STUDENT = 999998;

const locale = process.argv[2] ?? 'en';
const read = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, `reactapp/src/assets/translations/${locale}/${name}.json`), 'utf8'));
const words = read('student');
const namespaces = { student: words, flexibility: read('flexibility') };

const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

function cleanup() {
    conn.prepare('DELETE FROM ReflectionQueue WHERE StudentId = ?').run(STUDENT);
    conn.prepare('DELETE FROM AnchorRecord WHERE StudentId = ?').run(STUDENT);
    conn.prepare('DELETE FROM FlexibilityAttempt WHERE StudentId = ?').run(STUDENT);
    conn.prepare('DELETE FROM GoalCompletions WHERE StudentId = ?').run(STUDENT);
    conn.prepare('DELETE FROM AgencyLog WHERE StudentId = ?').run(STUDENT);
}

// As the app spells them: the goal catalogue's method and exercise-type names, which is also what the
// attempts table and the client's goal matching both use.
const ELIMINATION = 'Elimination', SUBSTITUTION = 'Substitution', EQUALIZATION = 'Equalization';
const SUITABILITY = 'Suitability', EFFICIENCY = 'Efficiency', MATCHING = 'Matching';

// The anchor names the app writes its decisions under. Owning a solution is FirstSolutionChoice, not
// a name of the question's own inventing.
const OWN = 'FirstSolutionChoice', EXPLAINED = 'SelfExplanationChoice', COMPARED = 'ComparisonChoice';

let exerciseId = 0;

/** One completed attempt, with the anchor records carrying its decisions. */
function attempt(type, method, errors, hints, time, decisions = {}) {
    const info = conn.prepare(
        'INSERT INTO FlexibilityAttempt (StudentId, ExerciseType, ExerciseId, SelectedMethod, AgentCondition, IsStudy, StartedAt, CompletedAt, TotalTime, TotalErrors, TotalHints) ' +
        'VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)'
    ).run(STUDENT, type, ++exerciseId, method, '2', stamp(), stamp(), time, errors, hints);

    const id = Number(info.lastInsertRowid);
    for (const [name, choice] of Object.entries(decisions)) {
        conn.prepare(
            'INSERT INTO AnchorRecord (AttemptId, StudentId, Name, Choice, MessageType, Actions, Time, Errors, Hints, UpdatedAt) ' +
            "VALUES (?, ?, ?, ?, NULL, '', 0, 0, 0, ?)"
        ).run(id, STUDENT, name, choice, stamp());
    }
}

async function completeGoal(category, label, focus, quality = '', limit = 0) {
    const response = await fetch(`${API}/student-progress/log-goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            studentId: STUDENT, goalId: category, goalLabel: label, xpEarned: 5,
            exerciseType: '', totalErrors: 0, totalHints: 0,
            since: '', focus, quality, maxPerExercise: limit,
        }),
    });

    if (!response.ok) console.log(`  !! log-goal ${response.status}: ${(await response.text()).slice(0, 200)}`);
}

function say(key, values = {}, slots = {}) {
    const dive = (k) => {
        const colon = k.indexOf(':');
        return colon < 0 ? words[k] : namespaces[k.slice(0, colon)]?.[k.slice(colon + 1)];
    };
    let text = dive(key);
    if (!text) return `<<${key}>>`;
    for (const [name, value] of Object.entries(values)) text = text.replaceAll(`{{${name}}}`, value);
    for (const [name, slotKey] of Object.entries(slots)) text = text.replaceAll(`{{${name}}}`, dive(slotKey) ?? `<<${slotKey}>>`);
    return text;
}

async function show(name, category, label, focus, quality = '', limit = 0) {
    await completeGoal(category, label, focus, quality, limit);

    const [item] = await (await fetch(`${API}/student-progress/reflection-queue/${STUDENT}`)).json();
    if (!item) { console.log(`\n### ${name}\n  (no item queued)\n`); return; }

    console.log(`\n### ${name}`);
    item.questions?.forEach((q, i) => {
        console.log(`  Q${i + 1}  ${say(q.textKey, q.values, q.slots)}`);
        console.log(`      ${q.chips.map(c => `"${say(c.textKey)}"`).join('   ')}`);
    });
}

cleanup();

// ── method goal: about one method, so only that method's exercises count ────
// Two other-method exercises first, from before the goal: they are what the comparison question
// compares against, and they must NOT appear in the goal's own window.
attempt(SUITABILITY, SUBSTITUTION, 5, 2, 60);
attempt(SUITABILITY, EQUALIZATION, 4, 1, 60);
attempt(EFFICIENCY, ELIMINATION, 3, 1, 70, { [OWN]: 'No' });
attempt(EFFICIENCY, ELIMINATION, 1, 0, 50, { [OWN]: 'Yes', [EXPLAINED]: 'Yes' });
attempt(EFFICIENCY, ELIMINATION, 0, 0, 40, { [OWN]: 'Yes' });
await show('method goal (Elimination)', 'method', 'Practise the elimination method', ELIMINATION);

// ── Suitability goal: the choices are what the goal is about ───────────────
cleanup();
attempt(SUITABILITY, SUBSTITUTION, 2, 1, 60, { [COMPARED]: 'No' });
attempt(SUITABILITY, SUBSTITUTION, 3, 1, 55, { [COMPARED]: 'No' });
attempt(SUITABILITY, SUBSTITUTION, 1, 0, 50, { [COMPARED]: 'No' });
attempt(SUITABILITY, ELIMINATION, 0, 0, 40, { [COMPARED]: 'Yes' });
await show('exercise-type goal (Suitability)', 'exerciseType', 'Four Suitability exercises', SUITABILITY);

// ── Efficiency goal: the same shape, but about the best method ─────────────
cleanup();
attempt(EFFICIENCY, SUBSTITUTION, 3, 2, 80, { [EXPLAINED]: 'No', [OWN]: 'No' });
attempt(EFFICIENCY, SUBSTITUTION, 2, 1, 70, { [EXPLAINED]: 'No', [OWN]: 'No' });
attempt(EFFICIENCY, ELIMINATION, 1, 0, 50, { [EXPLAINED]: 'Yes', [OWN]: 'Yes' });
await show('exercise-type goal (Efficiency)', 'exerciseType', 'Three Efficiency exercises', EFFICIENCY);

// ── Matching goal: the method is given, so questions are about mistakes ────
cleanup();
attempt(MATCHING, ELIMINATION, 0, 0, 40, { [EXPLAINED]: 'Yes', [OWN]: 'Yes' });
attempt(MATCHING, ELIMINATION, 4, 2, 65, { [EXPLAINED]: 'No', [OWN]: 'No' });
attempt(MATCHING, EQUALIZATION, 1, 0, 50, { [EXPLAINED]: 'No', [OWN]: 'No' });
await show('exercise-type goal (Matching)', 'exerciseType', 'Three Matching exercises', MATCHING);

// ── self-explanation goal: explained against skipped, inside the window ────
cleanup();
// Older exercise, where they turned explaining down: the "used to skip" option reads from these.
attempt(EFFICIENCY, ELIMINATION, 3, 2, 60, { [EXPLAINED]: 'No', [OWN]: 'Yes' });
attempt(EFFICIENCY, ELIMINATION, 4, 2, 62, { [EXPLAINED]: 'No', [OWN]: 'Yes' });
attempt(EFFICIENCY, ELIMINATION, 1, 0, 50, { [EXPLAINED]: 'Yes', [OWN]: 'Yes' });
attempt(MATCHING, EQUALIZATION, 0, 0, 45, { [EXPLAINED]: 'Yes', [OWN]: 'Yes' });
await show('self-explanation goal', 'selfExplanation', 'Explain your reasoning', '');

// ── method-comparison goal (Suitability only) ──────────────────────────────
cleanup();
attempt(SUITABILITY, ELIMINATION, 3, 2, 60, { [COMPARED]: 'No' });
attempt(SUITABILITY, ELIMINATION, 0, 1, 45, { [COMPARED]: 'Yes' });
attempt(SUITABILITY, ELIMINATION, 1, 0, 50, { [COMPARED]: 'Yes' });
await show('method-comparison goal', 'methodComparison', 'Compare methods', '');

// ── solve-on-own goal: own against handed over ─────────────────────────────
cleanup();
attempt(EFFICIENCY, SUBSTITUTION, 5, 2, 70, { [OWN]: 'No' });
attempt(EFFICIENCY, SUBSTITUTION, 3, 1, 60, { [OWN]: 'No' });
attempt(EFFICIENCY, EQUALIZATION, 2, 1, 60, { [OWN]: 'No' });
attempt(EFFICIENCY, ELIMINATION, 0, 0, 40, { [OWN]: 'Yes' });
await show('solve-on-own goal', 'solveOnOwn', 'Work it out yourself', '');

// ── hints-and-errors goal, limited on hints ────────────────────────────────
cleanup();
attempt(MATCHING, ELIMINATION, 2, 1, 50, { [OWN]: 'Yes' });
attempt(MATCHING, ELIMINATION, 1, 0, 45, { [OWN]: 'Yes' });
await show('hints-and-errors goal (limit: hints)', 'hintsAndErrors', 'Stay under one hint', '', 'hints', 1);

cleanup();
console.log('\nthrowaway student cleaned up');
