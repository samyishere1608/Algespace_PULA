// Dynamic translation keys: those built as `prefix-${value}`, which a literal-only audit cannot see.
// Each family is enumerated with every value the code can pass, then checked in every language.
// Run: node tools/pilot-audit/dynamic-key-audit.cjs
const fs = require("fs");
const path = require("path");

const transRoot = path.join(__dirname, "..", "..", "reactapp", "src", "assets", "translations");
const langs = ["en", "de", "ja"];

const resources = {};
for (const lang of langs) {
    resources[lang] = {};
    for (const file of fs.readdirSync(path.join(transRoot, lang))) {
        if (file.endsWith(".json")) {
            resources[lang][file.replace(/\.json$/, "")] = JSON.parse(
                fs.readFileSync(path.join(transRoot, lang, file), "utf8"),
            );
        }
    }
}

function has(lang, key) {
    // i18next appends a plural bucket, so a key may legitimately exist only as key_one / key_other.
    for (const candidate of [key, `${key}_one`, `${key}_other`, `${key}_zero`, `${key}_many`]) {
        for (const ns of Object.keys(resources[lang])) {
            const node = candidate.split(".").reduce((o, part) => (o == null ? null : o[part]), resources[lang][ns]);
            if (typeof node === "string") return true;
        }
    }
    return false;
}

// Every family the app builds by concatenation, with the values the code can actually supply.
const families = {
    "agency-": ["choice", "insight", "resolve"],
    "dashboard-tier-": ["beginner", "apprentice", "explorer", "solver", "expert", "master"],
    "dashboard-level-wallet-": ["choice", "insight", "resolve"],
    "goal-unit-": ["exercises", "minutes"],
    "goal-quality-": ["hints", "errors"],
    "goal-quality--one": [], // placeholder, not a real family
    "goal-unit-": ["exercises", "minutes"],
    "reflection-stage-": ["read", "think", "why", "next"],
    "reflection-decision-": [
        "calculating", "explain", "compare", "did-myself", "app-did",
        "explained", "compared", "skipped",
    ],
    "reflection-decision--count": [],
    "tree-stage-": ["seed", "sprout", "sapling", "seedling", "young", "full", "ancient"],
    "tour-offer-": ["core-title", "core-body", "companions-title", "companions-body",
        "exercises-title", "exercises-body", "module-title", "module-body"],
};

// The "-count" variants are built as `${decision.valueKey}-count`, so enumerate those too.
const decisionValues = ["did-myself", "app-did", "explained", "compared", "skipped"];

const checks = [];
for (const [prefix, values] of Object.entries(families)) {
    if (values.length === 0) continue;
    for (const value of values) checks.push(prefix + value);
}
for (const value of decisionValues) checks.push(`reflection-decision-${value}-count`);

const problems = [];
for (const key of checks) {
    const missing = langs.filter((lang) => !has(lang, key));
    if (missing.length > 0) problems.push(`${key}  missing in: ${missing.join(", ")}`);
}

console.log(`dynamic keys checked: ${checks.length}`);
console.log(`problems: ${problems.length}`);
problems.forEach((p) => console.log("  - " + p));
process.exitCode = problems.length > 0 ? 1 : 0;
