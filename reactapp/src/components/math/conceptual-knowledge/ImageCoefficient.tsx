import { Fraction } from "mathjs";
import React, { ReactElement } from "react";
import { Coefficient } from "@/types/math/coefficient.ts";
import { CoefficientContext, NumberType } from "@/types/math/enums.ts";
import { math } from "@/types/math/math.ts";

export default function ImageCoefficient({ coefficient, context }: { coefficient: Coefficient; context: CoefficientContext }): ReactElement {
    if (coefficient.type === NumberType.Number) {
        switch (context) {
            case CoefficientContext.Plain: {
                return <p>{coefficient.value}</p>;
            }
            case CoefficientContext.Weight: {
                return <p>{coefficient.value} g</p>;
            }
            case CoefficientContext.Multiplication: {
                return (
                    <p>
                        {coefficient.value}
                        &#215;
                    </p>
                );
            }
        }
    } else {
        const fractionValue: Fraction = math.fraction(coefficient.value);
        const fraction: ReactElement = (
            <div className={"image-equation__fraction"}>
                <p className={"image-equation__fraction-numerator"}>{fractionValue.s * fractionValue.n}</p>
                <p className={"image-equation__fraction-denominator"}>{fractionValue.d}</p>
            </div>
        );
        if (context == CoefficientContext.Plain) {
            return fraction;
        }
        return (
            <React.Fragment>
                {fraction}
                &#215;
            </React.Fragment>
        );
    }
}
