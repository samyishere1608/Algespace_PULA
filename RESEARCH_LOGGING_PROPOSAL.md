# Capturing Every Student Action

## In one paragraph

Most of what you want is **already being recorded**. If a student picks a goal, starts an exercise,
says yes or no to the decisions inside it, makes mistakes, takes hints, finishes it, answers the
reflection questions, and earns XP - all of that is in the database with a timestamp. Four things are
**not** recorded: his plan for the day, the goals he set and removed, the XP he spent, and one detail
about how chip answers are filed. And there is a fifth problem that is not about missing data at all:
the record is spread across eight separate tables, so there is no one place where you can read a
student's session from start to finish.

This document says, in plain terms, exactly what we have, what is missing, and what I propose.

---

## 1. A session, minute by minute

Every row below was checked against the live database, not read off the code.

| When | What the student did | Recorded today? | Where it goes |
|---|---|---|---|
| Opens the app | Picks his plan for the day - **Practice / Goal / Review** | **No** | Only in his own browser. The XP log shows *that* a plan was made, never *what* he chose. |
| Sets a goal | Chooses one, e.g. "3 exercises with no hints" | **Partly** | Stored while he is working on it, then **erased when the goal ends**, so its details are gone. If he completes it, a summary line survives; if he just abandons it, nothing does. |
| Removes a goal | Deletes a goal he had set | **No** | Nothing at all. The row is simply deleted. |
| Starts an exercise | Opens one of the 33 exercises | **Yes** | An attempt row, with the start time and which exercise it was. |
| Makes the decisions inside it | Says **Yes** or **No** to working it out himself, to explaining his reasoning, to comparing two methods | **Yes, in detail** | One row per decision: which decision it was, what he chose, and when. This part is the strongest of the lot - see the counts below. |
| Makes mistakes, takes hints | Each error, each hint | **Yes** | Counted per exercise, per attempt. |
| Finishes the exercise | Completes it | **Yes** | The same attempt row, now with the end time, total time, total errors, total hints. |
| Is asked to reflect | The three questions appear | **Yes** | A queue row, marked `done`, `skipped` or still `pending`. So "did he reflect" is answerable. |
| Answers the reflection | Taps a quick-answer chip, or types | **Yes**, with one flaw | Typed answers are stored as his own turn. Tapped chips *are* stored - but filed under the companion's turn instead of his (see section 3.4). |
| Ends the session | Chooses to reflect on the day or not | **Yes** | A queue row for the session, with the same done/skipped states. |
| Answers the session questions | Taps or types | **Yes** | Both answers are there, with which chips he chose. |
| Earns XP | Any award, anywhere | **Yes** | An XP row with the type, the amount, the reason and the time. |
| Spends XP | Buys an outfit or a companion | **No** | Nothing. The purchase is not written down anywhere. |

### The decisions, counted

This is the part that matters most for your questions, and it is already rich:

| Decision | Times recorded | Said yes | Said no |
|---|---|---|---|
| Work out the first solution yourself | 65 | 18 | 47 |
| Work out the second solution yourself | 57 | 13 | 44 |
| Explain your own reasoning | 50 | 15 | 35 |
| Compare the two methods | 14 | 3 | 11 |
| Resolve / conclusion step | 6 | 3 | 3 |

Each of those rows also carries which phase it happened in, and which intervention variant was shown
to him at the time.

### Exercises, counted

124 attempts in total: 63 finished, and 61 started but never finished. The unfinished ones are
recorded too (no end time), so "opened an exercise and walked away" is visible.

---

## 2. The four things that are not recorded

### 2.1 His plan for the day

The first thing that happens each day is a question: what do you want to do today? That answer lives
only in his browser. If he changes laptop it is gone, and we never have it.

We do see the *consequence* - there are 12 XP entries saying a plan was made, and 13 saying he
followed through on one - but never the plan itself.

### 2.2 The goals he set, and the goals he removed

Goals are stored while they are active and **deleted the moment they end** - whether he finished the
goal or gave up on it. Right now that table is empty, which is normal: it only ever holds what he is
currently working on.

So the history of "what did this student set out to do" cannot be reconstructed. We have a record of
186 goals *completed*, and a handful of XP entries for goals *chosen*, but a goal that was set and
quietly abandoned leaves no trace at all. That is a research-relevant behaviour - choosing something
and then dropping it - and we currently cannot measure it.

### 2.3 The XP he spent — *not a gap*

Earning is recorded 287 times. Spending is recorded **zero** times — and on checking, that is correct:
outfits are **unlocked by milestone, never bought**. There is no balance to spend, so nothing is
missing here and no `xp.spent` label exists in the timeline. (`spend-xp` is dead code with no caller.)

### 2.4 Nothing joins a session together

This is not missing data so much as missing glue. There is no "session" identifier anywhere, so:

- we cannot tell whether two exercises were one sitting or two;
- we cannot tell which exercise earned a particular XP award;
- we cannot tell which exercises a completed goal was actually made of.

The timestamps let you guess, and mostly guess correctly, but "guess" is not what you want in an
analysis. The only such link that exists today is between a reflection and the exercise it was about.

**Fixed** — see section 7. Every row now carries a session id.

---

## 3. The six things that make the record hard to read

These are all fixable, and none of them is about losing data.

### 3.1 The XP reason column has drifted

There are 45 different reasons across 287 XP entries, and **25 of them appear only once**. Somebody
built a reason like `reflection-commit-2415` - the row number glued onto the end - and the same
avoidance award is spelled three different ways (`faced-a-gap`, `faced-a-gap:SolveOnOwn`,
`faced-a-gap:MethodComparison`).

The effect: if you group XP by reason, one category shatters into 25 pieces.

**This one cannot simply be renamed.** That row number is doing real work: it is what stops a
student being paid twice for the same promise. The fix is to move the number into its own column and
put a uniqueness rule on it - not to delete it. Getting this wrong would have introduced double
payments, so it is worth doing carefully.

**Done, for the one award that needed it.** The `reflection-commit` guard now uses a `RefId` column
with a partial unique index, so the reason column no longer carries a glued-on row number and the
double-payment rule is enforced by the database instead of by a string. Rows written before the change
keep the old spelling; an exporter should strip anything after the first `-` in `Source` to fold the
two spellings together.

### 3.2 Times are ambiguous

Every row has a timestamp, and they are all UTC - but the value looks like `2026-10-14T10:01:49`:
no `Z` on the end, and no fractions of a second. So any tool reading it must be *told* it is UTC, and
two actions in the same second cannot be put in order. There is also one place
(`LogErrorController`) that writes the server's local time into the same kind of field, which would
shift those rows by the server's timezone.

### 3.3 A goal's details vanish when it ends

Covered in 2.2, repeated here because it is a storage decision rather than a bug: the goal is deleted,
not archived.

### 3.4 A tapped chip answer is filed under the companion

When the student types an answer, it is stored as **his** turn - 91 of those. When he taps a
quick-answer chip, the chip *is* stored, but on the **companion's** row: 68 of those, against 2 that
landed on his own row.

Nothing is lost. But to find "what the student answered", an analysis has to look in the `Choice`
column of a row whose role says `pippin`, which is exactly the kind of thing that leads to a wrong
number in a paper.

### 3.5 The intervention number means nothing on its own

The decision engine records which intervention variant it chose as a bare number (1, 2, 3...) in a
column called `MessageType`. There is no table, enum or note saying what those numbers mean. To
interpret them you have to read the decision engine's source - and hope it has not changed since.

### 3.6 Nothing records which version of the exercise he saw

An attempt stores `ExerciseId 1`. If the text or the equations of exercise 1 are ever edited, every
old row silently changes meaning, and there is no way to tell which version a student saw. Similarly
no row records which build of the app wrote it, so a change in question wording or marking cannot be
dated in the data.

---

## 4. What I propose

Three things, in order. The first two are small.

> **Status: steps 1 and 2 are now built, and step 3 is partly built.** Section 7 says exactly what is
> in place and what is still to come. The rest of this section is kept as written, so the reasoning
> stays readable.

### Step 1 - Write down the four missing actions

In plain terms: when he sets a goal, write it down. When he deletes one, write it down instead of
erasing it. When he picks his plan for the day, send it to the server and write it down. When a
reflection is judged, write the verdict down instead of leaving it in a log file that the next restart
overwrites.

This is a handful of inserts in places that already exist, plus one small call from the app for the
daily plan (the server never hears about that one today).

### Step 2 - One timeline table

Right now the story of a session is spread over eight tables, each shaped differently. I propose
**one extra table** that is nothing but a list of things that happened, in order:

| Column | What it holds |
|---|---|
| Student | who |
| Time | when, to the millisecond, with the `Z` so it is unambiguous |
| What happened | a fixed label, e.g. `exercise.completed`, `goal.deleted`, `reflection.answered`, `session.ended` |
| Session | which sitting it belonged to |
| Exercise | which exercise, when it was about one |
| Which one | the id of the thing it is about - a goal, a question, a chip |
| Value | what he chose: the chip, the method, the answer, the verdict |
| Amount | XP, or seconds, or a count |
| Details | a small JSON block for anything else |

Everything already stored stays exactly where it is - this is a *spine*, not a replacement. The
existing tables keep the detail (the per-phase numbers, the language analysis, the chat); the timeline
just says what happened when, and points at them.

With that, your question - "show me this student's session from the daily plan to the end" - becomes
one query rather than a seven-table join.

It also gives us the **session id**, which is the glue missing in 2.4, and it makes future
instrumentation additive: a new thing to record is a new label, not a new table.

### Step 3 - Make it readable

- All new timestamps carry the `Z` and milliseconds, written by one shared helper.
- The XP reasons become a fixed list, checked by the code, with the row number in its own column.
- The `MessageType` numbers get a name table, so a chart can say "worked example" instead of "2".
- Chip answers are filed under the student.
- The exercise version and the app build go on the rows.
- A small export script writes the data out as a spreadsheet-friendly file, with a companion document
  explaining every column - so the analysis does not require reading C#.

---

## 5. What is already good, and should be left alone

- **The decisions record.** One row per decision point, with the choice and the phase. It is the
  reason questions 5 and 6 above are already answerable.
- **The language analysis** carries the version of the pipeline that produced it, so a change in the
  word lists does not silently reinterpret old answers. This is the best reproducibility decision in
  the codebase and everything else should copy it.
- **The reflection record** keeps the exact window of exercises the questions were built from, and ties
  the reflection to the exercise it was about.
- **The study tables** in `studies.db` belong to the study protocol and must not be touched at all.
  Everything above is additive in our own database.

---

## 6. Decisions I need from you — and what you decided

1. **What counts as one session?** You decided: it starts when he opens the dashboard, and ends when
   he presses **End Session**. Built exactly that way. A 12-hour safety close covers a session nobody
   ever ended, so a crashed browser cannot leave one open forever.
2. **If a student asks to be removed from the study,** rows are **kept and flagged**, not deleted, so
   the dataset stays whole and the analysis can skip him. The flag column is not built yet.
3. **The chat and the written reflection answers stay in the same database** as everything else. The
   reflection is the only chat there is today, so the timeline and the writing live side by side.

---

## 7. What is already built

### The timeline table

One new table, `StudentEventLog`, plus a small `StudentEventVocabulary` table that holds the label
list so a chart reads "worked it out alone" instead of a number. Both are created on startup and are
idempotent.

### The 15 labels it writes

| Label | Written when | Value | Amount |
|---|---|---|---|
| `session.started` | the dashboard opens | - | - |
| `session.ended` | End Session is pressed | the reason | - |
| `intention.set` | he picks his plan for the day | the plan | - |
| `goal.set` | he adds a goal | the goal's focus | target |
| `goal.deleted` | he removes a goal | the goal's focus | target |
| `goal.completed` | the goal's exercise count is met | the goal's focus | XP |
| `exercise.started` | an exercise opens | the exercise name | - |
| `exercise.completed` | an exercise is finished | - | seconds |
| `exercise.abandoned` | an exercise was started and never finished | the exercise name | - |
| `decision.made` | he answers a decision point inside an exercise | the choice | - |
| `xp.awarded` | any XP award | which counter | XP |
| `reflection.asked` | a reflection reaches the queue | the item label | - |
| `reflection.answered` | he answers one question | the chip id, or `text` | characters written |
| `reflection.verdict` | that answer is judged | aligned / partial / off-topic / why it fell back | XP |
| `reflection.completed` | the reflection is submitted | answered / skipped | - |

`exercise.abandoned` is worked out at End Session from the recorded exercise spine, so it needs no
extra bookkeeping while the student is working.

### The three session calls

`session/start`, `session/intention`, `session/end` on the progress controller, and a small
`sessionLog.ts` on the app side. Opening the dashboard starts a session and remembers its id for the
tab; End Session closes it and reports what was left unfinished.

### The replay script

`tools/research-logging/replay-session.mjs` plays one whole session against the running server — plan,
goal, two exercises, a decision, XP, a reflection, End Session — and prints the resulting timeline.
`--clean` removes the rows afterwards. It is the answer to "show me one example end to end", and it is
also a smoke test: if a table or a label breaks, the timeline comes back short.

### Also fixed while building this

- **`reflection.verdict` used to be unrecordable on seven of the nine ways out of the judging code.**
  A timeline would have read as "this answer was never judged" when in fact it was judged and the reply
  was thrown away. Every exit now records a verdict, including the two that happen before a question
  object exists.
- **A confirmed written answer could go out with an empty badge.** When the reply was rejected and the
  offline text was shown instead, that text carried its own keyword guess rather than the judgement
  that had already been made — so a claim the judge confirmed was shown as not confirmed. The offline
  reply now carries the judge's verdict.

### Still to come

- The exercise-content version and the app build number on the rows.
- A `WithdrawnAt` flag on the student record (decision 2 above).
- The export script and the data dictionary.
- A rolling log file, so server-side errors stop being lost on restart.

---

# Appendix - technical detail

For whoever implements this. Nothing here changes an existing table's shape.

## A. The tables today

`students.db`, 15 tables:

| Table | Rows | What it is |
|---|---|---|
| `FlexibilityAttempt` | 124 | one row per exercise attempt (63 finished, 61 abandoned) |
| `AnchorRecord` | 1006 | one row per (attempt, phase): the action trail, the choices, the classifier output |
| `ReflectionQueue` | 102 | a reflection item and its status |
| `ReflectionHistory` | 276 | the turns of a reflection: question, answer, chip, XP |
| `AgencyLog` | 287 | every XP award |
| `GoalCompletions` | 186 | completed goals |
| `ActiveGoals` | 0 | goals currently in progress - deleted when they end |
| `ChatTranscript` | 70 | the companion conversation |
| `NlpAnalysis` | 61 | 25 derived language features per answer |
| `ExerciseLog` / `ExerciseCompletions` | 168 / 136 | exercise completion |
| `Students` | 129 | login row |
| `StudentProgress` | 9 | wallets, streak, onboarding step |
| `StudentTourState` / `InsightGapAward` | 3 / 2 | tutorials offered; Insight paid for a weakness |

`studies.db` holds the protocol's own capture (`FlexibilityStudy1_user_*`, 54 columns) and `Users`,
which is the only place a participant's group is recorded. Off-limits.

## B. The timeline table

```sql
CREATE TABLE IF NOT EXISTS StudentEvent (
    Id            INTEGER PRIMARY KEY AUTOINCREMENT,
    StudentId     INTEGER NOT NULL,
    OccurredAt    TEXT    NOT NULL,              -- ISO-8601 UTC, with Z and milliseconds
    EventType     TEXT    NOT NULL,              -- controlled label, see C
    SessionId     TEXT    NOT NULL DEFAULT '',   -- groups one sitting
    AttemptId     INTEGER NOT NULL DEFAULT 0,    -- the exercise, when there is one
    RefId         TEXT    NOT NULL DEFAULT '',   -- id of the subject: goal, question, chip, item
    Value         TEXT    NOT NULL DEFAULT '',   -- what was chosen
    Amount        INTEGER NOT NULL DEFAULT 0,    -- XP, seconds, count
    Data          TEXT    NOT NULL DEFAULT '{}', -- JSON for the rest
    SchemaVersion INTEGER NOT NULL DEFAULT 1,
    AppVersion    TEXT    NOT NULL DEFAULT '',
    Language      TEXT    NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS IX_StudentEvent_Student_Time ON StudentEvent (StudentId, OccurredAt);
CREATE INDEX IF NOT EXISTS IX_StudentEvent_Type_Time    ON StudentEvent (EventType, OccurredAt);
CREATE INDEX IF NOT EXISTS IX_StudentEvent_Attempt      ON StudentEvent (AttemptId);
```

```sql
-- Every label a log column may take, so a chart or the data dictionary can name it without reading C#.
CREATE TABLE IF NOT EXISTS LogVocabulary (
    Kind  TEXT NOT NULL,   -- 'EventType' | 'AgencySource' | 'Element' | 'Section' | 'InterventionType'
    Value TEXT NOT NULL,
    Label TEXT NOT NULL,
    PRIMARY KEY (Kind, Value)
);
```

Upserted from code constants at startup, so the table cannot drift from the code - the same guarantee
`AnchorStoreSettings.EnsureTables` already gives for the schemas.

## C. Event labels

| Label | Value holds | Amount | Data holds |
|---|---|---|---|
| `session.started` | | | trigger |
| `session.ended` | | minutes | exercise count, source (reflection / timeout) |
| `intention.set` | the plan (`practice`/`goal`/`review`) | | follow-up answer |
| `goal.set` | category | | focus, metric, target, quality, source |
| `goal.deleted` | category | | target, progress at deletion - **the abandoned-goal measure** |
| `goal.completed` | category | XP earned | the attempts that counted |
| `exercise.started` | type | | exercise id, agent condition |
| `exercise.completed` | type | seconds | errors, hints, method |
| `exercise.abandoned` | type | seconds | phase reached |
| `decision.made` | the choice (`No`, `Yes to Elimination`) | | phase, element |
| `nudge.shown` / `nudge.answered` | element / response | | accepted |
| `reflection.asked` | question id | | item type, item id, index |
| `reflection.answered` | chip id, or `text` | | answer length, mode |
| `reflection.verdict` | aligned / not-aligned / partial / unjudged | Insight paid | writer (model / fallback), guard rejection, question id |
| `xp.awarded` | choice / insight / resolve | amount | source, reflection id |
| `xp.spent` | what it bought | amount | item id |
| `buddy.changed` | character id | | previous |
| `outfit.equipped` | item id | | character id |
| `tour.offered` / `tour.accepted` / `tour.declined` | section | | replay |
| `chat.turn` | user / pippin | | turn index, phase, leak blocked |

## D. Timestamps

```csharp
public static class LogStamp
{
    /// "2026-10-14T10:01:49.482Z"
    public static string Now() => DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fff'Z'");
}
```

- New columns always carry `Z` and milliseconds.
- `DateTime.Now` is banned from anything written to a database. `LogErrorController` is the one
  offender to fix.
- Existing columns are left alone and documented as "UTC, no zone marker, second precision". Every
  legacy value is genuinely UTC, so recording the convention is enough; rewriting history is the
  bigger risk.

## E. Phases

**Phase 1** - the four missing actions, the timestamp helper, the fixed XP reason list (with the
idempotency guard moved into a column, not removed), the `MessageType` name table, chip answers filed
under the student.

**Phase 2** - the timeline table, the session id, and the events emitted from the server plus the one
small client call for the daily plan.

**Phase 3** - structured application logging to a rolling file that is not overwritten; exercise and
build versions; the group field and the withdrawal flag; the export script and the data dictionary.

Phase 1 repairs what is being written today, which is why it comes first.
