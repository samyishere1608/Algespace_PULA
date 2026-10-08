import { useAuth } from "@/contexts/AuthProvider.tsx";
import { usePreviewMode } from "@/contexts/previewContext.ts";
import type { TrackerUser } from "@/types/studies/user.ts";

/**
 * Who the exercise tracker should record an attempt as.
 *
 * There are two kinds of logged-in identity in this app and they are stored separately. A study
 * participant signs in at /studies/login, which fills `user`. A student signs in at /student/login,
 * which fills `student` and never `user`. Both are genuine owners of an attempt.
 *
 * This helper exists because the tracker used to be switched on with `isStudy || user !== undefined`,
 * which is false for every ordinary student. That was not a partial failure: the tracker derives its
 * entry id from an initial write, and with no identity that write never happens, so it silently
 * wrote nothing at all. The anchor store, the avoidance profile, the goals, the nudge and the
 * Insight XP were therefore all inert outside the study module — the features existed, were wired
 * up, and could never fire.
 *
 * `isStudy` remains the caller's decision rather than something derived here, so browsing the
 * worked examples as a study participant still records nothing.
 */
export default function useTrackerIdentity(isStudy: boolean): {
    /** Whether the caller wants this exercise recorded at all. */
    logging: boolean;
    /** Who to record it as. Always set whenever `logging` is true. */
    owner: TrackerUser | undefined;
} {
    const { user, student } = useAuth();
    const preview = usePreviewMode();
    const owner: TrackerUser | undefined = user ?? student;

    /**
     * A DEMONSTRATION records nothing.
     *
     * The walkthrough shows a real exercise, so a student who is only looking at it must not end up
     * with an attempt in their history — that would move their goals against work they never did,
     * and would put a row nobody sat into the research data.
     *
     * Returning false here is enough on its own. Every write in `useFlexibilityTracker` is already
     * gated on this decision: the mount effect that issues the attempt id is skipped, and with no
     * attempt id every later write has no destination. Details in `previewContext.ts`.
     */
    return { logging: !preview && (isStudy || owner !== undefined), owner };
}
