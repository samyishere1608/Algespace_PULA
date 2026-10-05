/**
 * The nudge: what happens when a student turns down something they always turn down.
 *
 * Declining once is a decision, not a problem. Declining the same thing over and over while the
 * profile records it as a gap is a pattern, and the student is the last person to see their own
 * pattern. So when they decline something they have consistently avoided, they are told — once —
 * what their own record shows, and why it might matter.
 *
 * Three rules hold this together, and all three are load-bearing:
 *
 *   1. Only a SUSTAINED gap is worth raising. The server owns that judgement (`GapThresholds`), so
 *      the nudge never second-guesses it. A one-off decline is never mentioned.
 *   2. It is raised for a given element only while the evidence keeps moving. Nagging is the
 *      failure mode that turns a helpful observation into something to click past, and it would
 *      poison the signal as well — so once the student has answered, the same record is never
 *      repeated back at them. But "once ever" was too blunt the other way: a threshold exists to
 *      measure evidence, and a record that has grown substantially is a new finding about them.
 *      See `RE_ASK_AFTER_OPPORTUNITIES`.
 *   3. Both answers are equally easy. A "no" that is smaller, greyer or worded as a forfeit makes
 *      the record meaningless, because the student is no longer free to say no.
 *
 * Which decisions count, and what each one is about, lives in `anchorDecisions.ts` — shared with the
 * Insight award so the two definitions can never drift apart.
 */

import { ANCHOR_ELEMENT } from "@/types/student/goal.ts";

/** How the student answered. Recorded verbatim — see `NudgeRecord` on the server. */
export type NudgeResponse = "Accepted" | "Declined";

/** The record name a nudge outcome is written under. Mirrors `NudgeRecord.NamePrefix`. */
export const NUDGE_NAME_PREFIX = "NudgeOutcome:";

export function nudgeNameFor(element: string): string {
    return NUDGE_NAME_PREFIX + element;
}

/**
 * The question the nudge asks.
 *
 * One line, because the nudge is now the same yes/no dialog the decline came from rather than a
 * screen of its own. What is being offered is named above it by the element's own label key.
 */
export const NUDGE_ASK_KEY = "nudge-ask";

/**
 * Why the behaviour is worth doing.
 *
 * Held here rather than alongside the element mapping, because this is the nudge's own copy. The
 * Insight award links to the same behaviour but does not repeat the argument for it.
 */
const BENEFIT_KEYS: Record<string, string> = {
    [ANCHOR_ELEMENT.SelfExplanation]: "nudge-benefit-self-explanation",
    [ANCHOR_ELEMENT.MethodComparison]: "nudge-benefit-method-comparison",
    [ANCHOR_ELEMENT.SolveOnOwn]: "nudge-benefit-solve-on-own",
};

export function nudgeBenefitKey(element: string): string {
    return BENEFIT_KEYS[element] ?? "nudge-benefit-solve-on-own";
}

// ── What has already been raised, and when ────────────────────────────────────

/** What we remember about a nudge already shown for one element. */
export interface NudgeMemory {
    /** How the student answered. */
    response: NudgeResponse;
    /**
     * How many opportunities the profile showed at the moment they were asked.
     *
     * Kept so the nudge can come back when the pattern has grown. "Once, ever" was the wrong rule:
     * a threshold exists to measure evidence, and evidence that has increased substantially is new
     * information. A student who declined when the record said 1-in-5 is entitled to hear it again
     * when it says 1-in-10, because that is a different finding about them.
     */
    opportunities: number;
}

/**
 * How much fresh evidence earns a second ask.
 *
 * Deliberately the same number as the server's observation floor, so a re-ask costs one full window
 * of new observations. The gap has to be re-established, not merely still open — otherwise a
 * student who has already answered would be asked again at the very next decline.
 */
export const RE_ASK_AFTER_OPPORTUNITIES = 5;

const KEY_PREFIX = "algespace_nudges_";

const key = (studentId: number | string) => `${KEY_PREFIX}${studentId}`;

/**
 * Everything remembered for this student.
 *
 * Tolerates the older shape, where the value was just the response string, so a browser that
 * remembers a nudge from before this change neither loses it nor breaks on it. Those entries carry
 * no evidence count, and are treated as having none.
 */
function read(studentId: number | string): Record<string, NudgeMemory> {
    try {
        const raw = localStorage.getItem(key(studentId));
        if (!raw) return {};
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};

        const out: Record<string, NudgeMemory> = {};
        for (const [element, value] of Object.entries(parsed as Record<string, unknown>)) {
            if (typeof value === "string") {
                out[element] = { response: value === "accepted" ? "Accepted" : "Declined", opportunities: 0 };
            } else if (typeof value === "object" && value !== null) {
                const remembered = value as Partial<NudgeMemory>;
                if (typeof remembered.response === "string") {
                    out[element] = {
                        response: remembered.response === "Accepted" ? "Accepted" : "Declined",
                        opportunities: typeof remembered.opportunities === "number" ? remembered.opportunities : 0,
                    };
                }
            }
        }
        return out;
    } catch {
        return {};
    }
}

export function getNudgeMemory(studentId: number | string, element: string): NudgeMemory | null {
    return read(studentId)[element] ?? null;
}

/** Remembers the answer, and the level of evidence it was given at. */
export function setNudgeMemory(studentId: number | string, element: string, memory: NudgeMemory): void {
    const all = read(studentId);
    all[element] = memory;
    try {
        localStorage.setItem(key(studentId), JSON.stringify(all));
    } catch {
        // Storage can be full or unavailable. The in-memory guard in the provider still stops the
        // nudge repeating within this visit; only the across-visits memory is lost.
    }
}

/**
 * Whether this element is worth raising again at the current level of evidence.
 *
 * The server has already decided it is a sustained gap. This only decides whether saying so again
 * adds anything, and it does not while the record looks the same as it did last time — that would
 * be nagging, not noticing.
 */
export function shouldRaiseNudge(memory: NudgeMemory | null, opportunities: number): boolean {
    if (memory === null) return true;
    return opportunities >= memory.opportunities + RE_ASK_AFTER_OPPORTUNITIES;
}
