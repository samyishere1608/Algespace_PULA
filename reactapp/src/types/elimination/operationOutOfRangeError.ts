export class OperationOutOfRangeError extends Error {
    constructor() {
        super("Fraction violates bounds. The number is either too small or too large.");
        this.name = "OperationOutOfRangeError";
    }
}
