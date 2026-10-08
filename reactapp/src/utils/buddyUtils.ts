import pippinImg from "@images/Character/Pipin_de.png";
import { BUDDIES, type Buddy } from "@views/student/dashboard/ChooseBuddyModal.tsx";
import { CHARACTER_CATALOGUE, resolveOutfitSrc } from "@views/student/dashboard/CharacterShopModal.tsx";
import { resolveChatfaceSrc } from "@utils/chatfaceUtils.ts";
import { getActiveBuddyId, getEquippedOutfitId } from "@utils/wardrobeUtils.ts";

/**
 * Everything about "which companion is this student using, and what does it look like".
 *
 * `getActiveBuddyId` lives in `wardrobeUtils`, but the roster it indexes into lives in
 * `ChooseBuddyModal`, and that module already imports `wardrobeUtils`. Putting these lookups in
 * `wardrobeUtils` would make the two import each other, so they live here instead: this module
 * depends on both and neither depends on it.
 */
export function getActiveBuddy(studentId: number | string): Buddy {
    const buddyId = getActiveBuddyId(studentId);
    return BUDDIES.find((buddy) => buddy.id === buddyId) ?? BUDDIES[0];
}

/** Just the name, for the places that only want to put it in a sentence. */
export function getActiveBuddyName(studentId: number | string): string {
    return getActiveBuddy(studentId).name;
}

/**
 * The portrait to show for the student's companion, in the outfit they are wearing.
 *
 * Chatface art wins over the full-body portrait. It is a head-and-shoulders drawing, which is the
 * right shape both for the small circle on the hint button and for the speech popover beside a hint
 * — that is the reason the chatface art exists at all. A character with no chatface art yet falls
 * back to their equipped outfit, then to their base art, then to Pippin, so the slot always shows
 * something correct rather than a broken image.
 *
 * This is the ONE place that decides that precedence, so the hint button and the popover's portrait
 * cannot drift apart: the student presses a face, and the same face is what answers them.
 */
export function getActiveBuddyAvatarSrc(studentId: number | string): string {
    const buddyId = getActiveBuddyId(studentId);
    const equippedId = getEquippedOutfitId(studentId, buddyId);

    return resolveChatfaceSrc(buddyId, equippedId)
        ?? (equippedId ? resolveOutfitSrc(buddyId, equippedId) : undefined)
        ?? CHARACTER_CATALOGUE.find((character) => character.id === buddyId)?.baseSrc
        ?? pippinImg;
}
