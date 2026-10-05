import { ReactElement, ReactNode, useCallback, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { NudgeContext, type AskNudge, type NudgeContextValue } from "@/contexts/nudgeContext.ts";
import { getAvoidanceProfile } from "@utils/avoidanceProfile.ts";
import { getNudgeMemory, setNudgeMemory, shouldRaiseNudge, type NudgeResponse } from "@utils/nudges.ts";

/**
 * The one chance to change a decline.
 *
 * A nudge used to end in the goal picker, which put a whole planning screen between "you always skip
 * this" and "would you like to try it". Now it asks the plain question in the same dialog the
 * decline came from, and the answer does one of two things:
 *
 *   - yes -> the step they just declined re-opens and they do it. Doing it is what earns Insight,
 *     exactly as if they had chosen it in the first place; agreeing earns nothing on its own.
 *   - no  -> the exercise carries on as it would have.
 *
 * Three rules hold this together, and all three are load-bearing:
 *
 *   1. Only a SUSTAINED gap is worth raising. The server owns that judgement (`GapThresholds`), so
 *      the nudge never second-guesses it. A one-off decline is never mentioned.
 *   2. It is raised for a given element only while the evidence keeps moving. The same record is
 *      never repeated back at the student, but a record that has grown by another full window of
 *      observations is a new finding, and they hear about it again.
 *   3. Both answers are equally easy. A "no" that is smaller, greyer or worded as a forfeit makes
 *      the record meaningless, because the student is no longer free to say no.
 *
 * A provider rather than a component inside each exercise, because the decline happens several
 * layers down in flows that differ per exercise type. `askNudge` resolves with the student's answer,
 * so the caller can hold the step open until they have had their chance. This component only decides
 * whether there is anything worth asking: the question is put by `Intervention`, in the body of the
 * dialog whose own decline raised it, through `usePendingNudge`.
 *
 * This module is the component and nothing else. The offer, the context and the hooks a dialog reads
 * it with live in `nudgeContext.ts`.
 */

export function NudgeProvider({ children }: { children: ReactNode }): ReactElement {
    const { student } = useAuth();

    const [pending, setPending] = useState<NudgeContextValue["pending"]>(null);
    const resolveRef = useRef<((tryIt: boolean) => void) | null>(null);

    /**
     * Elements already being asked about, so a later decline in the same exercise cannot queue the
     * same question while the profile is still in flight.
     */
    const inFlight = useRef<Set<string>>(new Set());

    const ask = useCallback<AskNudge>((offer) => {
        if (!student) return Promise.resolve(false);
        if (inFlight.current.has(offer.element)) return Promise.resolve(false);

        inFlight.current.add(offer.element);

        return getAvoidanceProfile(student.id).then((profile) => {
            // The server owns the definition of a sustained gap; a nudge that second-guessed it
            // would be raising something we have not actually observed.
            const gap = profile?.gaps.find((stat) => stat.element === offer.element);

            if (!gap) {
                inFlight.current.delete(offer.element);
                return false;
            }

            // It IS a gap. The only question left is whether saying so again adds anything, which
            // depends on how much the record has moved since they last answered — so this has to
            // come after the profile, not before it.
            const memory = getNudgeMemory(student.id, offer.element);
            if (!shouldRaiseNudge(memory, gap.opportunities)) {
                inFlight.current.delete(offer.element);
                return false;
            }

            return new Promise<boolean>((resolve) => {
                resolveRef.current = resolve;
                setPending({ offer, opportunities: gap.opportunities, engaged: gap.engaged });
            });
        });
    }, [student]);

    function answer(response: NudgeResponse): void {
        const current = pending;
        if (!current || !student) return;

        // Remembered together: the answer, and the level of evidence it was given at. The second half
        // is what lets the nudge come back if the pattern grows after this.
        setNudgeMemory(student.id, current.offer.element, {
            response,
            opportunities: current.opportunities,
        });
        current.offer.record(response);
        inFlight.current.delete(current.offer.element);

        const resolve = resolveRef.current;
        resolveRef.current = null;
        setPending(null);
        resolve?.(response === "Accepted");
    }

    return (
        <NudgeContext.Provider value={{ ask, pending, answer }}>
            {children}
        </NudgeContext.Provider>
    );
}
