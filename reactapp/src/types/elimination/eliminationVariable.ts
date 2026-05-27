import { OptimalEquation } from "@/types/elimination/enums.ts";
import { Coefficient } from "@/types/math/coefficient.ts";

export interface IEliminationVariable {
    readonly name: string;
    readonly solution: Coefficient;
    readonly optimalEquation: OptimalEquation;
}

export class EliminationVariable implements IEliminationVariable {
    constructor(
        public readonly name: string,
        public readonly solution: Coefficient,
        public readonly optimalEquation: OptimalEquation
    ) {}
}
