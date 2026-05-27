import { Transform, Type } from "class-transformer";
import { EqualizationVariable, IEqualizationVariable } from "./equalizationVariable";
import { EqualizationItemType, ScaleAllocation, Weight } from "./enums";
import { IScale, Scale } from "./scale";
import { jsonObjectToMap } from "@utils/utils";
import { EqualizationItem } from "@/types/shared/item";
import { EqualizationEquation, IEqualizationEquation } from "./equalizationEquation";
import { EqualizationConstants } from "./equalizationConstants.ts";

export interface IEqualizationExercise {
    readonly id: number;
    readonly level: number | null;
    readonly instruction: string;
    readonly firstEquation: IEqualizationEquation;
    readonly secondEquation: IEqualizationEquation;
    readonly isolatedVariable: IEqualizationVariable;
    readonly secondVariable: IEqualizationVariable;
    readonly equalizedScale: IScale;
    readonly simplifiedScale: IScale;
    readonly additionalWeights: Map<Weight, number> | null;
    readonly scaleAllocation: ScaleAllocation;
    readonly maximumCapacity: number | null;
}

export class EqualizationExercise implements IEqualizationExercise {
    public readonly id: number;

    public readonly level: number | null;

    public readonly instruction: string;

    @Type(() => EqualizationEquation)
    public readonly firstEquation: EqualizationEquation;

    @Type(() => EqualizationEquation)
    public readonly secondEquation: EqualizationEquation;

    @Type(() => EqualizationVariable)
    public readonly isolatedVariable: EqualizationVariable;

    @Type(() => EqualizationVariable)
    public readonly secondVariable: EqualizationVariable;

    @Type(() => Scale)
    public readonly equalizedScale: Scale;

    @Type(() => Scale)
    public readonly simplifiedScale: Scale;

    @Transform((jsonObj) => jsonObjectToMap(jsonObj), { toClassOnly: true })
    public readonly additionalWeights: Map<Weight, number> | null;

    public readonly scaleAllocation: ScaleAllocation;

    public readonly maximumCapacity: number | null;

    constructor(
        id: number,
        level: number | null,
        instruction: string,
        firstEquation: EqualizationEquation,
        secondEquation: EqualizationEquation,
        isolatedVariable: EqualizationVariable,
        secondVariable: EqualizationVariable,
        equalizedScale: Scale,
        simplifiedScale: Scale,
        weights: Map<Weight, number> | null,
        scaleAllocation: ScaleAllocation,
        maximumCapacity: number | null
    ) {
        this.id = id;
        this.level = level;
        this.instruction = instruction;
        this.firstEquation = firstEquation;
        this.secondEquation = secondEquation;
        this.isolatedVariable = isolatedVariable;
        this.secondVariable = secondVariable;
        this.equalizedScale = equalizedScale;
        this.simplifiedScale = simplifiedScale;
        this.additionalWeights = weights;
        this.scaleAllocation = scaleAllocation;
        this.maximumCapacity = maximumCapacity;
    }

    public computeWeightArray(): EqualizationItem[] {
        const arr: EqualizationItem[] = [];
        this.additionalWeights?.forEach((value: number, key: Weight): void => {
            arr.push(new EqualizationItem(key, value, EqualizationConstants.WEIGHT_WEIGHTS.get(key) ?? 0, EqualizationItemType.Weight));
        });
        return arr;
    }
}
