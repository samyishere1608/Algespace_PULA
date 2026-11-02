/**
 * The student's level badge, derived from the three agency XP wallets.
 *
 * DELIBERATELY SEPARATE FROM THE TREE. `GrowingTree` runs on its own, much softer scale
 * (0/20/60/140/280/500 per wallet) because the tree is immediate feedback: it has to move inside a
 * student's first session or they have no reason to think it ever will. The badge is the opposite —
 * it is standing, not feedback, so it should not tick up every few answers. Putting the two on one
 * scale made the badge move at the tree's pace, which is why they are two lists again. Do not merge
 * them: if you are here to change badge numbers, change `BADGE_LEVEL_THRESHOLDS` and leave the tree
 * alone.
 *
 * WHY THE MINIMUM WALLET, NOT THE SUM.
 *
 * The three wallets measure three different things: Choice (deciding for themselves), Insight
 * (noticing something about their own work) and Resolve (following through on what they said they
 * would do). Adding them together lets a student level up by grinding whichever is easiest — repeat
 * the same choice-driven exercise and the badge climbs while two thirds of what it stands for never
 * happened. Taking the WEAKEST wallet means a level is only reached when all three have been earned,
 * so the badge means "this student is doing all three things", which is the point of it.
 */

/**
 * XP needed in EACH wallet to reach each badge level.
 *
 * CALIBRATED TO THE ACTUAL EARN RATES, not to round numbers. Measured over the recorded ledger (two
 * students, 212 exercises): Choice arrives at ~4.6 XP per exercise, Insight at ~3.1 (a completed
 * reflection pays ~3.4), and Resolve at ~1.5 — because Resolve only moves when a goal finishes or a
 * promise is kept, not once per exercise. A 15-20 minute session is about three exercises, so a
 * steady student banks roughly 14 Choice, 9 Insight and 4-5 Resolve per session, and a student who
 * finishes a goal and keeps a promise in the same session banks 10-15 Resolve.
 *
 * Resolve is therefore always the wallet that decides when the badge moves, which is why these
 * numbers are set against it: Solver (level 4) at 40 lands at about four sessions for a student who
 * is following through on goals, and about ten for one who only reflects and never completes
 * anything. The old 0/50/150/400/800/1500 put Solver ~30 sessions away for the same student, which
 * meant nobody would ever see the badge move inside a pilot.
 *
 * Index is the wallet's own level (0-5), so `[1]` is what one wallet needs before the badge reaches
 * level 2.
 */
export const BADGE_LEVEL_THRESHOLDS = [0, 10, 20, 40, 90, 200];

/** One wallet's badge level, 0 to `BADGE_LEVEL_THRESHOLDS.length - 1`. */
export function badgeWalletLevel(xp: number): number {
    let level = 0;
    for (let index = 0; index < BADGE_LEVEL_THRESHOLDS.length; index++) {
        if (xp >= BADGE_LEVEL_THRESHOLDS[index]) level = index;
        else break;
    }
    return level;
}

/**
 * The tier names, one per level. Six tiers for six levels, so the badge and the tier advance
 * together instead of a tier lasting two levels and leaving the second one with nothing to show.
 */
export const TIER_NAMES = ["Beginner", "Apprentice", "Explorer", "Solver", "Expert", "Master"] as const;

export type AgencyWalletName = "choice" | "insight" | "resolve";

export interface BadgeLevel {
    /** 1-based overall level: 1 (Beginner) to 6 (Master). */
    level: number;

    /** The tier name for this level — always `TIER_NAMES[level - 1]`. */
    levelName: string;

    /**
     * The per-wallet XP total the next level needs, or `null` at the top level. This is the number
     * to show as "N XP in each", because the badge does not move until every wallet is there.
     */
    nextLevelAt: number | null;

    /** The weakest wallet's XP now, for an "amount left" figure against `nextLevelAt`. */
    weakestXP: number;

    /** Which wallet is currently holding the badge back. Empty at the top level. */
    weakestWallet: AgencyWalletName | "";
}

export function getBadgeLevel(choiceXP: number, insightXP: number, resolveXP: number): BadgeLevel {
    const wallets: { name: AgencyWalletName; level: number; xp: number }[] = [
        { name: "choice", level: badgeWalletLevel(choiceXP), xp: choiceXP },
        { name: "insight", level: badgeWalletLevel(insightXP), xp: insightXP },
        { name: "resolve", level: badgeWalletLevel(resolveXP), xp: resolveXP },
    ];

    // The weakest wallet decides. Ties keep the first in the list above, which only changes which
    // name is reported as holding the badge back — the level is the same either way.
    const weakest = wallets.reduce((low, entry) => (entry.level < low.level ? entry : low));

    const level = Math.min(weakest.level + 1, TIER_NAMES.length);
    const atTop = level >= TIER_NAMES.length;

    return {
        level,
        levelName: TIER_NAMES[level - 1],
        nextLevelAt: atTop ? null : BADGE_LEVEL_THRESHOLDS[weakest.level + 1],
        weakestXP: weakest.xp,
        weakestWallet: atTop ? "" : weakest.name,
    };
}
