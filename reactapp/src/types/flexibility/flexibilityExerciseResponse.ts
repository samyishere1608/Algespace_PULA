import { FlexibilityStudyExerciseType } from "@/types/studies/enums.ts";

export interface FlexibilityExerciseResponse {
    readonly id: number;
    readonly exerciseType: FlexibilityStudyExerciseType;
    readonly exerciseId: number;
    /**
     * The solving method this exercise is about: "Elimination", "Substitution", "Equalization".
     *
     * Only Matching sends one, because Matching tells the student the method before they start. The
     * other kinds send null: Suitability lets the student pick, and an Efficiency exercise's method
     * is the answer the exercise grades, so the list must not carry it.
     */
    readonly method?: string | null;
}