"""
Records what the reflection reply actually says in Japanese, for a fixed set of scenarios.

Used to compare the reply BEFORE and AFTER the Japanese style guide was added to the prompt: run it
with `--tag baseline`, change the prompt, rebuild, run it with `--tag after`, then diff the two files.

The scenarios are the ones the professor's examples are about — a clean run, a mismatch between what
the student tapped and what the record shows, and the next-step question — because those are where
translated-sounding Japanese shows up most.

    python tools/i18n-fix/capture-ja.py --tag baseline
"""
import argparse
import datetime
import json
import pathlib
import sqlite3
import sys
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[1]
DB = ROOT / "webapi" / "Data" / "databases" / "students.db"
BASE = "http://localhost:7273"
API_KEY = "algespace-api-2026"

STUDENT_ID = 6
LANGUAGE = "ja"

# (label, item_type, focus, errors, hints, question_id, question_number, answer)
#
# Answers are free text rather than chips: a chip is only graded correctly against the menu built for
# a real attempt, and a hand-seeded row falls into the bank's no-history menu instead. Free text takes
# the same reply path, and it is what the style guide is most visible on.
SCENARIOS = [
    # A run with nothing to fix. The professor's own good example is this case:
    # 「ヒントもミスもなしで、最後までスイスイ進めたね。やり方がしっかり身についてきてるよ！」
    ("clean-run", "exercise", "Matching", 0, 0, "q1-exercise-went-well", 1, "ヒントもミスもなしで、さいごまでできた"),

    # The student says they took no hints, on a run where they did. This is the path that has to say
    # their answer back first and then the fact, without turning it into a telling-off.
    ("hint-mismatch", "exercise", "Suitability", 2, 1, "q1-exercise-went-well", 1, "ヒントはつかわなかった"),

    # The next-step question, which is where the reply is a suggestion rather than a report.
    ("next-step", "exercise", "Matching", 1, 0, "q3-next-action", 3, "つぎは解き方をくらべてみたい"),
]


def seed(conn, item, attempt_id):
    now = datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%S")
    cursor = conn.execute(
        """INSERT INTO ReflectionQueue
           (StudentId, ItemType, ItemId, ItemLabel, Status, Errors, Hints, PippinMessages, Method,
            Decisions, Focus, Evidence, AttemptId, CompletedAt)
           VALUES (?, ?, ?, ?, 'pending', ?, ?, 0, ?, '', ?, '', ?, ?)""",
        (STUDENT_ID, item["type"], item["focus"], item["focus"], item["errors"], item["hints"],
         item["focus"], item["focus"], item["attempt"], now))
    conn.commit()
    return cursor.lastrowid


def evaluate(queue_item_id, scenario):
    payload = {
        "studentId": STUDENT_ID,
        "queueItemId": queue_item_id,
        "questionNumber": scenario["number"],
        "questionId": scenario["question_id"],
        "choice": "",
        "choiceLabel": "",
        "freeText": scenario["free_text"],
        "subjectTerms": [],
        "mode": "self",
        "language": LANGUAGE,
    }
    request = urllib.request.Request(
        f"{BASE}/student-progress/reflection/evaluate",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "X-API-Key": API_KEY},
        method="POST")
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.loads(response.read().decode("utf-8"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tag", required=True)
    parser.add_argument("--lang", default="ja")
    args = parser.parse_args()
    global LANGUAGE
    LANGUAGE = args.lang

    if not DB.exists():
        sys.exit(f"no database at {DB}")

    conn = sqlite3.connect(DB)
    results = []
    created = []

    try:
        for index, (label, item_type, focus, errors, hints, question_id, number, answer) in enumerate(SCENARIOS):
            scenario = {
                "type": item_type, "focus": focus, "errors": errors, "hints": hints,
                "question_id": question_id, "number": number, "free_text": answer,
                "attempt": 920000 + index,
            }
            queue_item_id = seed(conn, scenario, scenario["attempt"])
            created.append(queue_item_id)

            print(f"  {label} ...", end="", flush=True)
            reply = evaluate(queue_item_id, scenario)
            print(" done")
            results.append({
                "scenario": label,
                "question": question_id,
                "errors": errors,
                "hints": hints,
                "studentAnswer": answer,
                "feedback": reply.get("feedback", ""),
                "nextStep": reply.get("nextStep", ""),
                "aligned": reply.get("aligned"),
                "insightXp": reply.get("insightXp"),
            })
    finally:
        # The queue rows exist only for this capture.
        for queue_item_id in created:
            conn.execute("DELETE FROM ReflectionQueue WHERE Id = ?", (queue_item_id,))
        conn.commit()
        conn.close()

    out = HERE / f"ja-{args.tag}.json"
    out.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nwrote {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
