import { Fraction } from "mathjs";
import React, { ReactElement, useLayoutEffect, useRef } from "react";
import { Variable } from "@/types/flexibility/variable.ts";
import { math } from "@/types/math/math.ts";
import { FlexibilityCoefficient } from "@components/math/procedural-knowledge/FlexibilityCoefficient.tsx";

export function VariableSolution({ variable, useLayout = false }: { variable: Variable, useLayout?: boolean }): ReactElement {
    const contentRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        if (useLayout && contentRef.current !== null) {
            contentRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [useLayout]);

    const coefficient: Fraction = math.fraction(variable.value.value);
    return (
        <React.Fragment>
            <div className={"flexibility-equation flexibility-equation--light"} ref={contentRef}>
                <p>{variable.name}</p>
                <p>&#61;</p>
                {coefficient.s < 0 && <p>-</p>}
                <FlexibilityCoefficient coefficient={coefficient} displayOne={true} />
            </div>
            {useLayout && <div style={{ minHeight: "8rem", minWidth: "1rem" }}></div>}
        </React.Fragment>
    );
}
