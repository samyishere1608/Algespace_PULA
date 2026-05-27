import { FlexibilityStudyExerciseType } from "@/types/studies/enums.ts";

export interface FlexibilityExerciseResponse {
    readonly id: number;
    readonly exerciseType: FlexibilityStudyExerciseType;
    readonly exerciseId: number;
}