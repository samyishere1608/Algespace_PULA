# Reflection audit

The reflection questions are decided by `webapi/Services/ReflectionQuestionBank.cs`, and the
rule that grades them lives in the same file on purpose: the question a student reads and the
rule that decides whether their answer was right cannot drift apart if they are one object.

That leaves one thing that can go wrong quietly — **the bank can be too generous**. A question
with four chips and two of them paying something means a student who guesses is paid half the
time, and nothing about the code looks wrong when that happens. These checks measure it.

Run all of them after any change to the bank, the question models, or the chip translations.

## What to run

```powershell
# 1. The bank itself: every goal category, every exercise type, every awkward case.
cd tools/reflection-audit
dotnet run

# 2. Every translation key the bank can emit, in all three languages.
powershell -ExecutionPolicy Bypass -File .\check-keys.ps1

# 3. Through the real endpoint, where the evidence is assembled from the database, AND the
#    wording a student actually reads. Needs the API running on 7273 in Development.
node .\check-queue-routing.mjs en
node .\check-queue-routing.mjs de
node .\check-queue-routing.mjs ja

# 4. The follow-through award, end to end against the live API. Writes to the database;
#    always follow it with the restore.
node .\check-resolve-followthrough.mjs
node .\restore-baseline.mjs
```

Two more, for when something looks wrong and you need to see the real thing rather than reason
about it:

```powershell
# The model's actual reply to each of the three questions, aligned and not. Writes to the
# database; follow with restore-baseline.mjs.
node .\show-efficiency-replies.mjs

# Whether the attempt the questions were built from is the one the reflection is about. Read-only.
node .\show-attempt-match.mjs
```

## What each one is for

**`dotnet run`** compiles the bank straight from `webapi/` rather than through a copy, and
builds synthetic evidence for:

* all six goal categories (method, exercise type, self explanation, method comparison, solve
  on your own, hints and errors), including a method goal narrowed to one named method;
* all three exercise types, both when the student worked the decision out and when they asked
  to be shown it;
* the cases with no step detail, nothing clean, a single step, two equally costly steps, and a
  goal whose window is still empty.

For every question it asserts that:

* the chips the record names as correct pay the full award, and every other chip pays nothing;
* no question can pay more than its intended ceiling;
* the answer key only ever names chips that are actually offered;
* the routing is what the design calls for — Suitability asks about comparing, Efficiency and
  Matching about explaining, a hints-and-errors goal asks about hints, and so on;
* a next-action question never carries an answer key, because a promise is not a grade.

It then prints the number that answers the real question: **what a student who taps a chip at
random gets**. If that rises, something in the bank got more generous.

**`check-keys.ps1`** exists because the server sends translation *keys*, not sentences. A key
that no longer exists renders as the raw key in the student's face, and nothing else in the
project would catch it. It also fails on keys left behind by a rename.

**`check-queue-routing.mjs`** does two jobs. It checks the routing through the controller, where
`BuildEvidence` reads the student's own rows, and it prints **the wording a student would read** for
every exercise type and every goal category. The second is what makes it a copy review as well as a
check: the bank harness only knows which key was chosen, and a key can be correct while the sentence
it produces is confusing.

Two things it catches that nothing else can: a question that interpolates a slot and is given no
value for it (the student reads a raw `{{focus}}`), and a question that no longer names the moment
it is about. The routing is verified through the controller rather than in the bank because the two
can disagree, and that is not hypothetical: it is how the exercise-type question was found to be
falling through to the wrong branch.

**`check-resolve-followthrough.mjs`** seeds a promise, finishes an exercise through the real
endpoint, and reads back what was paid. Fifteen checks: a kept promise pays, a promise cannot
be paid twice, a broken promise pays nothing but is still closed, and the two chips that
deliberately never pay stay unpaid.

## The two numbers worth watching

```
checkable answers   49 of 131 = 37%
```

Roughly a third of the chips a student can tap on a checkable question are a correct answer.
That is the expected shape: the correct-answer rate should be near the reciprocal of the chip
count, not far above it. A rate that climbs means more chips are being accepted.

```
q1-progress: 3 case(s) out of 5
```

The one question the record cannot settle. It asks how this run compared with the last one,
and when there is no previous attempt there is nothing to compare with, so every chip pays the
partial amount. It is small, it is honest about not knowing, and it is listed separately
rather than averaged in so it cannot hide a change elsewhere.

## Note on the `Method` column

For an exercise row, `ReflectionQueue.Method` holds the **exercise type**, not a solving
method — that is what the completion call stores there. It is what decides which question an
exercise gets, so a fixture that puts a real method name in that column will quietly exercise
the wrong branch. `check-queue-routing.mjs` says so where it seeds.

## Open problem, reproducible here

`show-attempt-match.mjs` prints both halves of a mismatch that is **not fixed**: the evidence the
questions are built from comes from the student's **most recent completed attempt**, while the queue
row names the item the reflection is about. They are normally the same attempt, and nothing enforces
it. If a student finishes two exercises before reflecting, the questions describe the second one, and
the step chips can even come from a different exercise TYPE. The fix needs the attempt id stored on
the queue row.
