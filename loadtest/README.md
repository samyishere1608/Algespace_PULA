# Load testing

A concurrency test suite for the student-facing backend.

It does two things at once, and the second one is the point:

1. **Drives the API under load** — many parallel workers running realistic scenarios (loading
   exercises, writing anchor records, setting goals) for a fixed duration.
2. **Checks the data afterwards** — every invariant it can express in SQL, plus exact row counts for
   what the run believes it created.

Throughput alone tells you the server stayed up. Only the data tells you it stayed *correct*, and a
lost write still returns `200`, so nothing else would notice one.

---

## Quick start

The backend must be running in Development:

```powershell
cd webapi
$env:ASPNETCORE_ENVIRONMENT='Development'
dotnet run
```

Then, from the repository root:

```powershell
node loadtest/run.mjs                                    # 10 workers, 20s, reads and writes
node loadtest/run.mjs --duration 60 --concurrency 20      # longer, wider
node loadtest/run.mjs --profile write                     # only the write paths
node loadtest/run.mjs --profile read --concurrency 40     # only reads
node loadtest/run.mjs --scenario goals.crud,anchors.exercise
node loadtest/run.mjs --timeoutMs 60000 --settle 5            # for stressing the write path
node loadtest/run.mjs --json loadtest/report.json         # machine-readable copy
node loadtest/run.mjs --help
```

No dependencies. It runs on the Node already used elsewhere in this project (`node:sqlite`,
`fetch`).

---

## Two ways to run

**`simulate.mjs` — students, not endpoints.** This is the one that answers "can N students use the
platform". It creates one account per student and runs each through the real journey — dashboard,
exercise, decisions, self-explanation, completion, goal completion, reflection — with realistic think
time between actions, then checks that every write it made landed.

```powershell
node loadtest/simulate.mjs                                 # 120 students, 3 minutes, real pace
node loadtest/simulate.mjs --students 40 --duration 120
node loadtest/simulate.mjs --students 120 --time-scale 0.25  # 4x the traffic, to find the ceiling
```

Real think time needs a run of several minutes. A session takes a student minutes, so a 30-second run
only measures the ramp-up — not the steady state a class actually produces.

**`run.mjs` — endpoints, for finding which route is slow.** Weighted scenarios fired at a fixed
concurrency, with a per-step latency table. Use it when the simulation says something is slow and you
need to know which call it is.

**The test page** wraps the student simulation in a form with live progress and results:

```powershell
node loadtest/ui/server.mjs       # → http://localhost:4599
```

---

## Every write in the student flow

The complete list, in the order a student causes them. This is what the simulation reproduces and what
the `expect.*` checks verify.

**Every row below is exercised as of 2026-10-05.** That was not true before: the map was written from
the client code and was already accurate, but the simulation was only reproducing the first twelve
rows, so `tutorial`, `exercises` and `trackRecord` were documented and then never actually run.

| What the student does | Endpoint | Rows touched |
|---|---|---|
| Opens an exercise | `PUT /anchor-tracking/createEntry` | `FlexibilityAttempt` insert |
| Works the exercise | `POST /anchor-tracking/addActionToEntry` | `AnchorRecord` upsert, plus an `UPDATE` on the attempt when the method is chosen |
| Finishes a step | `POST /anchor-tracking/completePhaseTracking` | `AnchorRecord` upsert |
| Makes a decision | `POST /anchor-tracking/trackChoice` | `AnchorRecord` upsert |
| — | `POST /anchor-tracking/trackType` | `AnchorRecord` upsert |
| Answers a nudge | `POST /anchor-tracking/trackRecord` | `AnchorRecord` upsert |
| Closes the exercise | `POST /anchor-tracking/completeTracking` | `FlexibilityAttempt` update |
| Finishes the exercise | `POST /student-progress/log-exercise` | `StudentProgress` upsert + `ExerciseLog` insert |
| Earns Choice / Insight / Resolve | `POST /student-progress/log-agency-xp` | `StudentProgress` upsert + `AgencyLog` insert |
| Sets a goal | `POST /student-progress/goals` | `ActiveGoals` insert |
| Completes a goal | `POST /student-progress/log-goal` | `GoalCompletions` insert, `StudentProgress` update, **`ReflectionQueue` insert + cap update** |
| — | `POST /student-progress/goals/remove` | `ActiveGoals` delete |
| Writes a reflection | `POST /student-progress/reflection/complete` | `ReflectionQueue` update + `ReflectionHistory` insert **per turn** |
| Advances the tutorial | `POST /student-progress/tutorial/{id}` | `StudentProgress` update |
| Finishes an onboarding exercise | `POST /student-progress/exercises/{id}` | `ExerciseCompletions` insert |

**A full exercise is roughly 25–30 commits**, and the ones worth watching are marked in bold:

- **`log-goal`** is four statements in one request, one of which is the reflection-queue cap — an
  `INSERT` followed by an `UPDATE` that keeps the newest three. That is a read-modify-write across two
  statements, the classic shape that concurrency breaks.
- **`reflection/complete`** writes one history row *per turn*, so the cost scales with how much the
  student wrote.

**CORRECTION (2026-10-04): `EnsureTables` no longer runs per request.** It was guarded with a
process-wide `_schemaChecked` flag and moved to startup via `StudentProgressController.InitializeSchema()`,
so the ~20 DDL statements now run once for the process instead of on every request.

For the record, it was **never the cause of the latency measured here** — the anchor write route does
no DDL at all and failed identically, with the same `database is locked`. Moving it was a correctness
fix, not a performance fix: it had no measurable effect on the failure rate (35.7% before and after).

---

## Reading the report

```
scenario             iter  req  fail  p50  p95  p99   max
-------------------  ----  ---  ----  ---  ---  ----  ----
anchors.exercise     15    135  0     51   237  412   592
exercises.detail     39    117  0     1.9  2.9  3.5   3.9
```

**The percentiles are the report.** A mean hides the handful of requests that waited on a database
lock, which is the only thing a concurrency test is looking for. `p99` and `max` are the columns to
read; if they are close to `p50`, the system is behaving.

Failures are classified rather than counted, because in this codebase they do not announce
themselves as `500`s — every controller wraps its work in `try/catch` and returns
`BadRequest(exception.Message)`, so a SQLite write that lost the lock arrives as **400 with
"database is locked" in the body**. The body is inspected first, so:

| class | meaning |
|---|---|
| `ok` | 2xx |
| `busy` | SQLite could not take the lock — **the class this suite exists to surface** |
| `throttled` | 429 from the rate limiter, a capacity ceiling rather than a bug |
| `client` / `server` | other 4xx / 5xx |
| `timeout` / `network` | deadline exceeded, or the server could not be reached |

---

## What is covered

| Scenario | Area | Kind |
|---|---|---|
| `exercises.catalogue` | Exercise index | read |
| `exercises.detail` | One exercise per type — the heaviest read (JSON blob + deserialise) | read |
| `exercises.ck` | Conceptual-knowledge and bartering exercises | read |
| `dashboard.load` | Progress, weakness analysis, tutorial state | read |
| `anchors.read` | Avoidance profile, goal event feed | read |
| `goals.read` | Active goals | read |
| `reflection.read` | Pending reflection queue | read |
| `anchors.exercise` | The full in-exercise write chain: open attempt, six tracking points, close | write |
| `progress.exercise` | End-of-exercise counters and agency XP | write |
| `goals.crud` | Set a goal, remove it again | write |
| `progress.goal` | Log a completed goal (also drives the reflection queue cap) | write |
| `auth.login` | Sign in — hashing plus a database read | write |
| `ai.chat` | The Pippin chat. **Opt-in** (`--include-ai`) — calls OpenAI on every request | write |

**Not covered, deliberately:** the `flexibility-study` and `ck-study` controllers. Those belong to the
separate study module, which needs a study and a participant set up in `studies.db` that this suite
does not create. They also write to a different database file, so they are not where the contention
this suite is looking for would appear.

`ai.chat` is excluded by default because a load test of the chat endpoint would spend real money
without measuring anything this suite cares about.

### Write route coverage — what the 120-student simulation touches

The table above describes the scenario runner (`run.mjs`). The **student simulation** (`simulate.mjs`)
walks the real journey and therefore touches the routes in `lib/session.mjs` only. Be precise about
this — "the load test passed" means the journey below passed, not that every writing route in the
application was exercised.

**Exercised (16 writing routes):** `student/register`, `student/authenticate`, `anchor-tracking` /
`createEntry`, `addActionToEntry`, `completePhaseTracking`, `trackChoice`, `trackType`,
`completeTracking`, `trackRecord`; `student-progress` / `log-exercise`, `log-goal`, `log-agency-xp`,
`goals`, `goals/remove`, `reflection/evaluate` (opt-in), `reflection/complete`; plus `tutorial` and
`exercises` (added 2026-10-05).

The last three were added after an audit showed they were live, wrote to `students.db`, and were not
being exercised. Each is modelled at the frequency the client actually calls it:

| Route | Client caller | Modelled frequency |
|---|---|---|
| `POST /student-progress/exercises/{id}` | `logFlexibilityMethodChoice`, from all **five** exercise components | **once per completed exercise** — a high-volume path, not a rare one |
| `POST /student-progress/tutorial/{id}` | `setOnboardingStep` | 15% of sessions — only while a student is still onboarding |
| `POST /anchor-tracking/trackRecord` | `useFlexibilityTracker` on a declined nudge | 12% of sessions — needs a sustained gap first |

**Two of the three needed a different kind of expectation:**

- `exercises/{id}` is **idempotent** on `(studentId, category, exerciseKey, exerciseId)` — it SELECTs
  first and only INSERTs when nothing matches. So the expected row count is the number of **distinct
tuples**, not the number of calls, and the session tracks a tuple set rather than a counter.
- `tutorial/{id}` is an **UPDATE to a JSON array**, so a row count cannot see it — the row exists
  either way. Instead every call appends a key with a known prefix, and the number of times that
  prefix occurs across the cohort *is* the number of writes that landed (derived from two `LENGTH()`
  results divided by the marker length, because SQLite has no string-count function).

**A first-run correction worth keeping.** The tutorial check initially failed with `5 row(s), expected
at least 6 — LOST WRITES`, and the server was innocent: the check counted marker *occurrences* but the
shared helper then added the pre-run *row* baseline on top. Occurrences cannot be inflated by rows that
already existed, so `exact()` grew a `noBaseline` option. **The check was wrong, not the write.**

**NOT exercised.** "Live?" means *can a real student reach this route today* — verified by searching
`reactapp/src` for a caller, not by assuming.

| Route | What it writes | Shares `students.db`? | Live? |
|---|---|---|---|
| `POST /student-progress/reflect-on-stats/{id}` | **NOTHING — reads only** | — | yes — dashboard free-text |
| `POST /student-progress/suggest-goals/{id}` | **NOTHING — reads only**, calls OpenAI | — | button removed from picker |
| `POST /chat/flexibility` | `ChatTranscript` | **YES** | **DEAD — the chat was removed from the app.** `PippinChat.tsx` is deleted and all three exercise components say so; the only caller left is this suite's own `scenarios.mjs`. |
| `POST /student-progress/spend-xp` | XP balance | **YES** | **DEAD — no caller anywhere.** Unlocks are milestone-based, never spent (`wardrobeUtils.ts`), and are localStorage-only. |
| `POST /logerror` | error log | **YES** | no frontend caller found |
| `POST`/`PUT` `.../setExercises` (elimination, equalization, substitution, bartering) | exercise sets | `algespace.db` | yes — authoring, not student traffic |
| `POST /analytics/nlp/run` | `NlpAnalysis` | **YES** (`students.db`, via `GetSQLiteConnectionForStudentsDB`) | batch job, not student traffic |
| `POST /user/authenticate`, `PUT /user/setUser` | study users | — | study module |

**Three of these are not load at all.** `chat/flexibility` and `spend-xp` are **dead** — no frontend
caller, so they receive no production traffic. And `reflect-on-stats` and `suggest-goals` turned out
on inspection to **write nothing**: they read progress and exercise history, call OpenAI, and return
text. Listing them as untested write routes was wrong, and it was corrected by reading the handlers
rather than trusting the earlier note.

**So the untested surface is now thin.** What remains is either dead, read-only, or outside student
traffic. The high-volume path — the exercise chain plus the per-exercise completion mark, ~25-30
commits per exercise — is fully exercised.

### The reflection TEXT is tested; its NLP CLASSIFICATION is not

Worth being explicit, because "reflections passed" can be read as "the NLP passed". It does not.

- **Tested:** `reflection/complete` writes `ReflectionHistory` rows. `expect.reflection-turns` verifies
  the count (424 rows in the last run), so the student's raw text does land under load.
- **NOT tested — the feature extraction.** `NlpFeatureExtractor.Extract` has exactly **two** callers:
  1. `EvaluateReflection` (`POST /student-progress/reflection/evaluate`), which extracts per-answer
     features inline for the off-topic gate and the feedback prompt. **This suite only calls that
     route with `--include-ai`, and the 120-student runs did not enable it** — it calls OpenAI, so it
     is opt-in. With it off, **zero** extraction happens.
  2. `NlpAnalysisService` (`POST /analytics/nlp/run`), the **batch job** that reads `ReflectionHistory`
     and writes `NlpAnalysis`. This suite never calls it.
- `reflection/complete` itself does **no** NLP — it only inserts history rows.
- Consequence: `NlpAnalysis` rows are never produced by a load run, and the purge still deletes any
  left over from a manual run (they are keyed by `HistoryId`, so they have to go before the history).
- So the load test answers "does reflection writing survive 120 students", **not** "does the classifier
  work". Classification is a pure, LLM-free function over one row's text — it is not a concurrency
  surface, which is why it was left out, but that is a deliberate choice and not coverage.

To exercise the inline path: `node loadtest/simulate.mjs --students 120 --include-ai` (spends real
money). To exercise the batch path: `POST /analytics/nlp/run` after a run, and read `NlpAnalysis`.

**Why this is less alarming than it looks.** The fix is not per-endpoint. `busy_timeout`,
`synchronous=NORMAL` and pooling are applied to **every connection** inside
`DBSettings.OpenConnection()`, so any writing route — exercised or not — automatically inherits the
protection. That is precisely why the fix was put there rather than at the call sites: an untested
write route gets the same lock handling as a tested one. **Untested is not the same as unprotected.**

**What is genuinely unknown:** the *combination*. Chat writes to the same `students.db` as the exercise
chain, so a class that is chatting heavily while exercising is a load shape this suite has never
produced. If chat turns out to be heavy in real use, run `simulate.mjs --include-ai` once, or add chat
to the session model. Nothing suggests a problem — the busy timeout covers it — but it is untested.

### Scenarios configure themselves

Exercise ids are **discovered by probing the running server**, never hardcoded. The exercise tables are
rewritten from code on every startup, so a hardcoded id would silently start returning 404 and the
suite would spend its run measuring a failure it caused itself. If an area yields no usable ids, its
scenario is skipped and the setup line says so — a 404 measures the fixture, not the server.

---

## Integrity checks

Run before and after the load. A check that was already failing is reported as **pre-existing** and
does not fail the run; only a check that went from clean to dirty is the run's responsibility. That
comparison is also what stops an old failure from hiding a new one behind a familiar result.

Each check reports the offending rows, not just how many there were — a check that says "6 problems"
cannot be acted on.

| Check | Rule |
|---|---|
| `anchors.orphans` | Every anchor record belongs to an attempt that exists |
| `anchors.blank-name` | No anchor record was written with an empty name |
| `anchors.duplicate-points` | No `(attempt, name)` pair was recorded twice |
| `attempts.blank-start` | No attempt was created without a start stamp |
| `attempts.orphan-student` | No attempt refers to a student that does not exist |
| `goals.duplicate-instance` | No goal instance was stored twice |
| `goals.dangling-student` | No goal refers to a student that does not exist |
| `goals.malformed` | Every stored goal has a category, an id and a positive target |
| `reflection.queue-cap` | No student has more than three pending reflections |
| `reflections.blank-role` | No reflection turn was stored without a role |
| `agency.orphan-student` | No agency XP row refers to a student that does not exist |
| `expect.attempts` | Attempts written match the iterations that completed |
| `expect.active-goals` | Goals left behind match what the goal scenario expects |
| `expect.goal-completions` | Goal completions match the log-goal calls that succeeded |

The `expect.*` checks are the strongest lost-write detector available: the runner counts how many
iterations of each write scenario finished all their steps, and that number has to match the rows.
They are offset by what the account already had, because the account is reused between runs.

---

## Safety

- **Refuses to run against a non-localhost target** unless `--allow-remote` is passed. This suite
  registers an account and writes real rows.
- **Uses one fixed account** (`lt_runner` by default), reused across runs — registration is a write to
  the same database the run is about to hammer.
- **Purges only that account's rows, and never deletes the account itself.** Deleting data is routine;
  deleting an account is not, and this code cannot tell a load-test account from a real one by looking
  at it. The purge additionally refuses unless the username starts with `lt_`, so a mistyped
  `--username` cannot wipe a real student's history. `--force-purge` overrides; `--keep` skips it.
- **`--no` writes is not a mode** — use `--profile read` to touch nothing but read endpoints. That is
  safe against any database.

---

## Findings from the reference runs

**The data stayed correct.** In every run, at every rate, all three `expect.*` counts matched and no
invariant was broken. Concurrency does not corrupt this database and does not drop writes. Whatever
follows is a performance problem, not a correctness one.

**Reads are fine. Writes collapse.**

Reads against either database, in isolation, 10 workers:

```
node loadtest/run.mjs --scenario goals.read    --duration 15 --concurrency 10
  goals.read / list    235 req    p50 2.5 ms   p99 4.6 ms   max 8.1 ms

node loadtest/run.mjs --scenario anchors.read  --duration 15 --concurrency 10
  anchors.read         240 req    p50 1.8 ms   p99 3.6 ms   max 5.4 ms
```

Writes, 8 workers, client timeout raised to 60 s so the numbers are the server's and not the
client's patience:

```
node loadtest/run.mjs --profile write --duration 25 --concurrency 8 --timeoutMs 60000
  requests      52 in 48.8s  (1.1 req/s achieved)
  ok            48
  busy          4          <- SQLite could not take the lock

  progress.exercise / log-exercise   max 32249 ms
  anchors.exercise  / createEntry    max 30173 ms
  anchors.exercise  / trackChoice    max 25593 ms
  anchors.exercise  / addAction      max 19342 ms
```

A single `INSERT` taking **30 seconds**, and some failing outright with "database is locked", at
**eight** concurrent writers. The 30-second ceiling is Microsoft.Data.Sqlite's default command
timeout: those requests waited for the lock until it expired.

Mixed load is affected too — at the server's own 15 req/s ceiling, 10 workers only reached 6.9 req/s
and 6 requests timed out.

### CORRECTED 2026-10-04 — the volume explains the LATENCY, not the FAILURES

The section below records how this was originally read. **Its conclusion was wrong** and is kept only
so the reasoning is not repeated. The measurement itself is still valid:

```
  disk          11.35 ms per committed row where the database lives
                0.44 ms in the OS temp folder (26x slower)
```

SQLite commits with an fsync and permits only one writer at a time, so the cost of one commit is the
floor on every write route. Measured under concurrent load the gap between the project folder and the
OS temp folder is **174 ms vs 0.42 ms — 416x**. Reads are unaffected because a read does not fsync,
which is exactly the observed pattern (p99 <= 22 ms for reads, seconds for writes).

The volume is a plain local NTFS drive, not a network share and not a sync folder, so nothing is
misconfigured — it is simply slow at synchronous writes. **It is a dev-machine artifact; a server SSD
will not behave this way.**

**BUT the disk was never the cause of the request failures.** The disk produces slow writes; it does
not produce `database is locked`. The real cause was visible only in the server's own error log:

```
  850 x SQLite Error 5: 'database is locked'  in one 120-student run
```

thrown from `LogExercise`, `LogAgencyXp`, `CompleteReflection`, `EnqueueReflection`,
`addActionToEntry`, `completeTracking`, `completePhaseTracking` and `trackChoice`. The database was
**refusing** writes, not merely serving them slowly. **Read the server log first — latency numbers
alone pointed at the wrong culprit.**

**Two other explanations were tested and disproved**, which is worth recording so they are not
re-investigated:

- **Data volume is not involved.** The whole database is 0.3 MB, `AnchorRecord` held 290 rows, and
  latency did not track any table's size. The commit benchmark writes to a brand-new empty table and
  reproduces the cost exactly.
- **The per-request DDL is not involved.** `StudentProgressController` runs its `EnsureTables` DDL on
  every request (~19 statements, most of them failing `ALTER`s), which looked like the obvious culprit.
  Running the anchor write chain — a route that does **no** DDL at all — gave the same failure mode:

  ```
  node loadtest/run.mjs --scenario anchors.exercise --duration 20 --concurrency 8 --timeoutMs 60000
    requests      57 in 41.6s  (1.4 req/s achieved)
    busy          4
    anchors.exercise / createEntry    max 30132 ms
  ```

**WAL is a secondary factor, not the cause.** Switching `students.db` to WAL improved throughput about
3x (0.9 to 2.8 req/s) but left the latencies at 23-26 seconds, because a 174 ms fsync dominates
whatever the journal mode saves. Worth doing regardless — it is standard for SQLite and it stops
readers being excluded by writers — but it did **not** stop the refusals.

**Thread-pool exhaustion was also tested and disproved.** `ThreadPool.SetMinThreads(300)` gave 29.8%
failures versus 35.7% without — no effect. It was removed again.

### THE FIX — and it is application code, not the disk

All four settings live in **one place**, `DBSettings.OpenConnection()`, so every connection gets them
and every write route inherits the fix:

| Setting | Why it is needed |
|---|---|
| `busy_timeout=5000` | A write that meets a lock now **waits** instead of failing. This is what converts a refusal into a short delay. |
| `synchronous=NORMAL` | The WAL-recommended pairing. The biggest single win on a slow disk. |
| `Pooling=True` | Reuses connections instead of reopening per call. |
| `BEGIN IMMEDIATE` on the anchor upsert | **The subtle one.** The upsert reads to decide insert-vs-update. A *deferred* transaction takes a read snapshot and then tries to upgrade to a writer — and under WAL that upgrade fails **immediately** with `database is locked` **without ever consulting `busy_timeout`**, because waiting cannot repair a stale snapshot. `conn.BeginTransaction(deferred: false)` takes the write lock up front. |

`busy_timeout` and `synchronous` are **per-connection**, so they must be set on every open — which is
why they live in `OpenConnection()` and not in a one-off PRAGMA.

WAL is set in code at startup (`DBSettings.EnableWriteAheadLogging()`, called from `Program.cs`) so a
fresh container does not start on the default rollback journal. Startup prints
`journal modes: students.db=wal, algespace.db=wal, studies.db=wal`.

### What to do, in order

1. **Nothing — it is already done and verified.** See the final result below.
2. **Re-measure on the deployment target.** The disk is 400x faster there, so these numbers should
   improve, not worsen. Do not carry the latency figures over.
3. **Decide where the production database lives** (container-local disk vs a mounted volume). A mounted
   volume is the one configuration that could reintroduce the fsync cost. The `disk` line at the top of
   a run answers this for whatever target you point it at.

### Final validated result (2026-10-04, 120 students, 240 s)

```
requests      7,768 in 321.2s  (24.2 req/s)
failed        0  (0.00%)            <- was 29.8-35.7%
lock errors   0 on the server       <- was 850
sessions      283 completed by 120 students   <- was 181
sanity        504 req / 15.4 req/s  <- was 370 req / 11.5 req/s
expect.attempts           pass  283 row(s), exactly as expected
expect.active-goals       pass   29 row(s), exactly as expected
expect.goal-completions   pass   37 row(s), exactly as expected
expect.agency-rows        pass  669 row(s), exactly as expected
expect.reflection-turns   pass  416 row(s), exactly as expected
result        clean
```

Note the `expect.*` checks are now **exact counts, not ranges** — previously they read
`100..153: 53 write(s) never got a reply`. Every write now lands.

### Re-run with extended coverage (2026-10-05, 120 students, 240 s)

Same parameters, after `tutorial`, `exercises` and `trackRecord` were added to the session model —
so this run carries ~890 more writes than the one above, on the same machine.

```
requests      8,655 in 311.3s  (27.8 req/s)
ok            8,655
failed        0  (0.00%)
lock errors   0 on the server       (the log held no error output at all)
sessions      303 completed by 120 students
expect.attempts              pass  303 row(s), exactly as expected
expect.active-goals          pass   32 row(s), exactly as expected
expect.goal-completions      pass   38 row(s), exactly as expected
expect.agency-rows           pass  714 row(s), exactly as expected
expect.reflection-turns      pass  424 row(s), exactly as expected
expect.exercise-completions  pass  249 row(s), exactly as expected   <- NEW
expect.tutorial-steps        pass   50 row(s), exactly as expected   <- NEW
expect.nudge-records         pass   39 row(s), exactly as expected   <- NEW
result        clean
```

**All eight checks exact on the first attempt**, at 27.8 req/s against a disk measured 34x slower than
local temp for commits. `expect.exercise-completions` is the interesting one: 249 rows from ~303
completed exercises, and the number is lower purely because the route is idempotent and 12 usable
exercise ids are shared across the cohort — which is exactly what the distinct-tuple expectation
predicts. It is the strongest available evidence that the idempotency logic is correct under
concurrency.

Deliberately NOT done: batching each endpoint's 2-4 statements into one transaction. The run is clean,
so it would be complexity for nothing.

### The rate limiter is a hard ceiling on the whole app

`Program.cs` configures a fixed window partitioned by `User.Identity?.Name ?? Host`, with
`QueueLimit = 0`. Anonymous requests all share ONE partition, so the ceiling is a TOTAL across all
students, not a per-student allowance — the student routes are addressed by id in the URL, not by a
token, so `User.Identity` is empty and the key falls through to the Host header.

**Raised from 1000 to 6000 req/min on 2026-10-03** — 100/sec, roughly 6x the measured load of 120
students (24.2 req/s = ~1,450 req/min), so a synchronised class start is absorbed rather than
rejected. Anything above the ceiling is an immediate 429, not a wait.

`QueueLimit = 0` is deliberate: the window is a whole minute wide, so queueing could hold a request
for up to a minute — worse for a student than a fast rejection, and there is no retry UI.

The ceiling is now a real headroom question rather than a hit limit. To test the limiter itself use
`--rps 0` on the scenario runner.

### A caution about aborted requests

When a request times out the client gives up, but **the server does not stop working**. The write
still runs, still holds the lock, and still commits. Two consequences the suite handles:

- Expectation counts are reported as a **range**, not a number — `min` is what came back confirmed,
  `max` adds the writes whose replies were lost. An earlier version compared against a single number
  and reported every timeout as "extra writes", i.e. it accused the server of a bug it had not
  committed.
- A run that follows a run which timed out measures the previous run's backlog as well. Hence
  `--settle` (default 3 s) before the clock starts.

### Lock contention arrives as two different status codes

Some controllers wrap their database work in `try/catch` and return `BadRequest(exception.Message)`, so
a lost lock arrives as **400** carrying "database is locked". Others do not — `LogAgencyXp` returns an
unhandled **500** with the same text. That is precisely why `classify()` inspects the response body
before the status code: a status-based count would file one as a client error and the other as a
server error, and neither as the lock contention it actually is.

---

## Layout

```
loadtest/
  run.mjs               driver, CLI, report
  scenarios.mjs         the scenario catalogue — one per feature area
  lib/api.mjs           timing HTTP client, outcome classification, rate gate
  lib/stats.mjs         percentiles, grouping, table rendering
  lib/fixtures.mjs      test account, id discovery, database inspection, purge
  lib/integrity.mjs     the post-run invariants
```

## A trap worth knowing

Exercise types are **not** the values you would guess. The backend enum is
`WorkedExamples 0, Efficiency 1, Suitability 2, Matching 3, TipExercise 4, PlainExercise 5`, and the
client also has a legacy three-member `FlexibilityExerciseType` (`Efficiency 0, Suitability 1,
Matching 2`) which is *not* what the API sends. Using the client's values against the API buckets every
exercise under the wrong type and drops Matching entirely. See `EXERCISE_TYPE` in `lib/fixtures.mjs`.
