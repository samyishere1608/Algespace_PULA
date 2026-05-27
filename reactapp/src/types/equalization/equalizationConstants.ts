import { Weight } from "./enums";

export class EqualizationConstants {
    static readonly MAX_ITEMS_SCALE: number = 12; // Max number of items a scale plate can carry
    static readonly MAX_ITEMS_DIG_SCALE: number = 20; // Max number of items the digital scale can carry
    static readonly WEIGHT_VAR: string = "weight"; // If the variable in a term has the identifier "weight", we do not display an image

    static readonly WEIGHT_WEIGHTS: Map<Weight, number> = new Map<Weight, number>([
        [Weight.W1000, 1000],
        [Weight.W500, 500],
        [Weight.W250, 250],
        [Weight.W200, 200],
        [Weight.W100, 100],
        [Weight.W50, 50]
    ]);

    static readonly WEIGHT_SIZES: Map<Weight, number> = new Map<Weight, number>([
        [Weight.W1000, 3],
        [Weight.W500, 2.875],
        [Weight.W250, 2.75],
        [Weight.W200, 2.625],
        [Weight.W100, 2.5],
        [Weight.W50, 2.375]
    ]);
}
