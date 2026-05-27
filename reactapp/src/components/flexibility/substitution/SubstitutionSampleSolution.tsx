import { FlexibilityEquation as FlexibilityEquationProps } from "@/types/math/linearEquation.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { SubstitutedEquationInfo, SubstitutionParameters, SubstitutionResultParameters } from "@/types/flexibility/substitutionParameters.ts";
import React, { ReactElement, useMemo } from "react";
import { AgentExpression, AgentType, IsolatedIn } from "@/types/flexibility/enums.ts";
import { FlexibilityTerm } from "@/types/math/term.ts";
import { Fraction } from "mathjs";
import { computeSubstitutionResult, requiresDotOrFractions } from "@utils/substitutionUtils.ts";
import { FlexibilityPopover } from "@components/flexibility/interventions/FlexibilityPopover.tsx";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { TranslationNamespaces } from "@/i18n.ts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { Trans, useTranslation } from "react-i18next";
import { EquivalentSubstitutionEquations, SubstitutionResultEquations } from "@components/flexibility/substitution/SubstitutionResultEquations.tsx";

export function SubstitutionSampleSolution(
    {
        system,
        firstVariable,
        secondVariable,
        isolatedVariables,
        loadNextStep,
        agentType,
        isTip
    }: {
        system: [FlexibilityEquationProps, FlexibilityEquationProps];
        firstVariable: Variable;
        secondVariable: Variable;
        isolatedVariables: [IsolatedIn, IsolatedIn];
        loadNextStep: (equation: FlexibilityEquationProps, containsFirst: boolean, params?: SubstitutionParameters) => void;
        agentType?: AgentType;
        isTip: boolean;
    }
): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Flexibility);

    const substitutionParams = useMemo(() => {
        if (isTip) {
            return computeSampleSubstitutionParametersForTip(system, firstVariable, secondVariable, isolatedVariables);
        }
        return computeSampleSubstitutionParameters(system, firstVariable, secondVariable, isolatedVariables);
    }, [isTip, system, firstVariable, secondVariable, isolatedVariables]);

    const containsFraction: boolean = substitutionParams.substitutionItems.some((term) => term.coefficient.d !== 1);
    const substitutionResult: FlexibilityEquationProps | undefined = computeSubstitutionResult(system, substitutionParams);
    const containsDotOrFractions: boolean = isTip ? false : requiresDotOrFractions(substitutionParams.isFirstEquation ? system[0] : system[1], substitutionParams);
    const description = FlexibilityTranslations.getSubstitutionSampleSolutionDescription(substitutionParams.variable as string, !substitutionParams.isFirstEquation);

    return (
        <React.Fragment>
            <SubstitutionResultEquations system={system} substitutionParams={substitutionParams} containsFraction={containsFraction} />
            {substitutionResult !== undefined && <FlexibilityPopover agentType={agentType} agentExpression={AgentExpression.Thinking}>
                <React.Fragment>
                    <p>
                        <Trans ns={TranslationNamespaces.Flexibility} i18nKey={description.translationKey} values={description.interpolationVariables as object} />
                    </p>
                    {containsDotOrFractions && (
                        <EquivalentSubstitutionEquations system={system} substitutionParams={substitutionParams} containsFraction={containsDotOrFractions}
                                                         substitutionResult={substitutionResult} />
                    )}
                    <button className={"button primary-button"} onClick={() => continueWithNextStep(substitutionResult)}>
                        {t(GeneralTranslations.BUTTON_CONTINUE, { ns: TranslationNamespaces.General })}
                        <FontAwesomeIcon icon={faArrowRight} />
                    </button>
                </React.Fragment>
            </FlexibilityPopover>
            }
        </React.Fragment>
    );

    function continueWithNextStep(equation: FlexibilityEquationProps): void {
        loadNextStep(equation, substitutionParams.variable !== firstVariable.name, {
            isFirstEquation: substitutionParams.isFirstEquation,
            variable: substitutionParams.variable,
            equationInfo: containsDotOrFractions
                ? ({
                    substitutionItems: substitutionParams.substitutionItems,
                    isLeft: substitutionParams.isLeft,
                    index: substitutionParams.index
                } as SubstitutedEquationInfo)
                : undefined
        } as SubstitutionParameters);
    }
}

function computeSampleSubstitutionParameters(system: [FlexibilityEquationProps, FlexibilityEquationProps], firstVariable: Variable, secondVariable: Variable, isolatedVariables: [IsolatedIn, IsolatedIn]): SubstitutionResultParameters {
    let isFirstEquation: boolean = false;
    let isLeft: boolean;
    let index: number;
    let coefficient: Fraction;
    let substitutionItems: FlexibilityTerm[];
    let variable: string;
    if (isolatedVariables[0] !== IsolatedIn.None) {
        if (isolatedVariables[0] === IsolatedIn.First) {
            variable = firstVariable.name;
            [isLeft, index, coefficient] = findVariablePosition(system[1], firstVariable);
        } else {
            variable = secondVariable.name;
            [isLeft, index, coefficient] = findVariablePosition(system[1], secondVariable);
        }

        if (isolatedVariables[1] !== IsolatedIn.None) {
            let tmpIsLeft: boolean;
            let tmpIndex: number;
            let tmpCoefficient: Fraction;
            let tmpVariable: string;
            if (isolatedVariables[1] === IsolatedIn.First) {
                tmpVariable = firstVariable.name;
                [tmpIsLeft, tmpIndex, tmpCoefficient] = findVariablePosition(system[0], firstVariable);
            } else {
                tmpVariable = secondVariable.name;
                [tmpIsLeft, tmpIndex, tmpCoefficient] = findVariablePosition(system[0], secondVariable);
            }

            if ((tmpCoefficient.d !== 1 && coefficient.d !== 1 && tmpCoefficient.n < coefficient.n) ||
                (tmpCoefficient.d === 1 && coefficient.d !== 1) ||
                (tmpCoefficient.d === 1 && coefficient.d === 1 && tmpCoefficient.n < coefficient.n)) {
                isLeft = tmpIsLeft;
                index = tmpIndex;
                variable = tmpVariable;
                isFirstEquation = true;
                substitutionItems = getSubstitutionItems(system, 1);
            } else {
                substitutionItems = getSubstitutionItems(system, 0);
            }
        } else {
            substitutionItems = getSubstitutionItems(system, 0);
        }
    } else {
        if (isolatedVariables[1] === IsolatedIn.First) {
            variable = firstVariable.name;
            [isLeft, index] = findVariablePosition(system[0], firstVariable);
        } else {
            variable = secondVariable.name;
            [isLeft, index] = findVariablePosition(system[0], secondVariable);
        }
        substitutionItems = getSubstitutionItems(system, 1);
        isFirstEquation = true;
    }

    return {
        isValid: true,
        substitutionItems,
        isFirstEquation,
        isLeft,
        index,
        variable
    } as SubstitutionResultParameters;
}

function getSubstitutionItems(system: [FlexibilityEquationProps, FlexibilityEquationProps], index: number) {
    return (system[index].leftTerms.length === 1) ? system[index].rightTerms : system[index].leftTerms;
}

function findVariablePosition(equation: FlexibilityEquationProps, variable: Variable): [boolean, number, Fraction] {
    let index = equation.leftTerms.findIndex((term: FlexibilityTerm) => term.variable !== null && term.variable === variable.name);
    if (index !== -1) {
        return [true, index, equation.leftTerms[index].coefficient];
    }
    index = equation.rightTerms.findIndex((term: FlexibilityTerm) => term.variable !== null && term.variable === variable.name);
    return [false, index, equation.rightTerms[index].coefficient];
}

function computeSampleSubstitutionParametersForTip(system: [FlexibilityEquationProps, FlexibilityEquationProps], firstVariable: Variable, secondVariable: Variable, isolatedVariables: [IsolatedIn, IsolatedIn]): SubstitutionResultParameters {
    let isFirstEquation: boolean = false;
    let isLeft: boolean;
    let index: number;
    let substitutionItems: FlexibilityTerm[];
    let variable: string;
    if (isolatedVariables[0] === IsolatedIn.FirstMultiple || isolatedVariables[0] === IsolatedIn.SecondMultiple) {
        [isLeft, index] = findPositionOfUnion(system[1]);
        variable = isolatedVariables[0] === IsolatedIn.FirstMultiple ? firstVariable.name : secondVariable.name;
        substitutionItems = system[0].leftTerms.length === 1 ? system[0].rightTerms : system[0].leftTerms;
    } else {
        isFirstEquation = true;
        [isLeft, index] = findPositionOfUnion(system[0]);
        variable = isolatedVariables[1] === IsolatedIn.FirstMultiple ? firstVariable.name : secondVariable.name;
        substitutionItems = system[1].leftTerms.length === 1 ? system[1].rightTerms : system[1].leftTerms;
    }
    return {
        isValid: true,
        substitutionItems,
        isFirstEquation,
        isLeft,
        index,
        variable,
        replaceAll: true
    } as SubstitutionResultParameters;
}

function findPositionOfUnion(equation: FlexibilityEquationProps): [boolean, number] {
    let index = equation.leftTerms.findIndex((term: FlexibilityTerm) => term.isUnion);
    if (index !== -1) {
        return [true, index];
    }
    index = equation.rightTerms.findIndex((term: FlexibilityTerm) => term.isUnion);
    return [false, index];
}