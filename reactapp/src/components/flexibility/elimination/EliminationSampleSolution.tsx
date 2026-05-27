import React, { ReactElement, useLayoutEffect, useMemo, useRef } from "react";
import { FlexibilityEquation as FlexibilityEquationProps } from "@/types/math/linearEquation.ts";
import { EliminationParameters } from "@/types/flexibility/eliminationParameters.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { AgentExpression, AgentType } from "@/types/flexibility/enums.ts";
import { EliminationInstruction } from "@components/flexibility/elimination/EliminationMethod.tsx";
import { FlexibilityTerm } from "@/types/math/term.ts";
import { coefficientIsOne } from "@utils/utils.ts";
import { math } from "@/types/math/math.ts";
import { Fraction } from "mathjs";
import { GameError, GameErrorType } from "@/types/shared/error.ts";
import { multiplyTerms, sumUpEquations } from "@utils/eliminationUtils.ts";
import { MultipliedLinearSystem } from "@components/flexibility/elimination/MultipliedLinearSystem.tsx";
import { FlexibilityEquation } from "@components/math/procedural-knowledge/FlexibilityEquation.tsx";
import { FlexibilityPopover } from "@components/flexibility/interventions/FlexibilityPopover.tsx";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { TranslationNamespaces } from "@/i18n.ts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";

export function EliminationSampleSolution({ system, firstVariable, secondVariable, loadNextStep, agentType }: {
    system: [FlexibilityEquationProps, FlexibilityEquationProps];
    firstVariable: Variable;
    secondVariable: Variable;
    loadNextStep: (resultingEquation: FlexibilityEquationProps, containsFirst: boolean, params?: EliminationParameters, firstMultipliedEquation?: FlexibilityEquationProps, secondMultipliedEquation?: FlexibilityEquationProps) => void;
    agentType?: AgentType;
}): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.Flexibility, TranslationNamespaces.General]);

    const contentRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        if (contentRef.current !== null) {
            contentRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, []);

    const params = useMemo(() => computeSampleEliminationParams(system, firstVariable, secondVariable), [system, firstVariable, secondVariable]);

    const firstMultipliedEquation: FlexibilityEquationProps | undefined = useMemo(() => {
        if (params[2] !== undefined) {
            return multiplyEquation(system[0], params[2]);
        }
        return undefined;
    }, [params, system]);

    const secondMultipliedEquation: FlexibilityEquationProps | undefined = useMemo(() => {
        if (params[3] !== undefined) {
            return multiplyEquation(system[1], params[3]);
        }
        return undefined;
    }, [params, system]);

    const equationSum: FlexibilityEquationProps = useMemo(() => {
        return sumUpEquations(firstMultipliedEquation ?? system[0], secondMultipliedEquation ?? system[1], params[1]);
    }, [firstMultipliedEquation, secondMultipliedEquation, params, system]);

    return <React.Fragment>
        <div className={"elimination-instruction"}>
            <EliminationInstruction />
        </div>
        <div className={"elimination-result"} ref={contentRef}>
            <div className={"elimination-result__top"}>
                <MultipliedLinearSystem firstEquation={system[0]} secondEquation={system[1]} firstFactor={params[2]} secondFactor={params[3]}
                                        isSwitched={false} isAddition={params[1]} firstMultipliedEquation={firstMultipliedEquation}
                                        secondMultipliedEquation={secondMultipliedEquation} />
            </div>
            <hr />
            <div className={"elimination-result__bottom--solution"}>
                <FlexibilityEquation equation={equationSum} />
            </div>
            <div style={{ minHeight: "9rem", minWidth: "1rem" }}></div>
        </div>
        <FlexibilityPopover agentType={agentType} agentExpression={AgentExpression.Thinking}>
            <React.Fragment>
                <p>{t(FlexibilityTranslations.ELIMINATION_SAMPLE_SOLUTION)}</p>
                <button
                    className={"button primary-button"}
                    onClick={(): void => {
                        if (firstMultipliedEquation !== undefined || secondMultipliedEquation !== undefined) {
                            loadNextStep(
                                equationSum,
                                !params[0],
                                {
                                    switchedEquations: false,
                                    isAddition: params[1],
                                    firstFactor: params[2],
                                    secondFactor: params[3]
                                } as EliminationParameters,
                                firstMultipliedEquation,
                                secondMultipliedEquation
                            );
                        } else {
                            loadNextStep(equationSum, !params[0], {
                                switchedEquations: false,
                                isAddition: params[1]
                            } as EliminationParameters);
                        }
                    }}
                >
                    {t(GeneralTranslations.BUTTON_CONTINUE, { ns: TranslationNamespaces.General })}
                    <FontAwesomeIcon icon={faArrowRight} />
                </button>
            </React.Fragment>
        </FlexibilityPopover>
    </React.Fragment>;
}

function computeSampleEliminationParams(system: [FlexibilityEquationProps, FlexibilityEquationProps], firstVariable: Variable, secondVariable: Variable): [boolean, boolean, Fraction | undefined, Fraction | undefined] {
    const firstResult = canEliminateVariableInSystem(system, firstVariable.name);
    const secondResult = canEliminateVariableInSystem(system, secondVariable.name);
    if (!firstResult && !secondResult) {
        throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
    }

    let result = (firstResult || secondResult) as [boolean, Fraction | undefined, Fraction | undefined];
    let isFirstResult = !!firstResult;

    if (firstResult && secondResult) {
        const firstFactor = firstResult[1] || firstResult[2];
        const secondFactor = secondResult[1] || secondResult[2];

        if (!firstFactor) {
            result = firstResult;
            isFirstResult = true;
        } else if (!secondFactor) {
            result = secondResult;
            isFirstResult = false;
        } else if (firstResult[1] ? !firstResult[2] : firstResult[2]) { //XOR
            if ((secondResult[1] && secondResult[2]) || math.smaller(firstFactor, secondFactor)) {
                result = firstResult;
                isFirstResult = true;
            } else {
                result = secondResult;
                isFirstResult = false;
            }
        } else if (secondResult[1] ? !secondResult[2] : secondResult[2]) {
            if ((firstResult[1] && firstResult[2]) || math.smaller(secondFactor, firstFactor)) {
                result = secondResult;
                isFirstResult = false;
            } else {
                result = firstResult;
                isFirstResult = true;
            }
        } else if (math.smaller(secondResult[1] as Fraction, firstResult[1] as Fraction) && math.smaller(secondResult[2] as Fraction, firstResult[2] as Fraction)) {
            result = secondResult;
            isFirstResult = false;
        } else {
            result = firstResult;
            isFirstResult = true;
        }
    }

    return [isFirstResult, ...result];
}

function canEliminateVariableInSystem(system: [FlexibilityEquationProps, FlexibilityEquationProps], variable: string): [boolean, Fraction | undefined, Fraction | undefined] | undefined {
    let result = canEliminateVariableInTerms(system[0].leftTerms, system[1].leftTerms, variable);
    if (result === undefined) {
        result = canEliminateVariableInTerms(system[0].rightTerms, system[1].rightTerms, variable);
    }
    return result;
}

function canEliminateVariableInTerms(firstTerms: FlexibilityTerm[], secondTerms: FlexibilityTerm[], variable: string): [boolean, Fraction | undefined, Fraction | undefined] | undefined {
    const firstIndex = findIndexOfVariable(firstTerms, variable);
    const secondIndex = findIndexOfVariable(secondTerms, variable);

    if (firstIndex === -1 || secondIndex === -1) {
        return undefined;
    }

    const firstCoefficient = firstTerms[firstIndex].coefficient;
    const firstIsNegative = firstCoefficient.s < 0;
    const secondCoefficient = secondTerms[secondIndex].coefficient;
    const secondIsNegative = secondCoefficient.s < 0;

    let firstFactor, secondFactor;
    if (!fractionsAreEqual(firstCoefficient, secondCoefficient)) {
        if (coefficientIsOne(firstCoefficient) || coefficientIsOne(secondCoefficient)) {
            if (coefficientIsOne(firstCoefficient)) {
                firstFactor = math.abs(secondCoefficient);
            }
            if (coefficientIsOne(secondCoefficient)) {
                secondFactor = math.abs(firstCoefficient);
            }
        } else if (modIsZero(firstCoefficient, secondCoefficient)) { // Multiples of each other
            secondFactor = math.abs(math.divide(firstCoefficient, secondCoefficient)) as Fraction;
        } else if (modIsZero(secondCoefficient, firstCoefficient)) {
            firstFactor = math.abs(math.divide(secondCoefficient, firstCoefficient)) as Fraction;
        } else if (firstCoefficient.d === 1 && secondCoefficient.d === 1) { // Whole numbers
            const lcm = math.lcm(firstCoefficient.n, secondCoefficient.n);
            firstFactor = math.abs(math.divide(lcm, firstCoefficient)) as Fraction;
            secondFactor = math.abs(math.divide(lcm, secondCoefficient)) as Fraction;
        } else { // Multiply with inverse value
            firstFactor = math.fraction(firstCoefficient.d, firstCoefficient.n);
            secondFactor = math.fraction(secondCoefficient.d, secondCoefficient.n);
        }
    }

    const result = firstIsNegative !== secondIsNegative;
    return [result, firstFactor, secondFactor];
}

function fractionsAreEqual(firstCoefficient: Fraction, secondCoefficient: Fraction) {
    return firstCoefficient.n === secondCoefficient.n && firstCoefficient.d === secondCoefficient.d;
}

function findIndexOfVariable(terms: FlexibilityTerm[], variable: string): number {
    return terms.findIndex((term: FlexibilityTerm) => term.variable !== null && term.variable === variable);
}

function modIsZero(firstCoefficient: Fraction, secondCoefficient: Fraction): boolean {
    return math.isZero(math.mod(firstCoefficient, secondCoefficient));
}

function multiplyEquation(equation: FlexibilityEquationProps, factor: Fraction): FlexibilityEquationProps {
    return new FlexibilityEquationProps(multiplyTerms(equation.leftTerms, factor), multiplyTerms(equation.rightTerms, factor));
}