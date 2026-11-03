"""Removes translation keys that no longer exist in the code.

Deleting the line rather than leaving it behind, because a key nobody reads is a key that quietly rots:
the next person translates it again, or edits it and wonders why nothing changed.

Refuses to remove a key that is still referenced anywhere in the source, so this cannot delete a
string that is still on screen.

    python tools/i18n-fix/remove-keys.py buddy-next-why buddy-next-go-exercises --write
"""
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[1]
TRANSLATIONS = REPO / "reactapp" / "src" / "assets" / "translations"
SOURCE_DIRS = [REPO / "reactapp" / "src"]


def referenced(key):
    """True when the key still appears in the source, quoted or inside a template."""
    pattern = re.compile(re.escape(key) + r"""["'`]""")
    for root in SOURCE_DIRS:
        for path in root.rglob("*"):
            if path.suffix not in {".ts", ".tsx"} or not path.is_file():
                continue
            if pattern.search(path.read_text(encoding="utf-8", errors="ignore")):
                return True
    return False


def main():
    write = "--write" in sys.argv
    keys = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not keys:
        print(__doc__)
        return 2

    still_used = [key for key in keys if referenced(key)]
    if still_used:
        print("REFUSING: still referenced in the source:")
        for key in still_used:
            print("  -", key)
        return 1

    for path in sorted(TRANSLATIONS.glob("*/student.json")):
        lines = path.read_text(encoding="utf-8").splitlines()
        kept = [line for line in lines if not any(line.lstrip().startswith(f'"{key}":') for key in keys)]
        removed = len(lines) - len(kept)

        # Removing the last key would leave a dangling comma on the line before the brace.
        if removed and kept:
            close_index = max(i for i, line in enumerate(kept) if line.strip() == "}")
            previous = close_index - 1
            while previous >= 0 and not kept[previous].strip():
                previous -= 1
            if kept[previous].rstrip().endswith(","):
                kept[previous] = kept[previous].rstrip()[:-1]

        text = "\n".join(kept) + "\n"
        parsed = json.loads(text)
        leftovers = [key for key in keys if key in parsed]
        if leftovers:
            print(f"FAILED: {path.name} still has {leftovers}")
            return 1

        if write:
            path.write_text(text, encoding="utf-8")
        print(f"{path.parent.name}: removed {removed} line(s)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
