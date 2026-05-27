import { countSecondVariable } from "@/utils/utils";
import { EqualizationConstants } from "@/types/equalization/equalizationConstants.ts";
import { EqualizationItem } from "@/types/shared/item";
import { EqualizationItemType, ScaleAllocation, Weight } from "./enums";
import { EqualizationExercise } from "./equalizationExercise";

export interface IEqualizationGameState {
    isolatedVariableCount: number;
    secondVariableCount: number;
    weights: EqualizationItem[];
    leftItems: EqualizationItem[];
    rightItems: EqualizationItem[];
}

export class EqualizationGameState implements IEqualizationGameState {
    constructor(
        public isolatedVariableCount: number,
        public secondVariableCount: number,
        public weights: EqualizationItem[],
        public leftItems: EqualizationItem[],
        public rightItems: EqualizationItem[]
    ) {}

    public static initializeGameState(exercise: EqualizationExercise): EqualizationGameState {
        let leftItems: EqualizationItem[] = [];
        let rightItems: EqualizationItem[] = [];
        let secondVariableCount: number = exercise.secondVariable.amount;

        if (exercise.scaleAllocation !== ScaleAllocation.None) {
            if (exercise.scaleAllocation === ScaleAllocation.LeftFirst) {
                if (exercise.firstEquation.leftIsolated) {
                    leftItems = exercise.firstEquation.rightItems;
                } else {
                    leftItems = exercise.firstEquation.leftItems;
                }
                secondVariableCount -= countSecondVariable(leftItems);
            } else if (exercise.scaleAllocation === ScaleAllocation.LeftSecond) {
                if (exercise.secondEquation.leftIsolated) {
                    leftItems = exercise.secondEquation.rightItems;
                } else {
                    leftItems = exercise.secondEquation.leftItems;
                }
                secondVariableCount -= countSecondVariable(leftItems);
            } else if (exercise.scaleAllocation === ScaleAllocation.RightFirst) {
                if (exercise.firstEquation.leftIsolated) {
                    rightItems = exercise.firstEquation.rightItems;
                } else {
                    rightItems = exercise.firstEquation.leftItems;
                }
                secondVariableCount -= countSecondVariable(rightItems);
            } else {
                if (exercise.secondEquation.leftIsolated) {
                    rightItems = exercise.secondEquation.rightItems;
                } else {
                    rightItems = exercise.secondEquation.leftItems;
                }
                secondVariableCount -= countSecondVariable(rightItems);
            }
        }

        return new EqualizationGameState(exercise.isolatedVariable.amount, secondVariableCount, exercise.computeWeightArray(), leftItems, rightItems);
    }

    public static setGameStateForSolutionPhase(exercise: EqualizationExercise): EqualizationGameState {
        const weightsArray: EqualizationItem[] = [];

        const additionalWeights: Map<Weight, number> = new Map(exercise.additionalWeights);

        let scaleWeights: Map<Weight, number> | null = null;
        if (exercise.scaleAllocation !== ScaleAllocation.None) {
            if (exercise.scaleAllocation === ScaleAllocation.LeftFirst || exercise.scaleAllocation === ScaleAllocation.RightFirst) {
                if (exercise.firstEquation.leftIsolated) {
                    scaleWeights = exercise.firstEquation.weightsRight;
                } else {
                    scaleWeights = exercise.firstEquation.weightsLeft;
                }
            } else {
                if (exercise.secondEquation.leftIsolated) {
                    scaleWeights = exercise.secondEquation.weightsRight;
                } else {
                    scaleWeights = exercise.secondEquation.weightsLeft;
                }
            }
        }

        if (additionalWeights !== null) {
            additionalWeights.forEach((value: number, key: Weight): void => {
                weightsArray.push(new EqualizationItem(key, value, EqualizationConstants.WEIGHT_WEIGHTS.get(key) ?? 0, EqualizationItemType.Weight));
            });
        }

        if (scaleWeights !== null) {
            scaleWeights.forEach((value: number, key: Weight): void => {
                const index: number = weightsArray.findIndex((item: EqualizationItem): boolean => item.name === key);
                if (index !== -1) {
                    weightsArray[index].amount += value;
                } else {
                    weightsArray.push(new EqualizationItem(key, value, EqualizationConstants.WEIGHT_WEIGHTS.get(key) ?? 0, EqualizationItemType.Weight));
                }
            });
        }

        return new EqualizationGameState(0, exercise.secondVariable.amount, weightsArray, [], []);
    }
}
