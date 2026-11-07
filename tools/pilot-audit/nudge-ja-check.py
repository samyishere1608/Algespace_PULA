"""Checks just the nudge strings against the professor's two rules, so the repo-wide counts
(which include about/study pages nobody is editing) do not hide a problem in the sentence that was
actually changed."""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
ja = json.load(open(os.path.join(REPO, "reactapp", "src", "assets", "translations", "ja", "student.json"), encoding="utf-8"))
data = json.load(open(os.path.join(REPO, "tools", "i18n-fix", "kyoiku-kanji.json"), encoding="utf-8"))

# The file is {"grades": {"1": [...kanji...], ..., "6": [...]}, "all": "..."}.
grades = {}
for grade, characters in data["grades"].items():
    for ch in characters:
        grades[ch] = int(grade)

keys = [
    "nudge-ask",
    "nudge-benefit-self-explanation",
    "nudge-benefit-method-comparison",
    "nudge-benefit-solve-on-own",
]

problems = []
out_path = os.path.join(HERE, "nudge-ja-report.txt")
lines = []
for key in keys:
    text = ja.get(key)
    if text is None:
        problems.append(f"{key}: MISSING")
        continue
    above = []
    for ch in text:
        if "\u4e00" <= ch <= "\u9fff":
            grade = grades.get(ch)
            if grade is None:
                above.append(f"{ch}(unlisted)")
            elif grade > 6:
                above.append(f"{ch}(grade {grade})")
    if above:
        problems.append(f"{key}: kanji above grade 6 -> {', '.join(sorted(set(above)))}")
    if re.search(r"です|ます|あなた", text):
        problems.append(f"{key}: polite form or あなた -> {text}")
    lines.append(f"{key}\n  {text}")

lines.append(f"\nproblems: {len(problems)}")
for p in problems:
    lines.append("  - " + p)

# Written to a file rather than printed: this console is cp1252 and cannot encode Japanese, so
# printing raises UnicodeEncodeError and hides the result.
with open(out_path, "w", encoding="utf-8") as handle:
    handle.write("\n".join(lines) + "\n")

sys.exit(1 if problems else 0)
