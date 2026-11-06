#!/usr/bin/env node
/**
 * Creates the pilot roster from `tools/pilot-accounts.json` and puts each account in its arm.
 *
 * WHY A NAMED LIST RATHER THAN A PREFIX. The class is handed out as colours, not as a numbered
 * roster: blue accounts are the adapt arm, red accounts are the control arm, and the arm is a
 * property of the ACCOUNT (see `set-condition.mjs`), so it can be checked later without trusting
 * the name. The spec file is the single place the roster is written down.
 *
 * THREE STEPS, EACH INDEPENDENT, EACH SAFE TO RE-RUN:
 *   1. register   POST /student/register. A name that already exists answers 409 and is reported,
 *                 NEVER re-passworded — a re-run cannot lock out a student who changed their own.
 *   2. verify     POST /student/authenticate for every account, because "it was created" and "it can
 *                 sign in" are different claims and only the second one matters on the day.
 *   3. arm        POST /admin/students/condition, per group. Needs the researcher key, and is
 *                 dry-run until `--apply` — the arm is the one column a study cannot recover from
 *                 getting wrong.
 *
 *   node tools/pilot-accounts.mjs --base https://… --api-key <k> --admin-key <k> --dry-run
 *   node tools/pilot-accounts.mjs --base https://… --api-key <k> --admin-key <k> --apply
 *   node tools/pilot-accounts.mjs --base https://… --api-key <k> --verify-only
 *
 * Keys are read from the flags or from ALGESPACE_API_KEY / ALGESPACE_ADMIN_KEY, and are never
 * printed. A roster CSV is written at the end unless `--out ""`.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

const DEFAULTS = {
    base: "http://localhost:7273",
    spec: path.join(here, "pilot-accounts.json"),
    apiKey: process.env.ALGESPACE_API_KEY ?? "",
    adminKey: process.env.ALGESPACE_ADMIN_KEY ?? "",
    apply: false,
    verify: true,
    verifyOnly: false,
    concurrency: 6,
    out: path.join(here, "pilot-accounts.csv"),
};

function parseArgs(argv) {
    const args = { ...DEFAULTS };
    const bools = new Set(["apply", "dry-run", "verify", "no-verify", "verify-only", "no-out", "help"]);

    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (!token.startsWith("--")) continue;
        const name = token.slice(2);

        if (bools.has(name)) {
            if (name === "apply") args.apply = true;
            else if (name === "dry-run") args.apply = false;
            else if (name === "verify") args.verify = true;
            else if (name === "no-verify") args.verify = false;
            else if (name === "verify-only") { args.verifyOnly = true; args.verify = true; }
            else if (name === "no-out") args.out = "";
            else args.help = true;
            continue;
        }

        const value = argv[i + 1];
        if (value === undefined || value.startsWith("--")) throw new Error(`--${name} needs a value`);
        i++;

        switch (name) {
            case "base": args.base = value.replace(/\/$/, ""); break;
            case "spec": args.spec = value; break;
            case "api-key": args.apiKey = value; break;
            case "admin-key": args.adminKey = value; break;
            case "concurrency": args.concurrency = Number(value); break;
            case "out": args.out = value; break;
            default: throw new Error(`Unknown option --${name}`);
        }
    }

    return args;
}

function usage() {
    console.log(`
node tools/pilot-accounts.mjs [options]

  --base <url>        API base (default ${DEFAULTS.base})
  --spec <file>       roster file (default tools/pilot-accounts.json)
  --api-key <key>     X-API-Key, or ALGESPACE_API_KEY
  --admin-key <key>   X-Admin-Key, or ALGESPACE_ADMIN_KEY   (needed to set the arms)
  --apply             actually write. Without it nothing is created and no arm is changed.
  --verify-only       skip creation, just prove every account can sign in
  --no-verify         skip the sign-in check (creation only)
  --concurrency <n>   parallel requests (default ${DEFAULTS.concurrency})
  --out <file>        roster CSV (default tools/pilot-accounts.csv)
  --no-out            do not write a roster file
`);
}

/** One request, retried, with the transport failure reported as what it was. */
async function request(base, pathName, headers, init = {}, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const response = await fetch(`${base}${pathName}`, {
                ...init,
                headers: { "Content-Type": "application/json", ...headers, ...(init.headers ?? {}) },
                signal: AbortSignal.timeout(30_000),
            });
            const text = await response.text();
            let json = null;
            try { json = text ? JSON.parse(text) : null; } catch { /* not JSON: the status is the message */ }
            return { status: response.status, ok: response.ok, json, text };
        } catch (error) {
            lastError = error;
            if (attempt === attempts) break;
            await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
        }
    }
    const cause = lastError?.cause?.code ?? lastError?.cause?.message ?? "";
    throw new Error(`${lastError?.message ?? "request failed"}${cause ? ` (${cause})` : ""}`);
}

/** Runs `worker` over `items` with a bounded number in flight. */
async function pool(items, limit, worker) {
    const results = new Array(items.length);
    let cursor = 0;
    const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (cursor < items.length) {
            const index = cursor++;
            results[index] = await worker(items[index], index);
        }
    });
    await Promise.all(runners);
    return results;
}

async function main() {
    let args;
    try {
        args = parseArgs(process.argv.slice(2));
    } catch (error) {
        console.error(`${error.message}\n`);
        usage();
        process.exitCode = 1;
        return;
    }

    if (args.help) { usage(); return; }

    const apiKey = args.apiKey;
    if (!apiKey) {
        console.error("An API key is required: --api-key, or ALGESPACE_API_KEY.");
        process.exitCode = 1;
        return;
    }

    // A leading BOM is what several Windows editors write, and it makes JSON.parse fail with a message
    // about the first character that says nothing about the real problem.
    const specText = (await readFile(args.spec, "utf8")).replace(/^\uFEFF/, "");
    const spec = JSON.parse(specText);
    const apiHeaders = { "X-API-Key": apiKey };
    const adminHeaders = { "X-API-Key": apiKey, "X-Admin-Key": args.adminKey };

    const groups = spec.groups;
    const all = groups.flatMap((group) => group.usernames.map((username) => ({ username, group })));

    console.log(`Target:  ${args.base}`);
    console.log(`Roster:  ${all.length} accounts in ${groups.length} groups, password ${spec.password.length} characters`);
    for (const group of groups) {
        console.log(`  ${group.name.padEnd(10)} ${String(group.usernames.length).padStart(3)} accounts  arm=${group.condition}`);
    }
    console.log(`Mode:    ${args.verifyOnly ? "verify only" : args.apply ? "APPLY (writes)" : "dry run (writes nothing)"}`);

    // ── 1. Create ─────────────────────────────────────────────────────────────
    const created = new Map();
    if (!args.verifyOnly) {
        if (!args.apply) {
            console.log("\n[dry run] would register the accounts above; re-run with --apply to write.");
        } else {
            const outcomes = await pool(all, args.concurrency, async ({ username, group }) => {
                const result = await request(args.base, "/student/register", apiHeaders, {
                    method: "POST",
                    body: JSON.stringify({ username, password: spec.password }),
                });
                return { username, group: group.name, status: result.status };
            });

            const counts = { created: 0, existed: 0, failed: 0 };
            for (const outcome of outcomes) {
                created.set(outcome.username, outcome.status);
                if (outcome.status === 200) counts.created++;
                else if (outcome.status === 409) counts.existed++;
                else {
                    counts.failed++;
                    console.log(`  FAILED ${outcome.group}/${outcome.username}: HTTP ${outcome.status}`);
                }
            }
            console.log(`\nregister: ${counts.created} created, ${counts.existed} already existed, ${counts.failed} failed`);
        }
    }

    // ── 2. Arms ───────────────────────────────────────────────────────────────
    // BEFORE the sign-in check, so the arms it reports are the ones the server actually holds.
    //
    // `dryRun: false` is not optional. `AdminConditionRequest` defaults it to true on purpose — a
    // request that forgets the flag is reported rather than obeyed — and a call that leaves it out
    // matches the accounts, answers 200 with `changed: 0`, and writes nothing.
    if (args.apply) {
        if (!args.adminKey) {
            console.log("\narm: skipped — no --admin-key / ALGESPACE_ADMIN_KEY, so the arms stay as they are");
        } else {
            for (const group of groups) {
                const result = await request(args.base, "/admin/students/condition", adminHeaders, {
                    method: "POST",
                    body: JSON.stringify({ usernames: group.usernames, condition: group.condition, dryRun: false }),
                });
                const changed = result.json?.changed ?? 0;
                const matched = result.json?.accounts?.length ?? 0;
                if (result.ok) console.log(`arm: ${group.name} -> ${group.condition}: ${changed} changed of ${matched} matched`);
                else console.log(`arm: ${group.name} -> ${group.condition} FAILED ${result.status}: ${result.text.slice(0, 200)}`);
            }
        }
    } else if (!args.verifyOnly) {
        console.log("[dry run] arm assignment not sent");
    }

    // ── 3. Verify the accounts can actually sign in, and in the right arm ─────
    let unverified = [];
    if (args.verify) {
        const checks = await pool(all, args.concurrency, async ({ username }) => {
            const result = await request(args.base, "/student/authenticate", apiHeaders, {
                method: "POST",
                body: JSON.stringify({ username, password: spec.password }),
            });
            return { username, status: result.status, condition: result.json?.condition ?? "" };
        });

        unverified = checks.filter((check) => check.status !== 200);
        console.log(`sign in: ${checks.length - unverified.length}/${checks.length} accounts authenticated`);
        for (const bad of unverified.slice(0, 10)) {
            console.log(`  CANNOT SIGN IN ${bad.username}: HTTP ${bad.status}`);
        }

        // The arm as the SERVER reports it, per group. This is the column the analysis reads, so a
        // group that landed in the wrong arm has to be visible in the output of the run that did it.
        for (const group of groups) {
            const inGroup = checks.filter((check) => group.usernames.includes(check.username) && check.status === 200);
            const arms = new Map();
            for (const check of inGroup) arms.set(check.condition, (arms.get(check.condition) ?? 0) + 1);
            const summary = [...arms.entries()].map(([arm, n]) => `${arm}=${n}`).join(", ");
            const expected = arms.size === 1 && arms.has(group.condition) ? "OK" : "MISMATCH";
            console.log(`  ${group.name.padEnd(10)} ${expected.padEnd(9)} ${summary}`);
        }
    }

    // ── 4. The roster the class is handed out ─────────────────────────────────
    if (args.out) {
        const lines = ["username,password,group,condition"];
        for (const group of groups) {
            for (const username of group.usernames) lines.push(`${username},${spec.password},${group.name},${group.condition}`);
        }
        await writeFile(args.out, lines.join("\n") + "\n", "utf8");
        console.log(`\nroster written: ${args.out}`);
    }

    if (unverified.length > 0) {
        console.error(`\n${unverified.length} account(s) cannot sign in.`);
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error(`\n${error.message}`);
    process.exitCode = 1;
});
