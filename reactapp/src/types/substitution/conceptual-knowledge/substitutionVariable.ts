export interface ISubstitutionVariable {
    readonly name: string;
    readonly solution: number;
}

export class SubstitutionVariable implements ISubstitutionVariable {
    constructor(
        public readonly name: string,
        public readonly solution: number
    ) {}
}
