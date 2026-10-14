import axios from "axios";
import { addInsightXP } from "@utils/agencyUtils.ts";
import { showAgencyToast } from "@components/shared/AgencyXpToast.tsx";

const BACKEND = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7273";

/**
 * Insight for facing something you have been avoiding.
 *
 * This is the mirror of the nudge. The nudge reacts to a decline; this reacts to the engagement that
 * follows it — whether or not a nudge was ever shown, because a student who works this out on their
 * own has done exactly the same difficult thing. Requiring the nudge would mean paying only the
 * students who needed telling.
 *
 * ONE AWARD PER GAP, decided by the server. The first version paid every engagement while the
 * element still counted as a gap on an all-time rate, and with a long record of declines that rate
 * takes several engagements to recover — so a single change of habit was paid three times. The server
 * now pays once, and pays again only after the student has fallen back into avoiding the element
 * (the last three opportunities all declined) and then faces it again.
 * See `AwardInsightForGap` in StudentProgressController for the rule.
 *
 * That also means the award is worth little by design. It is for STARTING, not for continuing, and a
 * student who has genuinely changed gets nothing more from it.
 */

/**
 * Asks the server whether this engagement earns Insight and pays what it says. Returns the amount
 * paid, or 0.
 *
 * Callers are expected to have de-duplicated per exercise: the two solution points both map to the
 * same element, and being paid twice in one exercise for one act would be wrong. The server also
 * refuses a second award for the same attempt.
 */
export async function awardInsightForFacingGap(studentId: number, element: string, attemptId: number): Promise<number> {
    try {
        const { data } = await axios.post<{ amount: number }>(`${BACKEND}/student-progress/insight-gap-award`, {
            studentId,
            element,
            attemptId,
        });

        // A failed or unclear answer must never pay out: awarding on a failed request would make the
        // reward random rather than a reflection of anything.
        const amount = data?.amount ?? 0;
        if (amount <= 0) return 0;

        addInsightXP(studentId, amount, `faced-a-gap:${element}`);
        showAgencyToast("insight", amount);
        return amount;
    } catch {
        return 0;
    }
}
