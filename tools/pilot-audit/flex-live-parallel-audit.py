"""Find flexibility-module text the ja API still serves in English.

Compares the ja and en payloads of every flexibility exercise field by field. A leaf string
that is identical in both languages and looks like prose is text that was never localised,
which is how the classmate comparison descriptions went unnoticed.
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

ENDPOINTS = (
    "getSuitabilityExercise",
    "getEfficiencyExercise",
    "getMatchingExercise",
    "getTipExercise",
    "getPlainExercise",
)

PROSE = re.compile(r"[A-Za-z]{2,}")


def get(url: str) -> dict | None:
    try:
        request = urllib.request.Request(url, headers={"X-API-Key": "algespace-api-2026"})
        with urllib.request.urlopen(request, timeout=40) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


def walk(node, path: str, out: list[tuple[str, str]]) -> None:
    if isinstance(node, dict):
        for key, value in node.items():
            walk(value, f"{path}.{key}" if path else key, out)
    elif isinstance(node, list):
        for index, value in enumerate(node):
            walk(value, f"{path}[]", out)
    elif isinstance(node, str):
        out.append((path, node))


def looks_like_prose(text: str) -> bool:
    letters = len(re.findall(r"[A-Za-z]", text))
    return letters >= 8 and " " in text.strip()


def main() -> int:
    base = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:7273"
    findings: dict[str, dict] = {}
    single_words: dict[str, int] = {}
    checked = 0

    for endpoint in ENDPOINTS:
        found = 0
        for exercise_id in range(1, 52):
            english = get(f"{base}/flexibility-training/en/{endpoint}/{exercise_id}")
            if english is None:
                continue
            japanese = get(f"{base}/flexibility-training/ja/{endpoint}/{exercise_id}")
            if japanese is None:
                continue
            checked += 1
            found += 1

            en_leaves: list[tuple[str, str]] = []
            ja_leaves: list[tuple[str, str]] = []
            walk(english, "", en_leaves)
            walk(japanese, "", ja_leaves)
            ja_map = dict(ja_leaves)

            for path, en_text in en_leaves:
                ja_text = ja_map.get(path)
                if ja_text is None or ja_text != en_text:
                    continue
                if looks_like_prose(en_text):
                    entry = findings.setdefault(path, {"count": 0, "sample": en_text, "endpoint": endpoint})
                    entry["count"] += 1
                elif PROSE.search(en_text) and len(en_text) > 3:
                    single_words[en_text] = single_words.get(en_text, 0) + 1
        print(f"  {endpoint}: {found} payloads", flush=True)

    lines = [f"base: {base}", f"exercise payloads compared: {checked}", ""]
    lines.append(f"untranslated prose fields: {len(findings)}")
    for path, info in sorted(findings.items()):
        lines.append(f"  [{info['endpoint']}] {path}  x{info['count']}")
        lines.append(f"      {info['sample']}")
    lines.append("")
    lines.append(f"single-word / non-prose leaves identical in en and ja: {len(single_words)}")
    for text, count in sorted(single_words.items(), key=lambda kv: -kv[1]):
        lines.append(f"  x{count}  {text}")

    out = Path(__file__).with_name("flex-live-parallel-audit.txt")
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {out} ({len(findings)} prose fields, {len(single_words)} word leaves)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
