import { BarteringItem } from "@/types/shared/item.ts";
import { Trade } from "@/types/substitution/bartering/trade.ts";

export interface IRetailBox {
    readonly id: number;
    item: BarteringItem | null;
}

export class RetailBox implements IRetailBox {
    constructor(
        public readonly id: number,
        public item: BarteringItem | null
    ) {}
}

export function initializeRetailBoxes(trade: Trade): RetailBox[][] {
    const firstBox: RetailBox = new RetailBox(0, new BarteringItem(trade.firstInput.name as string, trade.firstInput.amount as number));
    const secondBox: RetailBox = new RetailBox(1, trade.secondInput !== null ? new BarteringItem(trade.secondInput.name as string, trade.secondInput.amount as number) : null);
    const placeholders: RetailBox[] = Array.from({ length: 9 }, (_, i) => new RetailBox(i + 2, null));
    return [[firstBox, secondBox, ...placeholders]];
}
