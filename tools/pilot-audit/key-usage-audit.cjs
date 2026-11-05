// Every i18n key the code asks for must exist, in every language, or a raw key shows on screen.
const fs = require("fs");
const path = require("path");

const srcRoot = path.join(__dirname, "..", "..", "reactapp", "src");
const transRoot = path.join(srcRoot, "assets", "translations");
const langs = ["en", "de", "ja"];

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(full);
    }
    return out;
}

const resources = {};
for (const lang of langs) {
    resources[lang] = {};
    for (const file of fs.readdirSync(path.join(transRoot, lang))) {
        if (!file.endsWith(".json")) continue;
        const ns = file.replace(/\.json$/, "");
        resources[lang][ns] = JSON.parse(fs.readFileSync(path.join(transRoot, lang, file), "utf8"));
    }
}

function has(lang, key) {
    // i18next appends the plural bucket for the language, so "key" may legitimately exist only as
    // "key_one" / "key_other": a language with no plural distinction (Japanese) has just "key_other".
    const candidates = [key, `${key}_one`, `${key}_other`, `${key}_zero`, `${key}_many`];
    for (const ns of Object.keys(resources[lang])) {
        for (const candidate of candidates) {
            const parts = candidate.split(".");
            let node = resources[lang][ns];
            let ok = true;
            for (const part of parts) {
                if (node == null || typeof node !== "object" || !(part in node)) { ok = false; break; }
                node = node[part];
            }
            if (ok) return true;
        }
    }
    return false;
}

const used = new Map(); // key -> Set(files)
const re = /\bt\(\s*["'`]([a-zA-Z0-9_.:-]+)["'`]/g;

for (const file of walk(srcRoot)) {
    const text = fs.readFileSync(file, "utf8");
    let m;
    while ((m = re.exec(text)) !== null) {
        const key = m[1];
        if (key.includes("${")) continue;
        if (!used.has(key)) used.set(key, new Set());
        used.get(key).add(path.relative(srcRoot, file));
    }
}

const missing = [];
for (const [key, files] of [...used.entries()].sort()) {
    // "number-" is a prefix the variables namespace builds by concatenation, not a key.
    if (key.endsWith("-")) continue;
    for (const lang of langs) {
        if (!has(lang, key)) missing.push(`${lang}: "${key}"  used in ${[...files].slice(0, 2).join(", ")}`);
    }
}

console.log(`literal t() keys used by the app: ${used.size}`);
console.log(`\n=== missing in some language: ${missing.length} ===`);
missing.slice(0, 80).forEach((line) => console.log(line));

// Dynamic families the code builds by template literal, checked by prefix so a hole is visible.
const dynamicPrefixes = ["dashboard-tier-", "dashboard-level-wallet-", "goal-unit-", "goal-quality-", "goals-cat-",
    "reflection-stage-", "reflection-decision-", "tree-stage-", "tour-", "buddy-desc-"];
for (const prefix of dynamicPrefixes) {
    const counts = langs.map((lang) => {
        let n = 0;
        for (const ns of Object.keys(resources[lang])) n += Object.keys(resources[lang][ns]).filter((k) => k.startsWith(prefix)).length;
        return `${lang}=${n}`;
    });
    console.log(`prefix ${prefix}: ${counts.join(" ")}`);
}
