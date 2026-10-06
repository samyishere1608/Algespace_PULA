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
