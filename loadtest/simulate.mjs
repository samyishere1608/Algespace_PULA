/**
 * Runs a simulated cohort of students against the server.
 *
 *   node loadtest/simulate.mjs                              # 120 students, 3 minutes, real think time
 *   node loadtest/simulate.mjs --students 40 --duration 120
 *   node loadtest/simulate.mjs --students 120 --time-scale 0.2
 *
 * For the same thing with charts and buttons: `node loadtest/ui/server.mjs`.
 */

import { runStudentSimulation, DEFAULTS } from "./lib/pipeline.mjs";
import { ms, renderTable } from "./lib/stats.mjs";

function parseArgs(argv) {
    const args = { ...DEFAULTS };
    const numbers = ["students", "durationSeconds", "timeScale", "rps", "timeoutMs"];
    const booleans = ["includeAi", "allowRemote", "keep", "forcePurge", "help"];

    const aliases = { duration: "durationSeconds", "time-scale": "timeScale", "include-ai": "includeAi",
                      "allow-remote": "allowRemote", "force-purge": "forcePurge" };

    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (!token.startsWith("--")) continue;

        const raw = token.slice(2);
        const key = aliases[raw] ?? raw;

        if (booleans.includes(key)) { args[key] = true; continue; }

        const value = argv[++i];
        if (value === undefined) throw new Error(`${token} needs a value`);
        args[key] = numbers.includes(key) ? Number(value) : value;
    }

    return args;
}

const USAGE = `
Simulate a cohort of students using AlgeSpace.

  --students <n>       how many students are using the platform at the same time (default 120)
  --duration <seconds> how long to run (default 180 — a session takes minutes, so short runs
                       only measure the ramp-up)
  --time-scale <f>     compress think time (1 = real). THIS INCREASES LOAD: 0.2 with 120 students
                       is 600 students' worth of traffic, useful for finding headroom but not for
                       answering "can 120 use it"
  --base <url>         target, default http://localhost:7273
  --include-ai         also call the AI reflection endpoint (spends real money, adds model latency)
  --keep               leave the data the run wrote instead of purging it
  --allow-remote       permit a target that is not localhost
  --json <file>        write the full result as JSON
`;

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) { console.log(USAGE); return 0; }

    let lastTick = 0;

    const result = await runStudentSimulation(args, (event) => {
        if (event.type === "environment") {
            const { databases, disk, diskBaseline } = event.environment;
            console.log(`\nAlgeSpace student simulation\n`);
            console.log(`  databases     ${databases.map((d) => `${d.name} ${d.journal}`).join(", ")}`);
            console.log(`  disk          ${disk.msPerCommit.toFixed(2)} ms/commit here, ` +
                        `${diskBaseline.msPerCommit.toFixed(2)} ms in temp`);
        }

        if (event.type === "accounts" && event.ready === event.wanted) {
            console.log(`  accounts      ${event.ready} ready`);
        }

        if (event.type === "ids") {
            const { suitability, efficiency, matching, total } = event.found;
            console.log(`  exercises     ${total} catalogued, ${suitability + efficiency + matching} usable ids`);
        }

        if (event.type === "stage" && event.stage === "running") {
            console.log(`  run           ${event.message}\n`);
            console.log("  " + "elapsed".padEnd(9) + "sessions".padEnd(10) + "requests");
        }

        if (event.type === "tick") {
            // One line, rewritten in place: a scroll of 90 ticks would bury the result.
            if (event.elapsed - lastTick < 1) return;
            lastTick = event.elapsed;
            process.stdout.write(`\r  ${(event.elapsed.toFixed(0) + "s").padEnd(9)}` +
                                 `${String(event.completedSessions).padEnd(10)}${event.counters.attempts}`);
        }

        if (event.type === "result") return;
        if (event.type === "error") console.error(`\n  error         ${event.message}`);
    });

    const { summary, integrity, notes, simulation } = result;

    console.log(`\n\n  requests      ${summary.total.toLocaleString()} in ${summary.wallSeconds.toFixed(1)}s ` +
                `(${summary.achievedRps.toFixed(1)} req/s)`);
    console.log(`  sessions      ${simulation.completedSessions} completed by ${result.students} students`);
    console.log(`  ok            ${(summary.countsByClass.ok ?? 0).toLocaleString()}`);
    for (const [klass, count] of Object.entries(summary.countsByClass)) {
        if (klass === "ok" || count === 0) continue;
        console.log(`  ${klass.padEnd(13)} ${count.toLocaleString()}`);
    }
    console.log(`  failed        ${summary.failed} (${(summary.failureRate * 100).toFixed(2)}%)\n`);

    console.log("Per action, sorted by p99\n");
    console.log(renderTable(["action", "req", "fail", "p50", "p95", "p99", "max"],
        summary.perStep.slice(0, 30).map((row) => [
            row.name, String(row.requests), String(row.failed),
            ms(row.p50), ms(row.p95), ms(row.p99), ms(row.max),
        ])));

    console.log("\nWhat the run wrote\n");
    console.log(renderTable(["check", "result", "detail"],
        integrity.map((check) => [
            check.id,
            check.passed ? "pass" : check.regression ? "FAIL" : "pre-existing",
            check.detail,
        ])));

    if (notes.length > 0) {
        console.log("\nNotes\n");
        for (const note of notes) console.log(`    [${note.level}] ${note.title}\n      ${note.detail}\n`);
    }

    const cleanup = result.cleanup;
    console.log("");
    if (cleanup?.skipped) console.log(`  cleanup       skipped (--keep)`);
    else if (cleanup?.refused) console.log(`  cleanup       refused: ${cleanup.reason}`);
    else if (cleanup?.failed) console.log(`  cleanup       FAILED: ${cleanup.failed}`);
    else if (cleanup?.removed) console.log(`  cleanup       ${cleanup.removed.length === 0
        ? "nothing to remove" : cleanup.removed.map(([t, n]) => `${t} ${n}`).join(", ")} (accounts kept)`);

    const failedChecks = integrity.filter((check) => check.regression);

    if (args.json) {
        const { writeFileSync } = await import("node:fs");
        writeFileSync(args.json, JSON.stringify(result, null, 2));
        console.log(`  report        ${args.json}`);
    }

    console.log(`\n  result        ${result.clean ? "clean" : "problems found"}\n`);
    return failedChecks.length > 0 || !result.clean ? 1 : 0;
}

main()
    .then((code) => process.exit(code))
    .catch((error) => {
        console.error(`\nSimulation aborted: ${error.message}\n`);
        process.exit(1);
    });
