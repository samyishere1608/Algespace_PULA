import { Transform, Type } from "class-transformer";
import { LinearEquation } from "@/types/math/linearEquation";
import { jsonObjectToMap } from "@utils/utils";
import { EqualizationItemType, Weight } from "./enums";
import { EqualizationItem } from "@/types//shared/item";
import { EqualizationExercise } from "./equalizationExercise";
import { Term } from "@/types/math/term";
import { EqualizationConstants } from "./equalizationConstants.ts";

export interface IEqualizationEquation {
    readonly equation: LinearEquation;
    readonly weightsLeft: Map<Weight, number> | null;
    readonly weightsRight: Map<Weight, number> | null;
}

export class EqualizationEquation implements IEqualizationEquation {
    @Type(() => LinearEquation)
    public readonly equation: LinearEquation;

    @Transform((jsonObj) => jsonObjectToMap(jsonObj), { toClassOnly: true })
    public readonly weightsLeft: Map<Weight, number> | null;

    @Transform((jsonObj) => jsonObjectToMap(jsonObj), { toClassOnly: true })
    public readonly weightsRight: Map<Weight, number> | null;

    public leftItems!: EqualizationItem[];

    public rightItems!: EqualizationItem[];

    public leftIsolated!: boolean;

    public isolatedVariableCount!: number;

    public secondVariableCount!: number;

    constructor(equation: LinearEquation, weightsLeft: Map<Weight, number> | null, weightsRight: Map<Weight, number> | null) {
        this.equation = equation;
        this.weightsLeft = weightsLeft;
        this.weightsRight = weightsRight;
    }

    private computeItemArray(exercise: EqualizationExercise, terms: Term[], weights: Map<Weight, number> | null, isLeft: boolean): EqualizationItem[] {
        const items: EqualizationItem[] = [];
        let pushWeights: boolean = true;

        if (terms[0].variable === exercise.isolatedVariable.name) {
            if (isLeft) {
                this.leftIsolated = true;
            }

            for (let i = 0; i < (terms[0].coefficient.value as number); i++) {
                items.push(exercise.isolatedVariable.toItem(EqualizationItemType.IsolatedVariable));
            }
            this.isolatedVariableCount = terms[0].coefficient.value as number;
        } else {
            if (isLeft) {
                this.leftIsolated = false;
            }

            if (terms[0].variable === exercise.secondVariable.name) {
                for (let i = 0; i < (terms[0].coefficient.value as number); i++) {
                    items.push(exercise.secondVariable.toItem(EqualizationItemType.SecondVariable));
                }
                this.secondVariableCount = terms[0].coefficient.value as number;
            } else {
                pushWeights = false;
                for (let i = 0; i < (terms[1].coefficient.value as number); i++) {
                    items.push(exercise.secondVariable.toItem(EqualizationItemType.SecondVariable));
                }
                this.secondVariableCount = terms[1].coefficient.value as number;
            }

            if (weights !== null) {
                weights.forEach((value: number, key: Weight): void => {
                    for (let i = 0; i < value; i++) {
                        if (pushWeights) {
                            items.push(new EqualizationItem(key, value, EqualizationConstants.WEIGHT_WEIGHTS.get(key) ?? 0, EqualizationItemType.Weight));
                        } else {
                            items.unshift(new EqualizationItem(key, value, EqualizationConstants.WEIGHT_WEIGHTS.get(key) ?? 0, EqualizationItemType.Weight));
                        }
                    }
                });
            }
        }

        return items;
    }

    public initializeItemArrays(exercise: EqualizationExercise): void {
        this.leftItems = this.computeItemArray(exercise, this.equation.leftTerms, this.weightsLeft, true);
        this.rightItems = this.computeItemArray(exercise, this.equation.rightTerms, this.weightsRight, false);
    }
}