// Checks the outfit-expression mapping against the folders on disk.
//   node tools/i18n-fix/check-chatfaces.mjs
//
// The folder layout is the only index for which art belongs to which look, so this asserts the thing
// that would otherwise fail silently: a mood with no file, a folder nobody mapped, or a look bound to
// the wrong outfit id (Lumi's two swapped folders).
import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
    describeOutfitExpressionPath,
    normaliseOutfitId,
    outfitIdForFolder,
} from "../../reactapp/src/utils/chatfaceExpressionMap.ts";

const ROOT = "reactapp/src/assets/images/Character/Chatfaces";
const MOODS = ["hint", "question", "celebrate", "solo", "approve"];

// What each character's folders must resolve to, written out by hand from the shop catalogue.
// Pippin has six items and five folders, so his folders are outfit 1..5 and his default look is drawn
// separately. The other three have five items and five folders, folder 1 being their default.
const EXPECTED = {
    Pipin: ["pippin-outfit-1", "pippin-outfit-2", "pippin-outfit-3", "pippin-outfit-4", "pippin-outfit-5"],
    // Deliberately not 2,3,4,5: Lumi's folders are numbered differently from her shop items.
    Lumi: ["lumi-default", "lumi-outfit-3", "lumi-outfit-2", "lumi-outfit-4", "lumi-outfit-5"],
    Chibi: ["chimi-default", "chimi-outfit-2", "chimi-outfit-3", "chimi-outfit-4", "chimi-outfit-5"],
    MasterZen: ["masterzen-default", "masterzen-outfit-2", "masterzen-outfit-3", "masterzen-outfit-4", "masterzen-outfit-5"],
};

let failures = 0;
const byOutfit = new Map();

for (const character of Object.keys(EXPECTED)) {
    for (let n = 1; n <= 5; n++) {
        const dir = join(ROOT, character, `outfit ${n}`);
        const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".png"));

        const moods = new Set();
        for (const file of files) {
            // The key Vite hands the app is a path ending in the same tail, so this exercises the
            // real parser rather than a copy of it.
            const described = describeOutfitExpressionPath(`${ROOT}/${character}/outfit ${n}/${file}`);
            if (!described) {
                console.log(`FAIL  unmapped path: ${character}/outfit ${n}/${file}`);
                failures++;
                continue;
            }
            moods.add(described.mood);
            byOutfit.set(described.outfitId, (byOutfit.get(described.outfitId) ?? new Set()).add(described.mood));
        }

        const expectedOutfit = EXPECTED[character][n - 1];

        const missing = MOODS.filter((m) => !moods.has(m));
        if (missing.length) {
            console.log(`FAIL  ${character}/outfit ${n}: no art for ${missing.join(", ")}`);
            failures++;
        }
        if (files.length !== 5) {
            console.log(`FAIL  ${character}/outfit ${n}: expected 5 files, found ${files.length}`);
            failures++;
        }
        // Every folder must land on the outfit id the shop uses for that look.
        const resolved = describeOutfitExpressionPath(`${ROOT}/${character}/outfit ${n}/${files[0]}`)?.outfitId;
        if (resolved !== expectedOutfit) {
            console.log(`FAIL  ${character}/outfit ${n} -> ${resolved}, expected ${expectedOutfit}`);
            failures++;
        }
    }
}

// Every outfit id must end up with all five moods, or the popover falls back mid-exercise.
for (const [outfitId, moods] of byOutfit) {
    const missing = MOODS.filter((m) => !moods.has(m));
    if (missing.length) {
        console.log(`FAIL  ${outfitId}: missing ${missing.join(", ")}`);
        failures++;
    }
}

console.log(`outfit ids with expression art: ${byOutfit.size}`);
console.log(failures === 0 ? "all outfit expression mappings check out" : `${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
