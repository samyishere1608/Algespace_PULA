import { addChoiceXP } from "@utils/agencyUtils.ts";
import { showAgencyToast } from "@components/shared/AgencyXpToast.tsx";

/**
 * Choice XP for the deliberate acts: setting yourself a direction, and agreeing to look back at how
 * it went.
 *
 * Choice is for deciding, not for doing — doing is what Resolve and Insight are for. That is why it
 * is the only one of the three that can be earned by a student who has not yet completed anything:
 * choosing to reflect is itself the skill being practised.
 */

export const CHOICE_XP_FOR_SETTING_A_GOAL = 5;
export const CHOICE_XP_FOR_DAY_REFLECTION = 5;

function today(): string {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Awards Choice at most once per calendar day for a given act.
 *
 * The daily bound exists because these acts are clicks, and clicks can be repeated. Goals can be
 * added and removed in a loop; the end-of-session prompt can be opened and closed. Paying per click
 * would make the currency a measure of nothing, and a student who noticed would be right to treat it
 * as one.
 *
 * The bound is per ACT rather than global, so setting a goal and agreeing to reflect on the same day
 * both count. They are different decisions and neither should cancel the other out.
 *
 * Guests are skipped: `addChoiceXP` is keyed on a student id and "guest" is not one.
 */
function awardDailyChoice(studentId: number | string, act: string, amount: number): number {
    if (typeof studentId !== "number" || studentId <= 0) return 0;

    const key = `algespace_choice_awarded_${act}_${studentId}_${today()}`;
    try {
        if (localStorage.getItem(key) !== null) return 0;
        localStorage.setItem(key, "1");
    } catch {
        // Storage unavailable. The claim cannot be recorded, so the same act could pay twice in a
        // session — but refusing the award would punish the student for a browser setting, which is
        // the worse of the two failures for something worth five points.
    }

    addChoiceXP(studentId, amount, act);
    showAgencyToast("choice", amount);
    return amount;
}

/**
 * Awarded when the student adds a goal of their own.
 *
 * NOTE for the AI suggestion: it must NOT award this. Choosing a direction is the thing being
 * rewarded, and accepting one the system proposed is not choosing it. The suggestion is there to
 * help a student who does not know what to pick, and paying them for taking the suggestion would
 * reward exactly the students who did the least deciding.
 */
export function awardChoiceForSettingAGoal(studentId: number | string): number {
    return awardDailyChoice(studentId, "goal-set", CHOICE_XP_FOR_SETTING_A_GOAL);
}

/** Awarded when the student agrees to look back over the session at the end of it. */
export function awardChoiceForDayReflection(studentId: number | string): number {
    return awardDailyChoice(studentId, "day-reflection", CHOICE_XP_FOR_DAY_REFLECTION);
}
