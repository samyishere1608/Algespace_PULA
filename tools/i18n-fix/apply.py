"""
Rewrites the given translation keys in place, preserving each file's key order and formatting.

Written because the same fix was first applied through a PowerShell here-string, which silently
turns every non-ASCII character into "?" on its way to Python's stdin. The source strings live in
`level-and-goal-remove.json`, which was written as a file rather than piped, so the Japanese and the
German umlauts survive.

    python tools/i18n-fix/apply.py
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
TRANSLATIONS = HERE.parents[1] / "reactapp" / "src" / "assets" / "translations"


def replace_value(lines, key, value):
    """Rewrites the line that defines `key`, keeping the file's own indentation and quoting."""
    needle = f'"{key}":'
    for index, line in enumerate(lines):
        if needle in line and line.lstrip().startswith(needle):
            indent = line[: len(line) - len(line.lstrip())]
            trailing = "," if line.rstrip().endswith(",") else ""
            lines[index] = f"{indent}{needle} {json.dumps(value, ensure_ascii=False)}{trailing}"
            return True
    return False


def main():
    fixes = json.loads((HERE / "level-and-goal-remove.json").read_text(encoding="utf-8"))
    failures = []

    for language, entries in fixes.items():
        path = TRANSLATIONS / language / "student.json"
        text = path.read_text(encoding="utf-8")
        lines = text.splitlines()

        for key, value in entries.items():
            if not replace_value(lines, key, value):
                failures.append(f"{language}: no line for {key}")

        updated = "\n".join(lines) + ("\n" if text.endswith("\n") else "")
        parsed = json.loads(updated)

        # Every value must come back character for character, or the rewrite has damaged something.
        for key, value in entries.items():
            if parsed.get(key) != value:
                failures.append(f"{language}: {key} did not round-trip")

        path.write_text(updated, encoding="utf-8")
        print(f"{language}: {len(entries)} keys rewritten")

    if failures:
        print("\nFAILURES:")
        for failure in failures:
            print("  -", failure)
        return 1
    print("\nall values round-trip exactly")
    return 0


if __name__ == "__main__":
    sys.exit(main())
