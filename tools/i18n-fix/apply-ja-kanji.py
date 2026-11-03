"""Applies whole-word kanji substitutions to every ja locale file.

Only for swaps where the hiragana form reads at least as naturally as the kanji. Anything that needs
judgement is deliberately NOT in the map: the point is to remove mechanical violations, not to
hiragana-ise the language. The words that are left are what `kanji-check.py --words` reports for the
professor to rule on.

Longest key first, so 「掛け算」 is replaced before 「掛け」 would touch it.

    python tools/i18n-fix/apply-ja-kanji.py --check
    python tools/i18n-fix/apply-ja-kanji.py
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
JA = HERE.parents[1] / "reactapp" / "src" / "assets" / "translations" / "ja"
MAP_FILE = HERE / "ja-kanji-words.json"

# Exempt for the same reason the register check exempts them: the About page addresses teachers and
# researchers, the study page is consent text, and error messages describe a system fault rather than
# the tutor speaking. None of them should be rewritten without their own review.
EXEMPT_FILES = {"about.json", "study.json", "error.json"}

# The C# files whose Japanese is student-facing prose. Option texts and reasons are included on
# purpose: replacing 掛け算 with かけ算 is orthography, not a change to the mathematics, so the
# readability rule applies to them even though their wording is left alone.
CS_FILES = [
    HERE.parents[1] / "webapi" / "Models" / "Flexibility" / "ExerciseContentJapanese.cs",
    HERE.parents[1] / "webapi" / "Services" / "GoalSuggestionText.cs",
    HERE.parents[1] / "webapi" / "Services" / "ReflectionText.cs",
    HERE.parents[1] / "webapi" / "Services" / "AnswerLeakGuard.cs",
]


def main():
    check_only = "--check" in sys.argv
    table = json.loads(MAP_FILE.read_text(encoding="utf-8"))
    table = {k: v for k, v in table.items() if not k.startswith("_")}
    keys = sorted(table, key=len, reverse=True)

    total = 0
    per_file = []
    targets = [p for p in sorted(JA.glob("*.json")) if p.name not in EXEMPT_FILES] + CS_FILES
    for path in targets:
        text = path.read_text(encoding="utf-8")
        before = text
        hits = 0
        for key in keys:
            hits += text.count(key)
            text = text.replace(key, table[key])

        if text != before:
            # A substitution must never break the file.
            if path.suffix == ".json":
                json.loads(text)
            per_file.append(f"{path.name}: {hits}")
            total += hits
            if not check_only:
                path.write_text(text, encoding="utf-8")

    verb = "would replace" if check_only else "replaced"
    print(f"{verb} {total} word occurrences")
    for line in per_file:
        print("  ", line)
    return 0


if __name__ == "__main__":
    sys.exit(main())
