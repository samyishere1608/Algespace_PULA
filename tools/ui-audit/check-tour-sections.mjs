// Checks the walkthrough's structure, which nothing else can see.
//
//   node tools/ui-audit/check-tour-sections.mjs
//
// A section is played on its own: the overlay finds its first and last step by scanning for the
// section name, and plays everything in between. That only works while each section is ONE
// CONTIGUOUS RUN — insert a step in the wrong place and a section silently swallows the steps of
// another, which the student experiences as the tour jumping to a screen it never introduced.
//
// It also proves the control arm's section still exists. A control student has no dashboard, so the
// module section is the only walkthrough they can ever be given; if it disappears they get nothing,
// and nothing on screen would say so.
import { readFileSync } from "node:fs";

const source = readFileSync("reactapp/src/utils/onboardingTour.ts", "utf8");
const problems = [];

// The steps live in one array, and each declares id, section and route in that order — even when the
// object spans several lines, so the gaps allow newlines but not another step.
const block = source.slice(source.indexOf("export const TOUR_STEPS"), source.indexOf("/** True once this student"));
const ordered = [...block.matchAll(/[{,]\s*id: "([\w-]+)",\s*section: "(\w+)",\s*route: (\w+)/g)]
    .map((m) => ({ id: m[1], section: m[2], route: m[3] }));

if (ordered.length === 0) problems.push("could not read any tour step out of onboardingTour.ts");

// ── Sections must not interleave ────────────────────────────────────────────────
const runs = {};
for (const step of ordered) {
    const last = runs[step.section];
    if (last === undefined) runs[step.section] = { count: 1, closed: false };
    else if (last.closed) problems.push(`section "${step.section}" is split into more than one run (at step "${step.id}")`);
    else last.count += 1;

    // A section that is no longer the most recent one can never be re-entered.
    for (const [name, run] of Object.entries(runs)) {
        if (name !== step.section && !run.closed) run.closed = true;
    }
}

const declared = [...source.matchAll(/TOUR_SECTIONS: TourSection\[\] = \[([^\]]+)\]/g)][0]?.[1]
    ?.split(",").map((value) => value.trim().replace(/"/g, "")).filter(Boolean) ?? [];

for (const name of Object.keys(runs)) {
    if (!declared.includes(name)) problems.push(`section "${name}" has steps but is not in TOUR_SECTIONS, so it can never be offered`);
}
for (const name of declared) {
    if (runs[name] === undefined) problems.push(`TOUR_SECTIONS lists "${name}" but no step uses it`);
}

// ── The control arm's section ───────────────────────────────────────────────────
const module = runs["module"];
if (module === undefined) {
    problems.push("there is no \"module\" section — control students would get no walkthrough at all");
} else if (module.count < 8) {
    problems.push(`the "module" section is only ${module.count} steps; a control student's tour should cover the list, the kinds and an exercise`);
}

const moduleRoutes = ordered.filter((step) => step.section === "module").map((step) => step.route);
for (const route of ["MODULE", "PREVIEW"]) {
    if (!moduleRoutes.includes(route)) problems.push(`the "module" section never uses ${route}`);
}

// ── It is actually started, and only for control students ──────────────────────
const view = readFileSync("reactapp/src/views/flexibility/FlexibilityView.tsx", "utf8");
if (!/startSectionTour\(student\.id, "module"\)/.test(view)) {
    problems.push("FlexibilityView.tsx no longer starts the module tour");
}
if (!/isControlStudent\(student\)/.test(view)) {
    problems.push("FlexibilityView.tsx starts the module tour without checking the arm");
}

// ── The kind screenshots are paired with their arm ─────────────────────────────
// The dashboard screenshots show the companion in the corner, because a treatment student meets one.
// A control student does not, so each arm has its own set and neither may borrow the other's — the
// whole point of the second set is that a control student never sees a character they will not get.
const images = [...block.matchAll(/id: "([\w-]+)",\s*section: "(\w+)",[\s\S]{0,400}?image: (\w+),/g)]
    .map((m) => ({ id: m[1], section: m[2], image: m[3] }));

if (images.length !== 6) {
    problems.push(`expected 6 kind screenshots (3 per arm), found ${images.length}`);
}

for (const step of images) {
    const isControlStep = step.section === "module";
    const usesControlImage = /Control(Image)?$/.test(step.image);
    if (isControlStep && !usesControlImage) {
        problems.push(`"${step.id}" is in the control tour but uses ${step.image} — the companion is visible in it`);
    }
    if (!isControlStep && usesControlImage) {
        problems.push(`"${step.id}" is the dashboard tour but uses ${step.image} — a treatment student meets a companion`);
    }
}

for (const file of ["suitability.png", "efficiency.png", "matching.png", "sutaiblity-control.png", "efficiency-control.png", "matching-control.png"]) {
    const path = `reactapp/src/assets/images/${file}`;
    try {
        readFileSync(path);
    } catch {
        problems.push(`missing screenshot ${path}`);
    }
}

if (problems.length > 0) {
    for (const problem of problems) console.log(`FAIL ${problem}`);
    console.log(`\n${problems.length} problem(s) found.`);
    process.exit(1);
}

console.log(`OK  tour sections: ${ordered.length} steps in ${Object.keys(runs).length} contiguous sections (${Object.entries(runs).map(([n, r]) => `${n} ${r.count}`).join(", ")})`);
