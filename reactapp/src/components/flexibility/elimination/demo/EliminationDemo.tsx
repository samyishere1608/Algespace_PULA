import { Fraction } from "mathjs";
import { ReactElement, useState } from "react";
import { Variable } from "@/types/flexibility/variable.ts";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { EliminationApplication } from "@components/flexibility/elimination/EliminationApplication.tsx";
import { EliminationDemoResult } from "@components/flexibility/elimination/demo/EliminationDemoResult.tsx";

export function EliminationDemo(
    {
        system,
        firstVariable,
        secondVariable
    }: {
        system: [FlexibilityEquation, FlexibilityEquation];
        firstVariable: Variable;
        secondVariable: Variable;
    }
): ReactElement {
    const [isApplication, setIsApplication] = useState<boolean>(true);

    const [isAddition, setIsAddition] = useState<boolean>(true);

    const [firstParsedFactor, setFirstParsedFactor] = useState<number | Fraction | undefined>();
    const [firstFactorInput, setFirstFactorInput] = useState<string>("");

    const [secondFactor, setSecondFactor] = useState<number | Fraction | undefined>();
    const [secondFactorInput, setSecondFactorInput] = useState<string>("");

    const [isSwitched, setIsSwitched] = useState<boolean>(false);

    const [resultingEquation, setResultingEquation] = useState<FlexibilityEquation | undefined>();
    const [firstMultipliedEquation, setFirstMultipliedEquation] = useState<FlexibilityEquation | undefined>();
    const [secondMultipliedEquation, setSecondMultipliedEquation] = useState<FlexibilityEquation | undefined>();

    let content: ReactElement;
    if (isApplication) {
        content = <EliminationApplication
            system={system}
            isAddition={isAddition}
            setIsAddition={setIsAddition}
            firstFactorInput={firstFactorInput}
            setFirstFactorInput={setFirstFactorInput}
            setFirstFactor={setFirstParsedFactor}
            secondFactorInput={secondFactorInput}
            setSecondFactorInput={setSecondFactorInput}
            setSecondFactor={setSecondFactor}
            isSwitched={isSwitched}
            setIsSwitched={setIsSwitched}
            computeResultingEquation={computeResultingEquation}
            trackAction={() => {
            }}
            isDemo={true}
        />;
    } else {
        content = <EliminationDemoResult
            system={system}
            resultingEquation={resultingEquation as FlexibilityEquation}
            firstMultipliedEquation={firstMultipliedEquation}
            secondMultipliedEquation={secondMultipliedEquation}
            firstFactor={firstParsedFactor}
            secondFactor={secondFactor}
            firstVariable={firstVariable}
            secondVariable={secondVariable}
            reset={reset}
            isAddition={isAddition}
            isSwitched={isSwitched}
        />;
    }

    return content;

    function computeResultingEquation(resultingEquation: FlexibilityEquation, firstMultipliedEquation?: FlexibilityEquation, secondMultipliedEquation?: FlexibilityEquation): void {
        setResultingEquation(resultingEquation);
        setFirstMultipliedEquation(firstMultipliedEquation);
        setSecondMultipliedEquation(secondMultipliedEquation);
        setIsApplication(false);
    }

    function reset(): void {
        setIsSwitched(false);
        setIsAddition(true);
        setFirstFactorInput("");
        setSecondFactorInput("");
        setIsApplication(true);
        setResultingEquation(undefined);
        setFirstMultipliedEquation(undefined);
        setSecondMultipliedEquation(undefined);
    }
}
