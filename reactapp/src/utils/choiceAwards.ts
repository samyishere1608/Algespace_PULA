import axios from "axios";
import { addChoiceXP, revokeChoiceXP } from "@utils/agencyUtils.ts";
import { showAgencyToast } from "@components/shared/AgencyXpToast.tsx";
import { pushState } from "@utils/studentState.ts";

const BACKEND = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7273";

/**
 * Choice XP for the deliberate acts: setting yourself a direction, and looking back at how it went.
 *
 * Choice is for deciding, not for doing — doing is what Resolve and Insight are for. That is why it
 * is the only one of the three that can be earned by a student who has not yet completed anything:
 * choosing to reflect is itself the skill being practised.
 *
 * WHAT KEEPS THIS FROM BEING FARMED, since it is no longer capped by the day.
 *
 * A daily cap was the first answer and it was the wrong shape: it stopped the farm, but it also meant
 * a student who genuinely set a goal in the morning got nothing for the second one in the afternoon,
 * and it made Choice a measure of days rather than of decisions. Each award now has an IDENTITY
 * instead, and is paid — or taken back — on the thing it names:
 *
 *   - setting a goal: paid once per goal id, and TAKEN BACK if that goal is deleted. Adding and
 *     deleting in a loop therefore nets to zero however often it is repeated, while a goal that is
 *     kept keeps its points.
 *   - finishing a reflection: paid by the SERVER, in `reflection/complete`, only when the reflection
 *     was actually finished. Agreeing to reflect and then closing the window pays nothing, because
 *     the close arrives as a skip and the award is not on the yes.
 */

export const CHOICE_XP_FOR_SETTING_A_GOAL = 5;

/** Choice for choosing to reflect. Paid on the yes, kept only if the reflection is finished. */
export const CHOICE_XP_FOR_REFLECTING = 5;

/** Marker for "this goal id has already been paid", so a re-saved goal cannot pay twice. */
function goalAwardKey(goalId: string): string {
    return `algespace_choice_goal_awarded_${goalId}`;
}

/** Marker for "this reflection has already been paid", so a re-opened item cannot pay twice. */
function reflectionAwardKey(queueItemId: number): string {
    return `algespace_choice_reflection_awarded_${queueItemId}`;
}

/**
 * Awarded when the student adds a goal of their own, once per goal.
 *
 * `goalId` is required because it is the identity the award is keyed on: a goal can be re-saved (an
 * edit re-posts it), and that must not pay a second time. Pass the goal's own id, not a fresh one.
 *
 * NOTE for the AI suggestion: it must NOT call this. Choosing a direction is the thing being
 * rewarded, and accepting one the system proposed is not choosing it. The suggestion is there to
 * help a student who does not know what to pick, and paying them for taking the suggestion would
 * reward exactly the students who did the least deciding.
 */
export function awardChoiceForSettingAGoal(studentId: number | string, goalId: string): number {
    if (typeof studentId !== "number" || studentId <= 0) return 0;

    const key = goalAwardKey(goalId);
    try {
        if (localStorage.getItem(key) !== null) return 0;
        localStorage.setItem(key, "1");
    } catch {
        // Storage unavailable: the claim cannot be recorded, so the same goal could pay twice here.
        // Refusing would punish the student for a browser setting, and the server's own row is keyed
        // on the goal id, so the duplicate is not in the ledger either way.
    }
    // The claim travels with the student too: paid on this machine and re-claimed on another would be
    // the same goal paying twice, which is exactly what this marker exists to prevent.
    pushState(studentId, key, "1");

    addChoiceXP(studentId, CHOICE_XP_FOR_SETTING_A_GOAL, "goal-set", goalId);
    showAgencyToast("choice", CHOICE_XP_FOR_SETTING_A_GOAL);
    return CHOICE_XP_FOR_SETTING_A_GOAL;
}

/**
 * Takes that Choice back when the goal is deleted.
 *
 * This reversal is what makes paying per goal safe: the pair (add, delete) is worth nothing, so the
 * loop a daily cap existed to prevent earns nothing even though the cap is gone. It is deliberately
 * NOT time-limited — deleting a goal a week later gives the points back too — because the award is
 * for a decision the student kept, and a deleted goal is a decision they did not keep.
 *
 * Deleting a goal that was never paid for is a no-op: one set before this rule existed, or one taken
 * from a suggestion, has no marker and nothing to give back. The server applies the same rule to its
 * own ledger, keyed on the goal id, so the two agree.
 */
export function revokeChoiceForDeletedGoal(studentId: number | string, goalId: string): void {
    if (typeof studentId !== "number" || studentId <= 0) return;

    const key = goalAwardKey(goalId);
    let wasAwarded = false;
    try {
        wasAwarded = localStorage.getItem(key) !== null;
        if (wasAwarded) localStorage.removeItem(key);
    } catch {
        // Storage unavailable: fall through. The server only reverses an award it can find in its own
        // ledger, so asking unnecessarily is harmless and skipping it would leave the points behind.
        wasAwarded = true;
    }
    // Clearing the claim has to reach the other machine too, or a student who deletes a goal here and
    // sits down at another seat tomorrow is paid for it again there.
    if (wasAwarded) pushState(studentId, key, null);
    if (!wasAwarded) return;

    // Local first, so the number on screen moves at once; the server does the same subtraction and the
    // next `syncAgencyFromBackend` reconciles the two.
    revokeChoiceXP(studentId, CHOICE_XP_FOR_SETTING_A_GOAL);
    void syncRevokeToBackend(studentId, goalId);
}

/**
 * Server-side reversal, keyed on the goal id.
 *
 * Non-critical like every other XP write: the goal is already gone from the list the student is
 * looking at, and failing this call must not put it back or show an error. The server keeps the
 * ledger row, so a missed call is a discrepancy the next sync corrects rather than a lost fact.
 */
async function syncRevokeToBackend(studentId: number, goalId: string): Promise<void> {
    try {
        await axios.post(`${BACKEND}/student-progress/goal-choice-revoke`, { studentId, goalId });
    } catch {
        // See above.
    }
}

/**
 * Awarded the moment the student agrees to reflect, so the yes has an answer they can see.
 *
 * PAID ON THE YES, KEPT ON THE FINISH. Nothing appears when the points arrive only after the last
 * question: the student said yes and nothing happened, which reads as the reflection not counting.
 * So the award lands immediately — and the same amount is taken back if they close the reflection
 * without finishing it (see `revokeChoiceForReflection`). The two together are what make the yes
 * worth something without making the yes itself the thing that pays.
 *
 * Idempotent per queue item, so re-opening the same reflection does not pay again. The server holds
 * the same row keyed on the item id, which is also what the revoke looks for.
 */
export function awardChoiceForReflection(studentId: number | string, queueItemId: number): number {
    if (typeof studentId !== "number" || studentId <= 0) return 0;

    const key = reflectionAwardKey(queueItemId);
    try {
        if (localStorage.getItem(key) !== null) return 0;
        localStorage.setItem(key, "1");
    } catch {
        // Storage unavailable: the same reflection could pay twice here. The server's row is keyed on
        // the item id, so the ledger stays right and the next sync corrects the display.
    }
    pushState(studentId, key, "1");

    addChoiceXP(studentId, CHOICE_XP_FOR_REFLECTING, "reflection-opted-in", String(queueItemId));
    showAgencyToast("choice", CHOICE_XP_FOR_REFLECTING);
    return CHOICE_XP_FOR_REFLECTING;
}

/**
 * Takes that Choice back when the reflection is closed without being finished.
 *
 * The other half of paying on the yes. Closing a reflection marks the item skipped, and a skipped
 * item is one the student declined — so the points for agreeing go with it. Completing it keeps
 * them, which is the bargain the offer makes.
 *
 * A no-op when nothing was paid: a reflection opened from the dashboard's own list rather than from
 * the yes prompt never went through `awardChoiceForReflection`, and the server refuses to take back
 * an award it cannot find in its ledger.
 */
export function revokeChoiceForReflection(studentId: number | string, queueItemId: number): void {
    if (typeof studentId !== "number" || studentId <= 0) return;

    const key = reflectionAwardKey(queueItemId);
    let wasAwarded = false;
    try {
        wasAwarded = localStorage.getItem(key) !== null;
        if (wasAwarded) localStorage.removeItem(key);
    } catch {
        wasAwarded = true;
    }
    if (wasAwarded) pushState(studentId, key, null);
    if (!wasAwarded) return;

    revokeChoiceXP(studentId, CHOICE_XP_FOR_REFLECTING);
    void syncReflectionRevokeToBackend(studentId, queueItemId);
}

async function syncReflectionRevokeToBackend(studentId: number, queueItemId: number): Promise<void> {
    try {
        await axios.post(`${BACKEND}/student-progress/reflection-choice-revoke`, { studentId, queueItemId });
    } catch {
        // Non-critical, as above.
    }
}
