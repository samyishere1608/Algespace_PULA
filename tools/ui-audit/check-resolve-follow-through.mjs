// Proves the Resolve follow-through rule against the real endpoint, on a scratch student.
//
//   node tools/ui-audit/check-resolve-follow-through.mjs      (API must be running on :7273 in Development)
//
// WHY IT DOES NOT JUST READ THE SOURCE. The rule lives in one place — "the decision immediately after
// the one that earned Insight" — and every way of getting it wrong looks identical in a diff: too
// generous pays Resolve for a later yes, too strict never pays it at all, and comparing the wrong two
// decisions silently breaks the within-exercise case. The only honest check is to seed a history and
// ask the endpoint, so that is what this does.
//
// THE FIXTURE MIRRORS REAL TIME. The attempt being worked on is always the newest one, and a decision
// already answered is already in the anchor records — that is what the client writes before it asks
// about the award. So each scenario seeds the history first, then makes the decisions in the order a
// student would.
//
// The fixture student is a high id no real participant uses (the same convention as
// tools/reflection-audit/fixture.mjs), and every row it writes is deleted again at the end.
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DB_PATH = path.join(ROOT, "webapi/Data/databases/students.db");
const API = process.env.ALGESPACE_API ?? "http://localhost:7273";
const STUDENT = 999902;

const problems = [];
let checks = 0;

function expect(label, actual, wanted) {
    checks += 1;
    const ok = JSON.stringify(actual) === JSON.stringify(wanted);
    console.log(`${ok ? "ok  " : "FAIL"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (wanted ${JSON.stringify(wanted)})`}`);
    if (!ok) problems.push(label);
}

async function ask(element, attemptId, decision) {
    const response = await fetch(`${API}/student-progress/insight-gap-award`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: STUDENT, element, attemptId, decision }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} from insight-gap-award`);
    const data = await response.json();
    return [data.amount ?? 0, data.resolveAmount ?? 0];
}

function cleanup(db) {
    const ids = db.prepare("SELECT Id FROM FlexibilityAttempt WHERE StudentId = ?").all(STUDENT).map((r) => r.Id);
    if (ids.length > 0) {
        db.exec(`DELETE FROM AnchorRecord WHERE AttemptId IN (${ids.join(",")})`);
        db.exec(`DELETE FROM FlexibilityAttempt WHERE Id IN (${ids.join(",")})`);
    }
    db.exec(`DELETE FROM InsightGapAward WHERE StudentId = ${STUDENT}`);
}

const db = new DatabaseSync(DB_PATH);

try {
    cleanup(db);

    // Ten exercises, oldest first. The last one is the one the student is in now.
    const insertAttempt = db.prepare(
        "INSERT INTO FlexibilityAttempt (StudentId, ExerciseType, ExerciseId, SelectedMethod, AgentCondition, IsStudy, StartedAt) " +
        "VALUES (?, 'Suitability', 1, 'Equalization', 'MotivationalAgent', 0, '2026-01-01T00:00:00')"
    );
    const attempts = [];
    for (let i = 0; i < 10; i++) attempts.push(Number(insertAttempt.run(STUDENT).lastInsertRowid));
    const CURRENT = attempts[attempts.length - 1];
    const PREVIOUS = attempts[attempts.length - 2];
    const BEFORE_THAT = attempts[attempts.length - 3];

    const write = db.prepare(
        "INSERT INTO AnchorRecord (AttemptId, StudentId, Name, Choice, UpdatedAt) VALUES (?, ?, ?, ?, '2026-01-01T00:00:00') " +
        "ON CONFLICT(AttemptId, Name) DO UPDATE SET Choice = excluded.Choice"
    );
    const record = (attemptId, name, choice) => write.run(attemptId, STUDENT, name, choice);

    // A long record of declining all four offers, which is what makes each element a gap.
    for (const id of attempts.slice(0, -1)) {
        record(id, "FirstSolutionChoice", "No");
        record(id, "SecondSolutionChoice", "No");
        record(id, "SelfExplanationChoice", "No");
        record(id, "ComparisonChoice", "No");
    }

    console.log("── Insight, then the same exercise asks again ──");
    // Working it out on your own is offered TWICE inside one exercise, so this is the case an
    // implementation that thinks in whole exercises cannot answer.
    expect("insight at the first solution point", await ask("SolveOnOwn", CURRENT, "FirstSolutionChoice"), [8, 0]);
    // The client writes the choice as the student makes it; the second point then comes round.
    record(CURRENT, "FirstSolutionChoice", "Yes");
    expect("follow-through at the second solution point", await ask("SolveOnOwn", CURRENT, "SecondSolutionChoice"), [0, 15]);
    expect("one Insight pays one Resolve", await ask("SolveOnOwn", CURRENT, "SecondSolutionChoice"), [0, 0]);

    console.log("── Insight, then the next exercise asks again ──");
    // Self-explanation is offered once per exercise, so "next" means the next exercise. The Insight is
    // earned in the previous exercise and taken up again in this one.
    record(PREVIOUS, "SelfExplanationChoice", "Yes");
    expect("insight in the previous exercise", await ask("SelfExplanation", PREVIOUS, "SelfExplanationChoice"), [8, 0]);
    // Taken up again at the next opportunity. No second Insight: the award in the previous exercise is
    // still inside its grace period, which is the right answer — the Resolve is the reward here.
    expect("follow-through in the next exercise", await ask("SelfExplanation", CURRENT, "SelfExplanationChoice"), [0, 15]);

    console.log("── A later yes is not a follow-through ──");
    record(BEFORE_THAT, "ComparisonChoice", "Yes");
    expect("insight two exercises back", await ask("MethodComparison", BEFORE_THAT, "ComparisonChoice"), [8, 0]);
    // The next time they were asked, they declined. Taking it up again a second time later is not the
    // behaviour Resolve is for; the chance was the very next time.
    expect("a yes two opportunities later earns nothing", await ask("MethodComparison", CURRENT, "ComparisonChoice"), [0, 0]);

    console.log("── The record ──");
    const rows = db.prepare(
        "SELECT Element, Decision, FollowedThroughAt FROM InsightGapAward WHERE StudentId = ? ORDER BY Id"
    ).all(STUDENT).map((r) => ({ ...r }));

    expect("three Insights, one per act", rows.length, 3);
    expect("every Insight names its decision", rows.every((r) => r.Decision !== ""), true);
    expect("exactly the two next decisions were followed through", rows.filter((r) => r.FollowedThroughAt !== "").length, 2);
} catch (error) {
    problems.push(`threw: ${error.message}`);
    console.log(`FAIL ${error.message}`);
} finally {
    cleanup(db);
    db.close();
}

if (problems.length > 0) {
    console.log(`\n${problems.length} of ${checks} check(s) failed.`);
    process.exit(1);
}
console.log(`\nOK  ${checks} checks: Insight 8, follow-through 15, once per Insight, and only for the very next decision`);
