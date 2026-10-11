/**
 * One run, as newline-delimited JSON on stdout.
 *
 * This is the entry point the API uses. It is deliberately NOT an HTTP server: the API owns the
 * port, the access key and the "one run at a time" rule, and a child process should do nothing but
 * start a run and report what happens. One JSON object per line means the parent can forward each
 * event the moment it arrives, which is the whole reason the page can show live progress rather than
 * a blank screen for three minutes.
 *
 *   node loadtest/stream.mjs --students 5 --durationSeconds 20
 *
 * The events are EXACTLY the ones `runStudentSimulation` emits — the same objects the standalone
 * Node host streams over SSE — so the page cannot tell the two apart.
 */

import { runStudentSimulation, DEFAULTS } from "./lib/pipeline.mjs";

const argv = process.argv.slice(2);

function value(name) {
    const index = argv.indexOf(`--${name}`);
    return index === -1 ? undefined : argv[index + 1];
}

function number(name, fallback) {
    const raw = value(name);
    const parsed = raw === undefined ? NaN : Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function flag(name) {
    const raw = value(name);
    return raw === "1" || raw === "true";
}

/**
 * The run's options, from the command line.
 *
 * Every one of these is also validated by the API before it gets here, so this stays a plain
 * reader. The defaults come from the suite's own DEFAULTS rather than being repeated, so the page,
 * the CLI and this entry point cannot drift apart.
 */
const options = {
    students: number("students", DEFAULTS.students),
    durationSeconds: number("durationSeconds", DEFAULTS.durationSeconds),
    timeScale: number("timeScale", DEFAULTS.timeScale),
    language: value("language") ?? DEFAULTS.language,
    includeAi: flag("includeAi"),
    keep: flag("keep"),
    base: value("base") ?? DEFAULTS.base,
    allowRemote: flag("allowRemote"),
    // Production gates every request behind X-API-Key, and a run of 120 students would otherwise get
    // a clean 400 to every call and report the server as broken. Handed over in the environment
    // rather than on the command line, where any process in the container could read it.
    apiKey: process.env.LOADTEST_API_KEY,
};

/**
 * Write one event, and never throw.
 *
 * If the parent has gone — the student closed the tab, the request was aborted — writing raises
 * EPIPE. There is nothing left to report it to, so the run stops instead of printing a stack trace
 * into a stream nobody is reading.
 */
function write(event) {
    try {
        process.stdout.write(`${JSON.stringify(event)}\n`);
    } catch {
        process.exit(0);
    }
}

process.stdout.on("error", () => process.exit(0));

try {
    const result = await runStudentSimulation(options, write);
    write({ type: "result", result });
} catch (error) {
    write({ type: "error", message: String(error?.message ?? error) });
    process.exitCode = 1;
}
