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

# 5. The relevance gate (in `dotnet run`) plus two behavioural checks against the live model.
#    (a) and (b) write to the database; follow them with restore-baseline.mjs.
node .\check-replies.mjs          # a real answer is not discarded; a contradicted claim is not agreed with
node .\check-attempt-link.mjs     # a reflection reads its own attempt (uses a throwaway student)

# 6. The end-of-session reflection, end to end through the real endpoints: its two questions,
#    the promise the second one records, and the Resolve the next day's intention pays.
#    Writes to the database; follow it with restore-baseline.mjs.
node .\check-session-reflection.mjs

# 7. The same reply check as (3), against the fallback text instead of the model. Start the API
#    with a deliberately broken key in the same process, so every reply is the offline wording:
#      $env:OpenAI__ApiKey = 'broken'; dotnet run
#    Then the usual check, and the usual restore afterwards.
node .\check-reply-alignment.mjs
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
  goal whose window is still empty;
* the three end-of-session cases: a day with a bit of everything in it, a day whose only
  exercise was clean but hint-heavy, and the hard day where every exercise cost both a mistake
  and a hint so the menu is down to its floor.

For every question it asserts that:

* the chips the record names as correct pay the full award, and every other chip pays nothing;
* no question can pay more than its intended ceiling;
* the answer key only ever names chips that are actually offered;
* the routing is what the design calls for — Suitability asks about comparing, Efficiency and
  Matching about explaining, a hints-and-errors goal asks about hints, and so on;
* a next-action question never carries an answer key, because a promise is not a grade.

The end-of-session item is checked apart from that loop, because every assertion in it is written
for a question set whose answers the record *can* settle — "nothing can ever earn Insight here" is
a failure for an exercise and the whole point of these. It asserts instead that the two questions
come back in the right order and kinds, and that **no chip and no blank answer pays Insight at
all**.

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
checkable answers   54 of 146 = 37%
```

Roughly a third of the chips a student can tap on a checkable question are a correct answer.
That is the expected shape: the correct-answer rate should be near the reciprocal of the chip
count, not far above it. A rate that climbs means more chips are being accepted.

The end-of-session questions are not in this table, and cannot be: they are the only ones with
no answer key, so every chip they offer pays nothing and averaging them in would only dilute the
rate the table exists to watch. `check-session-reflection.mjs` covers them instead.

```
q1-progress: 1 case(s) out of 1
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

## The rule the goal questions follow

**A completed goal is never asked about the criterion it just proved.** "Practise the elimination
method three times" cannot complete without three exercises solved with elimination, so asking how
many of them used elimination has one possible answer and tells the student nothing. The same holds
for every category: a goal to explain your reasoning cannot complete without explaining it.

So the goal question asks about the thing the goal does NOT prove — whether they worked it out
unaided — and the one goal that IS about working unaided asks about hints instead. The goal audit
case in `dotnet run` and the `goal/*` entries in `check-queue-routing.mjs` both encode this.

## Open problem, reproducible here

`show-attempt-match.mjs` prints both halves of the mismatch that used to exist between the attempt
the questions were built from and the attempt the queue row named. It is **fixed**: the queue row now
carries `AttemptId`, captured when the reflection is queued, and `check-attempt-link.mjs` proves a
reflection reads its own attempt even when a newer one exists. Rows written before the column existed
carry `0` and fall back to the newest attempt, which `check-attempt-link.mjs` also covers.

## Handover: the goal questions and the reply, as of the goal-reflection rework

Everything in this section is **uncommitted** at the time of writing. Run `git status` before assuming
any of it is on `main`.

### What changed

- **The goal questions were rewritten.** Six categories, each with its own Q1 what-went-well menu
  (every option backed by a rule from the goal's own window), its own Q2 pattern question, and a Q3
  commitment menu. A goal whose window shows nothing good pays every option, because a student
  answering honestly about a bad session should not be paid nothing. The window is the goal's own
  exercises, narrowed to the goal's method or type, and it is worked out when the goal completes
  because it closes the moment the goal is claimed.
- **The exercise Q1 changed shape.** The step question stays wherever a step breakdown exists; where it
  does not, Q1 is now the same what-went-well menu the exercise-type goal uses, read from one exercise.
  The options that compare a later half against an earlier half are left out, because one exercise has
  one half.
- **`SolveOnOwn` reads a decline as winning.** The two solution points are the same act offered twice,
  so "yes then no" is not working it out yourself. The rule lives in one place
  (`AnchorDimension.Engaged`) and is used by the goal count, the avoidance profile and the reflection.
  `check-solve-on-own.mjs` covers it.
- **The offline fallback no longer contradicts the badge.** It used to take the verdict from the record
  but keep its own keyword-guessed wording, so a tap scored as correct could be shown "+3 Insight"
  beside "the data tells a slightly different story". It is now built from the verdict that was paid.
- **`CallOpenAI` retries.** Three attempts, 250 ms and 500 ms apart, **5xx only** (a 4xx is this
  request's fault and is not retried). Each attempt logs `[AI] attempt n/3: ...`, so a run of failures
  can be told apart from a blip.

### The rule the reply follows

The student cannot see the verdict, so the reply is the only place they learn whether their answer
matched. Two things are enforced, one deterministically and one by the prompt:

- **The record line is scoped to the question.** `DescribeRecord` states exactly one thing: the
  comparison decision for the comparison question, the explanation decision for the explanation
  question, whether they did the working for a step question, and *nothing at all* for Q3, which asks
  about the next exercise and is never graded. Handing over all three decisions at once is what
  produced a reply about the solution on a question about comparing two methods.
- **The prompt rules.** Stay inside the question; never tell them they did not do something; never
  invent what they did (no crediting them with reading, opening or studying anything the record does
  not state); say which way it went; never mention "the data" or "the record".

### The scripts added for this

| Script | What it does |
|---|---|
| `show-goal-questions.mjs [locale]` | Prints every goal category's questions as the endpoint returns them. Seeds attempts and completes the goal through the real `log-goal`, because a hand-written queue row carries no window. |
| `check-solve-on-own.mjs` | Does an exercise count as solved on their own, through `GET /anchor-tracking/goal-events`, which is what the goal counter reads. |
| `check-reply-alignment.mjs [locale]` | The reply audit. See below. |

### `check-reply-alignment.mjs`

Reads each item's real questions and chips back from the endpoint, then probes every answer shape that
occurs in practice: every chip, vague free text, a factual claim, "I ignored that", junk, and
"Pippin, tell me". It checks the reply against **the verdict that was paid** and **the question that
was asked**, using word lists for the phrases that have actually gone wrong: report tone, telling the
student off, inventing engagement, contradicting an aligned verdict, and out-of-scope facts.

It covers exercise items and **goal** items (three categories, windows built through `log-goal`).
Last full run: **100 replies, 1 failure.**

Two things to know before you run it:

- It makes real model calls, so it takes minutes and depends on the provider.
- A rejected answer is the **one** case where a question mark is right, because the notice asks them to
  write it again and the modal shows that text. That is deliberate; do not "fix" it.

### Open items

1. **One reply-phrasing failure** out of the last 100: the Suitability comparison question with a
   vague free text still produced a reproachful phrase. The ban covers "you didn't share / mention /
   say / tell me"; something in that family survived.
2. **Exercise Q3 has not been moved onto the goal commitment menus.** Doing it means dropping the
   middle option "…and take a hint if I need one". Settlement already understands both id sets.
3. **Resolve timing is unresolved by design.** The notes say "after the next session's logs confirm
   it"; the code judges the **next exercise** and closes the promise either way.
4. **Settlement now judges the goal chips**, which it never did: every goal promise used to fall
   through to "not kept" and close unread, so Resolve was never paid. `pick-<method>` is disambiguated
   by `ItemId`, because the same chip means "compare in elimination" for a comparison goal and "work it
   out in elimination" for a solve-on-own one. `check-resolve-followthrough.mjs` covers 27 cases.

### The end-of-session reflection

Two questions, asked on purpose and at the end of a session rather than earned by finishing anything.
Opened from the end-session dialog: "Reflect on today's session" → **Answer two quick questions**. It
sits beside the existing free-write and AI-analysis options rather than replacing them, because those
are a note the student writes or reads and this is a reflection we build from the day.

**Q1** — *what went well today* — is a menu read from today's own exercises: finishing, a run with no
mistakes, a run with no hints, working a solution out unaided, explaining the reasoning, comparing two
methods. An option is offered only when the day actually shows it, and "I finished the exercises I
started" plus "I made time to practise today" are the floor, so even a day where every single exercise
cost both a mistake and a hint still offers a menu rather than one button. A session with nothing
finished in it asks about making the time at all, which is what it consisted of.

**Q2** — *what to work on next session* — is the promise. Its three chips name the same three things
the daily intention offers at the start of the next session, and deliberately so: the two are settled
against each other tomorrow, and matching them only works because neither side invented its own
vocabulary. A student who writes instead of tapping is judged on the text, which is why "something
else" needs no chip.

**Neither question pays Insight, and no chip is an answer key.** A session has no record of "what went
well" to check a claim against, and the second question is a commitment. `Grade` returns `no-award` for
the new `session` kind, the prompt is told outright that there is no verdict to give, and the reply is
built differently rather than falling through to one of the two branches that confirm or quietly mark
down a claim nothing looked at. The promise still pays the same 2 Choice every commitment pays.

**The settlement is on the intention, not on the next exercise.** When the student sets today's daily
intention, the client offers it to `POST /session-reflection/settle`, which reads back the promise they
made at the end of their last session and pays 5 Resolve if it is the same thing. Both halves are ids
the server chose, so the common path is a lookup and the model is never asked; only a promise or an
intention that was *written* reaches the model, which answers one question with one word.

Three rules worth knowing, because each of them is a deliberate difference from the exercise promise:

- **A promise is kept the NEXT day.** The intention is set at the start of a session and the promise is
  made at the end of one, so judging them on the same date would pay a student for promising what they
  are already in the middle of doing. The lookup excludes promises made today.
- **An unjudged promise stays open.** "The model said no" and "the model was never asked" are different
  facts, and only one of them is a promise that was not kept — so a provider that cannot be reached
  leaves the promise alone rather than closing it unpaid. The exercise promise closes either way,
  because its judgement is a rule and cannot fail; this one cannot say that.
- **Skipping the check-in is not breaking a promise.** No intention means nothing to compare against, so
  nothing is judged and nothing is closed.

`check-session-reflection.mjs` covers all of it, plus the two things the bank harness cannot reach: that
the answer key is not on the wire, and that opening a session reflection does not disturb the queue.

### Two things about the session item that are easy to get wrong

**It is not in the reflection queue the dashboard offers.** `GET /reflection-queue` excludes it, and so
does the cap that keeps only the newest three pending items. Both are load bearing: that list is what
the prompt bubble offers, and it is about work the student has just finished — warning about a session
reflection mid-session would be asking them to summarise a day that is not over. And the cap would
otherwise have let opening the dialog quietly skip an unanswered exercise reflection.

**Its promise is filed under its own item id, never under `"session"`.** A promise answered with a chip
writes one history row where a written one writes two, so "the newest two rows" pairs a promise with a
stranger's words; the settlement groups by item id instead. Each session reflection gets a unique one
(`session-<ticks>`), which is also what keeps two sessions' promises from looking like one.

### Environment

Backend 7273 (Development), frontend 5173. Test student `e2etest2` (id 7), baseline Choice 15 /
Insight 40 / Resolve 0 / lifetime 55. **Always end a session that wrote to the database with
`node restore-baseline.mjs`** and check `residue` comes back zero.

---

# SESSION LOG — 13 Oct 2026. Read this before the section above.

The section above describes the code as it was in the morning. Everything below happened after, and it
supersedes it. If the two disagree, believe this.

## Where the repository stands

`main` was at `68687a9`. Everything after that is in this one commit. **Nothing about the reflection
work is on the branch as this is written** — the commit and push happen together with this file, so
`git log` should show one commit immediately after `68687a9`.

Database files (`webapi/Data/databases/*.db`) are modified by every audit run. They must **never** be
committed. Same for `798-1554-tree-demo.riv`, `reactapp/src/assets/images/Dashboardimage11.mp4`,
`sakura.html`, `webapi/Data/golden/`.

## What is built now

**Goal questions.** Six categories, each with its own Q1 what-went-well menu (every option backed by a
rule over the goal's own window), its own Q2, and a Q3 commitment menu. The window is the goal's own
exercises, narrowed to the goal's method or type, worked out when the goal completes. If no Q1 option
is true, every option pays the little amount.

A completed goal is never asked about the criterion it just proved.

**Exercise questions.** Q1 is the step question wherever a step breakdown exists, and the type's
what-went-well menu where it does not. Q2 asks the decision that type actually offers. Q3 mirrors the
dimension Q2 asked about.

**The two decision questions are now an either/or.** "I compared them myself / I asked to be shown"
became "**I compared them myself / I skipped it**", and the same for explaining. A decision in this app
is a **yes or a no**, and no means they skipped it. There is no "asked for the answer to be revealed"
except for working the solution out, where declining genuinely does put the result on screen
(`ResultAuto`). The middle chip "I compared part of it" was **removed**: the record only ever holds a
yes or a no, so it could never be the right answer, and offered as the honest middle ground it was a
trap that marked an honest answer wrong.

**End-of-session reflection** (built in a separate session, reviewed and accepted): a `session` item
type with **two** questions, **no Insight at all**, the second stored as a promise that the next day's
daily intention is measured against, paying Resolve either by chip match or by the model judging the
text. `check-session-reflection.mjs` is 27 of 27. Its unjudged promises are left **open** rather than
closed as not kept, which differs from the exercise settlement; that difference is deliberate and
unconfirmed with the user.

**The reply.** Scoped per question: `DescribeRecord` states exactly one decision, and nothing at all for
Q3 and the session promise. The prompt carries: stay inside the question; never tell them they did not
do something; never invent what they did; never mention XP, Insight, Choice, Resolve, points, award,
score, "the record shows" or "the data"; say which way it went; end on a full stop.

**The offline fallback** is built from the verdict that was paid, so the text and the badge agree. It
used to take the record's verdict but keep its own keyword-guessed wording, which produced **+3 Insight
next to "the data tells a slightly different story"**. On a decision question with the provider down it
now states the record and claims nothing.

**Closing the reflection means no.** The X records a real skip, so the item leaves the queue for good.
It used to just hide the window, leaving the item `pending` and bringing it back next time.

**`CallOpenAI` retries** three times, 250 ms and 500 ms apart, 5xx only, logging `[AI] attempt n/3`.

## Running the audits

| Command | What it proves |
|---|---|
| `dotnet run` | The bank itself: every category, every type, every awkward case, and the relevance gate. No API needed. |
| `check-keys.ps1` | Every key the bank can emit resolves in en, de and ja. Currently 590 / 590 / 589. |
| `node check-reply-alignment.mjs` | The replies. Needs the API. **The main tool.** |
| `node check-session-reflection.mjs` | The session reflection end to end. 27 of 27. |
| `node check-resolve-followthrough.mjs` | Promises settling. 27 of 27. Writes to the database. |
| `node restore-baseline.mjs` | **Always run this after anything that wrote.** |

### `check-reply-alignment.mjs` — read this before trusting or changing it

Reads each item's real questions and chips back from the endpoint, then probes every answer shape:
every chip, four free-text shapes including "I ignored that" and junk, and "Pippin, tell me". Covers
three exercise types and three goal categories. Checks the reply against **the verdict that was paid**
and **the question that was asked**, using word lists for phrases that have actually gone wrong.

Last full run: **107 replies, 3 failures.** The three are all the same input, the vague answer
"it was fine i think" on a decision question, where the model still reaches for "you didn't". That is
the next thing to fix.

**Two traps in this file, both learned the hard way:**

1. **A question mark on a rejected answer is CORRECT.** The notice asks them to write it again, and the
   modal shows that text. The check exempts `needsRetry` and says so in a comment. Do not "fix" it.
2. **Keep the banned-word lists narrow.** Banning the bare word "point" fired on ordinary English
   ("a fair point", "the key point of each method") and reported ten failures that were nothing.
   "choice" and "resolve" are excluded for the same reason.

A provider outage shows up as fallback text and the check will report it, which is how the
contradiction above was found. That is deliberate.

## Open items, in the order I would do them

1. **The three vague-answer failures.** One more prompt pass targeted at "the answer was too vague to
   match anything".
2. **The fallback pass has NEVER been run.** Stop the backend, start it with a deliberately broken key
   so every reply is the offline text, then run `check-reply-alignment.mjs` against that. Half of what
   the user asked for, still outstanding.
3. **Solve-on-your-own still says "asked to be shown"** where the two decision questions now say
   "skipped". That is correct for that dimension (`ResultAuto` really does display the result), but it
   was never confirmed with the user, who believes no always means skip.
4. **The promise settlement is global.** `SettleReflectionCommitment` takes the newest open promise for
   the whole student regardless of which reflection it came from, so with goals and exercises mixed in
   one session, promises are settled against the wrong exercise and out of order.
5. **The 3-pending cap** in `EnqueueReflection` silently auto-skips older reflections, so completed
   goals can go unreflected without anyone deciding that.
6. **Exercise Q3 was never moved onto the goal commitment menus.** Settlement understands both id sets.
7. **Resolve timing** is unresolved by design: the notes say "after the next session's logs confirm it",
   the code judges the next exercise and closes either way.
8. **Two unused strings** left behind: `reflection-chip-yn-compare-partly`,
   `reflection-chip-yn-explain-partly`.

## The AI provider — everything learned

Base `https://chat-ai.academiccloud.de/v1`. Endpoint and key live in `webapp/appsettings.json`, which
is **gitignored with a live key: diagnose it masked, never print it.**

**Twelve usable models**, from `/models` plus one that is missing from it: `qwen3.6-35b-a3b` (current),
`qwen3.8-27b`, `qwen3-30b-a3b-instruct-2507`, `qwen3.5-397b-a17b`, `qwen3-omni-30b-a3b-instruct`,
`qwen3-coder-next`, `deepseek-v4-flash-0731`, `glm-5.3-flash`, `gemma-4-31b-it`,
`meta-llama-3.1-8b-instruct`, and `e5-mistral-7b-instruct` (works, **not listed**).

**`/models` is NOT authoritative.** A model can be callable while absent from the list, so the only
reliable test is a real call with `max_tokens: 5`.

**429 is NOT a reliable signal.** Seen three times, and every retry returned a clean 404. Do not judge
availability by "it did not 404".

**Not available:** Qwen 2.5 72B Instruct (404 under every spelling), Llama 3.3 70B, DeepSeek R1,
DeepSeek R1 Distill Llama 70B, Qwen 2.5 Coder 32B, Qwen 2.5 VL 72B, Codestral 22B, Llama 3.1 Nemotron
70B, InternVL2.5 8B MPO. `mistral-large-instruct` and `llama-3.1-sauerkrautlm-70b-instruct` return a
consistent **500 with an empty body**, which is neither a 404 nor a working model: ask the provider.

**The 500s we keep seeing** are the provider's own, usually instant with an empty body, which is a
hiccup rather than our request. The retry now absorbs most of them. A bad request would be 4xx and
would fail every time.

**If a model returns empty `content` on a 200**, the code detects it and logs `reasoning=N chars`: the
model spent the whole budget thinking. `max_tokens` is 500; set `OpenAI:DisableThinking=true` or raise it.

## Traps in this codebase

- **C# verbatim strings.** Inside `$@"..."` a plain `"` TERMINATES the string and produces hundreds of
  `CS1002` errors, not one. Use `""`.
- **`git commit -m` in PowerShell mangles quotes.** Write the message to a file and use `git commit -F`.
- **`Get-Process webapi | Stop-Process -Force`** kills the running backend. Restart it.
- **The push credential** was once cached for an account with no write access (403). If a push 403s,
  that is the cause, not the code. A `credential-manager-core is not a git command` warning appears on
  every push and is harmless.
- **`tsc` has `noUnusedLocals`/`noUnusedParameters` on**, so removing a call leaves the removing file
  failing to build until the now-unused member goes with it.
- **i18next uses flat keys** with `keySeparator: false`, and `t("ns:key")` resolves across namespaces.

## Testing a reply change

```
cd tools/reflection-audit
dotnet run                                  # the bank, no API needed
node check-reply-alignment.mjs              # the replies, needs the API on 7273
node restore-baseline.mjs                   # and then this, always
```

Backend 7273 (Development), frontend 5173. Test student `e2etest2` (id 7): baseline Choice 15 /
Insight 40 / Resolve 0 / lifetime 55, and `residue` must come back `{history:0, queue:0, agency:0}`.

---

# SESSION LOG — 13 Oct 2026, evening. The reply shape, and one button for the answer.

Read this after the log above; where the two disagree, this one is what the code does.

## What the user asked for

1. Every answer tied to the question that was asked, and never vague — if there is little to say,
   say something real about the thing on screen.
2. No pointing at mistakes, no XP or award names, no "nothing to award here" kind of wording.
3. "Pippin, tell me" means Pippin answers THAT question: Q1/Q2 with what the student did on the goal or
   exercise, Q3 with what to do next.
4. A chip must not submit itself. Chips select; one common submit button sends the chip or the writing.

## The buttons — `ReflectionModal.tsx`

Tapping a chip toggles the selection and nothing else; the single submit button sends whichever of the
two is there, so a chip and a written answer are the same kind of action again. The per-action `pending`
spinner stays (the old `loading` flag made both buttons spin). `reflection-answer-myself` was renamed to
`reflection-submit-answer` in all three locales, and `check-keys.ps1` lists the old key as stale.

## The reply — `StudentProgressController` and `ReflectionQuestionBank`

- **The contradiction is gone.** The help-button mode label said "nothing about them to say" while the
  bullet below told the model to state what the facts show they did. Two instructions pulling opposite
  ways is what a vague, off-question reply looks like from the inside.
- **`ReflectionQuestionBank.DescribeRecordToStudent`** is the record's own facts in the second person,
  scoped to the question: the comparison, the explanation, a step, the exercise's went-well options, and
  the three counts. The prompt carries it as *state this, in your own warm words, adding no contrast and
  no "didn't"*, and the same string answers the help button and the offline reply.
- **No award tokens in anything the model reads**, except the JSON schema it must return. "Insight",
  "XP" and `insightXp=` are gone from the instructions and the verdict lines, and the ban is phrased as
  the app's scoreboard in any form. Naming the words taught the model to use them: one reply came back
  "you got the insight you needed".
- **No enumerations of forbidden phrases.** Listing *"the record shows…"* and *"you didn't…"* as examples
  put both straight back into replies. The rules now state the shape instead: affirmative sentences only,
  nothing built on a gap, no source framing, no contrast in front of the fact.
- **`StepGloss` and `NextActionSubject`** give the model plain English for the four steps and for what a
  next-step question is about. The student's copy is translation keys the server never renders, so Q3 was
  guessing its own subject and could not name the thing it was asking about.
- **A commitment is not a claim.** The promise question used to be handed the "does NOT match" verdict
  line, because a commitment has no verdict from this call; the model read it as a mark against
  something the student had just done.
- **The offline reply is question-aware and award-free.** The Q3 branch used to hand over the weakest
  area's own recommendation ("Try 2 more Suitability exercises…"), which answers a different question
  than the one on screen — and it reached the student on the live path too, whenever the model returned
  no nextStep.

## What the audits say

| Check | Result |
|---|---|
| `dotnet run` | All checks passed. Settled-case counts unchanged. |
| `check-keys.ps1` | 590 / 590 / 589, 0 missing. |
| `node check-reply-alignment.mjs` | **100 replies, 0 failures.** |
| the same, against a broken AI key | **96 replies, 0 failures.** |

The last row is open item 2 from the log above — **the offline pass had never been run before this
session**. To run it, start the API with a deliberately broken key (`$env:OpenAI__ApiKey = 'broken'` in
the same process as `dotnet run`) so every reply is the fallback text, then run the same check and
follow it with `restore-baseline.mjs`.

Before this session: 107 replies and 3 failures, all of them the vague answer on a decision question.
That class is gone; the two that replaced it in earlier runs were both the prompt's own example wording
coming back out, which is why the examples were removed rather than reworded.

## Follow-up the same evening: two goal-question replies from the real UI

Reported by the user (3 Suitability exercises goal): (1) Q1 "what went well", tapped "my method choices got
better" — the reply was about asking for the solution; (2) Q2 "which method did you pick when it wasn't
suitable" — the reply said they picked equalization in "all three" exercises when it was once.

Causes: no facts line existed for the goal questions, so the model fell back on the goal's whole decision
list; and nothing stated per-method counts, so it invented "all three". Neither was in the audit, which only
tapped the first and last chip of a goal menu and had no scope rule for goal questions.

Fixes:
- `ReflectionQuestion` has two server-only fields: `RecordFact` (the question's own second-person tally)
  and `ChipFacts` (what is true behind each goal Q1 chip; the "no mistakes / no hints" ones carry counts).
  The goal builders set them. `GoalChipFacts` in `ReflectionQuestionBank` is the chip-id -> fact table.
- `DescribeRecordToStudent(evidence, question, choice)` now answers goal Q1 from the tapped chip (or, when
  the chip is not backed, from what the record does back) and returns `RecordFact` for the other goal
  questions. `DescribeRecord` scopes goal Q1/Q2/count questions: no decision list, no totals, method per
  exercise, and an instruction never to say "all"/"every" or a count the facts do not state.
- Q2 pick-method facts give the tally in the not-suitable exercises AND over the whole window.
- Verdict lines: a new branch for a partial (tie / unsettled) verdict, so the reply does not claim "the
  one picked most", and a goal-Q1 branch for an unbacked chip that says what went well without repeating it.
- `ReplyBreaksTheRules` (English only): a model reply that talks about the score, the button, or "didn't"
  is swapped for the record-based reply. Prompt for behaviour, code for guarantees.
- `check-reply-alignment.mjs`: goals now tap EVERY chip, goal Q1 and Q2 have scope rules, the Suitability
  goal has a third exercise, `SHOW=1` prints goal replies and `ONLY_GOALS=1` skips the exercise cases.

Audits after this: live 114 replies / 0 failures; broken key 113 / 0; session 27/27; keys 0 missing;
`tsc` clean; baseline residue 0/0/0. NB the AI provider returns 429 if the whole audit is run twice in
quick succession; the replies then silently become the fallback text and the live audit proves nothing.
Check `api.out.log` for `[AI] attempt ... 429` when a "live" run looks too plain.

## 14 Oct 2026 — written answers, relevant data only, and Insight for facing a gap

Reported by the user: after a goal of three exercises with no hints, the reply said "what happened here
reads a little differently" while the badge paid +3 Insight; replies did not match the question or the
answer; and Insight for "solve on own" was paid three times for one change of habit.

**Root causes, found in the stored history, not guessed**
1. The `reads a little differently` text is the OLD offline free-text fallback, reached because my reply
   guard (`ReplyBreaksTheRules`) swapped the model's feedback for the fallback's text while keeping the
   model's `aligned=true, insightXp=3`. Reply and badge came from two different verdicts. The offline
   fallback itself also judged written answers by keyword ("hint", "good") and paid 3 on the guess.
2. Goal Q2 for a hints goal asked "which method took the most hints" when there were none, a question
   whose premise is false. "I didn't use hints" was the honest answer and had no chip to match.
3. The prompt carried the student's weakest area, the item's raw error/hint totals and the last two
   reflection turns (from whichever item was answered last) into EVERY reply.
4. Insight for facing a gap used the all-time engagement rate (`>= 3` opportunities, `<= 20%` engaged),
   which with a long record of declines takes several engagements to climb out of, and every one paid.
   Separately, `CleanRuns` counted "no mistakes AND no hints" under a question that says "without a
   single mistake", so a student with hints but no mistakes was graded wrong.

**What changed**
- **One verdict per answer.** A written answer is judged by a SEPARATE narrow call (`JudgeWrittenAnswer`:
  topic + facts + answer, temperature 0, outcome `agrees|contradicts|no_claim`). Insight 3 is paid only
  for `agrees`. The writer is then told the verdict, exactly as for a tapped chip. No judgement (provider
  down, 429 after retries) means the offline reply and NO award.
- **Reply guard retries instead of swapping.** `ReplyProblem` (English only) rejects a reply that talks
  about the score or the button, says what they did not do, hedges a confirmed answer, or confirms an
  unconfirmed one. The model is asked once more with the reason; if it fails again the offline reply goes
  out WITH its own verdict, so what is shown is always consistent. `CallOpenAI` now also retries a 429.
- **Offline free text pays nothing** and states the question's own fact (`RecordFact` / chip facts).
- **Questions with a false premise are not asked.** `BuildGoalPickMethodQuestion` falls back to
  `BuildGoalAccuracyQuestion` when there is no unsuitable choice to name or nothing to place on a method;
  that question counts hint-free exercises for a hints goal and mistake-free ones otherwise.
- **Only this question's data reaches the model.** Removed from the prompt: weakest area, raw totals, last
  reflection turns. `ExerciseRuns` shows only the measures the question is about (a hints goal is shown
  hints only, except on Q1 whose menu offers both). `JudgeFacts` gives the judge plain facts with none of
  the writer's instructions; the instruction "never say all" had made the judge mark "all of them" wrong.
- **Insight for facing a gap: once per episode, decided by the server.** New `POST
  /student-progress/insight-gap-award` and table `InsightGapAward`. First award: the element is a gap over
  the whole record, counted WITHOUT the current exercise. Later awards: the last three opportunities after
  the previous award were all declined. The client (`insightAwards.ts`) pays only what the server returns.

**New audits**
- `check-written-answers-and-gap.mjs [--offline]` — the reported hints-goal case with four written answers on
  Q1 and Q2 (true, true in other words, false, a bare verdict), verdict/badge/reply consistency, and the gap
  rule (paid once, nothing for the next three engagements, paid again after three declines, never for a
  student who always does it, nothing under three opportunities). Spaces its calls: every written answer is
  two provider calls.
- `check-goal-window.mjs` — the stored goal window contains only exercises since the goal started, narrowed
  to the goal's method/type, capped at five, oldest first, with each decision on ITS OWN exercise. Uses its
  own student id (99002) and cleans up after itself.
- `Program.cs` (bank): the all-correct Efficiency goal now expects the count question for Q2.

**Results:** live 114 replies / 0 failures; broken key 114 / 0; written answers + gap 39/39 live, 43/43
offline; goal window 16/16; session 27/27; keys 0 missing; `tsc` clean; baseline residue 0/0/0. In the live
run about one reply in seven was rejected by `ReplyProblem` on the first pass (most often "didn't quite
match"), and a handful fell back to the offline text after the second.

**Known limits.** The reply guard is English-only (the judge is not). A reply the guard cannot recognise
can still be vague, so the verdict is the guarantee and the wording is best effort. Offline, a written
answer is never paid, by design.

### Follow-up, same day: replies that only echo, and a monitored Insight rule

- **Echo replies** ("you did exactly that"). Each judged question now carries a server-only `Meaning` (one
  sentence on why that thing matters, `MeaningFor` in the bank). The prompt asks for two parts: the fact in
  different words, then the meaning in the model's own words, with no stacked praise. `ReplyProblem` rejects
  a reply under 100 characters, under two sentences, or built on "exactly what happened" and asks again.
  Offline replies are fact + meaning too (`FactAndMeaning`, `VerdictFeedback`); "Spot on ... exactly what
  happened" is gone. In a live run about a quarter of first replies were sent back for this; a few fell back
  to the offline fact + meaning text after the second.
- **Insight for facing a gap: a 3-attempt grace after each award, shared with the nudge.** (Replaces the
  7-day / 5-opportunity monitoring I first built; the user said days are far too long because students use
  the app rarely.) Rule: once Insight is paid for a weakness, that weakness is NOT a gap for the next
  `GapThresholds.GraceOpportunities` (3) opportunities, however large the historical deficit still is;
  after them the normal whole-record gap applies again, so the nudge returns and the next engagement is
  paid again. The grace lives in `AnchorTrackingService.GetProfile` (`YesNo(..., lastAwardAttempt)`), which
  is what BOTH the nudge and the award read, so they cannot disagree. The award endpoint applies the same
  condition (gap over the record excluding the current exercise, and not in grace). The award table moved
  to `AnchorStoreSettings.InsightAwardTable`, created at startup with the other anchor tables. Each element
  has its own grace. `check-written-answers-and-gap.mjs` checks both the award and `/anchor-tracking/profile`
  (what the nudge acts on) through the grace and out the other side.
- Goal suggestions also read the profile, so a weakness in its grace is not suggested as a goal either.

Results: live 111 replies / 0 failures, written answers + gap 49/49, goal window 16/16, session 27/27,
`tsc` clean, baseline residue 0/0/0.

---

# DONE — section-based onboarding. Built 14 Oct 2026; see the log below.

## The requirement

One 33-step tour becomes **sections**, each shown when it is first relevant:

1. **First visit ever:** the core section only — what the agency is and how the dashboard works.
2. **Each other part, on first entry into it:** its own tutorial, or a prompt asking whether they want
   to see it. First time they open goal setting → the goal tutorial. First exercise → the exercise
   tutorial. The companion, and so on for each part.
3. **The state must live in the DATABASE, not the browser.** A student changes PC or device, and
   "already seen" has to follow them.

## What exists now

- `reactapp/src/utils/onboardingTour.ts` — the tour steps and the state. **The state is the defect:**
  `TOUR_COMPLETED_KEY(studentId)` is a `localStorage` key (`onboardingTour.ts:250-300`). One flag for the
  whole tour, per browser. Nothing is sent to the server.
- `reactapp/src/components/shared/OnboardingTour.tsx` and `TourHost.tsx` — the rendering and hosting.
- One long tour, played once, with no notion of which part a step belongs to.

## The shape of the change

**Server first, because it is the part that must not be guessed at later.** A table keyed on the student
and a section name:

```
StudentTourState (StudentId, Section, CompletedAt)   -- presence of a row means "shown"
```

plus `GET /student-progress/tour-state/{studentId}` returning the sections that are done, and
`POST /student-progress/tour-state` to record one. Follow the existing pattern for such endpoints:
`EnsureTables` for the DDL, an upsert that is idempotent on `(StudentId, Section)`.

**Client.** The section is what a step is tagged with, so the 33 steps get grouped rather than
rewritten. `hasSeenTour` becomes `hasSeenSection(section)`, reading a local cache for immediacy and
reconciling with the server, because a first paint must not wait on the network. The core section is
shown on first visit if nothing is recorded; every other section is checked at the moment its part is
opened.

## Decisions — answered by the user, do not re-ask

1. **"Not now" is NOT permanent dismissal, and it is not a re-ask either.** If they say no the first
   time, they are never prompted for that section again automatically, and the section keeps a
   **"Show tutorial" button** of its own so they can play it whenever they choose. First time is an
   offer; after that it is entirely their decision.
2. **One section can be replayed**, on its own, from that button. Completing a replay does not need to
   change the stored state, because "do not prompt again" was already true.
3. **A section is tied to first entry into its part.** Opening goal setting for the first time is what
   triggers the goal-setting section. First exercise triggers the exercise section. The companion, and
   so on for each part. So a section maps to *entering a part*, which is what the 33 steps have to be
   sorted into.
4. **The server is not a concern.** The backend runs anyway, so there is no offline case to design for.

## The design that follows

**Server.** `StudentTourState (StudentId, Section, OfferedAt)` — the row means "this student has been
offered this section, do not prompt again". `GET /student-progress/tour-state/{studentId}` returns the
sections already offered; `POST` records one. `EnsureTables` for the DDL, upsert idempotent on
`(StudentId, Section)`.

**Client.** The 33 steps get **tagged with a section** rather than rewritten. `hasSeenTour` becomes
`hasSeenSection(section)`, read from a local cache for the first paint and reconciled with the server.
The core section runs on the first visit when nothing is recorded. Every other section is checked at the
moment its part is opened, which is where the "do you want to see this?" prompt belongs, and each such
part renders a persistent "Show tutorial" control so the offer is never a one-off.

**Order of work:** sort the 33 steps into sections first, since the split is a judgement about the
product and everything else is mechanical once it exists. Then the table and the two endpoints, then the
prompt, then the per-section button.

---

# DONE 14 Oct 2026 — the sections, and the walkthrough story

## The split

32 steps, four contiguous sections (verified by reading the source, not by hand):

| Section | What it covers | Steps | Triggered by |
|---|---|---|---|
| `core` | what the platform is for, and how the dashboard is laid out | 9 (`buddy` … `tabs`) | the first dashboard visit, by itself — there is nothing to open first |
| `companions` | the buddy, and what XP unlocks | 3 (`buddy-corner` … `outfits`) | the first entry into the buddy menu, either button |
| `goals` | setting a goal, start to finish | 8 (`goals` … `goal-set`) | the first tap on a set-a-goal CTA |
| `exercises` | the list, the three kinds, and inside a real exercise | 12 (`to-training` … `done`) | the first tap on the Exercises tab |

## Server

`StudentTourState (Id, StudentId, Section, OfferedAt)` with a UNIQUE index on `(StudentId, Section)`;
`GET /student-progress/tour-state/{studentId}` returns the sections offered; `POST
/student-progress/tour-state` records one with `ON CONFLICT ... DO NOTHING`. A row means "offered, do
not ask again" — it does NOT mean watched, which is why saying "not now" writes the same row.

## Client

- `onboardingTour.ts`: `TourSection`, a `section` field on every step, `sectionBounds(section)`,
  `hasOfferedSection` / `recordSectionOffered` / `shouldOfferSection` / `syncOfferedSections`, and
  `startSectionTour` / `finishSectionTour`. The local cache is per student and per tour version; the
  server's rows are the truth and are reconciled on dashboard load without blocking the first paint.
- `OnboardingTour.tsx` plays ONE section: it reads the section from the step it opened on, starts at
  that section's first step, ends at its last, disables Back on the first, and counts
  "Step n of <section length>".
- `TourOffer.tsx` — the one-time offer ("Show me" / "Not now"), a blocking dialog because the student was
  on their way somewhere else and the answer is take-it-or-carry-on.
- `ShowSectionTourButton.tsx` — the standing invitation, in the goals section header, the exercises
  summary and the buddy menu; the dashboard's `?` pill replays the core section.
- `StudentDashboard.openOrOffer(section, then)`: on the first entry the offer appears and the action the
  student asked for is held and run if they dismiss. Accepting plays the section instead — the tour
  demonstrates the part with its own read-only picker, so opening the real one underneath would leave
  them two dialogs deep.

## Migration

A student who watched the old single tour has only the old localStorage flag. On first dashboard load
that flag is mirrored to the server as all four sections, so splitting the tour does not re-tour everyone
who had already seen it. `finishSectionTour` keeps writing that legacy flag for the core section.

## Verified

- Endpoints: `GET` empty → `{"sections":[]}`; `POST` 200 twice leaves ONE row; a bad body 400s.
- The split: 32 steps, four contiguous sections, no step left untagged.
- `npx tsc --noEmit` clean, `eslint` clean (one pre-existing warning), `npm run build` succeeds, and Vite
  transforms the changed modules.
- Regression: bank harness "All checks passed", session reflection 27/27, goal window 16/16, baseline
  residue `{0,0,0}`.

**Not verified:** any of it in a browser. The offer/accepted/dismissed flows and the per-section buttons
have not been clicked.

## Also uncommitted at the time of writing

Nothing — the reflection fixes and this are both committed and pushed.

