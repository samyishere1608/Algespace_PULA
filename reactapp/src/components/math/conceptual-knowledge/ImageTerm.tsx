import React, { ReactElement } from "react";
import { EqualizationConstants } from "@/types/equalization/equalizationConstants.ts";
import { CoefficientContext, Operator } from "@/types/math/enums.ts";
import { Term } from "@/types/math/term.ts";
import ImageCoefficient from "@components/math/conceptual-knowledge/ImageCoefficient.tsx";
import { getImageSourceByName } from "@utils/itemImageLoader.ts";
import { displayOperator, isZero } from "@utils/utils.ts";

export default function ImageTerm({ index, term }: { index: number; term: Term }): ReactElement | undefined {
    if (isZero(term.coefficient)) {
        if (index === 0) {
            return <p>0</p>;
        }
        return;
    }

    let content: ReactElement;
    if (term.variable !== null) {
        if (term.variable === EqualizationConstants.WEIGHT_VAR) {
            content = <ImageCoefficient coefficient={term.coefficient} context={CoefficientContext.Weight} />;
        } else {
            content = (
                <React.Fragment>
                    <ImageCoefficient coefficient={term.coefficient} context={CoefficientContext.Multiplication} />
                    <div className={"image-equation__image"}>
                        <img src={getImageSourceByName(term.variable)} alt={term.variable} />
                    </div>
                </React.Fragment>
            );
        }
    } else {
        content = <ImageCoefficient coefficient={term.coefficient} context={CoefficientContext.Plain} />;
    }

    let operator: ReactElement | undefined;
    if (term.operator !== null && displayOperator(index, term.operator)) {
        if (term.operator == Operator.Plus) {
            operator = <p>&#43;</p>;
        } else {
            operator = index == 0 ? <p>-</p> : <p>&#8722;</p>; // "-" is smaller than minus symbol
        }
    }

    return (
        <React.Fragment>
            {operator}
            {content}
        </React.Fragment>
    );
}
