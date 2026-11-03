// ── Chatface art ──────────────────────────────────────────────────────────────
//
// "Chatface" art is a head-and-shoulders portrait of a character drawn once per outfit. It is the
// art used when the character is *speaking to* the student — the intervention popover inside the
// flexibility exercises — as opposed to the full-body art used on the dashboard and in the shop.
//
// The mapping below is keyed `characterId -> outfitId -> image`, so it uses exactly the same two
// identifiers the rest of the app already uses (`CHARACTER_CATALOGUE[].id` and `shopItems[].id` in
// CharacterShopModal.tsx). Nothing needs translating between the two systems.
//
// ── How the files were matched to outfits ────────────────────────────────────
//
// Each outfit in the catalogue already has a full-body asset at
// `Character/Character assets/<Character>/<n>.png`, where `<n>` is the outfit number. The chatface
// files follow that same numbering, and the correspondence was confirmed by comparing the images:
//
//   Pipin      0.png        -> default            (classic orange hoodie)
//   Pipin      1.png        -> outfit-1           (black hoodie)          == assets 1.png
//   Pipin      Cropped_1..4 -> outfit-2..5
//
//   Chibi      "Lineup.png" -> default            (blue samurai)          == assets 1.png
//   Chibi      2.png..5.png -> outfit-2..5        (2.png == assets 2.png)
//
//   Lumi       Cropped_1    -> default            (blue overalls)         == assets 1.png
//   Lumi       Cropped_2..5 -> outfit-2..5
//
//   MasterZen  Cropped_1    -> default            (orange robe)           == assets 1.png
//   MasterZen  Cropped_2..5 -> outfit-2..5
//
// Note the folder names do not match the character ids: Chimi's art lives in `Chatfaces/Chibi/`, and
// Pippin's folder is spelled `Pipin` with one P. The character ids on the right are the ones the
// app uses.
//
// Note also that Chimi, Master Zen and Lumi have no `outfit-1` — their first outfit is `outfit-2`,
// because their numbered full-body assets start at 1 and 1 IS their default. Only Pippin has a
// separate `outfit-1`.

// Pippin — `Chatfaces/Pipin/`
import pippinFaceDefault from "@images/Character/Chatfaces/Pipin/0.png";
import pippinFace1 from "@images/Character/Chatfaces/Pipin/1.png";
import pippinFace2 from "@images/Character/Chatfaces/Pipin/Five Chibi Red Pandas Presenting_png_Cropped_1.png";
import pippinFace3 from "@images/Character/Chatfaces/Pipin/Five Chibi Red Pandas Presenting_png_Cropped_2.png";
import pippinFace4 from "@images/Character/Chatfaces/Pipin/Five Chibi Red Pandas Presenting_png_Cropped_3.png";
import pippinFace5 from "@images/Character/Chatfaces/Pipin/Five Chibi Red Pandas Presenting_png_Cropped_4.png";

// Pippin's expression art — see `CHATFACE_MOODS` below.
import pippinMoodHint from "@images/Character/Chatfaces/Pipin/hintpipin.png";
import pippinMoodQuestion from "@images/Character/Chatfaces/Pipin/Questionpipin.png";
import pippinMoodSolo from "@images/Character/Chatfaces/Pipin/Solveonownpipin.png";
import pippinMoodApprove from "@images/Character/Chatfaces/Pipin/Red Panda Chibi Emote Sticker Strip_png_Cropped_5.png";
import pippinMoodCelebrate from "@images/Character/Chatfaces/Pipin/Red Panda Chibi Emote Sticker Strip_png_Cropped_3.png";

// Chimi — `Chatfaces/Chibi/`
import chimiFaceDefault from "@images/Character/Chatfaces/Chibi/Chibi Samurai Festival Lineup.png";
import chimiFace2 from "@images/Character/Chatfaces/Chibi/2.png";
import chimiFace3 from "@images/Character/Chatfaces/Chibi/3.png";
import chimiFace4 from "@images/Character/Chatfaces/Chibi/4.png";
import chimiFace5 from "@images/Character/Chatfaces/Chibi/5.png";

// Master Zen — `Chatfaces/MasterZen/`
import masterZenFaceDefault from "@images/Character/Chatfaces/MasterZen/Chibi Grandfathers Chat Sticker Lineup_png_Cropped_1.png";
import masterZenFace2 from "@images/Character/Chatfaces/MasterZen/Chibi Grandfathers Chat Sticker Lineup_png_Cropped_2.png";
import masterZenFace3 from "@images/Character/Chatfaces/MasterZen/Chibi Grandfathers Chat Sticker Lineup_png_Cropped_3.png";
import masterZenFace4 from "@images/Character/Chatfaces/MasterZen/Chibi Grandfathers Chat Sticker Lineup_png_Cropped_4.png";
import masterZenFace5 from "@images/Character/Chatfaces/MasterZen/Chibi Grandfathers Chat Sticker Lineup_png_Cropped_5.png";

// Lumi — `Chatfaces/Lumi/`
import lumiFaceDefault from "@images/Character/Chatfaces/Lumi/Five Cheerful Chibi Girls Sticker Set_png_Cropped_1.png";
import lumiFace2 from "@images/Character/Chatfaces/Lumi/Five Cheerful Chibi Girls Sticker Set_png_Cropped_2.png";
import lumiFace3 from "@images/Character/Chatfaces/Lumi/Five Cheerful Chibi Girls Sticker Set_png_Cropped_3.png";
import lumiFace4 from "@images/Character/Chatfaces/Lumi/Five Cheerful Chibi Girls Sticker Set_png_Cropped_4.png";
import lumiFace5 from "@images/Character/Chatfaces/Lumi/Five Cheerful Chibi Girls Sticker Set_png_Cropped_5.png";

/**
 * Chatface art per character, then per outfit id.
 *
 * Keys are the SAME identifiers used by `CHARACTER_CATALOGUE`, so an equipped outfit id can be
 * looked up here directly.
 */
export const CHATFACE_CATALOGUE: Record<string, Record<string, string>> = {
    pippin: {
        "pippin-default": pippinFaceDefault,
        "pippin-outfit-1": pippinFace1,
        "pippin-outfit-2": pippinFace2,
        "pippin-outfit-3": pippinFace3,
        "pippin-outfit-4": pippinFace4,
        "pippin-outfit-5": pippinFace5,
    },
    chimi: {
        "chimi-default": chimiFaceDefault,
        "chimi-outfit-2": chimiFace2,
        "chimi-outfit-3": chimiFace3,
        "chimi-outfit-4": chimiFace4,
        "chimi-outfit-5": chimiFace5,
    },
    masterzen: {
        "masterzen-default": masterZenFaceDefault,
        "masterzen-outfit-2": masterZenFace2,
        "masterzen-outfit-3": masterZenFace3,
        "masterzen-outfit-4": masterZenFace4,
        "masterzen-outfit-5": masterZenFace5,
    },
    lumi: {
        "lumi-default": lumiFaceDefault,
        "lumi-outfit-2": lumiFace2,
        "lumi-outfit-3": lumiFace3,
        "lumi-outfit-4": lumiFace4,
        "lumi-outfit-5": lumiFace5,
    },
};

/** The outfit id each character's "no outfit equipped" state resolves to. */
const DEFAULT_ITEM_SUFFIX = "default";

/**
 * The chatface image for a character wearing a particular outfit.
 *
 * Falls back to the character's DEFAULT chatface when the outfit has no art of its own, so a newly
 * added outfit shows the character's normal face rather than a broken image. Returns `undefined`
 * only when the character itself has no chatface art, which lets the caller fall back to the
 * full-body portrait.
 *
 * `outfitId` may be null/undefined (nothing equipped), and may also be the literal string
 * "default" — `SolveChoiceScreen` passes that — so both are treated as "use the default look".
 */
export function resolveChatfaceSrc(
    characterId: string,
    outfitId: string | null | undefined
): string | undefined {
    const faces = CHATFACE_CATALOGUE[characterId];
    if (!faces) return undefined;

    if (outfitId && outfitId !== DEFAULT_ITEM_SUFFIX) {
        const exact = faces[outfitId];
        if (exact) return exact;
    }

    return faces[`${characterId}-${DEFAULT_ITEM_SUFFIX}`];
}

/** Whether a character has any chatface art at all. */
export function hasChatface(characterId: string): boolean {
    return CHATFACE_CATALOGUE[characterId] !== undefined;
}

// ── Expression art ───────────────────────────────────────────────────────────
//
// The five moods, and how a file path maps to one, live in `chatfaceExpressionMap.ts` — that module
// has no imports, so the mapping can be checked against the real folders without a Vite build. What
// stays here is the part that needs Vite: loading the images and choosing between them.
//
// EVERY OUTFIT HAS ALL FIVE MOODS NOW. The first version only had Pippin's default look, so a student
// who equipped anything else kept the outfit and lost the expression.
import {
    describeOutfitExpressionPath,
    normaliseOutfitId,
    type ChatfaceMood,
} from "@utils/chatfaceExpressionMap.ts";

// Re-exported so every existing `import type { ChatfaceMood } from "@utils/chatfaceUtils.ts"` keeps
// working — the mood vocabulary belongs to the whole feature, not to this file.
export type { ChatfaceMood } from "@utils/chatfaceExpressionMap.ts";
/**
 * Every expression file, resolved at build time rather than through 100 hand-written imports.
 *
 * The folder layout is the index: `Chatfaces/<Character>/outfit <n>/<sheet>_Cropped_<m>.png` says
 * which character, which look and which mood. These are emitted as separate assets rather than
 * bundled, so a student downloads only the five files for the look they are wearing.
 */
const OUTFIT_EXPRESSION_FILES = import.meta.glob(
    "../assets/images/Character/Chatfaces/*/outfit */*.png",
    { eager: true, import: "default" }
) as Record<string, string>;

function buildOutfitExpressions(): Record<string, Partial<Record<ChatfaceMood, string>>> {
    const expressions: Record<string, Partial<Record<ChatfaceMood, string>>> = {};

    for (const [path, url] of Object.entries(OUTFIT_EXPRESSION_FILES)) {
        const described = describeOutfitExpressionPath(path);
        if (!described) continue;

        (expressions[described.outfitId] ??= {})[described.mood] = url;
    }

    return expressions;
}

/** outfit id -> mood -> expression art, for every look that has art. */
const OUTFIT_EXPRESSIONS = buildOutfitExpressions();

/**
 * Pippin's default look, drawn by hand before the per-outfit sets existed.
 *
 * Kept because it is the one look with no folder of its own — his five folders are his five outfits,
 * and the look he wears with nothing equipped is drawn separately.
 */
const CHATFACE_MOODS: Record<string, Partial<Record<ChatfaceMood, string>>> = {
    pippin: {
        hint: pippinMoodHint,
        question: pippinMoodQuestion,
        solo: pippinMoodSolo,
        approve: pippinMoodApprove,
        celebrate: pippinMoodCelebrate,
    },
};

/**
 * The expression art for a character in an outfit, for one mood.
 *
 * Precedence: the outfit's own expression, then — only for the default look — the hand-drawn set, and
 * otherwise nothing, which lets the caller fall back to the plain portrait. The middle step is what
 * keeps Pippin's default look working; it is deliberately not used for other outfits, because those
 * drawings are the default CLOTHES and would contradict what the student is wearing.
 *
 * `outfitId` follows the same rules as `resolveChatfaceSrc`: null/undefined/"default"/"<id>-default"
 * all mean "the default look".
 */
export function resolveChatfaceMoodSrc(
    characterId: string,
    outfitId: string | null | undefined,
    mood: ChatfaceMood | undefined
): string | undefined {
    if (!mood) return undefined;

    const resolvedId = normaliseOutfitId(characterId, outfitId);

    const perOutfit = OUTFIT_EXPRESSIONS[resolvedId]?.[mood];
    if (perOutfit) return perOutfit;

    const isDefaultLook = resolvedId === `${characterId}-${DEFAULT_ITEM_SUFFIX}`;
    if (!isDefaultLook) return undefined;

    return CHATFACE_MOODS[characterId]?.[mood];
}


