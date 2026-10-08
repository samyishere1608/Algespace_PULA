import { createContext, useContext } from "react";

/**
 * Whether what is on screen is a demonstration rather than the real thing.
 *
 * The walkthrough has to show a real flexibility exercise — a mock would be a second copy of the UI
 * that drifts from the real one, and the student would notice that it does not match what they meet
 * afterwards. So it renders the REAL exercise. What it must not do is record an attempt, because an
 * attempt that nobody did would move the student's goals and pollute the research data.
 *
 * Rather than thread a flag through every exercise component, the flag lives here and the ONE shared
 * helper that decides whether an attempt gets written (`useTrackerIdentity`) reads it. Every write in
 * the tracker is already gated on that decision, so this single check makes the whole exercise inert:
 *
 *  - `useFlexibilityTracker` skips `createEntry`, so no attempt id is ever issued;
 *  - with no attempt id, every later write has no destination and returns immediately;
 *  - `considerInsight` (the Insight XP award) returns before it can pay anything;
 *  - the nudge is unavailable because it needs an attempt id too.
 *
 * Component-free on purpose, so `useTrackerIdentity` can import the hook without importing the
 * provider — the same reason `nudgeContext.ts` is separate from `NudgeProvider.tsx`.
 *
 * Defaults to `false`, so anything rendered outside a provider behaves exactly as before.
 */
export const PreviewContext = createContext(false);

export function usePreviewMode(): boolean {
    return useContext(PreviewContext);
}
