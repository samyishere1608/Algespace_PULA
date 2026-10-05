/**
 * The load-test driver.
 *
 *   node loadtest/run.mjs                                  # 10 workers, 20s, both reads and writes
 *   node loadtest/run.mjs --profile read --concurrency 25
 *   node loadtest/run.mjs --profile write --duration 30 --rps 0
 *   node loadtest/run.mjs --scenario goals.crud --concurrency 20
 *
 * RUN IT AGAINST A DEVELOPMENT SERVER. In Development there is no API key and no JWT middleware, and
 * writes land in the local database files. Against a deployed server this would create real students
 * and real data.
 */

import { createClient, CLASS, FAILED_CLASSES } from "./lib/api.mjs";
import { describe, groupBy, ms, renderTable } from "./lib/stats.mjs";
import { resolveStudent, discoverIds, discoverCkIds, purgeStudent, countRows, inspectDatabases, keyTableCounts, measureCommitCost, waitForReadable, DATABASES_DIR, EXERCISE_TYPE } from "./lib/fixtures.mjs";
import { runIntegrity } from "./lib/integrity.mjs";
import { SCENARIOS, selectable } from "./scenarios.mjs";
import { tmpdir } from "node:os";

// ── Arguments ────────────────────────────────────────────────────────────────

function parseArgs(argv) {
    const args = {
        base: "http://localhost:7273",
        username: "lt_runner",
        password: "loadtest-pw",
        language: "en",
        concurrency: 10,
        duration: 20,
        // The server rate-limits to 1000 requests per minute per host and does not queue, so anything
        // above ~16 rps collects 429s and measures the limiter instead of the database. The default
        // sits just under it. `--rps 0` removes the cap and makes the limiter itself the subject.
        rps: 15,
        profile: "mixed",
        scenario: null,
        apiKey: undefined,
        timeoutMs: 15000,
        // Abandoning a request does NOT cancel the work server-side: a timed-out write keeps running
        // and keeps holding the lock. A run that follows a run which timed out therefore measures the
        // previous run's backlog as well as its own. Waiting a moment lets that drain first.
        settle: 3,
        keep: false,
        forcePurge: false,
        includeAi: false,
        allowRemote: false,
        json: null,
    };

    const numbers = ["concurrency", "duration", "rps", "timeoutMs", "settle"];
    const booleans = ["keep", "forcePurge", "includeAi", "allowRemote", "help"];

    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (!token.startsWith("--")) continue;
        const key = token.slice(2);

        if (booleans.includes(key)) { args[key] = true; continue; }
        const value = argv[++i];
        if (value === undefined) throw new Error(`${token} needs a value`);
        args[key] = numbers.includes(key) ? Number(value) : value;
    }

    return args;
}

const USAGE = `
AlgeSpace load test

  --base <url>          target, default http://localhost:7273
  --profile <p>         read | write | mixed   (default mixed)
  --concurrency <n>     parallel workers, default 10
  --duration <seconds>  how long to run, default 20
  --rps <n>             global request cap per second, default 15, 0 = uncapped
  --scenario <names>    comma-separated subset, e.g. goals.crud,anchors.exercise
  --username <name>     the load-test account, default lt_runner
  --password <pw>       its password, default loadtest-pw
  --language <code>     exercise language, default en
  --api-key <key>       sent as X-API-Key; only needed outside Development
  --settle <seconds>    wait before starting, default 3, to let a previous run drain
  --include-ai          also exercise the chat endpoint (calls OpenAI, costs money)
  --keep                leave the data the run created instead of purging it
  --force-purge         purge data even if the account name does not look like a load-test one
  --allow-remote        permit a target that is not localhost
  --json <file>         also write the full report as JSON
`;

// ── Safety ───────────────────────────────────────────────────────────────────

function assertLocalTarget(base, allowRemote) {
    const host = new URL(base).hostname;
    if (allowRemote) return;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return;

    throw new Error(
        `Refusing to load-test ${base}: it is not localhost.\n` +
        "This suite registers an account and writes real rows. Pass --allow-remote if that is genuinely what you want.",
    );
}

/**
 * Whether the data may be purged afterwards.
 *
 * The purge deletes rows belonging to the account named on the command line. That is only safe if the
 * account really is the suite's own, so the name has to look like one. The account row itself is never
 * deleted, which is what keeps a mistake here survivable.
 */
function mayPurge(username, force) {
    return force || username.startsWith("lt_");
}

// ── Running ──────────────────────────────────────────────────────────────────

/** Weighted pick, so the scenario mix approximates a real session rather than a uniform storm. */
function pickScenario(pool, totalWeight) {
    let roll = Math.random() * totalWeight;
    for (const scenario of pool) {
        roll -= scenario.weight;
        if (roll <= 0) return scenario;
    }
    return pool[pool.length - 1];
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    if (args.help) {
        console.log(USAGE);
        return 0;
    }

    assertLocalTarget(args.base, args.allowRemote);

    const samples = [];
    // Setup traffic is excluded from the measurements: registering, discovering ids and purging are
    // one-off work whose latency says nothing about the server under load.
    let recording = false;
    const client = createClient({
        baseUrl: args.base,
        apiKey: args.apiKey,
        timeoutMs: args.timeoutMs,
        rps: args.rps,
        record: (sample) => { if (recording) samples.push(sample); },
    });

    console.log(`\nAlgeSpace load test\n`);
    console.log(`  target        ${args.base}`);
    console.log(`  profile       ${args.profile}`);
    console.log(`  concurrency   ${args.concurrency} worker(s)`);
    console.log(`  duration      ${args.duration}s`);
    console.log(`  rate cap      ${args.rps === 0 ? "none" : `${args.rps} req/s`}\n`);

    // Reported up front because it explains most of what the run measures. See inspectDatabases.
    const databases = inspectDatabases();
    console.log(`  databases     ${databases.map((entry) =>
        `${entry.name} ${entry.journal} ${entry.megabytes.toFixed(1)}MB`).join(", ")}`);

    // Also up front, because latency that grows with the data is a different problem from latency that
    // grows with concurrency, and these numbers are what make two runs comparable.
    const rows = keyTableCounts();
    console.log(`  students.db   ${Object.entries(rows).map(([table, n]) => `${table} ${n}`).join(", ")}`);

    // The single most explanatory number in this report. SQLite commits with an fsync, so the cost of
    // one commit is a property of the volume — and because SQLite allows one writer at a time, that
    // cost sets the ceiling for every write route regardless of the query. It is measured twice, here
    // and in the OS temp folder, so a slow volume is visible as a RATIO rather than as a number the
    // reader has to judge on its own.
    const disk = measureCommitCost(DATABASES_DIR);
    const diskBaseline = measureCommitCost(tmpdir());
    const diskRatio = diskBaseline.msPerCommit > 0 ? disk.msPerCommit / diskBaseline.msPerCommit : 0;
    console.log(`  disk          ${disk.msPerCommit.toFixed(2)} ms per committed row where the database lives`);
    console.log(`                ${diskBaseline.msPerCommit.toFixed(2)} ms in the OS temp folder ` +
                `(${diskRatio.toFixed(0)}x slower)  [${disk.journalMode}]\n`);

    // ── Setup ────────────────────────────────────────────────────────────────
    process.stdout.write("  setup         ");
    const student = await resolveStudent(client, { username: args.username, password: args.password });
    const ids = await discoverIds(client, { language: args.language });
    ids.ck = await discoverCkIds(client);

    if (!ids.ok) {
        console.log(`\n\nCould not read the exercise catalogue: ${ids.reason}`);
        console.log("Is the backend running, and did it seed its exercises on startup?");
        return 1;
    }

    console.log(`student ${student.id}, ${ids.total} exercises`);
    console.log(
        `  ids           suitability ${ids.byType[EXERCISE_TYPE.Suitability].length}, ` +
        `efficiency ${ids.byType[EXERCISE_TYPE.Efficiency].length}, ` +
        `matching ${ids.byType[EXERCISE_TYPE.Matching].length}, ` +
        `ck ${ids.ck ? Object.values(ids.ck).flat().length : 0}`,
    );

    // ── Scenario pool ────────────────────────────────────────────────────────
    let pool = selectable(SCENARIOS, ids);

    if (!args.includeAi) pool = pool.filter((scenario) => !scenario.externalCost);

    if (args.profile === "read") pool = pool.filter((scenario) => scenario.kind === "read");
    if (args.profile === "write") pool = pool.filter((scenario) => scenario.kind === "write");

    if (args.scenario) {
        const wanted = new Set(args.scenario.split(",").map((name) => name.trim()).filter(Boolean));
        const unknown = [...wanted].filter((name) => !SCENARIOS.some((scenario) => scenario.name === name));
        if (unknown.length > 0) {
            console.log(`\nUnknown scenario(s): ${unknown.join(", ")}`);
            console.log(`Available: ${SCENARIOS.map((scenario) => scenario.name).join(", ")}`);
            return 1;
        }
        pool = pool.filter((scenario) => wanted.has(scenario.name));
    }

    if (pool.length === 0) {
        console.log("\nNo scenarios selected — nothing to run.");
        return 1;
    }

    const skipped = SCENARIOS.filter((scenario) => !pool.includes(scenario) && !scenario.externalCost);
    console.log(`  scenarios     ${pool.map((scenario) => scenario.name).join(", ")}`);
    if (skipped.length > 0) {
        console.log(`  skipped       ${skipped.map((scenario) => scenario.name).join(", ")} (not selectable)`)
    }
    console.log("");

    // ── Baseline ─────────────────────────────────────────────────────────────
    // Taken BEFORE the load, so the report can tell a problem this run caused apart from one the
    // database already had. Comparing against a baseline is also what stops an old failure from
    // hiding a new one behind a familiar result.
    const baseline = new Map(runIntegrity({ studentIds: [student.id] }).map((check) => [check.id, check]));
    const rowCountsBefore = countRows(student.id);

    // ── Run ──────────────────────────────────────────────────────────────────
    const totalWeight = pool.reduce((sum, scenario) => sum + scenario.weight, 0);
    const iterations = new Map();
    // Both ends of every expectation: `X` is what was confirmed, `XMax` adds the writes whose
    // responses never arrived. See the note on ranges in lib/integrity.mjs.
    const expected = { attempts: 0, attemptsMax: 0, goalCompletions: 0, goalCompletionsMax: 0 };
    const scenarioErrors = [];

    if (pool.some((scenario) => scenario.name === "goals.crud")) {
        expected.activeGoals = 0;
        expected.activeGoalsMax = 0;
    }

    let stop = false;

    if (args.settle > 0) {
        process.stdout.write(`  settle        ${args.settle}s for any previous run to drain\n\n`);
        await new Promise((resolve) => setTimeout(resolve, args.settle * 1000));
    }

    // Measured from after the settle, so the configured duration is the time actually under load.
    const started = performance.now();
    const deadline = started + args.duration * 1000;

    recording = true;

    async function worker(workerId) {
        while (!stop) {
            const scenario = pickScenario(pool, totalWeight);

            try {
                const counters = await scenario.run({
                    api: client.forScenario(scenario.name),
                    student,
                    ids,
                    password: args.password,
                });

                iterations.set(scenario.name, (iterations.get(scenario.name) ?? 0) + 1);

                for (const [key, value] of Object.entries(counters ?? {})) {
                    expected[key] = (expected[key] ?? 0) + value;
                }
            } catch (error) {
                // A scenario that throws must not take the run down: the failure is recorded and the
                // worker carries on, because a suite that stops at the first surprise tells you less
                // than one that keeps going and reports it.
                scenarioErrors.push(`worker ${workerId} / ${scenario.name}: ${error?.message ?? error}`);
            }

            if (performance.now() >= deadline) stop = true;
        }
    }

    const timer = setTimeout(() => { stop = true; }, args.duration * 1000);
    await Promise.all(Array.from({ length: args.concurrency }, (_, index) => worker(index + 1)));
    clearTimeout(timer);

    const wallSeconds = (performance.now() - started) / 1000;
    recording = false;

    // ── Report ───────────────────────────────────────────────────────────────
    const byClass = groupBy(samples, (sample) => sample.klass);
    const countsByClass = Object.fromEntries([...byClass].map(([klass, list]) => [klass, list.length]));

    const total = samples.length;
    const failed = samples.filter((sample) => FAILED_CLASSES.includes(sample.klass)).length;

    console.log(`  requests      ${total.toLocaleString()} in ${wallSeconds.toFixed(1)}s  (${(total / wallSeconds).toFixed(1)} req/s achieved)`);
    console.log(`  ok            ${(countsByClass[CLASS.OK] ?? 0).toLocaleString()}`);
    for (const klass of FAILED_CLASSES) {
        const count = countsByClass[klass] ?? 0;
        if (count > 0) console.log(`  ${klass.padEnd(13)} ${count.toLocaleString()}`);
    }
    console.log(`  failed        ${failed.toLocaleString()} (${total === 0 ? "0" : ((failed / total) * 100).toFixed(2)}%)\n`);

    // Per scenario.
    const perScenario = [...groupBy(samples, (sample) => sample.scenario)]
        .map(([name, list]) => {
            const stats = describe(list.map((sample) => sample.ms));
            const bad = list.filter((sample) => FAILED_CLASSES.includes(sample.klass)).length;
            return [
                name,
                String(iterations.get(name) ?? 0),
                String(stats.count),
                String(bad),
                ms(stats.p50),
                ms(stats.p95),
                ms(stats.p99),
                ms(stats.max),
            ];
        })
        .sort((a, b) => Number(b[2]) - Number(a[2]));

    console.log(renderTable(
        ["scenario", "iter", "req", "fail", "p50", "p95", "p99", "max"],
        perScenario,
    ));

    // Per step — the table that answers "which endpoint is the problem".
    const perStep = [...groupBy(samples, (sample) => `${sample.scenario} / ${sample.step}`)]
        .map(([name, list]) => {
            const stats = describe(list.map((sample) => sample.ms));
            const bad = list.filter((sample) => FAILED_CLASSES.includes(sample.klass)).length;
            return [name, String(stats.count), String(bad), ms(stats.mean), ms(stats.p95), ms(stats.p99), ms(stats.max)];
        })
        .sort((a, b) => Number(b[5]) - Number(a[5]));

    console.log(`\nPer step (sorted by p99)\n`);
    console.log(renderTable(["scenario / step", "req", "fail", "mean", "p95", "p99", "max"], perStep.slice(0, 40)));

    // ── What the run left behind ─────────────────────────────────────────────
    // A write the client abandoned keeps running server-side, so the file can still be locked when
    // the run ends. Waiting briefly keeps a temporary lock from being reported as a data problem.
    const stillLocked = await waitForReadable(10000);
    if (stillLocked) {
        console.log(`\n  warning       the database was still locked after waiting 10s: ${stillLocked.message}`);
        console.log("                Integrity results below are unreliable — the run left writes in flight.");
    }

    const integrity = runIntegrity({ studentIds: [student.id], expectations: expected, baseline: rowCountsBefore });

    // A check that was already failing before the run is reported as pre-existing and does not fail
    // the run; only a check that went from clean to dirty is this run's responsibility.
    for (const check of integrity) {
        const before = baseline.get(check.id);
        check.regression = !check.passed && !(before && !before.passed);
        check.preExisting = !check.passed && !check.regression;
    }

    const integrityFailed = integrity.filter((check) => check.regression);
    const preExisting = integrity.filter((check) => check.preExisting);

    console.log(`\nIntegrity\n`);
    console.log(renderTable(
        ["check", "result", "detail"],
        integrity.map((check) => [
            check.id,
            check.passed ? "pass" : check.regression ? "FAIL" : "pre-existing",
            check.detail,
        ]),
    ));

    // ── Notes ────────────────────────────────────────────────────────────────
    const notes = [];

    if ((countsByClass[CLASS.BUSY] ?? 0) > 0) {
        notes.push(
            `${countsByClass[CLASS.BUSY]} request(s) failed because SQLite could not take the lock.\n` +
            "      This is the finding worth acting on: writes are serialising and losing.",
        );
    }

    if ((countsByClass[CLASS.THROTTLED] ?? 0) > 0) {
        notes.push(
            `${countsByClass[CLASS.THROTTLED]} request(s) were throttled (429).\n` +
            "      The server allows 1000 requests/minute per host, with no queue, so the app ceiling is\n" +
            "      about 16.7 req/s in total. Run with --rps 15 to measure the database instead.",
        );
    }

    if ((countsByClass[CLASS.SERVER] ?? 0) > 0) notes.push(`${countsByClass[CLASS.SERVER]} request(s) returned 5xx.`);
    if ((countsByClass[CLASS.TIMEOUT] ?? 0) > 0) notes.push(`${countsByClass[CLASS.TIMEOUT]} request(s) timed out after ${args.timeoutMs} ms.`);
    if ((countsByClass[CLASS.NETWORK] ?? 0) > 0) notes.push(`${countsByClass[CLASS.NETWORK]} request(s) could not reach the server.`);
    if (scenarioErrors.length > 0) notes.push(`${scenarioErrors.length} scenario error(s): ${scenarioErrors.slice(0, 3).join(" | ")}`);

    if (preExisting.length > 0) {
        notes.push(
            `${preExisting.length} integrity check(s) were ALREADY failing before this run ` +
            `(${preExisting.map((check) => check.id).join(", ")}).\n` +
            "      Reported as pre-existing, not as regressions — but they are real, and worth fixing.",
        );
    }

    for (const entry of databases) {
        if (entry.journal.toLowerCase() === "wal") continue;
        notes.push(
            `${entry.name} is in journal mode "${entry.journal}", not WAL.\n` +
            "      In that mode a writer excludes readers and readers exclude writers, so one write\n" +
            "      serialises the whole file. WAL lets reads continue against the last committed\n" +
            "      snapshot during a write, and is the cheapest change available here.",
        );
    }

    // The floor on every write, and the thing to fix first if it is high. Nothing in the application
    // can get below the cost of one commit, because SQLite permits only one writer at a time.
    if (diskRatio >= 5) {
        notes.push(
            `One committed row costs ${disk.msPerCommit.toFixed(1)} ms where the database lives, against ` +
            `${diskBaseline.msPerCommit.toFixed(2)} ms in\n` +
            `      the OS temp folder — ${diskRatio.toFixed(0)}x slower.\n` +
            "      This is the floor on every write route, and the likely reason for the latencies above:\n" +
            "      SQLite commits with an fsync and allows only one writer at a time, so concurrent writes\n" +
            "      queue behind it. Move the database files to a faster volume before tuning the code.",
        );
    }

    if (notes.length > 0) {
        console.log(`\nNotes\n`);
        for (const note of notes) console.log(`    - ${note}`);
    }

    // ── Cleanup ──────────────────────────────────────────────────────────────
    console.log("");
    if (args.keep) {
        console.log(`  cleanup       skipped (--keep). Left behind: ${JSON.stringify(countRows(student.id))}`);
    } else if (!mayPurge(args.username, args.forcePurge)) {
        console.log(
            `  cleanup       REFUSED — "${args.username}" does not look like a load-test account.\n` +
            "                Pass --force-purge if you really meant it, or --keep to leave the data.",
        );
    } else {
        try {
            const removed = purgeStudent(student.id);
            const summary = removed.length === 0
                ? "nothing to remove"
                : removed.map(([table, n]) => `${table} ${n}`).join(", ");
            console.log(`  cleanup       ${summary} (account kept)`);
        } catch (error) {
            // Reported rather than swallowed: leftover rows change what the NEXT run's baseline is,
            // so a failed purge has to be visible.
            console.log(`  cleanup       FAILED: ${error.message}`);
        }
    }

    if (args.json) {
        const { writeFileSync } = await import("node:fs");
        writeFileSync(args.json, JSON.stringify({
            args, student: student.id, wallSeconds, total, countsByClass,
            perScenario, perStep, integrity, notes, expectations: expected,
        }, null, 2));
        console.log(`  report        ${args.json}`);
    }

    // Non-zero when either the data or the requests showed a problem, so this can gate a commit.
    const hardFailures = ["busy", "server", "timeout", "network"].some((klass) => (countsByClass[klass] ?? 0) > 0);
    const exitCode = integrityFailed.length > 0 || hardFailures ? 1 : 0;
    console.log(`\n  result        ${exitCode === 0 ? "clean" : "problems found"}\n`);
    return exitCode;
}

main()
    .then((code) => process.exit(code))
    .catch((error) => {
        console.error(`\nLoad test aborted: ${error.message}\n`);
        process.exit(1);
    });
