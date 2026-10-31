"""
Merges japanese.py into ExerciseContentJapanese.cs, one section at a time.

Refuses to run if a string the new exercises need has no translation, so a Japanese student can
never be served English for one of the new 18. Idempotent: entries already in the file are skipped.
"""
import re
from pathlib import Path

import content
import japanese

TARGET = Path(__file__).resolve().parents[2] / "webapi" / "Models" / "Flexibility" / "ExerciseContentJapanese.cs"
SECTION_ANCHOR = "// ── Agent messages: what this task teaches (Tip exercises)"


def needed_strings():
    """Every English string the new exercises send to the client."""
    needed = {}

    def add(value, kind):
        if value:
            needed.setdefault(value, kind)

    for exercise in content.EFFICIENCY + content.MATCHING:
        for key in ("selfExplanationEN", "firstSolutionEN", "secondSolutionEN"):
            add(exercise["msgs"][key], "agent")
        for option in exercise["options"]:
            add(option["en"], "option")
            if not option["solution"]:
                add(option["ren"], "reason")
    for exercise in content.SUITABILITY:
        for key in ("firstSolutionEN", "secondSolutionEN", "comparisonEN", "resolvingEN"):
            add(exercise["msgs"][key], "agent")
        for step in exercise["comparison"]["steps"]:
            add(step["en"], "step")
    return needed


def entry(english, translated):
    return f'            {{ {chr(34)}{english}{chr(34)}, {chr(34)}{translated}{chr(34)} }},'


def insert_group(lines, header, mapping, existing):
    pending = [(english, translated) for english, translated in mapping.items() if english not in existing]
    if not pending:
        return lines, 0

    start = None
    for index, line in enumerate(lines):
        if line.strip().startswith(header):
            start = index
            break
    if start is None:
        index = next(i for i, line in enumerate(lines)
                     if line.strip().startswith(SECTION_ANCHOR))
        lines[index:index] = ["", f"            {header}"]
        start = index + 1

    end = start + 1
    while end < len(lines) and not lines[end].strip().startswith("//") and lines[end].strip() != "};":
        end += 1
    lines[end:end] = [entry(english, translated) for english, translated in pending]
    return lines, len(pending)


def tidy_sections(lines):
    """One blank line before each section comment and none before the closing brace."""
    start = next(i for i, line in enumerate(lines) if "Dictionary<string, string> Translations" in line) + 1
    end = next(i for i, line in enumerate(lines) if line.strip() == "};")

    collapsed = []
    for line in lines[start:end]:
        if not line.strip() and collapsed and not collapsed[-1].strip():
            continue
        collapsed.append(line)
    while collapsed and not collapsed[0].strip():
        collapsed.pop(0)

    out = []
    for line in collapsed:
        if line.strip().startswith("// ") and out and out[-1].strip():
            out.append("")
        out.append(line)
    while out and not out[-1].strip():
        out.pop()
    lines[start:end] = out
    return lines


if __name__ == "__main__":
    original = TARGET.read_text(encoding="utf-8")
    existing = set(re.findall(r'\{ "(.*?)", "', original))

    translated = {}
    for _, mapping in japanese.GROUPS:
        translated.update(mapping)
    missing = [value for value in needed_strings() if value not in translated and value not in existing]
    if missing:
        raise SystemExit("no Japanese for:\n  " + "\n  ".join(missing))

    lines = original.splitlines()
    written = 0
    for header, mapping in japanese.GROUPS:
        lines, count = insert_group(lines, header, mapping, existing)
        written += count

    updated = "\n".join(tidy_sections(lines)) + "\n"
    if updated != original:
        TARGET.write_text(updated, encoding="utf-8")
    print(f"entries written: {written}")
    unused = [key for _, mapping in japanese.GROUPS for key in mapping if key not in needed_strings()]
    if unused:
        print(f"translations not used by the new exercises: {len(unused)}")
        for key in unused:
            print("  -", key)
