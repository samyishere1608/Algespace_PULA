import { FlexibilityEquation as FlexibilityEquationProps } from "@/types/math/linearEquation.ts";
import { Fraction } from "mathjs";
import { ReactElement } from "react";
import { countElementsInTerm } from "@utils/utils.ts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus, faPlus, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FlexibilityEquation } from "@components/math/procedural-knowledge/FlexibilityEquation.tsx";

export function MultipliedLinearSystem(
    {
        firstEquation,
        secondEquation,
        firstFactor,
        secondFactor,
        isAddition,
        isSwitched,
        firstMultipliedEquation,
        secondMultipliedEquation
    }: {
        firstEquation: FlexibilityEquationProps;
        secondEquation: FlexibilityEquationProps;
        firstFactor: number | Fraction | undefined;
        secondFactor: number | Fraction | undefined;
        isAddition: boolean;
        isSwitched: boolean;
        firstMultipliedEquation?: FlexibilityEquationProps;
        secondMultipliedEquation?: FlexibilityEquationProps;
    }
): ReactElement {
    const leftCount: number = Math.max(countElementsInTerm(firstEquation.leftTerms), countElementsInTerm(secondEquation.leftTerms), 1) * 1.125;
    const rightCount: number = Math.max(countElementsInTerm(firstEquation.rightTerms), countElementsInTerm(secondEquation.rightTerms), 1) * 1.125;

    const operator: ReactElement = <div className={"stacked-equations__operator"}>{isAddition ? <FontAwesomeIcon icon={faPlus} /> :
        <FontAwesomeIcon icon={faMinus} />}</div>;

    const emptyOperator: ReactElement = <div className={"stacked-equations__operator"} />;

    return (
        <div className={"linear-system"} style={{ flexDirection: isSwitched ? "column-reverse" : "column", alignItems: "flex-start" }}>
            <div className={"stacked-equations"}>
                {firstMultipliedEquation && <FlexibilityEquation equation={firstMultipliedEquation} minLeftWidth={leftCount} minRightWidth={rightCount}
                                                                 classname={"multiplied-equation opacity-equation"} colour={"light-50"} />}
                <div className={"stacked-equations__numbered-equation"}>
                    {isSwitched ? operator : emptyOperator}
                    <p>1.</p>
                    <FlexibilityEquation equation={firstEquation} minLeftWidth={leftCount} minRightWidth={rightCount}
                                         classname={firstMultipliedEquation ? " multiplied-equation line-equation" : "multiplied-equation"} />
                    <Factor factor={firstFactor} />
                </div>
            </div>
            <div className={"stacked-equations"}>
                {secondMultipliedEquation && <FlexibilityEquation equation={secondMultipliedEquation} minLeftWidth={leftCount} minRightWidth={rightCount}
                                                                  classname={"multiplied-equation opacity-equation"} colour={"light-50"} />}
                <div className={"stacked-equations__numbered-equation"}>
                    {!isSwitched ? operator : emptyOperator}
                    <p>2.</p>
                    <FlexibilityEquation equation={secondEquation} minLeftWidth={leftCount} minRightWidth={rightCount}
                                         classname={secondMultipliedEquation ? " multiplied-equation line-equation" : "multiplied-equation"} />
                    <Factor factor={secondFactor} />
                </div>
            </div>
        </div>
    );
}

function Factor({ factor }: { factor: number | Fraction | undefined }): ReactElement {
    if (!factor) {
        return <div className={"elimination-factor__container"} />;
    }

    let content: ReactElement;
    if (typeof factor === "number") {
        content = <p>{factor}</p>;
    } else {
        if (factor.d == 1) {
            content = <p>{factor.s * factor.n}</p>;
        } else {
            content = (
                <div className={"flexibility-equation__fraction--light-50"}>
                    <p className={"flexibility-equation__fraction-numerator"}>{factor.s * factor.n}</p>
                    <p className={"flexibility-equation__fraction-denominator--light-50"}>{factor.d}</p>
                </div>
            );
        }
    }

    return (
        <div className={"elimination-factor__container"}>
            <div className={"elimination-factor__factor"}>
                <FontAwesomeIcon icon={faTimes} />
                {content}
            </div>
        </div>
    );
}