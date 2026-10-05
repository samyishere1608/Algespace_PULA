/**
 * The whole student-simulation run, from checks to verdict.
 *
 * Both entry points call this: `simulate.mjs` on the command line and the test page's server. One
 * implementation means the page cannot quietly disagree with the terminal.
 *
 * It is written as a generator of events rather than a function that returns at the end, because a
 * student simulation takes minutes of wall time and the useful thing to watch is the load building,
 * not a blank screen.
 */

import { createClient, CLASS } from "./api.mjs";
import {
    resolveAccountPool, discoverIds, discoverCkIds,
    inspectDatabases, keyTableCounts, measureCommitCost, waitForReadable,
    purgeStudent, countRows, DATABASES_DIR, EXERCISE_TYPE,
} from "./fixtures.mjs";
import { runIntegrity } from "./integrity.mjs";
import { simulate } from "./simulate.mjs";
import { summarise, buildNotes } from "./report.mjs";

export const DEFAULTS = {
    base: "http://localhost:7273",
    students: 120,
    // Real think time needs a long run: a session takes minutes, and a shorter window only measures
    // the ramp-up rather than the steady state a cohort actually produces.
    durationSeconds: 180,
    timeScale: 1,
    language: "en",
    includeAi: false,
    usernamePrefix: "lt_s",
    password: "loadtest-pw",
    rps: 0,
    timeoutMs: 20000,
    apiKey: undefined,
    allowRemote: false,
    keep: false,
    forcePurge: false,
};

/**
 * Whether a target may be load-tested at all.
 *
 * This suite registers accounts and writes real rows. Pointing it at something that is not localhost
 * by accident would create students in a live database, so it has to be asked for explicitly.
 */
export function assertLocalTarget(base, allowRemote) {
    if (allowRemote) return;

    const host = new URL(base).hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return;

    throw new Error(
        `Refusing to load-test ${base}: it is not localhost.\n` +
        "This suite registers accounts and writes real rows. Pass --allow-remote if that is what you want.",
    );
}

/** The purge deletes rows belonging to the accounts named on the command line, so they must look
 *  like the suite's own. The account rows themselves are never deleted, which keeps a mistake here
 *  survivable. */
export function mayPurge(usernamePrefix, force) {
    return force || usernamePrefix.startsWith("lt_");
}

export async function runStudentSimulation(optionsInput = {}, onEvent = () => { }) {
    const options = { ...DEFAULTS, ...optionsInput };

    assertLocalTarget(options.base, options.allowRemote);

    const samples = [];
    // Setup traffic is excluded: registering 120 accounts and discovering ids is one-off work whose
    // latency says nothing about the system under student load.
    let recording = false;

    const client = createClient({
        baseUrl: options.base,
        apiKey: options.apiKey,
        timeoutMs: options.timeoutMs,
        rps: options.rps,
        record: (sample) => { if (recording) samples.push(sample); },
    });

    const emit = (event) => onEvent(event);

    // ── Environment ─────────────────────────────────────────────────────────
    emit({ type: "stage", stage: "environment", message: "Reading database state" });

    const databases = inspectDatabases();
    const rows = keyTableCounts();
    const disk = measureCommitCost(DATABASES_DIR);
    const diskBaseline = measureCommitCost(process.env.TEMP ?? "/tmp");

    emit({
        type: "environment",
        environment: {
            databases,
            rows,
            disk: { ...disk, ratio: diskBaseline.msPerCommit > 0 ? disk.msPerCommit / diskBaseline.msPerCommit : 0 },
            diskBaseline,
        },
    });

    // ── Accounts ────────────────────────────────────────────────────────────
    emit({ type: "stage", stage: "accounts", message: `Preparing ${options.students} student accounts` });

    const accounts = await resolveAccountPool(client, {
        count: options.students,
        prefix: options.usernamePrefix,
        password: options.password,
        onProgress: (ready) => emit({ type: "accounts", ready, wanted: options.students }),
    });

    if (accounts.length === 0) {
        throw new Error("Could not create or sign in to any student account. Is the backend running?");
    }

    emit({ type: "accounts", ready: accounts.length, wanted: options.students });

    // ── Exercise ids ────────────────────────────────────────────────────────
    emit({ type: "stage", stage: "ids", message: "Discovering exercise ids" });

    const ids = await discoverIds(client, { language: options.language });
    if (!ids.ok) throw new Error(`Could not read the exercise catalogue: ${ids.reason}`);
    ids.ck = await discoverCkIds(client);

    emit({
        type: "ids",
        found: {
            suitability: ids.byType[EXERCISE_TYPE.Suitability].length,
            efficiency: ids.byType[EXERCISE_TYPE.Efficiency].length,
            matching: ids.byType[EXERCISE_TYPE.Matching].length,
            total: ids.total,
        },
    });

    // ── Baseline ────────────────────────────────────────────────────────────
    const beforeChecks = new Map(
        runIntegrity({ studentIds: accounts.map((account) => account.id) }).map((check) => [check.id, check]));
    const rowCountsBefore = countRows(accounts.map((account) => account.id));

    // ── Run ─────────────────────────────────────────────────────────────────
    emit({
        type: "stage",
        stage: "running",
        message: `${accounts.length} students, ${options.durationSeconds}s${options.timeScale !== 1
            ? `, think time x${options.timeScale}` : ""}`,
    });

    recording = true;

    const simulation = await simulate({
        client,
        ids,
        accounts,
        durationSeconds: options.durationSeconds,
        timeScale: options.timeScale,
        language: options.language,
        includeAi: options.includeAi,
        // The page shows a live request count, and only the recorder knows it.
        onEvent: (event) => emit({ ...event, requests: samples.length }),
    });

    recording = false;

    // ── Verdict ─────────────────────────────────────────────────────────────
    emit({ type: "stage", stage: "integrity", message: "Checking the data the run wrote" });

    const stillLocked = await waitForReadable(10000);
    if (stillLocked) {
        emit({
            type: "warning",
            message: `The database was still locked after waiting 10s: ${stillLocked.message}. ` +
                     "Integrity results below are unreliable — the run left writes in flight.",
        });
    }

    const integrity = runIntegrity({
        studentIds: accounts.map((account) => account.id),
        expectations: simulation.expectations,
        baseline: rowCountsBefore,
    });

    // A check already failing before the run is reported as pre-existing and does not fail the run.
    for (const check of integrity) {
        const before = beforeChecks.get(check.id);
        check.regression = !check.passed && !(before && !before.passed);
        check.preExisting = !check.passed && !check.regression;
    }

    const summary = summarise(samples, simulation.wallSeconds);
    const notes = buildNotes({
        summary, integrity, disk, diskBaseline, databases,
        simulation, args: options,
    });

    // ── Cleanup ─────────────────────────────────────────────────────────────
    let cleanup = null;

    if (options.keep) {
        cleanup = { skipped: true, left: countRows(accounts.map((account) => account.id)) };
    } else if (!mayPurge(options.usernamePrefix, options.forcePurge)) {
        cleanup = { refused: true, reason: `"${options.usernamePrefix}" does not look like a load-test prefix` };
    } else {
        try {
            cleanup = { removed: purgeStudent(accounts.map((account) => account.id)) };
        } catch (error) {
            cleanup = { failed: error.message };
        }
    }

    emit({ type: "cleanup", cleanup });

    return {
        students: accounts.length,
        requestedStudents: options.students,
        options,
        environment: { databases, rows, disk, diskBaseline },
        simulation,
        summary,
        integrity,
        notes,
        cleanup,
        failures: summary.failed,
        // Pre-existing problems do not make THIS run unclean — they were there before it started, and
        // failing a run for them would train the reader to ignore the verdict.
        clean: integrity.every((check) => check.passed || check.preExisting) &&
            [CLASS.BUSY, CLASS.SERVER, CLASS.TIMEOUT, CLASS.NETWORK]
                .every((klass) => (summary.countsByClass[klass] ?? 0) === 0),
    };
}
