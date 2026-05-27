import { Coefficient } from "@/types/math/coefficient.ts";

export interface IVariable {
    readonly name: string;
    readonly value: Coefficient;
}

export class Variable implements IVariable {
    constructor(
        public readonly name: string,
        public readonly value: Coefficient
    ) {}
}
