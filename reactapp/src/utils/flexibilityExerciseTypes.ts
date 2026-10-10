import { faGaugeHigh, faScaleBalanced, faShapes } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FlexibilityStudyExerciseType } from "@/types/studies/enums.ts";

/**
 * The three kinds of flexibility exercise, described once.
 *
 * There are two renderers of this list — the training page and the dashboard's Exercises tab — and
 * the walkthrough explains the same three kinds in its own graphic. They must not each invent a name,
 * a mark or a sentence for "Suitability", so the identity of each kind lives here and every renderer
 * reads it.
 *
 * `nameKey` is looked up in the FLEXIBILITY namespace, because that is where the exercise module's own
 * wording lives: the student meets the same three words in the exercise itself, in this list, and in
 * the walkthrough. `whatKey` is the one-line answer to "what does this kind actually ask me to do",
 * and the last of the three is the one that catches people out — Suitability and Efficiency give you a
 * system and ask for a method, Matching gives you a method and asks for a system.
 *
 * Colour is deliberately NOT here. It lives in the stylesheet, keyed off the type's own name (see
 * `data-type` in `dashboard.scss`), so the palette stays in one place rather than scattered through
 * components as hex literals.
 */

export interface FlexibilityExerciseTypeMeta {
    readonly type: FlexibilityStudyExerciseType;
    /** Looked up in the FLEXIBILITY namespace. */
    readonly nameKey: string;
    /** Looked up in the STUDENT namespace. */
    readonly whatKey: string;
    readonly icon: IconDefinition;
}

/**
 * In an order that teaches the distinction: the two that ask you to choose a method, then the one
 * that reverses it.
 */
export const FLEXIBILITY_EXERCISE_TYPES: readonly FlexibilityExerciseTypeMeta[] = [
    { type: FlexibilityStudyExerciseType.Suitability, nameKey: "Suitability", whatKey: "tour-visual-suitability-what", icon: faScaleBalanced },
    { type: FlexibilityStudyExerciseType.Efficiency, nameKey: "Efficiency", whatKey: "tour-visual-efficiency-what", icon: faGaugeHigh },
    { type: FlexibilityStudyExerciseType.Matching, nameKey: "Matching", whatKey: "tour-visual-matching-what", icon: faShapes },
];

/**
 * The description for one exercise type, or undefined for a type the list does not carry.
 *
 * `WorkedExamples`, `TipExercise` and `PlainExercise` exist as components but are not served by
 * `getFlexibilityExercises`, so they have no entry here. Reaching for one must not crash a list
 * render, which is why the callers fall back rather than assert.
 */
export function exerciseTypeMeta(type: FlexibilityStudyExerciseType): FlexibilityExerciseTypeMeta | undefined {
    return FLEXIBILITY_EXERCISE_TYPES.find((entry) => entry.type === type);
}
