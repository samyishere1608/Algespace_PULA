"""Normalises the Japanese name of the equalization method to the professor's term.

The app said 等値法 in the flexibility and study copy and in the exercise content, while the
dashboard, the onboarding, the goal suggestions and the NLP extractor all said 等置法. The professor
named 等置法 as the correct term in the first-session feedback, so the remaining files are aligned to
it. Reads and writes UTF-8 explicitly; reports a per-file count so a silent no-op is visible.
"""
import os

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OLD = "等値法"
NEW = "等置法"

FILES = [
    "reactapp/src/assets/translations/ja/about.json",
    "reactapp/src/assets/translations/ja/flexibility.json",
    "reactapp/src/assets/translations/ja/study.json",
    "webapi/Models/Flexibility/ExerciseContentJapanese.cs",
]

total = 0
for rel in FILES:
    path = os.path.join(REPO, rel)
    with open(path, encoding="utf-8") as handle:
        before = handle.read()
    count = before.count(OLD)
    if count == 0:
        print(f"{rel}: 0 (nothing to change)")
        continue
    with open(path, "w", encoding="utf-8", newline="") as handle:
        handle.write(before.replace(OLD, NEW))
    total += count
    print(f"{rel}: {count} replaced")

print(f"\ntotal: {total}")
