/**
 * Puts accounts into the control arm of the study, or back into treatment.
 *
 * WHY A TOOL RATHER THAN A SCREEN. Creating an account is something a student does, so it has a form;
 * assigning an arm is something a researcher does once, to a class, and a screen for it would be a
 * screen students could reach. This talks to the two guarded `/admin` routes instead, which is the
 * surface that already exists for operations the student app cannot do.
 *
 * WHY NOT A USERNAME PREFIX. The arm is a column on the account, not a rule about the name, exactly so
 * that it can be decided after the accounts exist and changed later without renaming anybody. This tool
 * only builds the list of names to send.
 *
 * DRY RUN BY DEFAULT, and so is the route it calls. Assigning an arm is reversible, but it is also the
 * one change that silently invalidates a study if it lands on the wrong 60 children, so the first run
 * of any command here tells you what it would do and does nothing. `--apply` is the only way to write.
 *
 *   node tools/set-condition.mjs --condition control --from 1 --to 60
 *   node tools/set-condition.mjs --condition control --from 1 --to 60 --apply
 *   node tools/set-condition.mjs --names jpstudent07,jpstudent12 --condition control --apply
 *   node tools/set-condition.mjs --status
 *
 * The admin key is read from --admin-key or ALGESPACE_ADMIN_KEY, and is never printed.
 */

const DEFAULTS = {
    base: "http://localhost:7273",
    prefix: "jpstudent",
    separator: "",
    from: 1,
    to: 120,
    pad: 2,
    condition: "",
    names: "",
    apply: false,
    status: false,
};

const CONDITIONS = ["control", "treatment"];

function parseArgs(argv) {
    const args = { ...DEFAULTS };
    const bools = new Set(["apply", "status", "help"]);

    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (!token.startsWith("--")) continue;

        const name = token.slice(2);
        if (bools.has(name)) {
            args[name === "help" ? "help" : name] = true;
            continue;
        }

        const value = argv[i + 1];
        if (value === undefined || value.startsWith("--")) {
            throw new Error(`--${name} needs a value`);
        }
        i++;

        switch (name) {
            case "base": args.base = value.replace(/\/$/, ""); break;
            case "admin-key": args.adminKey = value; break;
            case "prefix": args.prefix = value; break;
            case "separator": args.separator = value; break;
            case "from": args.from = Number(value); break;
            case "to": args.to = Number(value); break;
            case "pad": args.pad = Number(value); break;
            case "condition": args.condition = value.trim().toLowerCase(); break;
            case "names": args.names = value; break;
            default: throw new Error(`Unknown option --${name}`);
        }
    }

    return args;
}

function usage() {
    console.log(`Assign the control or treatment arm to student accounts.

  --condition <arm>     "control" or "treatment" (required unless --status)
  --names <a,b,c>       assign exactly these usernames
  --prefix <name>       build usernames from a family (default ${DEFAULTS.prefix})
  --from <n> --to <n>   number range for the family (default ${DEFAULTS.from}..${DEFAULTS.to})
  --pad <n>             number width, zero padded (default ${DEFAULTS.pad})
  --separator <s>       between prefix and number, may be empty (default "${DEFAULTS.separator}")
  --base <url>          API base (default ${DEFAULTS.base})
  --admin-key <key>     X-Admin-Key, or set ALGESPACE_ADMIN_KEY
  --apply               actually write. Without it, nothing changes.
  --status              just report the split and exit
  --help                this text

Examples
  node tools/set-condition.mjs --condition control --from 1 --to 60
  node tools/set-condition.mjs --condition control --from 1 --to 60 --apply
  node tools/set-condition.mjs --names jpstudent07,jpstudent12 --condition control --apply`);
}

const name = (prefix, separator, index, pad) => `${prefix}${separator}${String(index).padStart(pad, "0")}`;

/**
 * One request, with the transport failure reported for what it is.
 *
 * Same reasoning as the account tool: a connection that was reset is not the server saying no, and
 * "fetch failed" on its own says nothing about which fault it was. Retried, because none of these
 * calls decides anything by arriving twice — assigning the same arm twice is the same state.
 */
async function request(base, path, adminKey, init = {}, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const response = await fetch(`${base}${path}`, {
                ...init,
                headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey, ...(init.headers ?? {}) },
                keepalive: false,
                signal: AbortSignal.timeout(30_000),
            });

            const text = await response.text();
            let json = null;
            try { json = text ? JSON.parse(text) : null; } catch { /* not JSON; the status says enough */ }
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

/** The split between the arms. The one number that says whether a control group exists at all. */
async function reportSplit(base, adminKey) {
    const { ok, status, json, text } = await request(base, "/admin/status", adminKey, { method: "GET" });

    if (!ok) {
        throw new Error(`/admin/status answered ${status}: ${text.slice(0, 200)}`);
    }

    const conditions = json?.conditions ?? [];
    const total = conditions.reduce((sum, entry) => sum + entry.accounts, 0);
    console.log(`\nAccounts by arm (${total} total):`);
    for (const entry of conditions) {
        console.log(`  ${entry.condition.padEnd(10)} ${entry.accounts}`);
    }
    if (conditions.length === 0) {
        console.log("  (the database has no accounts yet)");
    }
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

    if (args.help) {
        usage();
        return;
    }

    const adminKey = args.adminKey ?? process.env.ALGESPACE_ADMIN_KEY ?? "";
    if (adminKey === "") {
        console.error("No admin key. Pass --admin-key or set ALGESPACE_ADMIN_KEY.");
        console.error("The routes answer 404 without Admin:ResetKey on the server, so this must be that key.");
        process.exitCode = 1;
        return;
    }

    if (args.status) {
        await reportSplit(args.base, adminKey);
        return;
    }

    if (!CONDITIONS.includes(args.condition)) {
        console.error(`--condition must be one of: ${CONDITIONS.join(", ")}`);
        process.exitCode = 1;
        return;
    }

    // An explicit list wins, so a one-off correction does not need a range that happens to contain it.
    const names = args.names.trim().length > 0
        ? args.names.split(",").map((entry) => entry.trim()).filter(Boolean)
        : Array.from({ length: Math.max(0, args.to - args.from + 1) }, (_, offset) =>
            name(args.prefix, args.separator, args.from + offset, args.pad));

    if (names.length === 0) {
        console.error("No usernames to send: check --names, or --from/--to.");
        process.exitCode = 1;
        return;
    }

    console.log(`Assigning "${args.condition}" to ${names.length} account(s) via ${args.base}`);
    console.log(`  ${names.slice(0, 4).join(", ")}${names.length > 4 ? `, … ${names[names.length - 1]}` : ""}`);

    const { ok, status, json, text } = await request(args.base, "/admin/students/condition", adminKey, {
        method: "POST",
        body: JSON.stringify({
            usernames: names,
            condition: args.condition,
            // The route defaults to a dry run as well. Sending it explicitly means a difference between
            // what this tool intends and what happens cannot come from a default either of us assumed.
            dryRun: !args.apply,
        }),
    });

    if (!ok) {
        // A name that does not exist comes back as "no account matched", which is a real answer and is
        // worth showing verbatim: it is almost always a typo in --prefix or the range.
        console.error(`\n${status}: ${json ? JSON.stringify(json) : text.slice(0, 300)}`);
        process.exitCode = 1;
        return;
    }

    const matched = json?.accounts ?? [];
    console.log(`\nMatched ${matched.length} account(s).`);

    if (!args.apply) {
        console.log("DRY RUN — nothing was changed. Re-run with --apply to write it.");
        for (const account of matched.slice(0, 60)) {
            console.log(`  ${account.username} (id ${account.id})`);
        }
        if (matched.length > 60) console.log(`  … and ${matched.length - 60} more`);
        console.log("");
        await reportSplit(args.base, adminKey);
        return;
    }

    console.log(`Changed ${json?.changed ?? matched.length} account(s) to "${args.condition}".`);
    await reportSplit(args.base, adminKey);
    console.log("\nStudents already signed in keep the arm they signed in with — they must sign in again.");
}

main().catch((error) => {
    console.error(error.message);
    console.error("If this is the deployed API, check Admin:ResetKey is set there — /admin answers 404 without it.");
    process.exitCode = 1;
});
