import { Type } from "class-transformer";
import {
    ISubstitutionVariable,
    SubstitutionVariable
} from "@/types/substitution/conceptual-knowledge/substitutionVariable.ts";
import {
    ISubstitutionEquation,
    SubstitutionEquation
} from "@/types/substitution/conceptual-knowledge/substitutionEquation.ts";

export interface ISubstitutionExercise {
    readonly id: number;
    readonly firstEquation: ISubstitutionEquation;
    readonly secondEquation: ISubstitutionEquation;
    readonly isolatedVariable: ISubstitutionVariable;
    readonly secondVariable: ISubstitutionVariable;
}

export class SubstitutionExercise implements ISubstitutionExercise {
    public readonly id: number;

    @Type(() => SubstitutionEquation)
    public readonly firstEquation: SubstitutionEquation;

    @Type(() => SubstitutionEquation)
    public readonly secondEquation: SubstitutionEquation;

    @Type(() => SubstitutionVariable)
    public readonly isolatedVariable: SubstitutionVariable;

    @Type(() => SubstitutionVariable)
    public readonly secondVariable: SubstitutionVariable;

    constructor(
        id: number,
        firstEquation: SubstitutionEquation,
        secondEquation: SubstitutionEquation,
        isolatedVariable: SubstitutionVariable,
        secondVariable: SubstitutionVariable
    ) {
        this.id = id;
        this.firstEquation = firstEquation;
        this.secondEquation = secondEquation;
        this.isolatedVariable = isolatedVariable;
        this.secondVariable = secondVariable;
    }
}