/**
 * Turns raw samples and integrity results into the numbers a report shows.
 *
 * Shared by the command line and the test page so that both describe a run the same way. Two
 * renderers over one set of facts, rather than two implementations of the same arithmetic.
 */

import { describe, groupBy, ms } from "./stats.mjs";
import { CLASS, FAILED_CLASSES } from "./api.mjs";

/** Everything derivable from the request samples. */
export function summarise(samples, wallSeconds) {
    const countsByClass = {};
    for (const klass of [CLASS.OK, ...FAILED_CLASSES]) countsByClass[klass] = 0;
    for (const sample of samples) countsByClass[sample.klass] = (countsByClass[sample.klass] ?? 0) + 1;

    const failed = samples.filter((sample) => FAILED_CLASSES.includes(sample.klass)).length;

    const rowsFor = (keyFn) => [...groupBy(samples, keyFn)]
        .map(([name, list]) => ({
            name,
            requests: list.length,
            failed: list.filter((sample) => FAILED_CLASSES.includes(sample.klass)).length,
            ...describe(list.map((sample) => sample.ms)),
        }))
        .sort((a, b) => b.requests - a.requests);

    return {
        total: samples.length,
        wallSeconds,
        achievedRps: wallSeconds > 0 ? samples.length / wallSeconds : 0,
        countsByClass,
        failed,
        failureRate: samples.length === 0 ? 0 : failed / samples.length,
        perScenario: rowsFor((sample) => sample.scenario),
        // Sorted by p99 rather than by volume: this is the table that answers "what is slow".
        perStep: rowsFor((sample) => `${sample.scenario} · ${sample.step}`)
            .sort((a, b) => b.p99 - a.p99),
    };
}

/**
 * The things worth saying out loud about a run.
 *
 * Ordered by how much they should worry the reader: a lost write or a lock failure first, a capacity
 * ceiling last. Each note says what was seen and what it means, because a number on its own does not
 * tell you whether it is a problem.
 */
export function buildNotes({ summary, integrity, disk, diskBaseline, databases, simulation, args }) {
    const notes = [];

    const regressions = integrity.filter((check) => check.regression);
    const preExisting = integrity.filter((check) => check.preExisting);

    for (const check of regressions) {
        notes.push({ level: "bad", title: `Data check failed: ${check.id}`, detail: check.detail });
    }

    if ((summary.countsByClass[CLASS.BUSY] ?? 0) > 0) {
        notes.push({
            level: "bad",
            title: `${summary.countsByClass[CLASS.BUSY]} request(s) hit "database is locked"`,
            detail: "Writes are serialising and some are being refused. This is the real failure mode " +
                    "to watch for as concurrency rises.",
        });
    }

    if (simulation && simulation.errors.length > 0) {
        notes.push({
            level: "warn",
            title: `${simulation.errors.length} session(s) threw`,
            detail: simulation.errors.slice(0, 3).join(" | "),
        });
    }

    if ((summary.countsByClass[CLASS.THROTTLED] ?? 0) > 0) {
        notes.push({
            level: "warn",
            title: `${summary.countsByClass[CLASS.THROTTLED]} request(s) were throttled (429)`,
            detail: "The rate limiter refused them. That is a configured ceiling, not a fault — raise " +
                    "PermitLimit in Program.cs if this run was meant to fit.",
        });
    }

    if ((summary.countsByClass[CLASS.TIMEOUT] ?? 0) > 0) {
        notes.push({
            level: "warn",
            title: `${summary.countsByClass[CLASS.TIMEOUT]} request(s) timed out after ${args.timeoutMs} ms`,
            detail: "A timed-out write may still be running server-side, so the row counts below are " +
                    "reported as ranges rather than exact numbers.",
        });
    }

    if ((summary.countsByClass[CLASS.SERVER] ?? 0) > 0) {
        notes.push({
            level: "warn",
            title: `${summary.countsByClass[CLASS.SERVER]} request(s) returned 5xx`,
            detail: "Unhandled server errors. Some routes catch their database failures and some do not.",
        });
    }

    for (const check of preExisting) {
        notes.push({
            level: "info",
            title: `Pre-existing data problem: ${check.id}`,
            detail: `${check.detail} — already present before this run, so not caused by it.`,
        });
    }

    if (disk && diskBaseline && disk.msPerCommit > diskBaseline.msPerCommit * 5) {
        notes.push({
            level: "warn",
            title: `The database volume is ${(disk.msPerCommit / diskBaseline.msPerCommit).toFixed(0)}x slower than local disk`,
            detail: `One committed row costs ${disk.msPerCommit.toFixed(1)} ms here against ` +
                    `${diskBaseline.msPerCommit.toFixed(2)} ms in the OS temp folder. SQLite fsyncs every ` +
                    `commit and allows one writer at a time, so this sets the floor on every write route.`,
        });
    }

    for (const entry of databases ?? []) {
        if (entry.journal.toLowerCase() === "wal") continue;
        notes.push({
            level: "warn",
            title: `${entry.name} is in journal mode "${entry.journal}", not WAL`,
            detail: "In that mode a writer excludes readers, so one write serialises the whole file.",
        });
    }

    if (summary.failureRate > 0.01) {
        notes.push({
            level: "warn",
            title: `${(summary.failureRate * 100).toFixed(1)}% of requests failed`,
            detail: "Above 1%, which is the level at which a student would notice.",
        });
    }

    return notes;
}

/** Formats a latency for display. Sub-millisecond detail below 10 ms, whole numbers above. */
export { ms };
