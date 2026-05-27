import { TranslationNamespaces } from "@/i18n.ts";
import { Fraction } from "mathjs";
import React, { ReactElement, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { EliminationParameters } from "@/types/flexibility/eliminationParameters.ts";
import { AgentType, Method } from "@/types/flexibility/enums.ts";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { FlexibilityEquation, FlexibilityEquation as FlexibilityEquationProps } from "@/types/math/linearEquation.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { EliminationApplication } from "@components/flexibility/elimination/EliminationApplication.tsx";
import { EliminationResult } from "@components/flexibility/elimination/EliminationResult.tsx";
import { TransformedSystem } from "@components/flexibility/system/TransformedSystem.tsx";
import { EliminationSampleSolution } from "@components/flexibility/elimination/EliminationSampleSolution.tsx";
import { faCalculator, faRotate } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export function EliminationMethod(
    {
        initialSystem,
        transformedSystem,
        firstVariable,
        secondVariable,
        loadNextStep,
        agentType,
        trackAction,
        trackError,
        trackHints,
        loadPreviousStep,
    }: {
        initialSystem: [FlexibilityEquation, FlexibilityEquation];
        transformedSystem?: [FlexibilityEquation, FlexibilityEquation];
        firstVariable: Variable;
        secondVariable: Variable;
        loadNextStep: (resultingEquation: FlexibilityEquation, containsFirst: boolean, params?: EliminationParameters, firstMultipliedEquation?: FlexibilityEquationProps, secondMultipliedEquation?: FlexibilityEquationProps) => void;
        agentType?: AgentType;
        trackAction: (action: string) => void;
        trackError: () => void;
        trackHints: () => void;
        loadPreviousStep?: () => void;
    }
): ReactElement {
    const transformationIntroduction: TranslationInterpolation = FlexibilityTranslations.getInstructionForSolvingSystem(Method.Elimination);

    return (
        <React.Fragment>
            <p>
                <Trans ns={TranslationNamespaces.Flexibility} i18nKey={transformationIntroduction.translationKey}
                       values={transformationIntroduction.interpolationVariables as object} />
            </p>
            <TransformedSystem initialSystem={initialSystem} transformedSystem={transformedSystem} />
            <MethodApplication system={transformedSystem !== undefined ? transformedSystem : initialSystem} firstVariable={firstVariable} secondVariable={secondVariable}
                               loadNextStep={loadNextStep} agentType={agentType} trackAction={trackAction} loadPreviousStep={loadPreviousStep}
                               trackError={trackError} trackHints={trackHints}/>
        </React.Fragment>
    );
}

function MethodApplication(
    {
        system,
        firstVariable,
        secondVariable,
        loadNextStep,
        agentType,
        trackAction,
        trackError,
        trackHints,
        loadPreviousStep
    }: {
        system: [FlexibilityEquation, FlexibilityEquation];
        firstVariable: Variable;
        secondVariable: Variable;
        loadNextStep: (resultingEquation: FlexibilityEquation, containsFirst: boolean, params?: EliminationParameters, firstMultipliedEquation?: FlexibilityEquationProps, secondMultipliedEquation?: FlexibilityEquationProps) => void;
        agentType?: AgentType;
        trackAction: (action: string) => void;
        trackError: () => void;
        trackHints: () => void;
        loadPreviousStep?: () => void;
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

    const [attempts, setAttempts] = useState<number>(0);
    const [showSampleSolution, setShowSampleSolution] = useState<boolean>(false);

    let content: ReactElement;
    if (showSampleSolution) {
        content =
            <EliminationSampleSolution system={system} firstVariable={firstVariable} secondVariable={secondVariable} loadNextStep={loadNextStep} agentType={agentType} />;
    } else if (isApplication) {
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
            agentType={agentType}
            trackAction={trackAction}
        />;
    } else {
        content = <EliminationResult
            system={system}
            resultingEquation={resultingEquation as FlexibilityEquation}
            firstMultipliedEquation={firstMultipliedEquation}
            secondMultipliedEquation={secondMultipliedEquation}
            firstFactor={firstParsedFactor}
            secondFactor={secondFactor}
            firstVariable={firstVariable}
            secondVariable={secondVariable}
            loadNextStep={loadNextStep}
            reset={reset}
            isAddition={isAddition}
            isSwitched={isSwitched}
            attempts={attempts}
            setShowSampleSolution={setShowSampleSolution}
            agentType={agentType}
            trackAction={trackAction}
            trackError={trackError}
            trackHints={trackHints}
            loadPreviousStep = {loadPreviousStep}
        />;
    }

    return content;

    function computeResultingEquation(resultingEquation: FlexibilityEquation, firstMultipliedEquation?: FlexibilityEquation, secondMultipliedEquation?: FlexibilityEquation): void {
        setAttempts((prevState: number) => prevState + 1);
        setResultingEquation(resultingEquation);
        setFirstMultipliedEquation(firstMultipliedEquation);
        setSecondMultipliedEquation(secondMultipliedEquation);
        setIsApplication(false);
    }

    function reset(): void {
        trackAction("FAILED");
        trackError();
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

export function EliminationInstruction(): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Flexibility);

    return (
        <React.Fragment>
            <p>{t(FlexibilityTranslations.ELIMINATION_INSTR)}</p>
            <div className={"elimination-instruction__item"}>
                <p className={"elimination-instruction__item-label"}>1.</p>
                <p className={"elimination-instruction__item-text"}>{t(FlexibilityTranslations.ELIMINATION_INSTR_STEP_1)}</p>
            </div>
            <div className={"elimination-instruction__item"}>
                <p className={"elimination-instruction__item-label"}>2.</p>
                <p className={"elimination-instruction__item-text"}>
                    {t(FlexibilityTranslations.ELIMINATION_INSTR_STEP_2_1)}
                    <FontAwesomeIcon style={{ fontSize: "0.875rem" }} icon={faRotate} />
                    {t(FlexibilityTranslations.ELIMINATION_INSTR_STEP_2_2)}
                </p>
            </div>
            <div className={"elimination-instruction__item"}>
                <p className={"elimination-instruction__item-label"}>3.</p>
                <p className={"elimination-instruction__item-text"}>
                    {t(FlexibilityTranslations.ELIMINATION_INSTR_STEP_3_1)}
                    <FontAwesomeIcon style={{ fontSize: "0.875rem", marginBottom: "0.125rem" }} icon={faCalculator} />
                    {t(FlexibilityTranslations.ELIMINATION_INSTR_STEP_3_2)}
                </p>
            </div>
        </React.Fragment>
    );
}
