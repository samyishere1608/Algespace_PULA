import { ReactElement } from "react";
import { FlexibilityEquation as FlexibilityEquationProps } from "@/types/math/linearEquation.ts";
import { FlexibilityTerm as FlexibilityTermProps } from "@/types/math/term.ts";
import { FlexibilityTerm } from "@components/math/procedural-knowledge/FlexibilityTerm.tsx";

export function FlexibilityEquation({ equation, minLeftWidth, minRightWidth, classname, colour }: { equation: FlexibilityEquationProps; minLeftWidth?: number; minRightWidth?: number; classname?: string; colour?: string }): ReactElement {
    return (
        <div className={`flexibility-equation ${classname ? classname : ""}`}>
            <div className={"flexibility-equation__terms--left"} style={{ minWidth: `${minLeftWidth}rem` }}>
                {equation.leftTerms.map((term: FlexibilityTermProps, index: number) => {
                    return <FlexibilityTerm key={index} index={index} term={term} colour={colour} />;
                })}
            </div>
            <p>&#61;</p>
            <div className={"flexibility-equation__terms--right"} style={{ minWidth: `${minRightWidth}rem` }}>
                {equation.rightTerms.map((term: FlexibilityTermProps, index: number) => {
                    return <FlexibilityTerm key={index} index={index} term={term} colour={colour} />;
                })}
            </div>
        </div>
    );
}
