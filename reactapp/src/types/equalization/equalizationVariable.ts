import { EqualizationItem } from "@/types/shared/item";
import { EqualizationItemType } from "./enums";

export interface IEqualizationVariable {
    readonly name: string;
    readonly weight: number;
    readonly amount: number;
}

export class EqualizationVariable implements IEqualizationVariable {
    public readonly name: string;

    public readonly weight: number;

    public readonly amount: number;

    constructor(variable: string, value: number, amount: number) {
        this.name = variable;
        this.weight = value;
        this.amount = amount;
    }

    public toItem(type: EqualizationItemType): EqualizationItem {
        return new EqualizationItem(this.name, 1, this.weight, type);
    }
}
