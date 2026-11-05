// Pre-pilot locale audit: key parity, empty values, study-design leaks, and stray simplified-Chinese
// characters in the Japanese files. Run: node tools/pilot-audit/locale-audit.cjs
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "..", "reactapp", "src", "assets", "translations");
const langs = ["en", "de", "ja"];
const problems = [];
const report = [];

function keys(obj, prefix = "") {
    const out = [];
    for (const [k, v] of Object.entries(obj)) {
        const full = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object" && !Array.isArray(v)) out.push(...keys(v, full));
        else out.push(full);
    }
    return out;
}

function walkStrings(node, cb, prefix = "") {
    for (const [k, v] of Object.entries(node)) {
        const full = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object") walkStrings(v, cb, full);
        else if (typeof v === "string") cb(full, v);
    }
}

const files = fs.readdirSync(path.join(root, "en")).filter((f) => f.endsWith(".json"));
const plural = /_(one|other|zero|many|two|few)$/;
// German declines its nouns, so the variables namespace carries -nom/-akk/-gen forms the other two
// languages do not have. That is the language, not a missing translation.
const deCase = /-(nom|akk|dat|gen)(-plural)?$/;

for (const file of files) {
    const maps = {};
    for (const lang of langs) {
        const p = path.join(root, lang, file);
        if (!fs.existsSync(p)) {
            problems.push(`missing file: ${lang}/${file}`);
            continue;
        }
        try {
            maps[lang] = JSON.parse(fs.readFileSync(p, "utf8"));
        } catch (e) {
            problems.push(`invalid JSON: ${lang}/${file}: ${e.message}`);
        }
    }
    if (!maps.en) continue;

    const sets = {};
    for (const lang of Object.keys(maps)) sets[lang] = new Set(keys(maps[lang]));

    const base = sets.en;
    for (const lang of Object.keys(sets)) {
        if (lang === "en") continue;
        const germanCases = lang === "de" && file === "variables.json";
        // A missing key is what shows a raw key on a student's screen, so it is the only hard failure.
        for (const k of base) {
            if (sets[lang].has(k) || plural.test(k) || germanCases) continue;
            problems.push(`${lang}/${file}: missing key ${k}`);
        }
        for (const k of sets[lang]) {
            if (base.has(k) || plural.test(k) || deCase.test(k) || germanCases) continue;
            problems.push(`${lang}/${file}: extra key ${k}`);
        }
    }

    for (const lang of Object.keys(maps)) {
        for (const k of keys(maps[lang])) {
            const value = k.split(".").reduce((o, part) => (o == null ? o : o[part]), maps[lang]);
            if (typeof value === "string" && value.trim() === "") problems.push(`${lang}/${file}: empty value ${k}`);
        }
    }

    report.push(`${file}: ${base.size} keys x ${Object.keys(maps).length} languages`);
}

// Nothing on a student's screen may name the study design.
const leakWords = [/\bcontrol group\b/i, /\btreatment\b/i, /\bstudy arm\b/i, /\bexperiment group\b/i,
    /\u7d71\u5236\u7fa4/, /\u5b9f\u9a13\u7fa4/, /Kontrollgruppe/, /Versuchsgruppe/];

for (const lang of langs) {
    for (const file of fs.readdirSync(path.join(root, lang))) {
        if (!file.endsWith(".json")) continue;
        const json = JSON.parse(fs.readFileSync(path.join(root, lang, file), "utf8"));
        walkStrings(json, (key, value) => {
            for (const rx of leakWords) {
                if (rx.test(value)) problems.push(`LEAK ${lang}/${file}::${key} = "${value}"`);
            }
        });
    }
}

// Characters that exist only in simplified Chinese are almost always a paste error in a Japanese file.
// Built from code points so the list survives any editor or encoding the file is opened with.
const simplifiedCodePoints = [
    0x6b65, 0x5458, 0x89c1, 0x5bf9, 0x8bf4, 0x65f6, 0x4e60, 0x73b0, 0x8ba4, 0x8bc6, 0x5e94, 0x8be5,
    0x8fd9, 0x6837, 0x5417, 0x5462, 0x65e0, 0x5173, 0x7535, 0x8bdd, 0x8f66, 0x4e70, 0x5356, 0x8bfb,
    0x5199, 0x542c, 0x4eec, 0x4e2a, 0x6765, 0x56fd, 0x4e3a, 0x4ece, 0x5b9e, 0x9645, 0x53d1, 0x53d8,
    0x9898, 0x5e2e, 0x89c9, 0x9009, 0x62e9, 0x7ec3, 0x56fe, 0x6807, 0x5f20, 0x957f, 0x95e8, 0x4e1c,
];
const simplified = new Set(simplifiedCodePoints.map((cp) => String.fromCodePoint(cp)));

const jaHits = [];
for (const file of fs.readdirSync(path.join(root, "ja")).filter((f) => f.endsWith(".json"))) {
    const json = JSON.parse(fs.readFileSync(path.join(root, "ja", file), "utf8"));
    walkStrings(json, (key, value) => {
        for (const ch of value) {
            if (simplified.has(ch)) jaHits.push(`${file}::${key} has "${ch}" -> ${value.slice(0, 40)}`);
        }
    });
}

console.log("=== files ===");
report.forEach((line) => console.log(line));
console.log(`\n=== problems: ${problems.length} ===`);
problems.slice(0, 60).forEach((p) => console.log(p));
console.log(`\n=== suspicious Japanese characters: ${jaHits.length} ===`);
jaHits.slice(0, 40).forEach((h) => console.log(h));
