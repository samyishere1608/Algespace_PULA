import { Language, TranslationNamespaces, getCurrentLanguage } from "@/i18n.ts";
import { faCalculator, faMinus, faPlus, faRotate } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Fraction, evaluate } from "mathjs";
import React, { ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { AgentExpression, AgentType } from "@/types/flexibility/enums.ts";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { math } from "@/types/math/math.ts";
import { EliminationInput } from "@components/flexibility/elimination/EliminationInput.tsx";
import { EliminationInstruction } from "@components/flexibility/elimination/EliminationMethod.tsx";
import { FlexibilityHint } from "@components/flexibility/interventions/FlexibilityHint.tsx";
import { FlexibilityPopover } from "@components/flexibility/interventions/FlexibilityPopover.tsx";
import { LinearSystemWithActions } from "@components/math/procedural-knowledge/LinearSystem.tsx";
import { numberOrFractionIsOne } from "@utils/utils.ts";
import { multiplyTerms, sumUpEquations } from "@utils/eliminationUtils.ts";

export function EliminationApplication(
    {
        system,
        isAddition,
        setIsAddition,
        firstFactorInput,
        setFirstFactorInput,
        setFirstFactor,
        secondFactorInput,
        setSecondFactorInput,
        setSecondFactor,
        isSwitched,
        setIsSwitched,
        computeResultingEquation,
        agentType,
        trackAction,
        isDemo = false,
        trackHints
    }: {
        system: [FlexibilityEquation, FlexibilityEquation];
        isAddition: boolean;
        setIsAddition: (value: React.SetStateAction<boolean>) => void;
        firstFactorInput: string;
        setFirstFactorInput: (value: React.SetStateAction<string>) => void;
        setFirstFactor: (value: React.SetStateAction<number | Fraction | undefined>) => void;
        secondFactorInput: string;
        setSecondFactorInput: (value: React.SetStateAction<string>) => void;
        setSecondFactor: (value: React.SetStateAction<number | Fraction | undefined>) => void;
        isSwitched: boolean;
        setIsSwitched: (value: React.SetStateAction<boolean>) => void;
        computeResultingEquation: (equation: FlexibilityEquation, firstEquation?: FlexibilityEquation, secEquation?: FlexibilityEquation) => void;
        agentType?: AgentType;
        trackAction: (action: string) => void;
        isDemo?: boolean;
        trackHints?: () => void;
    }
): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Flexibility);

    const [firstInputError, setFirstInputError] = useState<boolean>(false);
    const [secondInputError, setSecondInputError] = useState<boolean>(false);

    return (
        <React.Fragment>
            <div className={"elimination-instruction"}>
                <EliminationInstruction />
            </div>
            <div className={"elimination-application"}>
                <div className={"elimination-application__top"}>
                    <div className={"elimination-application__top-left"} style={{ minWidth: getCurrentLanguage() === Language.EN ? "6.25rem" : "8rem" }}>
                        <button className={"button dark-button"} onClick={() => {
                            trackAction(isAddition ? "set SUBTRACT" : "set ADD");
                            setIsAddition((prevState: boolean) => !prevState);
                        }}>
                            {isAddition ? (
                                <React.Fragment>
                                    <FontAwesomeIcon icon={faPlus} />
                                    {t(FlexibilityTranslations.BUTTON_ADD)}
                                </React.Fragment>
                            ) : (
                                <React.Fragment>
                                    <FontAwesomeIcon icon={faMinus} />
                                    {t(FlexibilityTranslations.BUTTON_SUBTRACT)}
                                </React.Fragment>
                            )}
                        </button>
                    </div>
                    <LinearSystemWithActions
                        firstEquation={system[0]}
                        secondEquation={system[1]}
                        firstAction={<EliminationInput input={firstFactorInput} setInput={setFirstFactorInput} error={firstInputError} setError={setFirstInputError} />}
                        secondAction={<EliminationInput input={secondFactorInput} setInput={setSecondFactorInput} error={secondInputError}
                                                        setError={setSecondInputError} />}
                        systemStyle={{ flexDirection: isSwitched ? "column-reverse" : "column" }}
                    />
                    <div className={"elimination-application__top-right"}>
                        <button className={"button dark-button"} onClick={() => {
                            setIsSwitched((prevState: boolean) => !prevState);
                            trackAction("SWITCH eq");
                        }}>
                            <FontAwesomeIcon icon={faRotate} />
                        </button>
                    </div>
                </div>
                <hr />
                <div className={"elimination-application__bottom"}>
                    <button className={"button dark-button"} onClick={handleCalculation}>
                        <FontAwesomeIcon icon={faCalculator} />
                    </button>
                </div>
            </div>
            {!isDemo && <FlexibilityHint hints={[FlexibilityTranslations.ELIMINATION_HINT_1, FlexibilityTranslations.ELIMINATION_HINT_2]} agentType={agentType}
                                         agentExpression={AgentExpression.Neutral} disabled={firstInputError || secondInputError} trackHint={trackHints}/>}
            {(firstInputError || secondInputError) && (
                !isDemo ?
                    <FlexibilityPopover agentType={agentType} agentExpression={AgentExpression.Thinking}>
                        <p>{t(FlexibilityTranslations.ELIMINATION_INPUT_ERROR)}</p>
                    </FlexibilityPopover> : <p>{t(FlexibilityTranslations.ELIMINATION_INPUT_ERROR)}</p>
            )}
        </React.Fragment>
    );

    function handleCalculation(): void {
        if (firstInputError || secondInputError) {
            return;
        }

        let firstMultipliedEquation: FlexibilityEquation | undefined;
        let firstFactor: number | Fraction | undefined;
        if (firstFactorInput !== "") {
            try {
                [firstMultipliedEquation, firstFactor] = multiplyEquation(system[0], firstFactorInput);
                trackAction(`multiplied FIRST with ${firstFactorInput}`);
            } catch (error) {
                setFirstInputError(true);
                return;
            }
        }

        let secondMultipliedEquation: FlexibilityEquation | undefined;
        let secondFactor: number | Fraction | undefined;
        if (secondFactorInput !== "") {
            try {
                [secondMultipliedEquation, secondFactor] = multiplyEquation(system[1], secondFactorInput);
                trackAction(`multiplied SECOND with ${secondFactorInput}`);
            } catch (error) {
                setSecondInputError(true);
                return;
            }
        }

        setFirstFactor(firstFactor);
        setSecondFactor(secondFactor);
        const addedEquation: FlexibilityEquation = sumUpEquations(firstMultipliedEquation ?? system[0], secondMultipliedEquation ?? system[1], isAddition);
        computeResultingEquation(addedEquation, firstMultipliedEquation, secondMultipliedEquation);
    }
}

function multiplyEquation(equation: FlexibilityEquation, input: string): [FlexibilityEquation | undefined, number | Fraction | undefined] {
    const modifiedInput: string = input.replace(",", ".");
    const evaluatedInput: number | Fraction = math.fraction(evaluate(modifiedInput));
    if (numberOrFractionIsOne(evaluatedInput)) {
        return [undefined, undefined];
    }
    const multipliedEquation: FlexibilityEquation = new FlexibilityEquation(multiplyTerms(equation.leftTerms, evaluatedInput), multiplyTerms(equation.rightTerms, evaluatedInput));
    return [multipliedEquation, evaluatedInput];
}