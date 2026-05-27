import { CSSProperties, ReactElement, useMemo } from "react";
import { FlexibilityEquation as FlexibilityEquationProps } from "@/types/math/linearEquation.ts";
import { FlexibilityEquation } from "@components/math/procedural-knowledge/FlexibilityEquation.tsx";
import { countElementsInTerm } from "@utils/utils.ts";

export function LinearSystem({ firstEquation, secondEquation, systemStyle }: { firstEquation: FlexibilityEquationProps; secondEquation: FlexibilityEquationProps; systemStyle?: CSSProperties}): ReactElement {
    const leftCount: number = Math.max(countElementsInTerm(firstEquation.leftTerms), countElementsInTerm(secondEquation.leftTerms), 1) * 1.125;
    const rightCount: number = Math.max(countElementsInTerm(firstEquation.rightTerms), countElementsInTerm(secondEquation.rightTerms), 1) * 1.125;

    return (
        <div className={"linear-system"} style={systemStyle}>
            <div className={"numbered-equation"}>
                <p>1.</p>
                <FlexibilityEquation equation={firstEquation} minLeftWidth={leftCount} minRightWidth={rightCount} />
            </div>
            <div className={"numbered-equation"}>
                <p>2.</p>
                <FlexibilityEquation equation={secondEquation} minLeftWidth={leftCount} minRightWidth={rightCount} />
            </div>
        </div>
    );
}

export function LinearSystemWithActions({ firstEquation, secondEquation, firstAction, secondAction, systemStyle }: { firstEquation: FlexibilityEquationProps; secondEquation: FlexibilityEquationProps; firstAction?: ReactElement; secondAction?: ReactElement; systemStyle?: CSSProperties }): ReactElement {
    const leftCount: number = useMemo((): number => {
        return Math.max(countElementsInTerm(firstEquation.leftTerms), countElementsInTerm(secondEquation.leftTerms), 1) * 1.125;
    }, [firstEquation, secondEquation]);

    const rightCount: number = useMemo((): number => {
        return Math.max(countElementsInTerm(firstEquation.rightTerms), countElementsInTerm(secondEquation.rightTerms), 1) * 1.125;
    }, [firstEquation, secondEquation]);

    return (
        <div className={"linear-system"} style={systemStyle}>
            <div className={"numbered-equation"}>
                <p>1.</p>
                <FlexibilityEquation equation={firstEquation} minLeftWidth={leftCount} minRightWidth={rightCount} />
                {firstAction !== undefined && firstAction}
            </div>
            <div className={"numbered-equation"}>
                <p>2.</p>
                <FlexibilityEquation equation={secondEquation} minLeftWidth={leftCount} minRightWidth={rightCount} />
                {secondAction !== undefined && secondAction}
            </div>
        </div>
    );
}
