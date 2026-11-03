// Finds popovers that will show the PLAIN portrait: no explicit `mood`, and no agent expression the
// mood mapper understands. Those are the ones where the character loses its expression mid-exercise.
//
//   node tools/ui-audit/check-popover-moods.mjs
//
// Prints one line per offending call site and the total, so a new popover that forgets a mood shows up
// as a number instead of as a slightly-wrong face nobody notices.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = "reactapp/src/components/flexibility";
const files = [];

(function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".tsx")) files.push(full);
    }
})(ROOT);

const TAGS = ["<FlexibilityPopover", "<ClosableFlexibilityPopover", "<StepNextIntervention", "<Intervention"];
let flagged = 0;
let wrongMood = 0;

for (const file of files) {
    const text = readFileSync(file, "utf8");
    const lines = text.split("\n");

    for (const tag of TAGS) {
        let index = text.indexOf(tag);
        while (index !== -1) {
            // The opening tag ends at the first ">" that is not inside braces.
            let depth = 0;
            let end = index;
            for (; end < text.length; end++) {
                const ch = text[end];
                if (ch === "{") depth++;
                else if (ch === "}") depth--;
                else if (ch === ">" && depth === 0) break;
            }
            const opening = text.slice(index, end + 1);
            const line = text.slice(0, index).split("\n").length;

            const hasMood = /mood=/.test(opening);
            const mapped = /AgentExpression\.(Smiling|Thinking)/.test(opening);
            const isHintComponent = tag === "<Intervention";

            // `<Intervention>` defaults to "question" when no mood is given, so it is never plain.
            if (!hasMood && !mapped && !isHintComponent) {
                console.log(`${file}:${line}  ${opening.replace(/\s+/g, " ").slice(0, 110)}`);
                flagged++;
            }

            // A POPOVER THAT ASKS SOMETHING WEARS THE QUESTION FACE. `<Intervention>` IS the yes/no
            // prompt — those two buttons are the whole component — so any other mood there is praise or
            // diagnosis for an answer the student has not given yet. This is the check for the mistake
            // that put the confident "your turn" face over "would you like to try this on your own?".
            if (tag === "<Intervention" && hasMood && !/mood=\{"question"\}/.test(opening)) {
                console.log(`WRONG MOOD ${file}:${line}  ${opening.replace(/\s+/g, " ").slice(0, 110)}`);
                wrongMood++;
            }

            index = text.indexOf(tag, end);
        }
    }
}

console.log(`\n${flagged} popover(s) would show the plain portrait`);
console.log(`${wrongMood} question popover(s) wear a non-question face`);
process.exit(flagged === 0 && wrongMood === 0 ? 0 : 1);

