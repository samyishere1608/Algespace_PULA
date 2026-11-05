// Asks the written-answer judge what it makes of real phrasings, on a record that supports them.
//
//   node tools/reflection-audit/check-written-judge.mjs      (API on :7273 in Development)
//
// WHY. A student who says the right thing in their own words and earns nothing is the complaint this
// exists to answer — and the judge is a model, so the only way to know whether it is too strict is to
// put phrasings in front of it and read the verdicts. The record is seeded so that every answer below
// is TRUE: the question asks whether they explained their reasoning, and the attempt says they did.
// Anything judged "none" here is a false negative.
//
// "different speaking styles" is the point of the list: casual, learner English, Japanese, a fragment,
// an answer with an extra true remark in it. None of those is a wrong answer.
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const conn = new DatabaseSync(path.join(ROOT, "webapi/Data/databases/students.db"));
const API = process.env.ALGESPACE_API ?? "http://localhost:7273";
const STUDENT = 999905;

// The truth every answer below is describing: they DID explain their reasoning in this exercise.
const ANSWERS = [
    { language: "en", text: "I explained my reasoning before working it out", want: "aligned" },
    { language: "en", text: "i said why i picked that method", want: "aligned" },
    { language: "en", text: "Told myself out loud why it works, then did the sum", want: "aligned" },
    { language: "en", text: "explained", want: "partial" },
    { language: "en", text: "I compared the two methods first, then said my reasoning", want: "aligned" },
    { language: "en", text: "We had to say our thinking so I did that", want: "aligned" },
    { language: "ja", text: "じぶんでやり方を説明してから解いたよ", want: "aligned" },
    { language: "ja", text: "なんでそのやり方でいいのか、ことばにしてみた", want: "aligned" },
    { language: "ja", text: "説明した", want: "partial" },
    { language: "ja", text: "考えを言ってから計算した", want: "aligned" },
    { language: "en", text: "I don't know", want: "none" },
    { language: "en", text: "it was fine", want: "partial" },
    { language: "en", text: "I skipped that part", want: "none" },

    // THE CASUAL ONES, WHICH ARE WHAT "IT FLAGGED ME FOR NO INSIGHT" ACTUALLY LOOKS LIKE.
    // The record here is clean (no mistakes, no hints) and the reasoning was written out, so every
    // sentence below is true — it is just said the way a twelve-year-old says it.
    { language: "en", text: "it went well", want: "aligned" },
    { language: "en", text: "went alright I guess", want: "aligned" },
    { language: "en", text: "no mistakes", want: "aligned" },
    { language: "en", text: "didnt need any hints", want: "aligned" },
    { language: "en", text: "was easy", want: "partial" },
    { language: "ja", text: "うまくできた", want: "aligned" },
    { language: "ja", text: "ふつうかな", want: "partial" },
    { language: "ja", text: "ミスしなかった", want: "aligned" },
    { language: "ja", text: "ヒントつかわなかった", want: "aligned" },
    { language: "ja", text: "かんたんだった", want: "partial" },
];

function cleanup() {
    const ids = conn.prepare("SELECT Id FROM FlexibilityAttempt WHERE StudentId = ?").all(STUDENT).map((r) => r.Id);
    if (ids.length > 0) {
        conn.exec(`DELETE FROM AnchorRecord WHERE AttemptId IN (${ids.join(",")})`);
        conn.exec(`DELETE FROM FlexibilityAttempt WHERE Id IN (${ids.join(",")})`);
    }
    conn.prepare("DELETE FROM ReflectionQueue WHERE StudentId = ?").run(STUDENT);
}

cleanup();

const attempt = Number(conn.prepare(
    "INSERT INTO FlexibilityAttempt (StudentId, ExerciseType, ExerciseId, SelectedMethod, AgentCondition, IsStudy, StartedAt, TotalErrors, TotalHints) " +
    "VALUES (?, 'Efficiency', 1, 'Equalization', 'MotivationalAgent', 0, '2026-01-01T00:00:00', 0, 0)"
).run(STUDENT).lastInsertRowid);

// Both solution points taken, and the reasoning written out — so "I explained my reasoning" is true and
// "I compared the methods" is true too. Everything else the question might be checked against is clean.
conn.prepare(
    "INSERT INTO AnchorRecord (AttemptId, StudentId, Name, Choice, UpdatedAt) VALUES (?, ?, ?, ?, '2026-01-01T00:00:00')"
).run(attempt, STUDENT, "SelfExplanationChoice", "Yes");
conn.prepare(
    "INSERT INTO AnchorRecord (AttemptId, StudentId, Name, Choice, UpdatedAt) VALUES (?, ?, ?, ?, '2026-01-01T00:00:00')"
).run(attempt, STUDENT, "FirstSolutionChoice", "Yes");

const queue = Number(conn.prepare(
    "INSERT INTO ReflectionQueue (StudentId, ItemType, ItemId, ItemLabel, Status, Errors, Hints, PippinMessages, Method, Decisions, Focus, Evidence, AttemptId, CompletedAt) " +
    "VALUES (?, 'exercise', 'Efficiency', 'Efficiency', 'pending', 0, 0, 0, 'Efficiency', 'SelfExplanation=Engaged;SolveOnOwn=Engaged', '', '', ?, datetime('now'))"
).run(STUDENT, attempt).lastInsertRowid);

const rows = [];
for (const answer of ANSWERS) {
    const response = await fetch(`${API}/student-progress/reflection/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            studentId: STUDENT,
            queueItemId: queue,
            language: answer.language,
            questionNumber: 2,
            questionId: "q2-explained",
            mode: "self",
            choice: "",
            choiceLabel: "",
            freeText: answer.text,
            subjectTerms: [],
        }),
    });
    const data = await response.json();
    const got = data.aligned ? "aligned" : data.insightXp > 0 ? "partial" : "none";
    rows.push({ ...answer, got, xp: data.insightXp });
}

cleanup();

const missed = rows.filter((row) => row.want !== "none" && row.got === "none");
const overpaid = rows.filter((row) => row.want === "none" && row.got !== "none");

for (const row of rows) {
    const mark = row.want === "none" ? (row.got === "none" ? "ok  " : "PAID") : row.got === "none" ? "MISS" : "ok  ";
    console.log(`${mark} [${row.language}] want=${row.want} got=${row.got} xp=${row.xp}  ${row.text}`);
}

console.log(`\n${rows.length - missed.length - overpaid.length}/${rows.length} as intended — ${missed.length} true answer(s) paid nothing, ${overpaid.length} non-answer(s) paid`);
