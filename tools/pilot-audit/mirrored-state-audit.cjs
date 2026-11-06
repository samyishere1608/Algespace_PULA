// The client and the server each keep a list of the key families that travel between machines.
// A key in one list but not the other is silently dropped, which looks exactly like "state that
// stopped following the student" — and only at a second computer, days later.
// Run: node tools/pilot-audit/mirrored-state-audit.cjs
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "..");

const clientSrc = fs.readFileSync(path.join(root, "reactapp", "src", "utils", "studentState.ts"), "utf8");
const serverSrc = fs.readFileSync(
    path.join(root, "webapi", "Controllers", "StudentProgressController.cs"),
    "utf8",
);

// client: the MIRRORED array of regex literals
const clientBlock = /const MIRRORED: RegExp\[\] = \[([\s\S]*?)\];/.exec(clientSrc);
if (!clientBlock) {
    console.error("could not find MIRRORED in studentState.ts");
    process.exit(1);
}
const clientPatterns = [...clientBlock[1].matchAll(/\/(.+?)\/([a-z]*)/g)].map((m) => new RegExp(m[1], m[2]));

// server: the ClientStateKeys tuple array
const serverBlock = /ClientStateKeys\s*=\s*\[([\s\S]*?)\];/.exec(serverSrc);
if (!serverBlock) {
    console.error("could not find ClientStateKeys in StudentProgressController.cs");
    process.exit(1);
}
const serverPrefixes = [...serverBlock[1].matchAll(/\("([^"]+)",\s*(?:true|false)\)/g)].map((m) => m[1]);

// Sample keys that each side should agree about. A real key per family, so the check is about
// behaviour rather than about two lists looking similar.
const samples = [
    "accuracy_last5_657",
    "algespace_owned_657_pippin",
    "algespace_equipped_657_lumi",
    "algespace_active_buddy_657",
    "algespace_unlocked_announced_657",
    "algespace_nudges_657",
    "algespace_choice_goal_awarded_eec412b5",
    "algespace_choice_reflection_awarded_3534",
    "daily_intention_657_2026-11-06",
    "onboarding-step-657",
    "ui-language-657",
];

const problems = [];
for (const key of samples) {
    const clientAccepts = clientPatterns.some((rx) => rx.test(key));
    const serverAccepts = serverPrefixes.some((prefix) => key.startsWith(prefix));
    if (clientAccepts !== serverAccepts) {
        problems.push(`${key}: client=${clientAccepts ? "accepts" : "refuses"}, server=${serverAccepts ? "accepts" : "refuses"}`);
    }
    console.log(`${clientAccepts && serverAccepts ? "ok  " : "MISMATCH"} ${key}`);
}

// And the reverse direction: a server family with no client pattern can never be written.
for (const prefix of serverPrefixes) {
    const covered = samples.some((key) => key.startsWith(prefix))
        || clientPatterns.some((rx) => rx.test(prefix.replace(/[^a-z0-9_:-]/gi, "") + "1"));
    if (!covered) problems.push(`server family "${prefix}" has no sample and no obvious client pattern`);
}

// Keys that must NOT travel: XP has its own columns, and a second writer is a second truth.
const mustNotTravel = ["algespace_choice_xp_657", "algespace_insight_xp_657", "algespace_resolve_xp_657", "algespace_lifetime_agency_657"];
for (const key of mustNotTravel) {
    if (clientPatterns.some((rx) => rx.test(key)) || serverPrefixes.some((p) => key.startsWith(p))) {
        problems.push(`${key} must NOT travel: the XP wallets have their own columns`);
    }
}

console.log(`\nclient families: ${clientPatterns.length}, server families: ${serverPrefixes.length}`);
console.log(`problems: ${problems.length}`);
problems.forEach((p) => console.log("  - " + p));
process.exitCode = problems.length > 0 ? 1 : 0;
