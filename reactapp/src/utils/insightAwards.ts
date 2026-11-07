import axios from "axios";
import { addInsightXP, addResolveXP } from "@utils/agencyUtils.ts";
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
 *
 * RESOLVE IS THE OTHER HALF. A decision on its own changes nothing, and a student who faces a gap once
 * and then drops it the next time has not changed anything either. So the same request can also pay
 * Resolve — much more — when this engagement is the decision immediately AFTER an Insight award: they
 * were offered the same thing again and said yes again. One Resolve per Insight, and only for the very
 * next decision, not a later one. See `AwardResolveForFollowThrough` for where "next" is decided.
 */

/**
 * Asks the server what this engagement earns and pays what it says. Returns the Insight amount, or 0.
 *
 * Callers are expected to have de-duplicated per exercise: the two solution points both map to the
 * same element, and being paid Insight twice in one exercise for one act would be wrong. The server
 * also refuses a second Insight award for the same attempt — but that is not the end of the request,
 * because the second solution point is exactly where an earlier Insight can be followed through on.
 *
 * `silent` pays and records exactly as usual but shows no toast.
 *
 * THE CONTROL ARM NOW EARNS NOTHING AT ALL, so `silent` is no longer what keeps them clean: the
 * server answers zero for a control account (see `AwardInsightForGap`). That is the stronger rule and
 * the one that matters — the client is a cached bundle on a lab machine, and the arm is a fact about
 * the ACCOUNT. What is still recorded is the behaviour itself, in the anchor store, which is the data
 * the analysis actually reads.
 *
 * The flag is kept because withholding the celebration is a separate decision from withholding the
 * award: a control student who saw "+3 Insight XP" float over the exercise would no longer be a
 * control student even if the number never reached their wallet.
 *
 * `decision` is the anchor store's name for this decision point (`FirstSolutionChoice` and so on).
 * Required for Resolve: it is how the server places this decision in the sequence and tells "the next
 * time they were asked" from "two times later".
 */
export async function awardInsightForFacingGap(
    studentId: number,
    element: string,
    attemptId: number,
    silent = false,
    decision = ""
): Promise<number> {
    try {
        const { data } = await axios.post<{ amount: number; resolveAmount: number }>(
            `${BACKEND}/student-progress/insight-gap-award`,
            {
                studentId,
                element,
                attemptId,
                // Which decision point this is, in the anchor store's own naming. The server needs it
                // for the follow-through below: two decisions for one element can share an attempt (the
                // two solution points), and "the next one" is only answerable if both are named.
                decision,
            }
        );

        // A failed or unclear answer must never pay out: awarding on a failed request would make the
        // reward random rather than a reflection of anything.
        const amount = data?.amount ?? 0;
        const resolveAmount = data?.resolveAmount ?? 0;

        if (amount > 0) {
            addInsightXP(studentId, amount, `faced-a-gap:${element}`);
            if (!silent) showAgencyToast("insight", amount);
        }

        // Paid by the same request, for a DIFFERENT act: this engagement was the next decision after an
        // earlier Insight, so it closes that episode. Both can be non-zero at once — facing a gap a
        // second time is exactly how a first one gets followed through on.
        if (resolveAmount > 0) {
            addResolveXP(studentId, resolveAmount, "insight-follow-through");
            if (!silent) showAgencyToast("resolve", resolveAmount);
        }

        return amount;
    } catch {
        return 0;
    }
}
