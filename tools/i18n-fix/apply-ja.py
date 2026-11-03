"""Applies a Japanese rewrite patch to one locale file, preserving key order and formatting.

The patch files are written with an editor rather than piped through PowerShell, because a
here-string silently turns every non-ASCII character into "?" on its way to Python's stdin. That
mistake already cost 20 translated strings once; this script exists so it cannot happen again.

Every rewritten value is read back out of the parsed file and compared character for character, so a
patch that mangles the text fails loudly instead of landing in the app.

    python tools/i18n-fix/apply-ja.py elimination.json ja-patch-elimination.json
    python tools/i18n-fix/apply-ja.py --check elimination.json ja-patch-elimination.json
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
TRANSLATIONS = HERE.parents[1] / "reactapp" / "src" / "assets" / "translations" / "ja"


def replace_value(lines, key, value):
    needle = f'"{key}":'
    for index, line in enumerate(lines):
        if line.lstrip().startswith(needle):
            indent = line[: len(line) - len(line.lstrip())]
            trailing = "," if line.rstrip().endswith(",") else ""
            lines[index] = f"{indent}{needle} {json.dumps(value, ensure_ascii=False)}{trailing}"
            return True
    return False


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    check_only = "--check" in sys.argv

    if len(args) != 2:
        print(__doc__)
        return 2

    locale_name, patch_name = args
    patch = json.loads((HERE / patch_name).read_text(encoding="utf-8"))
    entries = {k: v for k, v in patch.items() if not k.startswith("_")}

    path = TRANSLATIONS / locale_name
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()

    failures = []
    for key, value in entries.items():
        if not replace_value(lines, key, value):
            failures.append(f"no line for key {key}")

    updated = "\n".join(lines) + ("\n" if text.endswith("\n") else "")
    try:
        parsed = json.loads(updated)
    except json.JSONDecodeError as error:
        print(f"FAILED: output is not valid JSON: {error}")
        return 1

    for key, value in entries.items():
        if parsed.get(key) != value:
            failures.append(f"{key} did not round-trip")

    # A rewrite must not silently drop or add keys.
    before = set(json.loads(text).keys())
    after = set(parsed.keys())
    if before != after:
        failures.append(f"key set changed: missing {before - after}, extra {after - before}")

    if failures:
        print("FAILURES:")
        for failure in failures:
            print("  -", failure)
        return 1

    if check_only:
        print(f"{locale_name}: {len(entries)} keys would be rewritten, all round-trip")
        return 0

    path.write_text(updated, encoding="utf-8")
    print(f"{locale_name}: {len(entries)} keys rewritten, all round-trip")
    return 0


if __name__ == "__main__":
    sys.exit(main())
