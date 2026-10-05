import { createContext, useContext } from "react";
import { type AgentType } from "@/types/flexibility/enums.ts";
import { type NudgeResponse } from "@utils/nudges.ts";

/**
 * The nudge's shared vocabulary: what an offer is, what is currently waiting on an answer, and how a
 * dialog asks for it.
 *
 * A module of its own, deliberately holding no component, so that `Intervention` can read the
 * pending offer without importing the provider. The provider is what mounts the exercise tree, so
 * that direction would be a cycle. Keeping the two apart also means the provider stays a component
 * file, which is both what the fast-refresh lint rule asks for and what keeps an edit to it from
 * reloading the whole app.
 */

export interface NudgeOffer {
    element: string;
    /** What they declined, e.g. "Explaining your reasoning in your own words". */
    labelKey: string;
    /** Why it is worth doing. The argument for the behaviour, not a restatement of the ask. */
    benefitKey: string;
    /** The agent face to show, so the prompt matches the dialog the decline came from. */
    agentType?: AgentType;
    /** Writes the outcome into the anchor store, against the attempt that is open right now. */
    record: (response: NudgeResponse) => void;
}

/** Resolves true when the student took the offer up. */
export type AskNudge = (offer: NudgeOffer) => Promise<boolean>;

export interface NudgeContextValue {
    ask: AskNudge;
    pending: { offer: NudgeOffer; opportunities: number; engaged: number } | null;
    answer: (response: NudgeResponse) => void;
}

export const NudgeContext = createContext<NudgeContextValue | null>(null);

/** Answers "no" when there is no provider, so callers need no null checks. */
const noProvider: NudgeContextValue = {
    ask: async () => false,
    pending: null,
    answer: () => { },
};

function useNudgeContext(): NudgeContextValue {
    return useContext(NudgeContext) ?? noProvider;
}

/** Used by the tracker to raise a nudge and await the answer. */
export function useNudge(): AskNudge {
    return useNudgeContext().ask;
}

/** What a dialog needs in order to put the pending offer to the student in its own body. */
export interface PendingNudge {
    labelKey: string;
    benefitKey: string;
    opportunities: number;
    engaged: number;
    agentType?: AgentType;
    answer: (response: NudgeResponse) => void;
}

/**
 * The nudge waiting on an answer, for the dialog that raised it to render in place of its own text.
 *
 * There is deliberately no component that draws the prompt. The decline comes from a dialog that is
 * still on screen while the offer is being prepared — the caller is awaiting `askNudge` — so a
 * prompt of its own could only ever be a second card stacked on the first, at the same anchor,
 * because both are anchored the same way. Letting that dialog replace its own body keeps it one
 * card whose text changes, which is what it actually is: the same question, continued.
 *
 * Null outside a provider and null while nothing is pending, so an `Intervention` with nothing to
 * offer renders exactly as it always did.
 */
export function usePendingNudge(): PendingNudge | null {
    const { pending, answer } = useNudgeContext();
    if (pending === null) return null;

    return {
        labelKey: pending.offer.labelKey,
        benefitKey: pending.offer.benefitKey,
        opportunities: pending.opportunities,
        engaged: pending.engaged,
        agentType: pending.offer.agentType,
        answer,
    };
}
