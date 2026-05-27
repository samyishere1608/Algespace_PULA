import { Fraction } from "mathjs";
import { EliminationExercise } from "@/types/elimination/eliminationExercise.ts";
import { OperationOutOfRangeError } from "@/types/elimination/operationOutOfRangeError.ts";
import { NumberType, Operator } from "@/types/math/enums.ts";
import { LinearEquation } from "@/types/math/linearEquation.ts";
import { math } from "@/types/math/math.ts";
import { Term } from "@/types/math/term.ts";
import { addOrSubtractCoefficients, multiplyCoefficientWithScalar, satisfiesBounds } from "@utils/utils.ts";

export interface IRow {
    readonly first: Fraction;
    readonly second: Fraction;
    readonly costs: Fraction;
}

export class Row implements IRow {
    constructor(
        public readonly first: Fraction,
        public readonly second: Fraction,
        public readonly costs: Fraction
    ) {}

    public static initializeRows(exercise: EliminationExercise): Row[] {
        return [this.createRow(exercise, exercise.firstEquation), this.createRow(exercise, exercise.secondEquation)];
    }

    private static createRow(exercise: EliminationExercise, equation: LinearEquation): Row {
        let firstValue!: Fraction; // They must be initialized according to game logic
        let secondValue!: Fraction;
        let costs!: Fraction;

        [...equation.leftTerms, ...equation.rightTerms].forEach((term: Term): void => {
            if (term.variable === exercise.firstVariable.name) {
                firstValue = this.getCoefficient(term);
            } else if (term.variable === exercise.secondVariable.name) {
                secondValue = this.getCoefficient(term);
            } else {
                costs = this.getCoefficient(term);
            }
        });

        return new Row(firstValue, secondValue, costs);
    }

    private static getCoefficient(term: Term): Fraction {
        return term.operator !== null && term.operator === Operator.Minus ? (term.coefficient.type === NumberType.Fraction ? math.fraction("-" + term.coefficient.value) : math.fraction(-(term.coefficient.value as number))) : math.fraction(term.coefficient.value);
    }

    static add(row1: Row, row2: Row): Row {
        return new Row(this.addCoefficients(row1.first, row2.first), this.addCoefficients(row1.second, row2.second), this.addCoefficients(row1.costs, row2.costs));
    }

    private static addCoefficients(fraction1: Fraction, fraction2: Fraction): Fraction {
        return addOrSubtractCoefficients(true, fraction1, fraction2);
    }

    public static subtract(row1: Row, row2: Row): Row {
        return new Row(this.subtractCoefficients(row1.first, row2.first), this.subtractCoefficients(row1.second, row2.second), this.subtractCoefficients(row1.costs, row2.costs));
    }

    private static subtractCoefficients(fraction1: Fraction, fraction2: Fraction): Fraction {
        return addOrSubtractCoefficients(false, fraction1, fraction2);
    }

    public static multiply(row: Row, scalar: number | Fraction): Row {
        return new Row(this.multiplyCoefficient(row.first, scalar), this.multiplyCoefficient(row.second, scalar), this.multiplyCoefficient(row.costs, scalar));
    }

    private static multiplyCoefficient(coefficient: Fraction, scalar: number | Fraction): Fraction {
        return multiplyCoefficientWithScalar(coefficient, scalar);
    }

    public static divide(row: Row, scalar: number | Fraction): Row {
        return new Row(this.divideCoefficient(row.first, scalar), this.divideCoefficient(row.second, scalar), this.divideCoefficient(row.costs, scalar));
    }

    private static divideCoefficient(coefficient: Fraction, scalar: number | Fraction): Fraction {
        const result: Fraction = math.divide(coefficient, scalar) as Fraction;
        if (!satisfiesBounds(result)) {
            throw new OperationOutOfRangeError();
        }
        return result;
    }
}
