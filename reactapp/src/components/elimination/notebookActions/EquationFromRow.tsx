import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Fraction } from "mathjs";
import React, { ReactElement } from "react";
import { EliminationConstants } from "@/types/elimination/eliminationConstants.ts";
import { EliminationExercise } from "@/types/elimination/eliminationExercise.ts";
import { Row } from "@/types/elimination/row.ts";
import { math } from "@/types/math/math.ts";
import { getImageSourceByName } from "@utils/itemImageLoader.ts";
import { formatNumber } from "@utils/utils.ts";

export default function EquationFromRow({ exercise, row, addition, showFractions }: { exercise: EliminationExercise; row: Row; addition?: boolean; showFractions: boolean }): ReactElement {
    return (
        <div className={"action__equation"}>
            {addition !== undefined && addition && <FontAwesomeIcon className={"action__equation-operator"} icon={faPlus} />}
            {addition !== undefined && !addition && <FontAwesomeIcon className={"action__equation-operator"} icon={faMinus} />}
            <TermFromRow variable={exercise.firstVariable.name} coefficient={row.first} showFractions={showFractions} displayOperator={false} />
            <TermFromRow variable={exercise.secondVariable.name} coefficient={row.second} showFractions={showFractions} displayOperator={true} />
            <p>&#61;</p>
            <TermFromRow variable={EliminationConstants.BILL} coefficient={row.costs} displayOperator={false} showFractions={showFractions} />
        </div>
    );
}

export function TermFromRow({ variable, coefficient, showFractions, displayOperator }: { variable: string; coefficient: Fraction; showFractions: boolean; displayOperator: boolean }) {
    return (
        <React.Fragment>
            <CoefficientFromRow coefficient={coefficient} showFractions={showFractions} displayOperator={displayOperator} />
            <div className={"image-equation__image"}>
                <img src={getImageSourceByName(variable)} alt={variable} />
            </div>
        </React.Fragment>
    );
}

export function CoefficientFromRow({ coefficient, showFractions, displayOperator }: { coefficient: Fraction; showFractions: boolean; displayOperator?: boolean }): ReactElement {
    let entry: ReactElement;
    if (math.isZero(coefficient)) {
        entry = <p>0</p>;
    } else if (showFractions && coefficient.d !== 1 && coefficient.n < EliminationConstants.UPPER_BOUND && coefficient.d < EliminationConstants.UPPER_BOUND) {
        entry = (
            <div className={"notebook__fraction"}>
                <p className={"notebook__fraction-numerator"}>{coefficient.n}</p>
                <p className={"notebook__fraction-denominator"}>{coefficient.d}</p>
            </div>
        );
    } else {
        entry = <p>{formatNumber(coefficient.n / coefficient.d)}</p>;
    }

    const isNegative: boolean = math.isNegative(coefficient);
    let operator: ReactElement | undefined;
    if (displayOperator || isNegative) {
        if (displayOperator) {
            operator = isNegative ? <p>&#8722;</p> : <p>&#43;</p>;
        } else {
            operator = <p>-</p>; // "-" is smaller than minus symbol
        }
    }

    return (
        <React.Fragment>
            {operator}
            {entry}
            <p>&#215;</p>
        </React.Fragment>
    );
}
