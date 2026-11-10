"""Report which classmate step descriptions have no Japanese translation.

The comparison anchor renders `ComparisonMethod.Steps[i].Description`, which the server
builds via ExerciseContentJapanese.Pick(language, DescriptionDE, DescriptionEN). For ja
that means looking the English string up in ExerciseContentJapanese.Translations; a miss
silently returns English.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXAMPLES = ROOT / "webapi" / "Data" / "examples"
CONTENT = ROOT / "webapi" / "Models" / "Flexibility" / "ExerciseContentJapanese.cs"


def cs_strings(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    return re.findall(r'DescriptionEN\s*=\s*"((?:[^"\\]|\\.)*)"', text)


def translation_keys() -> set[str]:
    text = CONTENT.read_text(encoding="utf-8")
    return {m.replace('\\"', '"') for m in re.findall(r'\{\s*"((?:[^"\\]|\\.)*)"\s*,', text)}


def main() -> int:
    keys = translation_keys()
    rows: list[tuple[str, str, bool]] = []
    for path in sorted(EXAMPLES.glob("*.cs")):
        for text in cs_strings(path):
            rows.append((path.name, text, text in keys))

    missing = [r for r in rows if not r[2]]
    out = [
        f"classmate step descriptions found: {len(rows)}",
        f"translated for ja:                  {len(rows) - len(missing)}",
        f"missing (renders English in ja):    {len(missing)}",
        "",
    ]
    for name, text, ok in rows:
        out.append(("OK   " if ok else "MISS ") + f"[{name}] {text}")

    target = ROOT / "tools" / "pilot-audit" / "classmate-description-audit.txt"
    target.write_text("\n".join(out), encoding="utf-8")
    print(f"wrote {target} ({len(missing)} missing of {len(rows)})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
