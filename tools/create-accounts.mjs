#!/usr/bin/env node
/**
 * Creates the student accounts a class needs, and proves each one can log in.
 *
 * WHY A SCRIPT. 120 accounts is 120 identical HTTP calls; doing it by hand is an afternoon of typing and
 * one typo per screen. It uses the app's own public route (`POST /student/register`), so a created
 * account is indistinguishable from one made on the register page: same salt, same hash, same row.
 *
 * WHAT IT WILL NOT DO. It never touches the database. Everything goes through the API, which means the
 * server decides the rules and this script cannot create an account the app could not.
 *
 *   node tools/create-accounts.mjs --base https://... --api-key <key> --dry-run
 *   node tools/create-accounts.mjs --base https://... --api-key <key>
 *
 * The key is read from --api-key or from ALGESPACE_API_KEY, and is never written to the output. Prefer the
 * environment variable: a command line is visible to every process on the machine.
 *
 * Defaults match the pilot: 120 students named jp-test-student-001..120, five tester accounts named
 * jp-test-check-01..05, and the password "test123" for all of them. Re-running is safe: a name that
 * already exists is reported, not overwritten, and never silently re-passworded.
 */

import { writeFile } from "node:fs/promises";

const DEFAULTS = {
    base: "http://localhost:7273",
    prefix: "jp-test-student",
    from: 1,
    to: 120,
    pad: 3,
    password: "test123",
    testers: 5,
    testerPrefix: "jp-test-check",
    testerPad: 2,
    concurrency: 8,
    verify: true,
    out: "",
    dryRun: false,
};

function parseArgs(argv) {
    const args = { ...DEFAULTS, verify: true, out: "" };
    const bools = new Set(["verify", "dry-run", "no-verify", "help"]);

    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (!token.startsWith("--")) continue;

        const name = token.slice(2);
        if (bools.has(name)) {
            if (name === "no-verify") args.verify = false;
            else if (name === "dry-run") args.dryRun = true;
            else if (name === "verify") args.verify = true;
            else args.help = true;
            continue;
        }

        const value = argv[i + 1];
        if (value === undefined || value.startsWith("--")) {
            throw new Error(`--${name} needs a value`);
        }
        i++;

        switch (name) {
            case "base": args.base = value; break;
            case "api-key": args.apiKey = value; break;
            case "prefix": args.prefix = value; break;
            case "from": args.from = Number(value); break;
            case "to": args.to = Number(value); break;
            case "pad": args.pad = Number(value); break;
            case "password": args.password = value; break;
            case "testers": args.testers = Number(value); break;
            case "tester-prefix": args.testerPrefix = value; break;
            case "tester-pad": args.testerPad = Number(value); break;
            case "concurrency": args.concurrency = Number(value); break;
            case "out": args.out = value; break;
            default: throw new Error(`Unknown option --${name}`);
        }
    }

    return args;
}

function usage() {
    console.log(`Create student accounts through the app's own register route.

  --base <url>          API base (default ${DEFAULTS.base})
  --api-key <key>       X-API-Key, or set ALGESPACE_API_KEY
  --prefix <name>       student username prefix (default ${DEFAULTS.prefix})
  --from <n> --to <n>   student number range (default ${DEFAULTS.from}..${DEFAULTS.to})
  --pad <n>             number width, zero padded (default ${DEFAULTS.pad})
  --password <pw>       password for every account (default ${DEFAULTS.password})
  --testers <n>         extra tester accounts, prefix below (default ${DEFAULTS.testers})
  --tester-prefix <p>   (default ${DEFAULTS.testerPrefix})
  --tester-pad <n>      (default ${DEFAULTS.testerPad})
  --concurrency <n>     parallel requests (default ${DEFAULTS.concurrency})
  --no-verify           skip the sign-in check
  --out <file>          write the handout CSV here (default ./<prefix>-accounts.csv)
  --dry-run             print the names and change nothing
`);
}

const name = (prefix, index, pad) => `${prefix}-${String(index).padStart(pad, "0")}`;

async function post(base, path, apiKey, body) {
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["X-API-Key"] = apiKey;

    const response = await fetch(`${base}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });

    const text = await response.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* not JSON; the status says enough */ }

    return { status: response.status, ok: response.ok, json, text };
}

/** Runs `task` over `items`, `size` at a time, so the server is not asked to accept 120 at once. */
async function inBatches(items, size, task) {
    for (let start = 0; start < items.length; start += size) {
        await Promise.all(items.slice(start, start + size).map(task));
    }
}

function csvCell(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        usage();
        return;
    }

    const apiKey = args.apiKey ?? process.env.ALGESPACE_API_KEY ?? "";
    if (!apiKey) {
        // A local API in Development does not gate its routes, so this is the normal way to try the
        // script. A deployed one does, and answers 400 to every call: the run then reports every account
        // as failed rather than pretending otherwise.
        console.warn("No API key: sending requests without X-API-Key. Fine locally, rejected by a deployed server.");
    }

    const base = args.base.replace(/\/+$/, "");
    const students = [];
    for (let index = args.from; index <= args.to; index++) {
        students.push(name(args.prefix, index, args.pad));
    }

    const testers = [];
    for (let index = 1; index <= args.testers; index++) {
        testers.push(name(args.testerPrefix, index, args.testerPad));
    }

    if (args.dryRun) {
        console.log(`Would create ${students.length} students on ${base}:`);
        console.log(`  ${students[0]} .. ${students[students.length - 1]}`);
        if (testers.length > 0) {
            console.log(`Plus ${testers.length} testers:`);
            console.log(`  ${testers.join(", ")}`);
        }
        console.log(`Password for all: ${args.password}`);
        return;
    }

    console.log(`Creating ${students.length} students and ${testers.length} testers on ${base}`);

    // ── Students ────────────────────────────────────────────────────────────
    const rows = [];
    let created = 0;
    let existed = 0;
    const failed = [];

    await inBatches(students, args.concurrency, async (username) => {
        try {
            const result = await post(base, "/student/register", apiKey, { username, password: args.password });

            if (result.ok) {
                created++;
                rows.push({ username, password: args.password, status: "created", id: "" });
            } else if (result.status === 409) {
                existed++;
                // Not an error: a re-run should find the class it made last time. It is also not a
                // re-password, which is why the existing one is reported as unknown.
                rows.push({ username, password: "", status: "already existed", id: "" });
            } else {
                failed.push({ username, status: result.status, body: result.text.slice(0, 200) });
            }
        } catch (error) {
            failed.push({ username, status: 0, body: error.message });
        }
    });

    console.log(`  students: ${created} created, ${existed} already existed, ${failed.length} failed`);

    // ── Testers ─────────────────────────────────────────────────────────────
    for (const username of testers) {
        try {
            const result = await post(base, "/student/register", apiKey, { username, password: args.password });
            const status = result.ok ? "created" : result.status === 409 ? "already existed" : `failed ${result.status}`;
            console.log(`  tester ${username}: ${status}`);
            rows.push({
                username,
                password: result.ok ? args.password : "",
                status: status.startsWith("failed") ? status : "tester " + status,
                id: "",
            });
        } catch (error) {
            console.log(`  tester ${username}: failed ${error.message}`);
        }
    }

    // ── Proof that each one can log in ──────────────────────────────────────
    //
    // The register route only proves a row was written. A row whose salt or hash was mangled would still
    // be a row, and the first a student would hear of it is a login screen that refuses them. Signing in
    // once per account here turns that into a line of output.
    if (args.verify) {
        console.log("Checking each account can sign in");
        const created_rows = rows.filter((row) => row.password !== "");
        let signedIn = 0;

        await inBatches(created_rows, args.concurrency, async (row) => {
            try {
                const result = await post(base, "/student/authenticate", apiKey, {
                    username: row.username,
                    password: row.password,
                });

                if (result.ok) {
                    signedIn++;
                    row.id = String(result.json?.id ?? "");
                    row.status += ", login ok";
                } else {
                    row.status += `, LOGIN FAILED ${result.status}`;
                    failed.push({ username: row.username, status: result.status, body: result.text.slice(0, 200) });
                }
            } catch (error) {
                row.status += `, LOGIN FAILED ${error.message}`;
            }
        });

        console.log(`  signed in: ${signedIn}/${created_rows.length}`);
    }

    // ── The handout ─────────────────────────────────────────────────────────
    rows.sort((a, b) => a.username.localeCompare(b.username));
    const out = args.out || `${args.prefix}-accounts.csv`;
    const csv = [
        "username,password,id,status",
        ...rows.map((row) => [row.username, row.password, row.id, row.status].map(csvCell).join(",")),
    ].join("\n");
    await writeFile(out, csv + "\n", "utf8");

    console.log(`\nHandout written to ${out} (${rows.length} rows)`);
    if (failed.length > 0) {
        console.log(`\n${failed.length} failure(s):`);
        for (const entry of failed.slice(0, 20)) {
            console.log(`  ${entry.username}: ${entry.status} ${entry.body}`);
        }
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
