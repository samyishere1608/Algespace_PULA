import { addInsightXP } from "@utils/agencyUtils.ts";
import { getAvoidanceProfile } from "@utils/avoidanceProfile.ts";
import { showAgencyToast } from "@components/shared/AgencyXpToast.tsx";

/**
 * Insight for facing something you have been avoiding.
 *
 * This is the mirror of the nudge. The nudge reacts to a decline; this reacts to the engagement that
 * follows it — whether or not a nudge was ever shown, because a student who works this out on their
 * own has done exactly the same difficult thing. Requiring the nudge would mean paying only the
 * students who needed telling.
 *
 * WHY IT CANNOT BE FARMED, and why that is structural rather than a rule:
 *
 * The award is conditional on the element being a gap, and engaging is precisely what closes a gap.
 * The server defines a gap as at most one engagement in five, so working through the thing you avoid
 * raises your rate above that within a couple of attempts and the awards stop on their own. There is
 * no counter to maintain and no daily cap to tune — the reward extinguishes itself by the same
 * measurement that switched it on.
 *
 * That also means the award is worth little by design. It is for STARTING, not for continuing, and a
 * student who has genuinely changed gets nothing more from it. The alternative — paying per
 * engagement — would turn the thing we are trying to encourage into a tap to be held down.
 */

/** Small, and deliberately so: see above. Comparable to a completed goal's Resolve. */
export const INSIGHT_XP_FOR_FACING_GAP = 8;

/**
 * Awards Insight if the element is currently a gap. Returns the amount awarded, or 0.
 *
 * Callers are expected to have de-duplicated per exercise: the two solution points both map to the
 * same element, and being paid twice in one exercise for one act would be wrong.
 */
export async function awardInsightForFacingGap(studentId: number, element: string): Promise<number> {
    const profile = await getAvoidanceProfile(studentId);

    // No profile means we do not know, which must never pay out. Awarding on a failed request would
    // make the reward random rather than a reflection of anything.
    const gap = profile?.gaps.find((stat) => stat.element === element);
    if (!gap) return 0;

    addInsightXP(studentId, INSIGHT_XP_FOR_FACING_GAP, "faced-a-gap");
    showAgencyToast("insight", INSIGHT_XP_FOR_FACING_GAP);
    return INSIGHT_XP_FOR_FACING_GAP;
}
