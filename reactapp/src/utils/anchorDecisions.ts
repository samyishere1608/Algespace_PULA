import { FlexibilityExerciseChoicePhase } from "@/types/studies/enums.ts";
import { ANCHOR_ELEMENT, CATEGORY_FOR_ELEMENT, type GoalCategory } from "@/types/student/goal.ts";

/**
 * What a student's answer at a decision point says about the six tracked dimensions.
 *
 * This is the single translation layer between "what the student just clicked" and "which dimension
 * that speaks to". Two features read it and they must never disagree:
 *
 *   - the NUDGE, when a student declines something their profile says they avoid;
 *   - the INSIGHT award, when a student engages with something their profile says they avoid.
 *
 * They are deliberately the same mapping. The nudge reacts to the decline and the award reacts to
 * whatever the student does next, and if the two used different definitions a student could be
 * nagged about one thing and rewarded for another.
 */

export interface DecisionElement {
    /** One of `ANCHOR_ELEMENT`. */
    element: string;
    /** The goal category that addresses it — derived from the element, never written by hand. */
    category: GoalCategory;
    /** Translation key naming the behaviour, e.g. "Explain your own reasoning". */
    labelKey: string;
}

/** The element a phase speaks to, before the category is derived. */
interface ElementRef {
    element: string;
    labelKey: string;
}

const SELF_EXPLANATION: ElementRef = {
    element: ANCHOR_ELEMENT.SelfExplanation,
    labelKey: "nudge-element-self-explanation",
};

const METHOD_COMPARISON: ElementRef = {
    element: ANCHOR_ELEMENT.MethodComparison,
    labelKey: "nudge-element-method-comparison",
};

const SOLVE_ON_OWN: ElementRef = {
    element: ANCHOR_ELEMENT.SolveOnOwn,
    labelKey: "nudge-element-solve-on-own",
};

/**
 * The decisions that can be DECLINED.
 *
 * Only three of the six dimensions appear, and that is not an oversight. A student cannot "decline"
 * a solving method or an exercise type — they simply pick a different one — and hints and errors is
 * a measurement rather than a behaviour, so there is nothing to decline there either. The other
 * three dimensions are reached through the goal picker and the AI suggestion instead.
 *
 * POLARITY, verified against the question text the student is actually shown: at each of these
 * points "Yes" means they took the offer up ("Would you like to try to find the solution on your
 * own?"), which is how the server counts engagement. So "No" really is a decline. If a question's
 * wording is ever flipped, this mapping becomes wrong and both features invert — we would scold
 * students for the behaviour we reward.
 */
const DECLINABLE: Partial<Record<FlexibilityExerciseChoicePhase, ElementRef>> = {
    [FlexibilityExerciseChoicePhase.SelfExplanationChoice]: SELF_EXPLANATION,
    [FlexibilityExerciseChoicePhase.SelfExplanationInterventionChoice]: SELF_EXPLANATION,

    [FlexibilityExerciseChoicePhase.ComparisonChoice]: METHOD_COMPARISON,
    [FlexibilityExerciseChoicePhase.ComparisonInterventionChoice]: METHOD_COMPARISON,
    [FlexibilityExerciseChoicePhase.ResolvingChoice]: METHOD_COMPARISON,
    [FlexibilityExerciseChoicePhase.ResolvingInterventionChoice]: METHOD_COMPARISON,

    [FlexibilityExerciseChoicePhase.FirstSolutionChoice]: SOLVE_ON_OWN,
    [FlexibilityExerciseChoicePhase.FirstSolutionInterventionChoice]: SOLVE_ON_OWN,
    [FlexibilityExerciseChoicePhase.SecondSolutionChoice]: SOLVE_ON_OWN,
    [FlexibilityExerciseChoicePhase.SecondSolutionInterventionChoice]: SOLVE_ON_OWN,
};

/**
 * The decisions the SERVER counts as engagement.
 *
 * Narrower than the map above, on purpose. The server reads history from the base decision names
 * only — the `…InterventionChoice` variants are the second ask and are not part of any element's
 * count. Rewarding engagement recorded under a name the profile never reads would pay out for
 * something the profile cannot see, so the award would fire against a gap that never closes.
 *
 * `ComparisonChoice` and `ResolvingChoice` both count because the server counts both; they are the
 * same act offered at two different points in the exercise.
 */
const ENGAGEABLE: Partial<Record<FlexibilityExerciseChoicePhase, ElementRef>> = {
    [FlexibilityExerciseChoicePhase.SelfExplanationChoice]: SELF_EXPLANATION,
    [FlexibilityExerciseChoicePhase.ComparisonChoice]: METHOD_COMPARISON,
    [FlexibilityExerciseChoicePhase.ResolvingChoice]: METHOD_COMPARISON,
    [FlexibilityExerciseChoicePhase.FirstSolutionChoice]: SOLVE_ON_OWN,
    [FlexibilityExerciseChoicePhase.SecondSolutionChoice]: SOLVE_ON_OWN,
};

function withCategory(ref: ElementRef): DecisionElement {
    const category = CATEGORY_FOR_ELEMENT[ref.element];
    if (!category) throw new Error(`No goal category for anchor element ${ref.element}`);
    return { ...ref, category };
}

/** Choices are worded freely ("No", "No to Elimination"), so a prefix match is the reliable test. */
const ANSWERS_YES = /^yes\b/i;
const ANSWERS_NO = /^no\b/i;

/**
 * The element a decision declined, or null when nothing was declined.
 *
 * The word boundary matters: without it "Nothing" would read as a decline.
 */
export function declinedElement(choice: string, phase: FlexibilityExerciseChoicePhase): DecisionElement | null {
    if (!ANSWERS_NO.test(choice.trim())) return null;
    const ref = DECLINABLE[phase];
    return ref ? withCategory(ref) : null;
}

/**
 * The element a decision engaged with, or null when it was not taken up.
 *
 * Returns a DISTINCT element per exercise for the two solution points, but callers usually want
 * "the student faced this once" rather than "twice", so they should de-duplicate per element.
 */
export function engagedElement(choice: string, phase: FlexibilityExerciseChoicePhase): DecisionElement | null {
    if (!ANSWERS_YES.test(choice.trim())) return null;
    const ref = ENGAGEABLE[phase];
    return ref ? withCategory(ref) : null;
}

/**
 * What the student did at a decision point, for describing the exercise afterwards.
 *
 * Uses the FULL map, including the follow-up interventions — the opposite of `engagedElement`.
 *
 * The two are asking different questions, which is why they differ. The Insight award asks "did they
 * do the thing the profile measures?" and must stay narrow, or it would pay for something the
 * profile cannot see. The decision summary asks "did they take the help?" and must be wide, because
 * the follow-up ask IS help, and a reflection that ignores it would let "it was easy" stand on the
 * strength of an answer the student was shown.
 */
export function decisionOutcome(
    choice: string,
    phase: FlexibilityExerciseChoicePhase
): { element: string; engaged: boolean } | null {
    const ref = DECLINABLE[phase];
    if (!ref) return null;

    const answer = choice.trim();
    if (ANSWERS_YES.test(answer)) return { element: ref.element, engaged: true };
    if (ANSWERS_NO.test(answer)) return { element: ref.element, engaged: false };
    return null;
}
