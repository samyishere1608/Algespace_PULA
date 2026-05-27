export interface IScale {
    totalWeight: number;
    variablesLeft: number;
    variablesRight: number;
}

export class Scale implements IScale {
    constructor(
        public totalWeight: number,
        public variablesLeft: number,
        public variablesRight: number
    ) {}
}
