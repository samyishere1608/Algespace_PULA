"""Checks student-facing Japanese against the professor's style guide.

Two independent checks, because they fail differently:

  --kanji   Every kanji a student reads must be one taught by the end of grade 6. Anything above that
            is written in hiragana, unless the word is on the maths-term exception list. This catches
            text that is correct Japanese but unreadable to a 12-year-old.

  --register  Flags です・ます (and あなた) in areas that are meant to be Pippin's own voice. The app
            had drift where a reflection said 「できたね」 and the hint button beside it said
            「してみてください」, so the check reports the surface rather than trusting the author.

Neither check can decide whether a sentence sounds natural - that still needs the professor. They
only find the mechanical faults, so attention can go on the sentences that actually read badly.

Usage:
    python tools/i18n-fix/kanji-check.py             # report for everything student-facing
    python tools/i18n-fix/kanji-check.py --words     # distinct offending words, for sending to review
    python tools/i18n-fix/kanji-check.py --register  # です・ます report only
    python tools/i18n-fix/kanji-check.py --summary   # counts only
"""

import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
JA_DIR = os.path.join(REPO, "reactapp", "src", "assets", "translations", "ja")

# The C# files that hold Japanese a student actually reads.
CS_FILES = [
    os.path.join(REPO, "webapi", "Models", "Flexibility", "ExerciseContentJapanese.cs"),
    os.path.join(REPO, "webapi", "Services", "GoalSuggestionText.cs"),
    os.path.join(REPO, "webapi", "Services", "ReflectionText.cs"),
    os.path.join(REPO, "webapi", "Services", "AnswerLeakGuard.cs"),
]

# Files that are deliberately NOT in the student's casual voice and are therefore exempt from the
# register check. The About page addresses teachers and researchers, the study page is consent text
# that must stay formal for ethical reasons, and error messages describe a system fault rather than
# the tutor speaking.
REGISTER_EXEMPT_FILES = {"about.json", "study.json", "error.json"}

KANJI = re.compile(r"[\u4e00-\u9fff]")
KANA = re.compile(r"[\u3041-\u309f\u30a0-\u30ff]")
POLITE = re.compile(r"ください|ましょう|でしょう|です|ます|ません|ました|でした")
ANATA = re.compile(r"あなた")

# Maths terms the app exists to teach. These are the words a student is supposed to learn, so
# writing them in hiragana would defeat the purpose of the exercise. Every entry is a word plus the
# non-kyoiku kanji it needs; the checker allows the kanji only inside that word.
MATHS_EXCEPTIONS = {
    "こう": ["項"],          # 項 (term) - not in the grade 1-6 list
    "けいすう": ["係数"],     # 係数 (coefficient)
    "きごう": ["記号"],       # 記号 (sign/symbol)
    "へんすう": ["変数"],     # 変数 (variable) - 変 is grade 4, 数 grade 2; kept for clarity
    "むすびつき": ["結びつき"],
    "はいれつ": ["配列"],
    "とうごう": ["統合"],
    "きのう": ["機能"],
    "そうさ": ["操作"],
    "かいとう": ["回答", "解答"],
    "してい": ["指定"],
    "たいしょう": ["対象"],
    "たいおう": ["対応"],
    "ひょうか": ["評価"],
    "ようそ": ["要素"],
    "いんすう": ["因数"],
    "ぶんすう": ["分数"],
    "しょうすう": ["小数"],
    "ふごう": ["符号"],
    "けいさん": ["計算"],
    "へんけい": ["変形"],
    "どうち": ["同値"],
    "ひかり": ["光"],
}


def load_kyoiku():
    path = os.path.join(HERE, "kyoiku-kanji.json")
    with open(path, encoding="utf-8") as f:
        return set(json.load(f)["all"])


def iter_ja_strings():
    """Every (file, key, value) pair a Japanese student can read."""
    for name in sorted(os.listdir(JA_DIR)):
        if not name.endswith(".json"):
            continue
        with open(os.path.join(JA_DIR, name), encoding="utf-8") as f:
            data = json.load(f)
        for key, value in data.items():
            if isinstance(value, str):
                yield name, key, value


def iter_cs_strings():
    """Japanese inside C# string literals, one entry per literal."""
    for path in CS_FILES:
        if not os.path.exists(path):
            continue
        name = os.path.basename(path)
        with open(path, encoding="utf-8") as f:
            for lineno, line in enumerate(f, 1):
                for literal in re.findall(r'"((?:[^"\\]|\\.)*)"', line):
                    if KANA.search(literal) or KANJI.search(literal):
                        yield name, f"line {lineno}", literal


def strip_markup(value):
    """Removes template placeholders and markup so only real Japanese is examined."""
    value = re.sub(r"\{\{[^}]*\}\}", "", value)
    value = re.sub(r"\$t\([^)]*\)", "", value)
    value = re.sub(r"<[^>]+>", "", value)
    return value


def allowed_by_exception(text, kanji, kyoiku):
    """True when every occurrence of `kanji` in `text` is inside an allowed maths term."""
    for term in MATHS_EXCEPTIONS.values():
        for word in term:
            if kanji in word and word in text:
                return True
    return False


def kanji_report(kyoiku, words_mode=False):
    offenders = []
    word_index = {}

    for source, name, value in list(iter_ja_strings()) + list(iter_cs_strings()):
        text = strip_markup(value)
        bad = [ch for ch in text if KANJI.match(ch) and ch not in kyoiku]
        if not bad:
            continue
        remaining = []
        for ch in set(bad):
            if not allowed_by_exception(text, ch, kyoiku):
                remaining.append(ch)
        if not remaining:
            continue

        # Collect the whole kanji run each offending character sits in, so the report reads as
        # words rather than single characters.
        for match in re.finditer(r"[\u4e00-\u9fff]+", text):
            run = match.group()
            if any(ch in remaining for ch in run):
                word_index[run] = word_index.get(run, 0) + 1

        offenders.append((source, name, "".join(sorted(remaining)), text))

    lines = []
    if words_mode:
        lines.append(f"{len(word_index)} distinct words containing a kanji above grade 6")
        lines.append("")
        for word, count in sorted(word_index.items(), key=lambda kv: (-kv[1], kv[0])):
            lines.append(f"{count}\t{word}")
    else:
        lines.append(f"{len(offenders)} strings contain a kanji above grade 6")
        lines.append("")
        for source, name, bad, text in offenders:
            lines.append(f"{source}\t{name}\t{bad}\t{text[:160]}")
    return lines, len(offenders), len(word_index)


def register_report():
    """です・ます and あなた in areas that should be Pippin's casual voice."""
    polite_lines = []
    anata_lines = []
    totals = {}

    for name, key, value in iter_ja_strings():
        if name in REGISTER_EXEMPT_FILES:
            continue
        text = strip_markup(value)
        totals[name] = totals.get(name, {"total": 0, "polite": 0, "anata": 0})
        totals[name]["total"] += 1
        if POLITE.search(text):
            totals[name]["polite"] += 1
            polite_lines.append(f"{name}\t{key}\t{text[:140]}")
        if ANATA.search(text):
            totals[name]["anata"] += 1
            anata_lines.append(f"{name}\t{key}\t{text[:140]}")

    lines = []
    total_polite = sum(t["polite"] for t in totals.values())
    total_all = sum(t["total"] for t in totals.values())
    lines.append(f"です・ます in student-facing strings: {total_polite}/{total_all}")
    lines.append("")
    lines.append("BY FILE\tstrings\tです・ます\tあなた")
    for name, t in sorted(totals.items(), key=lambda kv: -kv[1]["polite"]):
        lines.append(f"{name}\t{t['total']}\t{t['polite']}\t{t['anata']}")
    lines.append("")
    lines.append(f"=== です・ます ({len(polite_lines)}) ===")
    lines.extend(polite_lines)
    lines.append("")
    lines.append(f"=== あなた ({len(anata_lines)}) ===")
    lines.extend(anata_lines)
    return lines, total_polite, total_all


def main():
    args = set(sys.argv[1:])
    kyoiku = load_kyoiku()

    # The Windows console is cp1252, so Japanese written to stdout either raises or arrives as
    # mojibake. Everything human-readable goes to a report file; stdout carries ASCII counts only.
    report_path = os.path.join(HERE, "kanji-report.txt")

    if "--register" in args:
        lines, polite, total = register_report()
        write(report_path, lines)
        print("register report written (ASCII-only stdout)")
        print(f"polite: {polite}/{total}")
        print(f"report: {report_path}")
        return 0

    if "--words" in args:
        lines, _, _ = kanji_report(kyoiku, words_mode=True)
        write(report_path, lines)
        print("word report written")
        print(f"report: {report_path}")
        return 0

    kanji_lines, offender_count, word_count = kanji_report(kyoiku)
    register_lines, polite, total = register_report()

    if "--summary" in args:
        print(f"strings with a kanji above grade 6: {offender_count}")
        print(f"distinct offending words: {word_count}")
        print(f"polite (desu/masu) student-facing strings: {polite}/{total}")
        return 0

    write(report_path, kanji_lines + [""] + register_lines)
    print(f"strings with a kanji above grade 6: {offender_count}")
    print(f"distinct offending words: {word_count}")
    print(f"polite (desu/masu) student-facing strings: {polite}/{total}")
    print(f"report: {report_path}")
    return 0


def write(path, lines):
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


if __name__ == "__main__":
    sys.exit(main())
