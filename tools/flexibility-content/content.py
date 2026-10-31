"""
Design + validation of the 18 new flexibility exercises (51 total, 17 per type).

Nothing here writes C#. It defines each exercise, solves it exactly with Fraction
arithmetic, and reports any stated solution or worked comparison step that is wrong.
gen_csharp.py reads this module, so a mistake cannot reach the generated code.
"""
from fractions import Fraction


# ── exact solving ────────────────────────────────────────────────────────────────

def v_coef(term):
    return Fraction(str(term["coef"]))


def _value_at(term, x, y):
    coef = v_coef(term)
    v = term.get("var")
    if v == "x":
        return coef * x
    if v == "y":
        return coef * y
    return coef


def total_at(terms, x, y):
    """
    The value of a term list at (x, y), honouring the distributive parenthesis pairs.

    `Coefficient LeftSmall` opens a group whose contents are multiplied by that coefficient, and the
    term carrying `RightSmall` is the last piece of content inside it. A term marked `mul` multiplies
    the previous addend instead of being added to it. Both are display constructions, so the only way
    to check an equation is to evaluate it the way it will be read.
    """
    total, idx = _group_at(terms, 0, x, y)
    return total


def _group_at(terms, idx, x, y):
    total = Fraction(0)
    last = Fraction(0)
    while idx < len(terms):
        term = terms[idx]
        coef = v_coef(term)
        paren = term.get("paren")

        if paren == "LeftSmall":
            inner, idx = _group_at(terms, idx + 1, x, y)
            last = coef * inner
            total += last
            continue

        value = _value_at(term, x, y)
        if term.get("mul"):
            total -= last
            last = last * value
            total += last
        else:
            last = value
            total += last

        idx += 1
        if paren == "RightSmall":
            return total, idx
    return total, idx


def std(left, right):
    """A pair of term lists -> (a, b, c) for the linear system ax + by = c."""
    def collect(terms):
        a = b = c = Fraction(0)
        for t in terms:
            if t.get("paren") or t.get("mul"):
                raise ValueError("a system equation must not use parentheses or multiplication")
            coef = v_coef(t)
            v = t.get("var")
            if v == "x":
                a += coef
            elif v == "y":
                b += coef
            else:
                c -= coef
        return a, b, c
    la, lb, lc = collect(left)
    ra, rb, rc = collect(right)
    return la - ra, lb - rb, lc - rc


def solve(eq1, eq2):
    (a1, b1, c1), (a2, b2, c2) = std(*eq1), std(*eq2)
    det = a1 * b2 - a2 * b1
    if det == 0:
        return None
    return (Fraction(c1 * b2 - c2 * b1, det), Fraction(a1 * c2 - a2 * c1, det))


# ── the new exercises ───────────────────────────────────────────────────────────
SUITABILITY, EFFICIENCY, MATCHING = [], [], []


def suit(id_, ordering, eq1, eq2, iso1, iso2, x, y, suitable, comparison, msgs):
    SUITABILITY.append(dict(id=id_, ordering=ordering, eq1=eq1, eq2=eq2, iso1=iso1, iso2=iso2,
                            x=Fraction(x), y=Fraction(y), suitable=suitable,
                            comparison=comparison, msgs=msgs))


def eff(id_, ordering, eq1, eq2, iso1, iso2, x, y, transformation, efficient, options, msgs, tip=False):
    EFFICIENCY.append(dict(id=id_, ordering=ordering, eq1=eq1, eq2=eq2, iso1=iso1, iso2=iso2,
                           x=Fraction(x), y=Fraction(y), transformation=transformation,
                           efficient=efficient, options=options, msgs=msgs, tip=tip))


def match(id_, ordering, eq1, eq2, iso1, iso2, x, y, method, alts, options, msgs):
    MATCHING.append(dict(id=id_, ordering=ordering, eq1=eq1, eq2=eq2, iso1=iso1, iso2=iso2,
                         x=Fraction(x), y=Fraction(y), method=method, alts=alts,
                         options=options, msgs=msgs))


# ══ Suitability 14-17 ═══════════════════════════════════════════════════════════

# 14: both solved for y.  1y = 3x - 1 ; 1y = -2x + 9  ->  x = 2, y = 5
suit(14, 14,
     (([{"coef": 1, "var": "y"}]), ([{"coef": 3, "var": "x"}, {"coef": -1}])),
     (([{"coef": 1, "var": "y"}]), ([{"coef": -2, "var": "x"}, {"coef": 9}])),
     "Second", "Second", 2, 5,
     ["Equalization", "Substitution"],
     dict(method="Elimination", steps=[
         dict(de="Dein*e Mitschüler*in hat die erste Gleichung von der zweiten abgezogen, um y zu entfernen.",
              en="Your classmate subtracted the first equation from the second to remove y.",
              eqs=[
                  (([{"coef": 0}]), ([{"coef": -2, "var": "x"}, {"coef": 9},
                                      {"coef": -1, "paren": "LeftSmall"}, {"coef": 3, "var": "x"}, {"coef": -1, "paren": "RightSmall"}])),
                  (([{"coef": 0}]), ([{"coef": -2, "var": "x"}, {"coef": 9}, {"coef": -3, "var": "x"}, {"coef": 1}])),
                  (([{"coef": 0}]), ([{"coef": -5, "var": "x"}, {"coef": 10}])),
              ]),
         dict(de="Danach hat er* sie durch -5 geteilt und so x berechnet.",
              en="Then they divided by -5 and so calculated x.",
              eqs=[
                  (([{"coef": -5, "var": "x"}]), ([{"coef": -10}])),
                  (([{"coef": 1, "var": "x"}]), ([{"coef": 2}])),
              ]),
         dict(de="Um y zu berechnen, hat er* sie die Lösung für x in die erste Gleichung eingesetzt.",
              en="To calculate y, they substituted the solution for x into the first equation.",
              eqs=[
                  (([{"coef": 1, "var": "y"}]), ([{"coef": 3, "var": "x"}, {"coef": -1}])),
                  (([{"coef": 1, "var": "y"}]), ([{"coef": 3}, {"coef": 2, "mul": True}, {"coef": -1}])),
                  (([{"coef": 1, "var": "y"}]), ([{"coef": 5}])),
              ]),
     ]),
     dict(firstSolution="Wenn du Gleichungen nach einer Variablen auflöst, siehst du sofort, welche Methode sich anbietet.",
          firstSolutionEN="Solving equations for a variable shows you straight away which method suggests itself.",
          secondSolution="Wer beide Gleichungen geschickt umstellt, spart Rechenzeit. Regelmäßiges Üben macht dich darin sicher.",
          secondSolutionEN="Rearranging both equations cleverly saves time. Regular practice makes you confident at it.",
          comparison="Zwei Gleichungen nach derselben Variablen aufzulösen ist genau die Vorbereitung, die das Gleichsetzungsverfahren braucht.",
          comparisonEN="Solving two equations for the same variable is exactly the preparation the equalization method needs.",
          resolving="Verschiedene Methoden auszuprobieren zeigt dir, dass es oft mehrere Wege gibt, ein Problem zu lösen.",
          resolvingEN="Trying out different methods shows you that there are often several ways to solve a problem."))

# 15: elimination direct, opposite signs.  4x + 5y = 17 ; 4x - 5y = 7  ->  x = 3, y = 1
suit(15, 15,
     (([{"coef": 4, "var": "x"}, {"coef": 5, "var": "y"}]), ([{"coef": 17}])),
     (([{"coef": 4, "var": "x"}, {"coef": -5, "var": "y"}]), ([{"coef": 7}])),
     "None", "None", 3, 1,
     ["Elimination"],
     dict(method="Equalization", steps=[
         dict(de="Dein*e Mitschüler*in hat beide Gleichungen nach x aufgelöst, um sie gleichsetzen zu können.",
              en="Your classmate solved both equations for x so that they could be equated.",
              eqs=[
                  (([{"coef": 4, "var": "x"}]), ([{"coef": 17}, {"coef": -5, "var": "y"}])),
                  (([{"coef": 4, "var": "x"}]), ([{"coef": 7}, {"coef": 5, "var": "y"}])),
                  (([{"coef": 1, "var": "x"}]), ([{"coef": "17/4"}, {"coef": "-5/4", "var": "y"}])),
                  (([{"coef": 1, "var": "x"}]), ([{"coef": "7/4"}, {"coef": "5/4", "var": "y"}])),
              ]),
         dict(de="Durch Gleichsetzen der beiden Ausdrücke bleibt eine Gleichung mit nur noch y.",
              en="Equating the two expressions leaves an equation containing only y.",
              eqs=[
                  (([{"coef": "17/4"}, {"coef": "-5/4", "var": "y"}]), ([{"coef": "7/4"}, {"coef": "5/4", "var": "y"}])),
                  (([{"coef": "-10/4", "var": "y"}]), ([{"coef": "-10/4"}])),
                  (([{"coef": 1, "var": "y"}]), ([{"coef": 1}])),
              ]),
         dict(de="Zum Schluss hat er* sie y in eine der umgestellten Gleichungen eingesetzt.",
              en="Finally they substituted y into one of the rearranged equations.",
              eqs=[
                  (([{"coef": 1, "var": "x"}]), ([{"coef": "17/4"}, {"coef": "-5/4", "var": "y"}])),
                  (([{"coef": 1, "var": "x"}]), ([{"coef": "17/4"}, {"coef": "-5/4"}])),
                  (([{"coef": 1, "var": "x"}]), ([{"coef": 3}])),
              ]),
     ]),
     dict(firstSolution="Addierst du die Gleichungen geschickt, fällt eine Variable weg und du rechnest nur noch mit einer.",
          firstSolutionEN="Adding the equations cleverly removes one variable, so you only work with one.",
          secondSolution="Erst umformen, dann lösen: ein Schritt mehr, der aber immer zum Ziel führt.",
          secondSolutionEN="Rearrange first, solve second: one step more, but it always gets you there.",
          comparison="Gleiche Koeffizienten mit verschiedenem Vorzeichen sind das Signal für das Additionsverfahren.",
          comparisonEN="Matching coefficients with opposite signs are the signal for the addition method.",
          resolving="Verschiedene Methoden auszuprobieren zeigt dir, dass es oft mehrere Wege gibt, ein Problem zu lösen.",
          resolvingEN="Trying out different methods shows you that there are often several ways to solve a problem."))

# 16: substitution direct.  1x = 3y + 7 ; 2x + 5y = 3  ->  x = 4, y = -1
suit(16, 16,
     (([{"coef": 1, "var": "x"}]), ([{"coef": 3, "var": "y"}, {"coef": 7}])),
     (([{"coef": 2, "var": "x"}, {"coef": 5, "var": "y"}]), ([{"coef": 3}])),
     "First", "None", 4, -1,
     ["Substitution"],
     dict(method="Elimination", steps=[
         dict(de="Dein*e Mitschüler*in hat die erste Gleichung mit 2 multipliziert, damit x in beiden Gleichungen dieselbe Zahl davor hat.",
              en="Your classmate multiplied the first equation by 2 so that x has the same number in front of it in both equations.",
              eqs=[
                  (([{"coef": 1, "var": "x"}]), ([{"coef": 3, "var": "y"}, {"coef": 7}])),
                  (([{"coef": 2, "var": "x"}]), ([{"coef": 6, "var": "y"}, {"coef": 14}])),
              ]),
         dict(de="Dann hat er* sie die neue erste Gleichung von der zweiten abgezogen und so x entfernt.",
              en="Then they subtracted the new first equation from the second, removing x.",
              eqs=[
                  (([{"coef": 0}]), ([{"coef": -11, "var": "y"}, {"coef": -11}])),
                  (([{"coef": -11, "var": "y"}]), ([{"coef": 11}])),
                  (([{"coef": 1, "var": "y"}]), ([{"coef": -1}])),
              ]),
         dict(de="Zuletzt hat er* sie y in die erste Gleichung eingesetzt und x berechnet.",
              en="Last they substituted y into the first equation and calculated x.",
              eqs=[
                  (([{"coef": 1, "var": "x"}]), ([{"coef": 3, "var": "y"}, {"coef": 7}])),
                  (([{"coef": 1, "var": "x"}]), ([{"coef": 3}, {"coef": -1, "mul": True}, {"coef": 7}])),
                  (([{"coef": 1, "var": "x"}]), ([{"coef": 4}])),
              ]),
     ]),
     dict(firstSolution="Ist eine Variable schon freigestellt, kannst du ihren Term direkt einsetzen und sparst dir eine Umformung.",
          firstSolutionEN="When a variable is already on its own you can substitute its term directly and save a rearrangement.",
          secondSolution="Ein zweiter Weg über das Additionsverfahren zeigt dir, dass beide Methoden zum selben Ergebnis führen.",
          secondSolutionEN="A second route through the addition method shows both methods reach the same result.",
          comparison="Ein bereits freigestellter Term ist die Einladung zum Einsetzungsverfahren.",
          comparisonEN="A term that is already on its own is an invitation to substitute.",
          resolving="Verschiedene Methoden auszuprobieren zeigt dir, dass es oft mehrere Wege gibt, ein Problem zu lösen.",
          resolvingEN="Trying out different methods shows you that there are often several ways to solve a problem."))

# 17: nothing isolated, both need transforming.  3x + 4y = 18 ; 5x + 2y = 16  ->  x = 2, y = 3
suit(17, 17,
     (([{"coef": 3, "var": "x"}, {"coef": 4, "var": "y"}]), ([{"coef": 18}])),
     (([{"coef": 5, "var": "x"}, {"coef": 2, "var": "y"}]), ([{"coef": 16}])),
     "None", "None", 2, 3,
     ["Elimination"],
     dict(method="Substitution", steps=[
         dict(de="Dein*e Mitschüler*in hat die erste Gleichung nach x aufgelöst.",
              en="Your classmate solved the first equation for x.",
              eqs=[
                  (([{"coef": 3, "var": "x"}]), ([{"coef": 18}, {"coef": -4, "var": "y"}])),
                  (([{"coef": 1, "var": "x"}]), ([{"coef": 6}, {"coef": "-4/3", "var": "y"}])),
              ]),
         dict(de="Diesen Term hat er* sie in die zweite Gleichung eingesetzt.",
              en="They substituted this term into the second equation.",
              eqs=[
                  (([{"coef": 5, "var": "x"}, {"coef": 2, "var": "y"}]), ([{"coef": 16}])),
                  (([{"coef": 5, "paren": "LeftSmall"}, {"coef": 6}, {"coef": "-4/3", "var": "y", "paren": "RightSmall"}, {"coef": 2, "var": "y"}]), ([{"coef": 16}])),
                  (([{"coef": 30}, {"coef": "-20/3", "var": "y"}, {"coef": 2, "var": "y"}]), ([{"coef": 16}])),
                  (([{"coef": "-14/3", "var": "y"}]), ([{"coef": -14}])),
                  (([{"coef": 1, "var": "y"}]), ([{"coef": 3}])),
              ]),
         dict(de="Zum Schluss hat er* sie y in die umgestellte erste Gleichung eingesetzt.",
              en="Finally they substituted y into the rearranged first equation.",
              eqs=[
                  (([{"coef": 1, "var": "x"}]), ([{"coef": 6}, {"coef": "-4/3", "var": "y"}])),
                  (([{"coef": 1, "var": "x"}]), ([{"coef": 6}, {"coef": -4}])),
                  (([{"coef": 1, "var": "x"}]), ([{"coef": 2}])),
              ]),
     ]),
     dict(firstSolution="Wenn keine Variable freigestellt ist, formst du zuerst um. Das ist der Preis für einen sauberen Rechenweg.",
          firstSolutionEN="When no variable is on its own you rearrange first. That is the price for a clean route through.",
          secondSolution="Das Additionsverfahren mit vorheriger Multiplikation ist hier kürzer, verlangt aber mehr Überblick.",
          secondSolutionEN="The addition method with prior multiplication is shorter here, but demands more of an overview.",
          comparison="Müssen beide Gleichungen umgeformt werden, wähle die Methode mit den wenigsten Zwischenschritten.",
          comparisonEN="When both equations need rearranging, pick the method with the fewest intermediate steps.",
          resolving="Verschiedene Methoden auszuprobieren zeigt dir, dass es oft mehrere Wege gibt, ein Problem zu lösen.",
          resolvingEN="Trying out different methods shows you that there are often several ways to solve a problem."))


# ══ Efficiency 11-17 ════════════════════════════════════════════════════════════

# 11: y isolated -> substitution.  3x + 4y = 25 ; 1y = 2x - 2  ->  x = 3, y = 4
eff(11, 11,
    (([{"coef": 3, "var": "x"}, {"coef": 4, "var": "y"}]), ([{"coef": 25}])),
    (([{"coef": 1, "var": "y"}]), ([{"coef": 2, "var": "x"}, {"coef": -2}])),
    "None", "Second", 3, 4, False, ["Substitution"],
    [
        dict(solution=True,
             de="Die zweite Gleichung ist bereits nach y aufgelöst, also kann der Term 2x-2 direkt in die erste Gleichung eingesetzt werden.",
             en="The second equation is already solved for y, so the term 2x-2 can be substituted directly into the first equation."),
        dict(solution=False,
             de="Beide Gleichungen müssen zunächst in die Normalform gebracht werden.",
             en="Both equations must first be brought into standard form.",
             rde="Die zweite Gleichung ist bereits nach y aufgelöst; eine Umformung ist nicht nötig.",
             ren="The second equation is already solved for y; no transformation is needed."),
        dict(solution=False,
             de="Die erste Gleichung muss zunächst nach x aufgelöst werden, bevor man einsetzen kann.",
             en="The first equation must first be solved for x before substituting.",
             rde="Die zweite Gleichung ist bereits nach y aufgelöst und kann so eingesetzt werden, wie sie dasteht.",
             ren="The second equation is already solved for y and can be substituted exactly as it stands."),
        dict(solution=False,
             de="Das Gleichsetzungsverfahren ist hier am direktesten, weil y schon freigestellt ist.",
             en="The equalization method is the most direct here because y is already on its own.",
             rde="Die erste Gleichung ist nicht nach y aufgelöst, sie müsste erst umgeformt werden.",
             ren="The first equation is not solved for y and would have to be rearranged."),
    ],
    dict(selfExplanation="Erkennst du, dass eine Variable schon freigestellt ist, sparst du dir eine ganze Umformung.",
         selfExplanationEN="Recognising that a variable is already on its own saves you a whole rearrangement.",
         firstSolution="Gleichungen geschickt umzustellen ist oft der halbe Weg zum Ziel.",
         firstSolutionEN="Rearranging an equation cleverly is often half the way to the answer.",
         secondSolution="In Prüfungen musst du oft verschiedene Ansätze kennen. Der Vergleich bereitet dich darauf vor.",
         secondSolutionEN="In exams you often need to know different approaches. Comparing them prepares you."))

# 12: elimination direct, opposite signs.  5x + 3y = 25 ; -5x + 4y = 10  ->  x = 2, y = 5
eff(12, 12,
    (([{"coef": 5, "var": "x"}, {"coef": 3, "var": "y"}]), ([{"coef": 25}])),
    (([{"coef": -5, "var": "x"}, {"coef": 4, "var": "y"}]), ([{"coef": 10}])),
    "None", "None", 2, 5, False, ["Elimination"],
    [
        dict(solution=True,
             de="Addiert man beide Gleichungen, fällt x weg, weil 5 und -5 sich aufheben.",
             en="Adding both equations removes x, because 5 and -5 cancel each other out."),
        dict(solution=False,
             de="Die zweite Gleichung muss zunächst nach x aufgelöst werden, bevor man einsetzen kann.",
             en="The second equation must first be solved for x before substituting.",
             rde="Das Additionsverfahren ist ohne jede Umformung anwendbar.",
             ren="The addition method can be applied without any transformation."),
        dict(solution=False,
             de="Beide Gleichungen sind bereits nach y aufgelöst und können gleichgesetzt werden.",
             en="Both equations are already solved for y and can be equated.",
             rde="In der ersten steht 3y, in der zweiten 4y; keine ist nach y aufgelöst.",
             ren="The first has 3y and the second 4y; neither is solved for y."),
        dict(solution=False,
             de="Die erste Gleichung muss mit 2 multipliziert werden, um y zu entfernen.",
             en="The first equation must be multiplied by 2 to remove y.",
             rde="Addieren entfernt bereits x; eine Multiplikation ist nicht nötig.",
             ren="Adding already removes x; no multiplication is needed."),
    ],
    dict(selfExplanation="Gleiche Koeffizienten mit verschiedenem Vorzeichen sind das klarste Signal für das Additionsverfahren.",
         selfExplanationEN="Equal coefficients with opposite signs are the clearest signal for the addition method.",
         firstSolution="Erkennst du das Muster, brauchst du keinen einzigen Zwischenschritt.",
         firstSolutionEN="Once you spot the pattern you need not a single intermediate step.",
         secondSolution="Manuelles Rechnen macht dich schneller und sicherer im Erkennen solcher Muster.",
         secondSolutionEN="Working by hand makes you faster and surer at spotting patterns like this."))

# 13: both solved for y -> equalization.  1y = 3x - 10 ; 1y = -x + 6  ->  x = 4, y = 2
eff(13, 13,
    (([{"coef": 1, "var": "y"}]), ([{"coef": 3, "var": "x"}, {"coef": -10}])),
    (([{"coef": 1, "var": "y"}]), ([{"coef": -1, "var": "x"}, {"coef": 6}])),
    "Second", "Second", 4, 2, False, ["Equalization"],
    [
        dict(solution=True,
             de="Beide Gleichungen sind bereits nach y aufgelöst, also können die Terme direkt gleichgesetzt werden.",
             en="Both equations are already solved for y, so the terms can be equated directly."),
        dict(solution=False,
             de="Die zweite Gleichung muss zunächst nach y aufgelöst werden.",
             en="The second equation must first be solved for y.",
             rde="Die zweite Gleichung ist bereits nach y aufgelöst.",
             ren="The second equation is already solved for y."),
        dict(solution=False,
             de="Das Subtrahieren der ersten von der zweiten Gleichung entfernt y.",
             en="Subtracting the first equation from the second removes y.",
             rde="Beim Subtrahieren bleibt -4x + 16 stehen; y fällt zwar weg, dafür war aber keine Umformung nötig.",
             ren="Subtracting leaves -4x + 16; y does drop out, but no transformation was needed for that."),
        dict(solution=False,
             de="Die erste Gleichung muss zunächst nach x aufgelöst werden, bevor das Verfahren angewendet werden kann.",
             en="The first equation must first be solved for x before the method can be applied.",
             rde="Sie ist nach y aufgelöst, und genau das braucht das Gleichsetzen.",
             ren="It is solved for y, which is exactly what equating needs."),
    ],
    dict(selfExplanation="Stehen beide Gleichungen schon nach derselben Variablen da, ist Gleichsetzen der kürzeste Weg.",
         selfExplanationEN="When both equations already stand solved for the same variable, equating them is the shortest route.",
         firstSolution="Ein Blick auf die Form spart dir oft mehrere Rechenschritte.",
         firstSolutionEN="A glance at the shape often saves you several steps of working.",
         secondSolution="Verschiedene Wege zu kennen macht dich beim Lösen von Aufgaben flexibler.",
         secondSolutionEN="Knowing several routes makes you more flexible at solving problems."))

# 14: elimination needs one multiplication.  2x + 5y = 17 ; 6x - 2y = 0  ->  x = 1, y = 3
eff(14, 14,
    (([{"coef": 2, "var": "x"}, {"coef": 5, "var": "y"}]), ([{"coef": 17}])),
    (([{"coef": 6, "var": "x"}, {"coef": -2, "var": "y"}]), ([{"coef": 0}])),
    "None", "None", 1, 3, True, ["Elimination"],
    [
        dict(solution=True,
             de="Multipliziert man die erste Gleichung mit 3, steht in beiden 6x; durch Subtrahieren wird x entfernt.",
             en="Multiplying the first equation by 3 gives 6x in both; subtracting removes x."),
        dict(solution=False,
             de="Das Einsetzungsverfahren geht hier ohne jede Umformung.",
             en="The substitution method works here without any transformation.",
             rde="Keine der beiden Gleichungen ist nach einer Variablen aufgelöst.",
             ren="Neither equation is solved for a variable."),
        dict(solution=False,
             de="Addiert man beide Gleichungen, fällt y weg.",
             en="Adding both equations removes y.",
             rde="Addiert erhält man 8x + 3y = 17; keine Variable fällt weg.",
             ren="Adding gives 8x + 3y = 17; no variable drops out."),
        dict(solution=False,
             de="Eine einzige Multiplikation genügt nicht, es müssen beide Gleichungen multipliziert werden.",
             en="A single multiplication is not enough; both equations must be multiplied.",
             rde="Multipliziert man nur die erste Gleichung mit 3, sind die Koeffizienten von x bereits gleich.",
             ren="Multiplying only the first equation by 3 already lines up the coefficients of x."),
    ],
    dict(selfExplanation="Eine einzige Multiplikation macht aus zwei Gleichungen ein direkt lösbares Additionsverfahren.",
         selfExplanationEN="A single multiplication turns the two equations into an addition step you can solve directly.",
         firstSolution="Erst schauen, welcher Faktor die Koeffizienten angleicht, dann rechnen.",
         firstSolutionEN="First see which factor lines the coefficients up, then calculate.",
         secondSolution="Wer die Struktur erkennt, spart Zeit und vermeidet Flüchtigkeitsfehler.",
         secondSolutionEN="Seeing the structure saves time and avoids careless mistakes."))

# 15: substitution with 2y (coefficient path).  2y = x - 1 ; 3x + 2y = 19  ->  x = 5, y = 2
eff(15, 15,
    (([{"coef": 2, "var": "y"}]), ([{"coef": 1, "var": "x"}, {"coef": -1}])),
    (([{"coef": 3, "var": "x"}, {"coef": 2, "var": "y"}]), ([{"coef": 19}])),
    "SecondMultiple", "None", 5, 2, False, ["Substitution"],
    [
        dict(solution=True,
             de="Der Term x-1 steht bereits für 2y und passt deshalb direkt auf die 2y in der zweiten Gleichung.",
             en="The term x-1 already stands for 2y and therefore matches the 2y in the second equation directly."),
        dict(solution=False,
             de="Die erste Gleichung muss erst nach y aufgelöst werden, weil dort 2y steht.",
             en="The first equation must first be solved for y because it contains 2y.",
             rde="Der Term x-1 steht für 2y und passt genau auf die 2y in der zweiten Gleichung.",
             ren="The term x-1 stands for 2y and matches the 2y in the second equation exactly."),
        dict(solution=False,
             de="Durch Addieren der beiden Gleichungen lässt sich y direkt entfernen.",
             en="Adding the two equations removes y directly.",
             rde="In beiden Gleichungen steht 2y; addiert bleibt 4y stehen.",
             ren="Both equations contain 2y; adding leaves 4y in place."),
        dict(solution=False,
             de="Beide Gleichungen sind nach x aufgelöst und können gleichgesetzt werden.",
             en="Both equations are solved for x and can be equated.",
             rde="Nur die erste Gleichung stellt einen Term für sich allein; die zweite ist das nicht.",
             ren="Only the first equation isolates a term; the second does not."),
    ],
    dict(selfExplanation="Steht auf beiden Seiten dasselbe Vielfache einer Variablen, kannst du den ganzen Term austauschen.",
         selfExplanationEN="When the same multiple of a variable appears on both sides, you can swap the whole term.",
         firstSolution="Auch ein Koeffizient ungleich 1 ist kein Hindernis, wenn der passende Term schon dasteht.",
         firstSolutionEN="A coefficient other than 1 is no obstacle when the matching term is already there.",
         secondSolution="Genau hinzuschauen lohnt sich: oft passt der Term, ohne dass du umformen musst.",
         secondSolutionEN="It pays to look closely: often the term fits without any rearrangement."))

# 16: elimination needs both multiplied.  4x + 3y = 18 ; 3x + 5y = 19  ->  x = 3, y = 2
eff(16, 16,
    (([{"coef": 4, "var": "x"}, {"coef": 3, "var": "y"}]), ([{"coef": 18}])),
    (([{"coef": 3, "var": "x"}, {"coef": 5, "var": "y"}]), ([{"coef": 19}])),
    "None", "None", 3, 2, True, ["Elimination"],
    [
        dict(solution=True,
             de="Multipliziert man die erste mit 3 und die zweite mit 4, steht in beiden 12x; Subtrahieren entfernt x.",
             en="Multiplying the first by 3 and the second by 4 gives 12x in both; subtracting removes x."),
        dict(solution=False,
             de="Addiert man beide Gleichungen, fällt eine Variable weg.",
             en="Adding both equations removes one variable.",
             rde="Addiert erhält man 7x + 8y = 37; keine Variable fällt weg.",
             ren="Adding gives 7x + 8y = 37; no variable drops out."),
        dict(solution=False,
             de="Das Einsetzungsverfahren ist hier ohne Umformung anwendbar.",
             en="The substitution method can be applied here without any transformation.",
             rde="Keine Gleichung ist nach einer Variablen aufgelöst.",
             ren="No equation is solved for a variable."),
        dict(solution=False,
             de="Eine einzige Multiplikation genügt, um die Koeffizienten anzugleichen.",
             en="A single multiplication is enough to line up the coefficients.",
             rde="Die Koeffizienten sind 4 und 3 sowie 3 und 5; es braucht zwei Multiplikationen.",
             ren="The coefficients are 4 and 3, and 3 and 5; two multiplications are needed."),
    ],
    dict(selfExplanation="Zwei Multiplikationen sind kein Umweg, sondern der schnellste Weg zu einer Gleichung mit einer Variablen.",
         selfExplanationEN="Two multiplications are not a detour, they are the fastest way to an equation with one variable.",
         firstSolution="Systematisch den kleinsten gemeinsamen Faktor suchen, dann geht es zügig.",
         firstSolutionEN="Look systematically for the smallest common factor and it goes quickly.",
         secondSolution="Solche Aufgaben schulen den Blick für Strukturen, die in Prüfungen Zeit sparen.",
         secondSolutionEN="Tasks like this train your eye for structure, which saves time in exams."))

# 17: x isolated, negative solution.  1x = 3 - y ; 4x + 3y = 8  ->  x = -1, y = 4
eff(17, 17,
    (([{"coef": 1, "var": "x"}]), ([{"coef": 3}, {"coef": -1, "var": "y"}])),
    (([{"coef": 4, "var": "x"}, {"coef": 3, "var": "y"}]), ([{"coef": 8}])),
    "First", "None", -1, 4, False, ["Substitution"],
    [
        dict(solution=True,
             de="Die erste Gleichung ist bereits nach x aufgelöst, also kann der Term 3-y direkt in die zweite Gleichung eingesetzt werden.",
             en="The first equation is already solved for x, so the term 3-y can be substituted directly into the second equation."),
        dict(solution=False,
             de="Die erste Gleichung muss zuerst nach y aufgelöst werden.",
             en="The first equation must first be solved for y.",
             rde="Sie ist nach x aufgelöst, und genau das braucht das Einsetzen.",
             ren="It is solved for x, which is exactly what substituting needs."),
        dict(solution=False,
             de="Subtrahiert man die zweite von der ersten Gleichung, fällt eine Variable weg.",
             en="Subtracting the second equation from the first removes a variable.",
             rde="Subtrahiert erhält man -3x - 2y = -5; keine Variable fällt weg.",
             ren="Subtracting gives -3x - 2y = -5; no variable drops out."),
        dict(solution=False,
             de="Ein negatives Ergebnis kann bei dieser Aufgabe nicht herauskommen.",
             en="A negative result cannot come out of this task.",
             rde="Setzt man ein, erhält man y = 4 und x = -1; ein negatives Ergebnis ist also möglich.",
             ren="Substituting gives y = 4 and x = -1, so a negative result is possible."),
    ],
    dict(selfExplanation="Ein negatives Ergebnis ist kein Fehler. Es zeigt nur, wo der Punkt auf der Zahlengeraden liegt.",
         selfExplanationEN="A negative result is not a mistake. It only shows where the point sits on the number line.",
         firstSolution="Ein freigestellter Term ist immer eine Einladung zum Einsetzen, auch mit Minus.",
         firstSolutionEN="A term on its own is always an invitation to substitute, minus sign or not.",
         secondSolution="Wer mit negativen Zahlen sicher umgeht, lässt sich davon nicht aus dem Konzept bringen.",
         secondSolutionEN="Being confident with negative numbers keeps you from losing your thread."))


# ══ Matching 11-17 ══════════════════════════════════════════════════════════════

# 11: equalization, both solved for y.  1y = 2x + 1 ; 1y = -x + 7  ->  x = 2, y = 5
match(11, 11,
      (([{"coef": 1, "var": "y"}]), ([{"coef": 2, "var": "x"}, {"coef": 1}])),
      (([{"coef": 1, "var": "y"}]), ([{"coef": -1, "var": "x"}, {"coef": 7}])),
      "Second", "Second", 2, 5, "Equalization",
      [
          (([{"coef": 2, "var": "x"}, {"coef": 3, "var": "y"}]), ([{"coef": 13}]),
           ([{"coef": 1, "var": "x"}, {"coef": -1, "var": "y"}]), ([{"coef": -1}])),
          (([{"coef": 1, "var": "x"}, {"coef": 2, "var": "y"}]), ([{"coef": 8}]),
           ([{"coef": 3, "var": "x"}, {"coef": -2, "var": "y"}]), ([{"coef": 4}])),
      ],
      [
          dict(solution=True,
               de="Beide Gleichungen sind bereits nach y aufgelöst, daher können die Ausdrücke direkt gleichgesetzt werden.",
               en="Both equations are already solved for y, so the expressions can be equated directly."),
          dict(solution=True,
               de="Die beiden anderen Systeme müssten zunächst nach derselben Variablen aufgelöst werden.",
               en="The other two systems would first have to be solved for the same variable."),
          dict(solution=False,
               de="Beide Gleichungen müssen erst in die Normalform gebracht werden.",
               en="Both equations must first be brought into standard form.",
               rde="Beide liegen schon in der Form y = ... vor.",
               ren="Both are already in the form y = ..."),
          dict(solution=False,
               de="Gleichsetzen funktioniert nur, wenn beide Gleichungen nach verschiedenen Variablen aufgelöst sind.",
               en="Equating only works when the two equations are solved for different variables.",
               rde="Es funktioniert genau dann, wenn beide nach derselben Variablen aufgelöst sind.",
               ren="It works precisely when both are solved for the same variable."),
      ],
      dict(selfExplanation="Sind beide Gleichungen nach derselben Variablen aufgelöst, kannst du die rechten Seiten gleichsetzen.",
           selfExplanationEN="When both equations are solved for the same variable, you can equate the right-hand sides.",
           firstSolution="Erkennst du die Form, brauchst du keinen Zwischenschritt.",
           firstSolutionEN="Once you recognise the form you need no intermediate step.",
           secondSolution="Verschiedene Systeme zu vergleichen schärft deinen Blick für die passende Methode.",
           secondSolutionEN="Comparing different systems sharpens your eye for the right method."))

# 12: elimination, equal coefficients.  3x + 2y = 12 ; 3x - 5y = -9  ->  x = 2, y = 3
match(12, 12,
      (([{"coef": 3, "var": "x"}, {"coef": 2, "var": "y"}]), ([{"coef": 12}])),
      (([{"coef": 3, "var": "x"}, {"coef": -5, "var": "y"}]), ([{"coef": -9}])),
      "None", "None", 2, 3, "Elimination",
      [
          (([{"coef": 2, "var": "x"}, {"coef": 5, "var": "y"}]), ([{"coef": 19}]),
           ([{"coef": 4, "var": "x"}, {"coef": -3, "var": "y"}]), ([{"coef": 6}])),
          (([{"coef": 1, "var": "x"}, {"coef": 2, "var": "y"}]), ([{"coef": 8}]),
           ([{"coef": 2, "var": "x"}, {"coef": -1, "var": "y"}]), ([{"coef": 1}])),
      ],
      [
          dict(solution=True,
               de="In beiden Gleichungen steht 3x; durch Subtrahieren fällt x weg und y bleibt allein übrig.",
               en="Both equations contain 3x; subtracting removes x and leaves y on its own."),
          dict(solution=True,
               de="In den beiden anderen Systemen lässt sich ohne vorherige Multiplikation keine Variable entfernen.",
               en="In the other two systems no variable can be removed without multiplying first."),
          dict(solution=False,
               de="Beide Gleichungen müssen zuerst mit einem Faktor multipliziert werden.",
               en="Both equations must first be multiplied by a factor.",
               rde="Die Koeffizienten von x sind in beiden Gleichungen bereits gleich.",
               ren="The coefficients of x are already equal in both equations."),
          dict(solution=False,
               de="Durch Addieren der beiden Gleichungen fällt x weg.",
               en="Adding the two equations removes x.",
               rde="Addiert erhält man 6x - 3y = 3; x bleibt stehen.",
               ren="Adding gives 6x - 3y = 3; x stays in place."),
      ],
      dict(selfExplanation="Gleiche Koeffizienten heißen: einmal subtrahieren und eine Variable ist weg.",
           selfExplanationEN="Equal coefficients mean one subtraction and a variable is gone.",
           firstSolution="Vergleiche die Koeffizienten, bevor du rechnest. Das spart Arbeit.",
           firstSolutionEN="Compare the coefficients before you calculate. It saves work.",
           secondSolution="Übung im Kopfrechnen hilft dir, solche Muster schneller zu sehen.",
           secondSolutionEN="Practising mental arithmetic helps you see patterns like this faster."))

# 13: substitution, x isolated.  1x = 4y - 3 ; 2x + 3y = 16  ->  x = 5, y = 2
match(13, 13,
      (([{"coef": 1, "var": "x"}]), ([{"coef": 4, "var": "y"}, {"coef": -3}])),
      (([{"coef": 2, "var": "x"}, {"coef": 3, "var": "y"}]), ([{"coef": 16}])),
      "First", "None", 5, 2, "Substitution",
      [
          (([{"coef": 3, "var": "x"}, {"coef": 2, "var": "y"}]), ([{"coef": 12}]),
           ([{"coef": 3, "var": "x"}, {"coef": -5, "var": "y"}]), ([{"coef": -9}])),
          (([{"coef": 2, "var": "x"}, {"coef": 5, "var": "y"}]), ([{"coef": 19}]),
           ([{"coef": 4, "var": "x"}, {"coef": -3, "var": "y"}]), ([{"coef": 6}])),
      ],
      [
          dict(solution=True,
               de="Die erste Gleichung ist bereits nach x aufgelöst, also kann der Term 4y-3 direkt in die zweite Gleichung eingesetzt werden.",
               en="The first equation is already solved for x, so the term 4y-3 can be substituted directly into the second equation."),
          dict(solution=True,
               de="Die beiden anderen Systeme müssten zunächst nach einer Variablen aufgelöst werden.",
               en="The other two systems would first have to be solved for a variable."),
          dict(solution=False,
               de="Die erste Gleichung muss zuerst nach y aufgelöst werden.",
               en="The first equation must first be solved for y.",
               rde="Sie ist nach x aufgelöst, und genau das braucht das Einsetzen.",
               ren="It is solved for x, which is exactly what substituting needs."),
          dict(solution=False,
               de="Subtrahiert man die zweite von der ersten Gleichung, fällt x weg.",
               en="Subtracting the second equation from the first removes x.",
               rde="Subtrahiert erhält man -x - 3y = 4y - 19; x bleibt stehen.",
               ren="Subtracting gives -x - 3y = 4y - 19; x stays in place."),
      ],
      dict(selfExplanation="Ein freigestellter Term ist der schnellste Startpunkt: einmal einsetzen und eine Variable ist weg.",
           selfExplanationEN="A term on its own is the fastest starting point: one substitution and a variable is gone.",
           firstSolution="Ein Blick genügt, wenn du auf die Form der Gleichungen achtest.",
           firstSolutionEN="One look is enough when you watch the shape of the equations.",
           secondSolution="Verschiedene Methoden zu kennen macht dich beim Lösen flexibler.",
           secondSolutionEN="Knowing several methods makes you more flexible at solving."))

# 14: equalization, both solved for x.  1x = 3y - 4 ; 1x = -y + 8  ->  x = 5, y = 3
match(14, 14,
      (([{"coef": 1, "var": "x"}]), ([{"coef": 3, "var": "y"}, {"coef": -4}])),
      (([{"coef": 1, "var": "x"}]), ([{"coef": -1, "var": "y"}, {"coef": 8}])),
      "First", "First", 5, 3, "Equalization",
      [
          (([{"coef": 2, "var": "x"}, {"coef": 1, "var": "y"}]), ([{"coef": 11}]),
           ([{"coef": 1, "var": "x"}, {"coef": 3, "var": "y"}]), ([{"coef": 13}])),
          (([{"coef": 4, "var": "x"}, {"coef": -1, "var": "y"}]), ([{"coef": 6}]),
           ([{"coef": 2, "var": "x"}, {"coef": 3, "var": "y"}]), ([{"coef": 16}])),
      ],
      [
          dict(solution=True,
               de="Beide Gleichungen sind bereits nach x aufgelöst, daher können die Terme direkt gleichgesetzt werden.",
               en="Both equations are already solved for x, so the terms can be equated directly."),
          dict(solution=True,
               de="Die beiden anderen Systeme müssten zunächst nach derselben Variablen aufgelöst werden.",
               en="The other two systems would first have to be solved for the same variable."),
          dict(solution=False,
               de="Beide Gleichungen müssen erst nach x aufgelöst werden.",
               en="Both equations must first be solved for x.",
               rde="Beide sind schon nach x aufgelöst.",
               ren="Both are already solved for x."),
          dict(solution=False,
               de="Gleichsetzen funktioniert nur bei Systemen in der Form y = ...",
               en="Equating only works for systems in the form y = ...",
               rde="Es funktioniert mit jeder Variablen, solange beide nach derselben aufgelöst sind.",
               ren="It works with any variable, as long as both are solved for the same one."),
      ],
      dict(selfExplanation="Die Variable ist egal. Entscheidend ist, dass beide Gleichungen nach derselben aufgelöst sind.",
           selfExplanationEN="The variable does not matter. What matters is that both are solved for the same one.",
           firstSolution="Achte auf die Form, nicht auf den Buchstaben.",
           firstSolutionEN="Watch the shape, not the letter.",
           secondSolution="Erst prüfen, dann rechnen: Das spart viele Schritte.",
           secondSolutionEN="Check first, then calculate: it saves many steps."))

# 15: elimination, equal coefficients & same sign -> subtract.  5x + 2y = 24 ; 5x - 3y = -11  ->  x = 2, y = 7
match(15, 15,
      (([{"coef": 5, "var": "x"}, {"coef": 2, "var": "y"}]), ([{"coef": 24}])),
      (([{"coef": 5, "var": "x"}, {"coef": -3, "var": "y"}]), ([{"coef": -11}])),
      "None", "None", 2, 7, "Elimination",
      [
          (([{"coef": 1, "var": "x"}]), ([{"coef": 2, "var": "y"}, {"coef": -1}]),
           ([{"coef": 3, "var": "x"}, {"coef": 1, "var": "y"}]), ([{"coef": 11}])),
          (([{"coef": 2, "var": "x"}, {"coef": 5, "var": "y"}]), ([{"coef": 19}]),
           ([{"coef": 4, "var": "x"}, {"coef": -3, "var": "y"}]), ([{"coef": 6}])),
      ],
      [
          dict(solution=True,
               de="In beiden Gleichungen steht 5x; subtrahiert man sie, fällt x weg und y bleibt allein.",
               en="Both equations contain 5x; subtracting them removes x and leaves y on its own."),
          dict(solution=True,
               de="Die beiden anderen Systeme müssten zuerst mit einem Faktor multipliziert werden.",
               en="The other two systems would first have to be multiplied by a factor."),
          dict(solution=False,
               de="Addiert man die Gleichungen, fällt eine Variable weg.",
               en="Adding the equations removes one variable.",
               rde="Addiert erhält man 10x - y = 13; keine Variable fällt weg.",
               ren="Adding gives 10x - y = 13; no variable drops out."),
          dict(solution=False,
               de="Beide Gleichungen müssen zuerst mit einem Faktor multipliziert werden.",
               en="Both equations must first be multiplied by a factor.",
               rde="Die Koeffizienten von x sind bereits gleich; ein Subtrahieren genügt.",
               ren="The coefficients of x are already equal; one subtraction is enough."),
      ],
      dict(selfExplanation="Gleiche Koeffizienten mit gleichem Vorzeichen heißen subtrahieren, mit verschiedenem addieren.",
           selfExplanationEN="Equal coefficients with the same sign mean subtract; with opposite signs, add.",
           firstSolution="Ein kurzer Blick auf die Vorzeichen sagt dir, ob du addieren oder subtrahieren musst.",
           firstSolutionEN="A quick look at the signs tells you whether to add or subtract.",
           secondSolution="Wer beide Fälle unterscheiden kann, ist beim Additionsverfahren sicher.",
           secondSolutionEN="Telling the two cases apart is what makes you sure with the addition method."))

# 16: substitution with 2y.  2y = 3x - 4 ; 5x + 2y = 12  ->  x = 2, y = 1
match(16, 16,
      (([{"coef": 2, "var": "y"}]), ([{"coef": 3, "var": "x"}, {"coef": -4}])),
      (([{"coef": 5, "var": "x"}, {"coef": 2, "var": "y"}]), ([{"coef": 12}])),
      "SecondMultiple", "None", 2, 1, "Substitution",
      [
          (([{"coef": 3, "var": "x"}, {"coef": 2, "var": "y"}]), ([{"coef": 12}]),
           ([{"coef": 3, "var": "x"}, {"coef": -5, "var": "y"}]), ([{"coef": -9}])),
          (([{"coef": 1, "var": "x"}, {"coef": 2, "var": "y"}]), ([{"coef": 9}]),
           ([{"coef": 2, "var": "x"}, {"coef": -1, "var": "y"}]), ([{"coef": 8}])),
      ],
      [
          dict(solution=True,
               de="Der Term 3x-4 steht bereits für 2y und passt direkt auf die 2y in der zweiten Gleichung.",
               en="The term 3x-4 already stands for 2y and matches the 2y in the second equation directly."),
          dict(solution=True,
               de="Die beiden anderen Systeme müssten zunächst nach einer Variablen aufgelöst werden.",
               en="The other two systems would first have to be solved for a variable."),
          dict(solution=False,
               de="Die erste Gleichung muss erst nach y aufgelöst werden.",
               en="The first equation must first be solved for y.",
               rde="Der Term 3x-4 steht für 2y und passt ohne Umformung.",
               ren="The term 3x-4 stands for 2y and fits without a transformation."),
          dict(solution=False,
               de="Addiert man die Gleichungen, fällt y weg.",
               en="Adding the equations removes y.",
               rde="In beiden steht 2y; addiert bleibt 4y stehen.",
               ren="Both contain 2y; adding leaves 4y in place."),
      ],
      dict(selfExplanation="Steht links schon das Vielfache, das rechts gebraucht wird, kannst du den ganzen Term austauschen.",
           selfExplanationEN="When the multiple you need already stands on the left, you can swap the whole term.",
           firstSolution="Du musst nicht umformen, wenn der passende Term schon dasteht.",
           firstSolutionEN="You do not have to rearrange when the matching term is already there.",
           secondSolution="Genaues Hinschauen spart dir hier einen ganzen Rechenschritt.",
           secondSolutionEN="Looking closely saves you a whole step of working here."))

# 17: equalization, both solved for y, negative slope.  1y = -3x + 11 ; 1y = 2x - 4  ->  x = 3, y = 2
match(17, 17,
      (([{"coef": 1, "var": "y"}]), ([{"coef": -3, "var": "x"}, {"coef": 11}])),
      (([{"coef": 1, "var": "y"}]), ([{"coef": 2, "var": "x"}, {"coef": -4}])),
      "Second", "Second", 3, 2, "Equalization",
      [
          (([{"coef": 4, "var": "x"}, {"coef": 3, "var": "y"}]), ([{"coef": 18}]),
           ([{"coef": 3, "var": "x"}, {"coef": 5, "var": "y"}]), ([{"coef": 19}])),
          (([{"coef": 1, "var": "x"}, {"coef": -2, "var": "y"}]), ([{"coef": 1}]),
           ([{"coef": 3, "var": "x"}, {"coef": 1, "var": "y"}]), ([{"coef": 16}])),
      ],
      [
          dict(solution=True,
               de="Beide Gleichungen sind nach y aufgelöst, also können die Terme gleichgesetzt werden, auch wenn ein Minus davorsteht.",
               en="Both equations are solved for y, so the terms can be equated even with a minus sign in front."),
          dict(solution=True,
               de="Die beiden anderen Systeme müssten zunächst nach derselben Variablen aufgelöst werden.",
               en="The other two systems would first have to be solved for the same variable."),
          dict(solution=False,
               de="Gleichsetzen funktioniert nicht, wenn ein negativer Koeffizient vorkommt.",
               en="Equating does not work when a negative coefficient appears.",
               rde="Es funktioniert unabhängig vom Vorzeichen, solange beide nach derselben Variablen aufgelöst sind.",
               ren="It works regardless of sign, as long as both are solved for the same variable."),
          dict(solution=False,
               de="Beide Gleichungen müssen erst in die Normalform gebracht werden.",
               en="Both equations must first be brought into standard form.",
               rde="Beide liegen bereits in der Form y = ... vor.",
               ren="Both are already in the form y = ..."),
      ],
      dict(selfExplanation="Ein Minus vor dem x ändert nichts am Vorgehen. Gleichsetzen funktioniert trotzdem.",
           selfExplanationEN="A minus in front of the x changes nothing about the procedure. Equating still works.",
           firstSolution="Lass dich von Vorzeichen nicht irritieren: Die Form entscheidet, nicht das Minus.",
           firstSolutionEN="Do not let signs put you off: the shape decides, not the minus.",
           secondSolution="Sicherheit mit negativen Zahlen macht dich in vielen Aufgaben schneller.",
           secondSolutionEN="Confidence with negative numbers makes you faster in many tasks."))


# ── validation ──────────────────────────────────────────────────────────────────

def isolated_flag(eq, first_var):
    """
    The IsolatedIn value an equation should carry.

    `First`/`Second` name which of the two variables is on its own — firstVariable (x) or
    secondVariable (y) — NOT which side of the equation it sits on, and `…Multiple` is the same
    with a coefficient other than ±1. Getting this wrong makes the drag-and-drop targets light up
    for the wrong terms, so it is checked rather than trusted.
    """
    left, right = eq

    def sole_variable(terms):
        if len(terms) != 1 or terms[0].get("var") is None:
            return None
        return terms[0]["var"], v_coef(terms[0])

    for own, other in ((left, right), (right, left)):
        found = sole_variable(own)
        if found is None:
            continue
        var, coef = found
        if any(t.get("var") == var for t in other):
            continue
        base = "First" if var == first_var else "Second"
        return base if abs(coef) == 1 else base + "Multiple"
    return "None"


def check_isolated():
    problems = []
    for group, items in (("Suitability", SUITABILITY), ("Efficiency", EFFICIENCY), ("Matching", MATCHING)):
        for e in items:
            for key, flag in (("eq1", "iso1"), ("eq2", "iso2")):
                expected = isolated_flag(e[key], "x")
                if e[flag] != expected:
                    problems.append(
                        f"{group} {e['id']}: {key} declares {e[flag]} but the equation isolates as {expected}")
    return problems


def check_all():
    problems = check_isolated()

    for group, items, alt_of in (("Suitability", SUITABILITY, None),
                                 ("Efficiency", EFFICIENCY, None),
                                 ("Matching", MATCHING, "alts")):
        seen = set()
        for e in items:
            tag = f"{group} {e['id']}"
            if e["id"] in seen:
                problems.append(f"{tag}: duplicate id")
            seen.add(e["id"])
            for axis in ("x", "y"):
                if e[axis].denominator != 1:
                    problems.append(f"{tag}: non-integer {axis} = {e[axis]}")
            got = solve(e["eq1"], e["eq2"])
            if got is None:
                problems.append(f"{tag}: system has no unique solution")
            elif got != (e["x"], e["y"]):
                problems.append(f"{tag}: stated ({e['x']}, {e['y']}) but solves to {tuple(got)}")
            if alt_of:
                for i, pair in enumerate(e[alt_of]):
                    # Alternatives are written flat: (eq1 left, eq1 right, eq2 left, eq2 right).
                    if solve((pair[0], pair[1]), (pair[2], pair[3])) is None:
                        problems.append(f"{tag}: alternative system {i} is not uniquely solvable")

    # Every equation inside a worked comparison step must hold at the exercise's own solution.
    for e in SUITABILITY:
        # The client renders exactly three slots — steps[0], steps[1] and steps[2] — so a walkthrough
        # with four steps silently loses one and one with two crashes on steps[2].
        if len(e["comparison"]["steps"]) != 3:
            problems.append(f"Suitability {e['id']}: comparison has {len(e['comparison']['steps'])} steps, "
                            f"the client renders exactly 3")
        for step in e["comparison"]["steps"]:
            for i, (left, right) in enumerate(step["eqs"]):
                if total_at(left, e["x"], e["y"]) != total_at(right, e["x"], e["y"]):
                    problems.append(
                        f"Suitability {e['id']}: step '{step['en'][:44]}' equation {i} is false "
                        f"at ({e['x']}, {e['y']})")
    return problems


if __name__ == "__main__":
    issues = check_all()
    print(f"new: Suitability {len(SUITABILITY)}, Efficiency {len(EFFICIENCY)}, Matching {len(MATCHING)}")
    print(f"totals: Suitability {13 + len(SUITABILITY)}, Efficiency {10 + len(EFFICIENCY)}, Matching {10 + len(MATCHING)}"
          f"  => {13 + 10 + 10 + len(SUITABILITY) + len(EFFICIENCY) + len(MATCHING)}")
    if issues:
        print(f"\n{len(issues)} PROBLEM(S):")
        for p in issues:
            print("  -", p)
    else:
        print("\nall systems, stated solutions and worked steps check out")
