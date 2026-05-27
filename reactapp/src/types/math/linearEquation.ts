import { Type } from "class-transformer";
import { FlexibilityTerm, ITerm, ParenthesisTerm, Term } from "./term";
import { RelationSymbol } from "./enums";

export interface ILinearEquation {
    leftTerms: ITerm[];
    rightTerms: ITerm[];
}

export class LinearEquation implements ILinearEquation {
    public relation?: RelationSymbol;

    @Type(() => Term)
    public leftTerms: Term[];

    @Type(() => Term)
    public rightTerms: Term[];

    constructor(leftTerms: Term[], rightTerms: Term[], relation?: RelationSymbol) {
        this.leftTerms = leftTerms;
        this.rightTerms = rightTerms;
        this.relation = relation ?? RelationSymbol.Equal;
    }
}

export class FlexibilityEquation {

    @Type(() => FlexibilityTerm)
    public leftTerms: FlexibilityTerm[];

    @Type(() => FlexibilityTerm)
    public rightTerms: FlexibilityTerm[];

    constructor(leftTerms: FlexibilityTerm[], rightTerms: FlexibilityTerm[]) {
        this.leftTerms = leftTerms;
        this.rightTerms = rightTerms;
    }
}

export class ParenthesisEquation {
    @Type(() => ParenthesisTerm)
    public leftTerms: ParenthesisTerm[];

    @Type(() => ParenthesisTerm)
    public rightTerms: ParenthesisTerm[];

    constructor(leftTerms: ParenthesisTerm[], rightTerms: ParenthesisTerm[]) {
        this.leftTerms = leftTerms;
        this.rightTerms = rightTerms;
    }
}