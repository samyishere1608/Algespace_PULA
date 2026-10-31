"""
Emits the C# for the new flexibility exercises and splices it into webapi/Data/examples.

content.py owns the mathematics and refuses to load a system that does not solve to its stated
solution, so anything written here has already been verified. Running this twice is a no-op.

    python content.py       # check the content
    python gen_csharp.py    # write it into the C# seed files
"""
import re
from fractions import Fraction
from pathlib import Path

import content

ROOT = Path(__file__).resolve().parents[2]
EXAMPLES = ROOT / "webapi" / "Data" / "examples"

# Variable names in the generated C#, unique within each seed file.
NAMES = {
    "Suitability": {14: "equalization6", 15: "elimination7", 16: "substitution4", 17: "elimination8"},
    "Efficiency": {11: "substitution6", 12: "elimination6", 13: "equalization1", 14: "elimination7",
                   15: "substitution7", 16: "elimination8", 17: "substitution8"},
    "Matching": {11: "equalization5", 12: "elimination4", 13: "substitution4", 14: "equalization6",
                 15: "elimination5", 16: "substitution5", 17: "equalization7"},
}

# Positions 36.. in the ordering index, interleaved so the three types keep taking turns.
ORDERING_INDEX = [
    ("Suitability", 14), ("Efficiency", 11), ("Matching", 11),
    ("Suitability", 15), ("Efficiency", 12), ("Matching", 12),
    ("Suitability", 16), ("Efficiency", 13), ("Matching", 13),
    ("Suitability", 17), ("Efficiency", 14), ("Matching", 14),
    ("Efficiency", 15), ("Matching", 15),
    ("Efficiency", 16), ("Matching", 16),
    ("Efficiency", 17), ("Matching", 17),
]

GROUPS = {"Suitability": content.SUITABILITY, "Efficiency": content.EFFICIENCY, "Matching": content.MATCHING}
FILES = {"Suitability": "SuitabilityExamples.cs", "Efficiency": "EfficiencyExamples.cs",
         "Matching": "MatchingExamples.cs"}


# ── value formatting ────────────────────────────────────────────────────────────

def coef(value):
    """"-10/4" / 3 / Fraction -> the matching `new Coefficient(...)` call, fractions reduced."""
    if isinstance(value, (str, Fraction)):
        fraction = Fraction(value)
        if fraction.denominator == 1:
            return f"new Coefficient({fraction.numerator})"
        return f'new Coefficient("{fraction.numerator}/{fraction.denominator}")'
    return f"new Coefficient({value})"


def term(value):
    parts = [f"Coefficient = {coef(value['coef'])}"]
    if value.get("var"):
        parts.append(f"Variable = Identifier.{value['var'].upper()}")
    if value.get("paren"):
        parts.append(f"Parenthesis = Parenthesis.{value['paren']}")
    if value.get("mul"):
        parts.append("IsMultiplication = true")
    return "new() { " + ", ".join(parts) + " }"


def terms(values, indent):
    """`indent` is the column of the line the list belongs to; items sit four spaces in."""
    if len(values) == 1:
        return f"[{term(values[0])}]"
    pad = " " * (indent + 4)
    return "[\n" + pad + (",\n" + pad).join(term(v) for v in values) + "\n" + " " * indent + "]"


def terms_prop(name, values, indent):
    """`LeftTerms = [...]`, with a multi-term list broken onto its own line like the seed files."""
    if len(values) == 1:
        return f"{name} = [{term(values[0])}]"
    return f"{name} =\n{' ' * indent}{terms(values, indent)}"


def equation(eq, indent):
    """A `new() { ... }` block whose first line is left for the caller to indent."""
    pad = " " * indent
    inner = " " * (indent + 4)
    left, right = eq
    return ("new()\n"
            + pad + "{\n"
            + inner + terms_prop("LeftTerms", left, indent + 4) + ",\n"
            + inner + terms_prop("RightTerms", right, indent + 4) + "\n"
            + pad + "}")


def equation_list(eqs, indent):
    pad = " " * (indent + 4)
    return "[\n" + pad + (",\n" + pad).join(equation(eq, indent + 4) for eq in eqs) + "\n" + " " * indent + "]"


def text(value):
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def system(eq1, eq2, indent, prop1="FirstEquation", prop2="SecondEquation"):
    pad = " " * indent
    inner = " " * (indent + 4)
    return (f"{pad}{prop1} = new LinearEquation\n"
            + pad + "{\n"
            + inner + terms_prop("LeftTerms", eq1[0], indent + 4) + ",\n"
            + inner + terms_prop("RightTerms", eq1[1], indent + 4) + "\n"
            + pad + "},\n"
            + f"{pad}{prop2} = new LinearEquation\n"
            + pad + "{\n"
            + inner + terms_prop("LeftTerms", eq2[0], indent + 4) + ",\n"
            + inner + terms_prop("RightTerms", eq2[1], indent + 4) + "\n"
            + pad + "}")


def messages(msgs, indent, pairs):
    """Agent messages, DE then EN."""
    pad = " " * indent
    lines = []
    for attrib, key in pairs:
        lines.append(f"{pad}AgentMessageFor{attrib}DE = {text(msgs[key])},")
        lines.append(f"{pad}AgentMessageFor{attrib}EN = {text(msgs[key + 'EN'])},")
    lines[-1] = lines[-1][:-1]
    return "\n".join(lines)


def options_block(options, indent):
    """`Options = new List<ExtendedOption> { ... }` whose first line sits at `indent`."""
    pad = " " * (indent + 4)
    inner = " " * (indent + 8)
    rendered = []
    for option in options:
        bits = [inner + f"TextDE = {text(option['de'])},",
                inner + f"TextEN = {text(option['en'])},"]
        if not option["solution"]:
            bits.append(inner + f"ReasonDE = {text(option['rde'])},")
            bits.append(inner + f"ReasonEN = {text(option['ren'])},")
        bits.append(inner + f"IsSolution = {'true' if option['solution'] else 'false'}")
        rendered.append(pad + "new()\n" + pad + "{\n" + "\n".join(bits) + "\n" + pad + "}")
    return ("Options = new List<ExtendedOption> {\n"
            + ",\n".join(rendered) + "\n"
            + " " * indent + "}")


def single_choice(options):
    return "true" if sum(1 for o in options if o["solution"]) == 1 else "false"


# ── exercise emitters ──────────────────────────────────────────────────────────

def suitability(exercise):
    pad = " " * 12
    name = NAMES["Suitability"][exercise["id"]]
    steps = []
    for step in exercise["comparison"]["steps"]:
        step_pad = " " * 24
        inner = " " * 28
        steps.append(step_pad + "new()\n" + step_pad + "{\n"
                     + inner + f"DescriptionDE = {text(step['de'])},\n"
                     + inner + f"DescriptionEN = {text(step['en'])},\n"
                     + inner + "Equations = " + equation_list(step["eqs"], 28) + "\n"
                     + step_pad + "}")
    agent = messages(exercise["msgs"], 16, [("FirstSolution", "firstSolution"),
                                            ("SecondSolution", "secondSolution"),
                                            ("Comparison", "comparison"),
                                            ("Resolving", "resolving")])
    steps_text = ",\n".join(steps)
    body = f"""{pad}ExtendedSuitabilityExercise {name} = new()
{pad}{{
{pad}    Id = {exercise['id']},
{pad}    Ordering = {exercise['ordering']},
{system(exercise['eq1'], exercise['eq2'], 16)},
{pad}    FirstEquationIsIsolatedIn = IsolatedIn.{exercise['iso1']},
{pad}    SecondEquationIsIsolatedIn = IsolatedIn.{exercise['iso2']},
{pad}    FirstVariable = new() {{ Name = Identifier.X, Value = {coef(exercise['x'])} }},
{pad}    SecondVariable = new() {{ Name = Identifier.Y, Value = {coef(exercise['y'])} }},
{pad}    SuitableMethods = [{', '.join('Method.' + m for m in exercise['suitable'])}],
{pad}    ComparisonMethods = [new() {{
{pad}        Method = Method.{exercise['comparison']['method']},
{pad}        Steps = [
{steps_text}
{pad}        ]
{pad}    }}],
{agent}
{pad}}};"""
    return name, body


def efficiency(exercise):
    pad = " " * 12
    name = NAMES["Efficiency"][exercise["id"]]
    tip = f"\n{pad}    UseWithTip = true," if exercise["tip"] else ""
    options = (" " * 24) + options_block(exercise["options"], 24)
    agent = messages(exercise["msgs"], 16, [("SelfExplanation", "selfExplanation"),
                                            ("FirstSolution", "firstSolution"),
                                            ("SecondSolution", "secondSolution")])
    body = f"""{pad}ExtendedEfficiencyExercise {name} = new()
{pad}{{
{pad}    Id = {exercise['id']},
{pad}    Ordering = {exercise['ordering']},
{pad}    TransformationRequired = {'true' if exercise['transformation'] else 'false'},{tip}
{system(exercise['eq1'], exercise['eq2'], 16)},
{pad}    FirstEquationIsIsolatedIn = IsolatedIn.{exercise['iso1']},
{pad}    SecondEquationIsIsolatedIn = IsolatedIn.{exercise['iso2']},
{pad}    FirstVariable = new() {{ Name = Identifier.X, Value = {coef(exercise['x'])} }},
{pad}    SecondVariable = new() {{ Name = Identifier.Y, Value = {coef(exercise['y'])} }},
{pad}    EfficientMethods = [{', '.join('Method.' + m for m in exercise['efficient'])}],
{pad}    SelfExplanationTasks = [
{pad}        new()
{pad}        {{
{pad}            Method = Method.{exercise['efficient'][0]},
{pad}            IsSingleChoice = {single_choice(exercise['options'])},
{options}
{pad}        }}
{pad}    ],
{agent}
{pad}}};"""
    return name, body


def matching(exercise):
    pad = " " * 12
    name = NAMES["Matching"][exercise["id"]]
    alternatives = []
    for alt in exercise["alts"]:
        alternatives.append(" " * 20 + "new()\n" + " " * 20 + "{\n"
                            + system((alt[0], alt[1]), (alt[2], alt[3]), 24)
                            + "\n" + " " * 20 + "}")
    alternatives_text = ",\n".join(alternatives)
    options = (" " * 20) + options_block(exercise["options"], 20)
    agent = messages(exercise["msgs"], 16, [("SelfExplanation", "selfExplanation"),
                                            ("FirstSolution", "firstSolution"),
                                            ("SecondSolution", "secondSolution")])
    body = f"""{pad}ExtendedMatchingExercise {name} = new()
{pad}{{
{pad}    Id = {exercise['id']},
{pad}    Ordering = {exercise['ordering']},
{system(exercise['eq1'], exercise['eq2'], 16)},
{pad}    FirstEquationIsIsolatedIn = IsolatedIn.{exercise['iso1']},
{pad}    SecondEquationIsIsolatedIn = IsolatedIn.{exercise['iso2']},
{pad}    FirstVariable = new() {{ Name = Identifier.X, Value = {coef(exercise['x'])} }},
{pad}    SecondVariable = new() {{ Name = Identifier.Y, Value = {coef(exercise['y'])} }},
{pad}    Method = Method.{exercise['method']},
{pad}    AlternativeSystems = [
{alternatives_text}
{pad}    ],
{pad}    SelfExplanationTask = new ExtendedSelfExplanation()
{pad}    {{
{pad}        Method = Method.{exercise['method']},
{pad}        IsSingleChoice = {single_choice(exercise['options'])},
{options}
{pad}    }},
{agent}
{pad}}};"""
    return name, body


EMITTERS = {"Suitability": suitability, "Efficiency": efficiency, "Matching": matching}


# ── splicing ───────────────────────────────────────────────────────────────────

def splice_examples(group):
    path = EXAMPLES / FILES[group]
    original = path.read_text(encoding="utf-8")
    new_text = original
    names = []
    for exercise in GROUPS[group]:
        name, body = EMITTERS[group](exercise)
        names.append(name)
        if f" {name} = new()" in original:
            continue
        anchor = new_text.find("\n            return [")
        if anchor == -1:
            raise SystemExit(f"{path.name}: could not find the return list")
        new_text = new_text[:anchor] + "\n" + body + "\n" + new_text[anchor:]

    found = re.search(r"return \[(.*?)\];", new_text, re.S)
    if found is None:
        raise SystemExit(f"{path.name}: could not find the return list")
    existing = [part.strip() for part in found.group(1).split(",") if part.strip()]
    missing = [name for name in names if name not in existing]
    if missing:
        combined = ", ".join(existing + missing)
        new_text = new_text[:found.start(1)] + combined + new_text[found.end(1):]

    if new_text != original:
        path.write_text(new_text, encoding="utf-8")
        return True
    return False


def splice_ordering():
    path = EXAMPLES / "FlexibilityExamples.cs"
    original = path.read_text(encoding="utf-8")
    existing = len(re.findall(r"ExerciseId = \d+", original))
    if existing >= 33 + len(ORDERING_INDEX):
        return False
    marker = ("                new()\n                {\n"
              "                    ExerciseType = FlexibilityExerciseType.Efficiency,\n"
              "                    ExerciseId = 10 // 35\n                }")
    if marker not in original:
        raise SystemExit("FlexibilityExamples.cs: could not find the last existing entry")
    entries = []
    for position, (group, exercise_id) in enumerate(ORDERING_INDEX, start=36):
        entries.append(f"                new()\n                {{\n"
                       f"                    ExerciseType = FlexibilityExerciseType.{group},\n"
                       f"                    ExerciseId = {exercise_id} // {position}\n                }}")
    path.write_text(original.replace(marker, marker + ",\n" + ",\n".join(entries)), encoding="utf-8")
    return True


if __name__ == "__main__":
    problems = content.check_all()
    if problems:
        raise SystemExit("content.py failed its checks:\n  " + "\n  ".join(problems))
    for group in ("Suitability", "Efficiency", "Matching"):
        print(f"{FILES[group]}: {'updated' if splice_examples(group) else 'already up to date'}")
    print(f"FlexibilityExamples.cs: {'updated' if splice_ordering() else 'already up to date'}")
