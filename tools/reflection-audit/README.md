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
