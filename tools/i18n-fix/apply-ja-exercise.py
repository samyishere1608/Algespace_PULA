"""Applies a Japanese rewrite to ExerciseContentJapanese.cs, keyed by the English source string.

Only the second string of each `{ "english", "japanese" }` pair is replaced. The English key is the
dictionary key, so it must stay byte-identical or every lookup silently falls back to English.

Every patched line is re-read after writing and compared to what was asked for, so a patch that
mangles the Japanese fails instead of landing in the app. Keys that do not match any line are
reported by name rather than ignored.

    python tools/i18n-fix/apply-ja-exercise.py --check
    python tools/i18n-fix/apply-ja-exercise.py
"""
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
TARGET = HERE.parents[1] / "webapi" / "Models" / "Flexibility" / "ExerciseContentJapanese.cs"
PATCH = HERE / "ja-patch-exercise-content.json"

# { "english", "japanese" },  -- both sides may contain escaped quotes but never a raw newline.
PAIR = re.compile(r'^(\s*\{ ")(?P<en>(?:[^"\\]|\\.)*)(",\s*")(?P<ja>(?:[^"\\]|\\.)*)("\s*\},?\s*)$')


def main():
    check_only = "--check" in sys.argv
    patch = json.loads(PATCH.read_text(encoding="utf-8"))
    patch = {k: v for k, v in patch.items() if not k.startswith("_")}

    lines = TARGET.read_text(encoding="utf-8").splitlines()
    applied = set()
    failures = []

    for index, line in enumerate(lines):
        match = PAIR.match(line)
        if not match:
            continue
        english = match.group("en").replace('\\"', '"')
        if english not in patch:
            continue
        lines[index] = (
            match.group(1)
            + match.group("en")
            + match.group(3)
            + json.dumps(patch[english], ensure_ascii=False)[1:-1]
            + match.group(5)
        )
        applied.add(english)

    missing = [k for k in patch if k not in applied]
    for key in missing:
        failures.append(f"No line matched key: {key[:90]}")

    # Re-parse the file and confirm every value we touched is exactly what we asked for.
    reparsed = {}
    for line in lines:
        match = PAIR.match(line)
        if match:
            reparsed[match.group("en").replace('\\"', '"')] = match.group("ja").replace('\\"', '"')

    for key in applied:
        if reparsed.get(key) != patch[key]:
            failures.append(f"Did not round-trip: {key[:70]}")

    if failures:
        print("FAILURES:")
        for failure in failures:
            print("  -", failure)
        return 1

    if check_only:
        print(f"{len(applied)} keys would be rewritten, all round-trip")
        return 0

    TARGET.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{len(applied)} keys rewritten, all round-trip")
    return 0


if __name__ == "__main__":
    sys.exit(main())
