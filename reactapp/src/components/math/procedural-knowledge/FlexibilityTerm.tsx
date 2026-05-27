import React, { ReactElement } from "react";
import { math } from "@/types/math/math.ts";
import { FlexibilityTerm as FlexibilityTermProps } from "@/types/math/term.ts";
import { FlexibilityCoefficient } from "@components/math/procedural-knowledge/FlexibilityCoefficient.tsx";

export function FlexibilityTerm({ index, term, colour }: { index: number; term: FlexibilityTermProps; colour?: string }): ReactElement | undefined {
    if (math.isZero(term.coefficient)) {
        if (index === 0) {
            return <p>0</p>;
        }
        return;
    }

    let operator: ReactElement | undefined;
    if (index !== 0) {
        if (term.coefficient.s > 0) {
            operator = <p>&#43;</p>;
        } else {
            operator = <p>&#8722;</p>;
        }
    } else if (term.coefficient.s < 0) {
        operator = <p>-</p>; // "-" is smaller than minus symbol
    }

    return (
        <React.Fragment>
            {operator}
            <FlexibilityCoefficient coefficient={term.coefficient} displayOne={term.variable === null} colour={colour} />
            {term.variable !== null && <p>{term.variable}</p>}
        </React.Fragment>
    );
}
