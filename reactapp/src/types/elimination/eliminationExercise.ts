import { Type } from "class-transformer";
import { LinearEquation } from "@/types/math/linearEquation.ts";
import { EliminationVariable } from "@/types/elimination/eliminationVariable.ts";

export interface IEliminationExercise {
    readonly id: number;
    readonly firstEquation: LinearEquation;
    readonly secondEquation: LinearEquation;
    readonly firstVariable: EliminationVariable;
    readonly secondVariable: EliminationVariable;
}

export class EliminationExercise implements IEliminationExercise {
    public readonly id: number;

    @Type(() => LinearEquation)
    public readonly firstEquation: LinearEquation;

    @Type(() => LinearEquation)
    public readonly secondEquation: LinearEquation;

    @Type(() => EliminationVariable)
    public readonly firstVariable: EliminationVariable;

    @Type(() => EliminationVariable)
    public readonly secondVariable: EliminationVariable;

    constructor(
        id: number,
        firstEquation: LinearEquation,
        secondEquation: LinearEquation,
        firstVariable: EliminationVariable,
        secondVariable: EliminationVariable
    ) {
        this.id = id;
        this.firstEquation = firstEquation;
        this.secondEquation = secondEquation;
        this.firstVariable = firstVariable;
        this.secondVariable = secondVariable;
    }
}