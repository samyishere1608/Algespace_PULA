import { ReactElement } from "react";
import pippinImg from "@images/Character/Pipin_de.png";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { getActiveBuddyId, getEquippedOutfitId } from "@utils/wardrobeUtils.ts";
import { CHARACTER_CATALOGUE, resolveOutfitSrc } from "@views/student/dashboard/CharacterShopModal.tsx";
import { BUDDIES } from "@views/student/dashboard/ChooseBuddyModal.tsx";
import "@styles/flexibility/flexibility.scss";

/**
 * The character portrait shown next to an intervention popover.
 *
 * The generic pedagogical-agent artwork (AgentType / AgentExpression) is no longer used. This slot
 * now shows the student's own chosen character, so hints appear to come from the character they
 * picked rather than from an anonymous agent.
 *
 * The image resolves the same way it does everywhere else in the app — equipped outfit first, then
 * the character's base image, then the default — so the character looks identical here to how it
 * looks on the dashboard.
 */
export function Agent(): ReactElement {
    const { student } = useAuth();

    const studentId = student?.id ?? "guest";
    const buddyId = getActiveBuddyId(studentId);
    const buddy = BUDDIES.find((b) => b.id === buddyId) ?? BUDDIES[0];

    const equippedId = getEquippedOutfitId(studentId, buddyId);
    const equippedSrc = equippedId ? resolveOutfitSrc(buddyId, equippedId) : undefined;
    const imageSrc = equippedSrc ?? CHARACTER_CATALOGUE.find((c) => c.id === buddyId)?.baseSrc ?? pippinImg;

    return (
        <div className="agent-image__container agent-image__container--large">
            <img src={imageSrc} alt={buddy.name} />
        </div>
    );
}

