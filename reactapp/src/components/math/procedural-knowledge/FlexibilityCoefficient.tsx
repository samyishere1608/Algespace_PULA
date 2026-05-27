import { Fraction } from "mathjs";
import { ReactElement } from "react";

export function FlexibilityCoefficient({ coefficient, displayOne, colour }: { coefficient: Fraction; displayOne: boolean; colour?: string }): ReactElement | undefined {
    if (coefficient.d === 1) {
        if (coefficient.n === 1) {
            return displayOne ? <p>1</p> : undefined;
        } else {
            return <p>{coefficient.n}</p>;
        }
    } else {
        return (
            <div className={"flexibility-equation__fraction"}>
                <p className={"flexibility-equation__fraction-numerator"}>{coefficient.n}</p>
                <p className={`flexibility-equation__fraction-denominator--${colour ? colour : "light"}`}>{coefficient.d}</p>
            </div>
        );
    }
}
