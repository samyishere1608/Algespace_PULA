import { EqualizationItemType } from "@/types/equalization/enums";
import { Operator } from "@/types/math/enums.ts";
import { SubstitutionItemType } from "@/types/substitution/conceptual-knowledge/enums.ts";

export interface IItem {
    readonly name: string;
    amount: number;
}

export class EqualizationItem implements IItem {
    constructor(
        public readonly name: string,
        public amount: number,
        public readonly weight: number,
        public readonly itemType: EqualizationItemType
    ) {}
}

export class BarteringItem implements IItem {
    constructor(
        public readonly name: string,
        public amount: number
    ) {}
}

export class SubstitutionItem implements IItem {
    constructor(
        public readonly name: string,
        public amount: number,
        public operator: Operator,
        public readonly itemType: SubstitutionItemType
    ) {}

    public evaluateItem(): number {
        return this.operator === Operator.Minus ? -this.amount : this.amount;
    }
}
