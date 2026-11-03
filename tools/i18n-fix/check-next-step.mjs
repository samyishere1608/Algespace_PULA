// Rule-engine check for chooseNextSteps. Run with: node tools/i18n-fix/check-next-step.mjs
// Node 24 strips the types natively, so this needs no test runner and no build step.
import { chooseNextSteps } from "../../reactapp/src/utils/nextStep.ts";

const goal = (id, target) => ({ id, category: "method", focus: null, metric: "exercises", target, createdAt: new Date().toISOString() });
const progress = (current, target) => ({ current, target, percent: Math.round((current / target) * 100), complete: current >= target, unit: "exercises" });

const base = {
    goals: [],
    progress: {},
    labelFor: (g) => `goal-${g.id}`,
    exercisesToday: 0,
    streakDays: 0,
    choiceXP: 0,
    insightXP: 0,
    resolveXP: 0,
    surface: "main",
    dwellSeconds: 0,
};

// [name, context, expected signals in order]
const cases = [
    ["near-complete + streak + wallet", { ...base, goals: [goal("a", 5)], progress: { a: progress(4, 5) }, streakDays: 9 },
        ["goal-near-complete", "streak-at-risk", "weakest-wallet"]],
    ["near-complete leads", { ...base, goals: [goal("a", 5)], progress: { a: progress(4, 5) } },
        ["goal-near-complete", "no-exercises-today", "weakest-wallet"]],
    ["complete goal is ignored", { ...base, goals: [goal("a", 5)], progress: { a: progress(5, 5) }, streakDays: 9 },
        ["streak-at-risk", "weakest-wallet"]],
    ["zero-progress goal", { ...base, goals: [goal("a", 3)], progress: { a: progress(0, 3) } },
        ["goal-zero-progress", "no-exercises-today", "weakest-wallet"]],
    ["one kind offered once", { ...base, goals: [goal("a", 3), goal("b", 4)], progress: { a: progress(0, 3), b: progress(0, 4) } },
        ["goal-zero-progress", "no-exercises-today", "weakest-wallet"]],
    ["streak needs three days", { ...base, streakDays: 2 }, ["no-exercises-today", "weakest-wallet"]],
    ["long dwell joins in", { ...base, exercisesToday: 2, surface: "analytics", dwellSeconds: 120 },
        ["long-dwell", "weakest-wallet"]],
    ["main tab never counts as a long sit", { ...base, exercisesToday: 3, surface: "main", dwellSeconds: 600 },
        ["weakest-wallet"]],
    ["never the screen you are on", { ...base, surface: "exercises" }, ["weakest-wallet"]],
    ["goal option dropped on the exercises tab", { ...base, surface: "exercises", goals: [goal("a", 5)], progress: { a: progress(4, 5) } },
        ["weakest-wallet"]],
    ["at most three", { ...base, goals: [goal("a", 5)], progress: { a: progress(4, 5) }, streakDays: 9, surface: "analytics", dwellSeconds: 200 },
        ["goal-near-complete", "streak-at-risk", "long-dwell"]],
];

let failures = 0;
for (const [name, context, expected] of cases) {
    const result = chooseNextSteps(context).map((s) => s.signal);
    const ok = JSON.stringify(result) === JSON.stringify(expected);
    if (!ok) failures++;
    console.log(`${ok ? "ok  " : "FAIL"}  ${name.padEnd(40)} -> [${result.join(", ")}]`);
}

// Every option must respect the same rule the list is built on.
for (const [name, context] of cases) {
    for (const suggestion of chooseNextSteps(context)) {
        if (suggestion.target === context.surface) {
            console.log(`FAIL  ${name}: points at the current screen (${suggestion.target})`);
            failures++;
        }
    }
}

// The template and reason keys must exist in EVERY locale, not just one: a key missing from Japanese
// would show a raw key in the pilot's own language, which is the one case that actually matters.
import { readFileSync } from "node:fs";
const keysByLanguage = {};
for (const lang of ["en", "de", "ja"]) {
    const data = JSON.parse(readFileSync(`reactapp/src/assets/translations/${lang}/student.json`, "utf8"));
    keysByLanguage[lang] = new Set(Object.keys(data));
}

const required = [
    "buddy-next-goal-near", "buddy-next-goal-zero", "buddy-next-streak", "buddy-next-start",
    "buddy-next-dwell", "buddy-next-dwell-shop",
    "buddy-next-weakest-choice", "buddy-next-weakest-insight", "buddy-next-weakest-resolve",
    "buddy-next-why-goal", "buddy-next-why-goal-zero", "buddy-next-why-streak",
    "buddy-next-why-none", "buddy-next-why-dwell",
    "buddy-next-why-wallet-choice", "buddy-next-why-wallet-insight", "buddy-next-why-wallet-resolve",
    "buddy-next-ask", "buddy-next-thinking", "buddy-next-later", "buddy-next-pick",
    "buddy-next-offer", "buddy-next-offer-yes", "buddy-next-offer-no",
];

// The action line is a LABEL on a button, so it has to stay short. A previous version let the model
// write a friendly paragraph and the result read as advice instead of as something to press.
const MAX_ACTION_LENGTH = { ja: 26, en: 70, de: 70 };
for (const lang of ["en", "de", "ja"]) {
    const data = JSON.parse(readFileSync(`reactapp/src/assets/translations/${lang}/student.json`, "utf8"));
    for (const key of required.filter((k) => k.startsWith("buddy-next-") && !k.startsWith("buddy-next-why") && !k.startsWith("buddy-next-offer"))) {
        const value = data[key] ?? "";
        const length = value.replace(/\{\{\w+\}\}/g, "X").length;
        if (length > MAX_ACTION_LENGTH[lang]) {
            console.log(`FAIL  ${lang}/${key} is ${length} chars, too long to be an action label`);
            failures++;
        }
    }
}

for (const key of required) {
    for (const lang of ["en", "de", "ja"]) {
        if (!keysByLanguage[lang].has(key)) {
            console.log(`FAIL  missing translation key: ${lang}/${key}`);
            failures++;
        }
    }
}

console.log(`\nkeys checked: ${required.length}`);
console.log(failures === 0 ? "\nall rule-engine cases and translation keys pass" : `\n${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
