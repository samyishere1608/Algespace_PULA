// Prints what the live model actually replies to a Japanese student, for each way of answering.
//
//   node tools/reflection-audit/show-ja-replies.mjs      (API on :7273 in Development)
//
// The prompt is the only thing that shapes the reply, so it cannot be judged from the source: the
// rules are long, they overlap, and the model follows some of them and not others. This prints real
// output for the cases that reach a student in Japanese.
//
// Writes to the database on a scratch student and clears up after itself.
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const conn = new DatabaseSync(path.join(ROOT, "webapi/Data/databases/students.db"));
const API = process.env.ALGESPACE_API ?? "http://localhost:7273";
const STUDENT = 999904;

function seed(decisions, errors = 2, hints = 1, attempts = 3) {
    conn.prepare("DELETE FROM ReflectionQueue WHERE StudentId = ?").run(STUDENT);
    conn.prepare(
        "INSERT INTO ReflectionQueue (StudentId, ItemType, ItemId, ItemLabel, Status, Errors, Hints, PippinMessages, Method, Decisions, Focus, Evidence, CompletedAt) " +
        "VALUES (?, 'exercise', 'Efficiency', 'Efficiency', 'pending', ?, ?, 0, 'Efficiency', ?, '', '', datetime('now'))"
    ).run(STUDENT, errors, hints, decisions);
    return conn.prepare("SELECT Id FROM ReflectionQueue WHERE StudentId = ? ORDER BY Id DESC LIMIT 1").get(STUDENT).Id;
}

async function evaluate(queueItemId, body) {
    const response = await fetch(`${API}/student-progress/reflection/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: STUDENT, queueItemId, language: "ja", subjectTerms: [], ...body }),
    });
    if (!response.ok) return { error: `HTTP ${response.status}` };
    return await response.json();
}

async function turn(title, decisions, body, options = {}) {
    const id = seed(decisions, options.errors ?? 2, options.hints ?? 1);
    const result = await evaluate(id, body);
    console.log(`\n=== ${title}`);
    console.log(`mode=${body.mode ?? "self"} Q=${body.questionNumber} choice=${body.choice || "-"} freeText=${body.freeText ? "yes" : "-"}`);
    if (result.error) {
        console.log(`ERROR ${result.error}`);
        return;
    }
    console.log(`verdict: aligned=${result.aligned} insight=${result.insightXp}`);
    console.log(`reply:   ${result.feedback}`);
    if (result.nextStep) console.log(`next:    ${result.nextStep}`);
}

const ENGAGED = "SelfExplanation=Engaged;SolveOnOwn=Engaged;MethodComparison=Engaged";
const AVOIDED = "SelfExplanation=Declined;SolveOnOwn=Declined;MethodComparison=Declined";

try {
    await turn("Q2 tapped, matches the record", ENGAGED,
        { questionNumber: 2, questionId: "q2-explained", choice: "yn-explain-yes", choiceLabel: "自分で説明した" });

    await turn("Q2 tapped, does not match", AVOIDED,
        { questionNumber: 2, questionId: "q2-explained", choice: "yn-explain-yes", choiceLabel: "自分で説明した" });

    await turn("Q1 tapped", ENGAGED,
        { questionNumber: 1, questionId: "q1-exercise-went-well", choice: "band-yes", choiceLabel: "うまくいった" });

    await turn("Q3 promise", ENGAGED,
        { questionNumber: 3, questionId: "q3-next-action", choice: "act-explain-hint", choiceLabel: "自分で説明して、必要ならヒントを見る" });

    await turn("Pippin answers Q1", ENGAGED,
        { questionNumber: 1, questionId: "q1-exercise-went-well", mode: "pippin", choice: "", choiceLabel: "" });

    await turn("Pippin answers Q2", AVOIDED,
        { questionNumber: 2, questionId: "q2-explained", mode: "pippin", choice: "", choiceLabel: "" });

    await turn("Pippin answers Q3", ENGAGED,
        { questionNumber: 3, questionId: "q3-next-action", mode: "pippin", choice: "", choiceLabel: "" });

    await turn("written answer, real sentence", ENGAGED,
        { questionNumber: 2, questionId: "q2-explained", mode: "self", choice: "", choiceLabel: "", freeText: "じぶんでやり方を説明してから解いたよ" });

    await turn("written answer, vague", ENGAGED,
        { questionNumber: 2, questionId: "q2-explained", mode: "self", choice: "", choiceLabel: "", freeText: "ふつう" });

    await turn("written answer, gibberish", ENGAGED,
        { questionNumber: 2, questionId: "q2-explained", mode: "self", choice: "", choiceLabel: "", freeText: "aaaaaaa" });
} finally {
    conn.prepare("DELETE FROM ReflectionQueue WHERE StudentId = ?").run(STUDENT);
    console.log("\nqueue cleared");
}
