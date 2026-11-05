// Keeps two pilot decisions from quietly coming back.
//
//   node tools/ui-audit/check-silent.mjs
//
// 1. Sound is off. The players are gated on `SOUND_ENABLED`, not deleted, so a new chime added later
//    would look completely normal and would simply start playing in a classroom.
// 2. The screen-size gate is off — it was blocking students whose screen met its own requirements.
//    If the guard is dropped from the boundary, every small window starts being refused again.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const problems = [];

// ── Sound ────────────────────────────────────────────────────────────────────────
const audioPlayers = [];
(function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name) && !full.endsWith(join("config", "sound.ts"))) {
            // `config/sound.ts` explains the flag by naming `new Audio`, so it is not a player.
            const text = readFileSync(full, "utf8");
            if (/new Audio\(/.test(text)) audioPlayers.push({ file: full, text });
        }
    }
})("reactapp/src");

if (audioPlayers.length === 0) {
    problems.push("no audio player found at all — did the sound code move?");
}

for (const { file, text } of audioPlayers) {
    if (!/import \{[^}]*SOUND_ENABLED[^}]*\} from "@\/config\/sound\.ts"/.test(text)) {
        problems.push(`${file}: creates an Audio but does not import SOUND_ENABLED`);
        continue;
    }
    // Every construction must be the guarded branch of a ternary.
    for (const line of text.split("\n")) {
        if (/new Audio\(/.test(line) && !/SOUND_ENABLED \? new Audio\(/.test(line)) {
            problems.push(`${file}: ungated construction — ${line.trim()}`);
        }
    }
    // And no bare playback outside a guard.
    const lines = text.split("\n");
    lines.forEach((line, index) => {
        if (!/\.play\(\)/.test(line)) return;
        const before = lines.slice(Math.max(0, index - 6), index).join("\n");
        if (!/!== null/.test(before) && !/SOUND_ENABLED/.test(before)) {
            problems.push(`${file}:${index + 1}: playback with no guard in front of it`);
        }
    });
}

const soundConfig = readFileSync("reactapp/src/config/sound.ts", "utf8");
if (!/export const SOUND_ENABLED: boolean = false;/.test(soundConfig)) {
    problems.push("config/sound.ts: SOUND_ENABLED is no longer switched off");
}

// ── Device gate ──────────────────────────────────────────────────────────────────
const deviceConfig = readFileSync("reactapp/src/config/device.ts", "utf8");
if (!/export const DEVICE_GATE_ENABLED: boolean = false;/.test(deviceConfig)) {
    problems.push("config/device.ts: DEVICE_GATE_ENABLED is no longer switched off");
}

const boundary = readFileSync("reactapp/src/components/views/UnsupportedDevicesBoundary.tsx", "utf8");
if (!/if \(!DEVICE_GATE_ENABLED \|\| isSupported\)/.test(boundary)) {
    problems.push("UnsupportedDevicesBoundary.tsx: the gate no longer honours DEVICE_GATE_ENABLED");
}

if (problems.length > 0) {
    for (const problem of problems) console.log(`FAIL ${problem}`);
    console.log(`\n${problems.length} problem(s) found.`);
    process.exit(1);
}

console.log(`OK  silent and ungated: ${audioPlayers.length} audio players gated, device gate off`);
