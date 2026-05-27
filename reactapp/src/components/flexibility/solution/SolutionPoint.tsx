import { Fraction } from "mathjs";
import React, { ReactElement, useLayoutEffect, useRef } from "react";
import { Coefficient } from "@/types/math/coefficient.ts";
import { math } from "@/types/math/math.ts";
import { FlexibilityCoefficient } from "@components/math/procedural-knowledge/FlexibilityCoefficient.tsx";
import { ParenthesisLeft, ParenthesisRight } from "@components/math/procedural-knowledge/SubstitutedEquation.tsx";

export function SolutionPoint({ firstFactor, secondFactor }: { firstFactor: Coefficient; secondFactor: Coefficient }): ReactElement {
    const contentRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        if (contentRef.current !== null) {
            contentRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, []);

    const firstFraction: Fraction = math.fraction(firstFactor.value);
    const secondFraction: Fraction = math.fraction(secondFactor.value);

    const largeParenthesis = firstFraction.d !== 1 || secondFraction.d !== 1;

    return (
        <React.Fragment>
            <div className={"system-result"} ref={contentRef}>
                <Point factor={firstFraction} isLeft={true} largeParenthesis={largeParenthesis} />
                <p>,</p>
                <Point factor={secondFraction} isLeft={false} largeParenthesis={largeParenthesis} />
            </div>
            <div style={{ minHeight: "9rem", minWidth: "1rem" }}></div>
        </React.Fragment>
    );
}

function Point({ factor, isLeft, largeParenthesis }: { factor: Fraction; isLeft: boolean; largeParenthesis: boolean }): ReactElement {
    return (
        <React.Fragment>
            {isLeft && <ParenthesisLeft containsFraction={largeParenthesis} />}
            {factor.s < 0 && <p>-</p>}
            <FlexibilityCoefficient coefficient={factor} displayOne={true} />
            {!isLeft && <ParenthesisRight containsFraction={largeParenthesis} />}
        </React.Fragment>
    );
}
