// Placeholder audit: every {{placeholder}} a string asks for must be supplied by the code that
// renders it, in every language. A missing one renders as a hole in the sentence.
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
        if (file.endsWith(".json")) resources[lang][file.replace(/\.json$/, "")] = JSON.parse(fs.readFileSync(path.join(transRoot, lang, file), "utf8"));
    }
}

function lookup(lang, key) {
    for (const ns of Object.keys(resources[lang])) {
        const node = key.split(".").reduce((o, part) => (o == null ? null : o[part]), resources[lang][ns]);
        if (typeof node === "string") return node;
    }
    return null;
}

function placeholders(text) {
    return new Set([...text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((m) => m[1]));
}

// Collect call sites: the key and the object literal that follows it.
const calls = [];
const patterns = [
    /new TranslationInterpolation\(\s*["'`]([a-zA-Z0-9_.:-]+)["'`]\s*,\s*\{/g,
    /\bt\(\s*["'`]([a-zA-Z0-9_.:-]+)["'`]\s*,\s*\{/g,
];

for (const file of walk(srcRoot)) {
    const text = fs.readFileSync(file, "utf8");
    for (const re of patterns) {
        let m;
        while ((m = re.exec(text)) !== null) {
            // Grab the balanced braces that follow so shorthand and computed keys are visible.
            let i = re.lastIndex - 1;
            let depth = 0;
            let end = i;
            for (; i < text.length; i++) {
                if (text[i] === "{") depth++;
                else if (text[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
            }
            const body = text.slice(re.lastIndex, end);
            const keys = new Set();
            let d = 0;
            let token = "";
            const flush = () => {
                const t = token.trim();
                if (t && d === 0) {
                    const name = t.split(":")[0].trim();
                    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) keys.add(name);
                }
                token = "";
            };
            for (const ch of body) {
                if ("{[(".includes(ch)) d++;
                else if ("}])".includes(ch)) d--;
                if (ch === "," && d === 0) flush();
                else token += ch;
            }
            flush();
            calls.push({ key: m[1], keys, file: path.relative(srcRoot, file) });
        }
    }
}

const problems = [];
for (const call of calls) {
    for (const lang of langs) {
        const text = lookup(lang, call.key);
        if (text == null) continue; // key existence is covered by the other audit
        const wanted = placeholders(text);
        for (const name of wanted) {
            if (!call.keys.has(name)) {
                problems.push(`${lang}: "${call.key}" wants {{${name}}} but ${call.file} passes [${[...call.keys].join(", ")}]`);
            }
        }
    }
}

console.log(`call sites found: ${calls.length}`);
console.log(`\n=== unfilled placeholders: ${problems.length} ===`);
[...new Set(problems)].slice(0, 60).forEach((p) => console.log(p));
