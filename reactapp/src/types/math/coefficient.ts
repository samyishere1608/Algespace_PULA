import { NumberType } from "./enums.ts";

export interface ICoefficient {
    value: number | string;
    type: NumberType;
}

export class Coefficient implements ICoefficient {
    constructor(
        public value: number | string,
        public type: NumberType
    ) {}

    public static createNumberCoefficient(value: number): Coefficient {
        return new Coefficient(value, NumberType.Number);
    }
}
