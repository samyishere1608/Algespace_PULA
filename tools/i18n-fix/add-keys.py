"""Adds new translation keys to a locale file, without reformatting the rest of it.

Rewriting the whole file through json.dump would reindent and reorder 700 keys and bury the change in
a diff nobody can read. This inserts the new key lines just before the closing brace instead, which
leaves every existing line byte-identical.

Refuses to overwrite an existing key: a silent overwrite is how a translated string gets replaced by
an English one.

    python tools/i18n-fix/add-keys.py              # dry run
    python tools/i18n-fix/add-keys.py --write
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
TRANSLATIONS = HERE.parents[1] / "reactapp" / "src" / "assets" / "translations"
SOURCE = HERE / "next-step-keys.json"


def main():
    write = "--write" in sys.argv
    allow_update = "--update" in sys.argv
    positional = [a for a in sys.argv[1:] if not a.startswith("--")]
    source = HERE / (positional[0] if positional else "next-step-keys.json")
    additions = json.loads(source.read_text(encoding="utf-8"))
    additions = {k: v for k, v in additions.items() if not k.startswith("_")}

    failures = []
    for language, entries in additions.items():
        path = TRANSLATIONS / language / "student.json"
        lines = path.read_text(encoding="utf-8").splitlines()
        existing = json.loads("\n".join(lines))

        # Updating an existing key is opt-in. The default is to refuse, because a silent overwrite is
        # how a carefully translated string gets replaced by an English one.
        to_add = {}
        to_update = {}
        for key, value in entries.items():
            if key in existing:
                if allow_update:
                    to_update[key] = value
                else:
                    failures.append(f"{language}: {key} already exists (use --update to replace it)")
            else:
                to_add[key] = value

        for key, value in to_update.items():
            needle = f'"{key}":'
            for index, line in enumerate(lines):
                if line.lstrip().startswith(needle):
                    indent = line[: len(line) - len(line.lstrip())]
                    trailing = "," if line.rstrip().endswith(",") else ""
                    lines[index] = f"{indent}{needle} {json.dumps(value, ensure_ascii=False)}{trailing}"
                    break

        if to_add:
            # The closing brace is the last line that is exactly "}".
            close_index = max(i for i, line in enumerate(lines) if line.strip() == "}")
            previous = close_index - 1
            while previous >= 0 and not lines[previous].strip():
                previous -= 1

            if not lines[previous].rstrip().endswith(","):
                lines[previous] = lines[previous].rstrip() + ","

            new_lines = [
                f"  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)},"
                for k, v in to_add.items()
            ]
            # The last inserted line must not keep its trailing comma, or the object will not close.
            new_lines[-1] = new_lines[-1][:-1]
            lines = lines[:close_index] + new_lines + lines[close_index:]

        text = "\n".join(lines) + "\n"
        parsed = json.loads(text)
        for key, value in entries.items():
            if parsed.get(key) != value:
                failures.append(f"{language}: {key} did not round-trip")

        if not write:
            print(f"{language}: would add {len(to_add)}, update {len(to_update)}")
            continue

        path.write_text(text, encoding="utf-8")
        print(f"{language}: added {len(to_add)}, updated {len(to_update)}")

    if failures:
        print("\nFAILURES:")
        for failure in failures:
            print("  -", failure)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
