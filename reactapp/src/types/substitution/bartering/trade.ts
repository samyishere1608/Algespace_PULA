import { LinearEquation } from "@/types/math/linearEquation.ts";
import { BarteringItem, IItem } from "@/types/shared/item.ts";

export interface ITrade {
    firstInput: IItem;
    secondInput: IItem | null;
    firstOutput: IItem;
    secondOutput: IItem | null;
}

export class Trade implements ITrade {
    constructor(
        public readonly firstInput: BarteringItem,
        public readonly secondInput: BarteringItem | null,
        public readonly firstOutput: BarteringItem,
        public readonly secondOutput: BarteringItem | null
    ) {}

    public static computeTradeFromEquation(equation: LinearEquation): Trade {
        const firstInput: BarteringItem = new BarteringItem(equation.leftTerms[0].variable as string, equation.leftTerms[0].coefficient.value as number);

        let secondInput: BarteringItem | null = null;
        if (equation.leftTerms[1] !== undefined) {
            secondInput = new BarteringItem(equation.leftTerms[1].variable as string, equation.leftTerms[1].coefficient.value as number);
        }

        const firstOutput: BarteringItem = new BarteringItem(equation.rightTerms[0].variable as string, equation.rightTerms[0].coefficient.value as number);

        let secondOutput: BarteringItem | null = null;
        if (equation.rightTerms[1] !== undefined) {
            secondOutput = new BarteringItem(equation.rightTerms[1].variable as string, equation.rightTerms[1].coefficient.value as number);
        }

        return new Trade(firstInput, secondInput, firstOutput, secondOutput);
    }
}
