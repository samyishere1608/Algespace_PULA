import { TranslationNamespaces } from "@/i18n.ts";
import { Fraction } from "mathjs";
import React, { ReactElement, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { AgentExpression, AgentType, IsolatedIn, Method } from "@/types/flexibility/enums.ts";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { math } from "@/types/math/math.ts";
import { FlexibilityTerm } from "@/types/math/term.ts";
import { GameError, GameErrorType } from "@/types/shared/error.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { FlexibilityHint } from "@components/flexibility/interventions/FlexibilityHint.tsx";
import { ClosableFlexibilityPopover } from "@components/flexibility/interventions/FlexibilityPopover.tsx";
import { LinearSystem, LinearSystemWithActions } from "@components/math/procedural-knowledge/LinearSystem.tsx";
import EquivalenceSymbol from "@images/flexibility/equivalence.svg";

export function SystemTransformation({
                                         firstEquation,
                                         secondEquation,
                                         initialIsolatedVariables,
                                         firstVariable,
                                         secondVariable,
                                         method,
                                         loadNextStep,
                                         agentType,
                                         trackAction,
                                         trackError,
                                         trackHints
                                     }: {
    firstEquation: FlexibilityEquation;
    secondEquation: FlexibilityEquation;
    firstVariable: Variable;
    secondVariable: Variable;
    method: Method;
    initialIsolatedVariables: [IsolatedIn, IsolatedIn];
    loadNextStep: (transformedSystem?: [FlexibilityEquation, FlexibilityEquation], isolatedVariables?: [IsolatedIn, IsolatedIn], transformationInfo?: [IsolatedIn, IsolatedIn]) => void;
    agentType?: AgentType;
    trackAction: (action: string) => void;
    trackError: () => void;
    trackHints: () => void;
}): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Flexibility);

    const [transformedSystem, setTransformedSystem] = useState<[FlexibilityEquation, FlexibilityEquation]>();
    const [transformationInfo, setTransformationInfo] = useState<[IsolatedIn, IsolatedIn]>([IsolatedIn.None, IsolatedIn.None]);
    const [isolatedVariables, setIsolatedVariables] = useState<[IsolatedIn, IsolatedIn]>(initialIsolatedVariables);
    const [feedback, setFeedback] = useState<string>();
    const [showFeedback, setShowFeedback] = useState<boolean>(false);
    const [transformationStepCount, setTransformationStepCount] = useState(0);

    const exerciseInstruction: TranslationInterpolation = useMemo(() => FlexibilityTranslations.getInstructionForSolvingSystem(method), [method]);
    const transformationInstruction: TranslationInterpolation = useMemo(() => FlexibilityTranslations.getInstructionForSystemTransformation(method), [method]);

    const hint: string = useMemo(() => {
        switch (method) {
            case Method.Equalization:
                return FlexibilityTranslations.EQUALIZATION_NOT_EFFICIENT;
            case Method.Substitution:
                return FlexibilityTranslations.SUBSTITUTION_NOT_EFFICIENT;
            case Method.Elimination:
                return FlexibilityTranslations.ELIMINATION_NOT_EFFICIENT;
        }
    }, [method]);

    let content: ReactElement;
    if (transformedSystem === undefined) {
        content = <TransformableSystem firstEquation={firstEquation} secondEquation={secondEquation} firstVariable={firstVariable} secondVariable={secondVariable}
                                       setTransformedSystem={setTransformedSystem} isolatedVariables={isolatedVariables} setIsolatedVariables={setIsolatedVariables}
                                       transformationInfo={transformationInfo} setTransformationInfo={setTransformationInfo} trackAction={trackAction}
                                       incrementStepCount={() => setTransformationStepCount((prev) => prev + 1)}
                                       getHint={getHint}
                                       transformationStepCount = {transformationStepCount}
        />;
    } else {
        content = (
            <div className={"system-transformation__systems"}>
                <LinearSystem firstEquation={firstEquation} secondEquation={secondEquation} />
                <TransformableSystem
                    firstEquation={transformedSystem[0]}
                    secondEquation={transformedSystem[1]}
                    firstVariable={firstVariable}
                    secondVariable={secondVariable}
                    setTransformedSystem={setTransformedSystem}
                    isTransformed={true}
                    isolatedVariables={isolatedVariables}
                    setIsolatedVariables={setIsolatedVariables}
                    transformationInfo={transformationInfo}
                    setTransformationInfo={setTransformationInfo}
                    trackAction={trackAction}
                    incrementStepCount={() => setTransformationStepCount((prev) => prev + 1)}
                    getHint={getHint}
                    transformationStepCount = {transformationStepCount}
                />
            </div>
        );
    }

    return (
        <React.Fragment>
            <p>
                <Trans ns={TranslationNamespaces.Flexibility} i18nKey={exerciseInstruction.translationKey}
                       values={exerciseInstruction.interpolationVariables as object} />
            </p>
            {content}
            <p>
                <Trans ns={TranslationNamespaces.Flexibility} i18nKey={transformationInstruction.translationKey}
                       values={transformationInstruction.interpolationVariables as object} />
            </p>
            <p>{t(method === Method.Elimination ? FlexibilityTranslations.SYSTEM_TRANSFORMATION_ELIMINATION_INSTR : FlexibilityTranslations.SYSTEM_TRANSFORMATION_ADDITIONAL_INSTR)}</p>
            <div className={"system-transformation__buttons"}>
                <button className={"button primary-button"} onClick={() => evaluateSelection(true)}>
                    {t(FlexibilityTranslations.BUTTON_SELECT_INITIAL_SYSTEM)}
                </button>
                {transformedSystem !== undefined && (
                    <button className={"button primary-button"} onClick={() => evaluateSelection(false)}>
                        {t(FlexibilityTranslations.BUTTON_SELECT_TRANSFORMED_SYSTEM)}
                    </button>
                )}
            </div>
            {showFeedback && (
                <ClosableFlexibilityPopover setShowContent={setShowFeedback} agentType={agentType} agentExpression={AgentExpression.Thinking}>
                    <p>{feedback}</p>
                </ClosableFlexibilityPopover>
            )}
            <FlexibilityHint hints={[hint]} disabled={showFeedback} agentType={agentType} agentExpression={AgentExpression.Neutral} trackHint={trackHints}/>
        </React.Fragment>
    );

    function evaluateSelection(applyMethodToInitialSystem: boolean): void {
        if (applyMethodToInitialSystem) {
            switch (method) {
                case Method.Equalization: {
                    if (initialIsolatedVariables[0] !== IsolatedIn.None && initialIsolatedVariables[0] == initialIsolatedVariables[1]) {
                        trackAction("selected VALID INITIAL");
                        loadNextStep(undefined, undefined, transformationInfo);
                    } else {
                        trackAction("selected INVALID INITIAL");
                        trackError();
                        setFeedback(t(FlexibilityTranslations.SYSTEM_TRANSFORMATION_EQUALIZATION_FEEDBACK));
                        setShowFeedback(true);
                    }
                    break;
                }
                case Method.Substitution: {
                    if (initialIsolatedVariables[0] !== IsolatedIn.None || initialIsolatedVariables[1] !== IsolatedIn.None) {
                        trackAction("selected VALID INITIAL");
                        loadNextStep(undefined, undefined, transformationInfo);
                    } else {
                        trackAction("selected INVALID INITIAL");
                        trackError();
                        setFeedback(t(FlexibilityTranslations.SYSTEM_TRANSFORMATION_SUBSTITUTION_FEEDBACK));
                        setShowFeedback(true);
                    }
                    break;
                }
                case Method.Elimination: {
                    if (isEliminationMethodApplicable(firstEquation, secondEquation, firstVariable, secondVariable)) {
                        trackAction("selected VALID INITIAL");
                        loadNextStep(undefined, undefined, transformationInfo);
                    } else {
                        trackAction("selected INVALID INITIAL");
                        trackError();
                        setFeedback(t(FlexibilityTranslations.SYSTEM_TRANSFORMATION_ELIMINATION_FEEDBACK));
                        setShowFeedback(true);
                    }
                    break;
                }
            }
        } else {
            if (transformedSystem === undefined) {
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }
            switch (method) {
                case Method.Equalization: {
                    if (isolatedVariables[0] !== IsolatedIn.None && isolatedVariables[0] == isolatedVariables[1]) {
                        trackAction("selected VALID TRANSFORMED");
                        loadNextStep(transformedSystem, isolatedVariables, transformationInfo);
                    } else {
                        trackAction("selected INVALID TRANSFORMED");
                        trackError();
                        setFeedback(t(FlexibilityTranslations.SYSTEM_TRANSFORMATION_EQUALIZATION_FEEDBACK));
                        setShowFeedback(true);
                    }
                    break;
                }
                case Method.Substitution: {
                    if (isolatedVariables[0] !== IsolatedIn.None || isolatedVariables[1] !== IsolatedIn.None) {
                        trackAction("selected VALID TRANSFORMED");
                        loadNextStep(transformedSystem, isolatedVariables, transformationInfo);
                    } else {
                        trackAction("selected INVALID TRANSFORMED");
                        trackError();
                        setFeedback(t(FlexibilityTranslations.SYSTEM_TRANSFORMATION_SUBSTITUTION_FEEDBACK));
                        setShowFeedback(true);
                    }
                    break;
                }
                case Method.Elimination: {
                    if (isEliminationMethodApplicable(transformedSystem[0], transformedSystem[1], firstVariable, secondVariable)) {
                        trackAction("selected VALID TRANSFORMED");
                        loadNextStep(transformedSystem, isolatedVariables, transformationInfo);
                    } else {
                        trackAction("selected INVALID TRANSFORMED");
                        trackError();
                        setFeedback(t(FlexibilityTranslations.SYSTEM_TRANSFORMATION_ELIMINATION_FEEDBACK));
                        setShowFeedback(true);
                    }
                    break;
                }
            }
        }
    }

    function getHint(){
        switch (method) {
            case Method.Equalization: {
                setFeedback(t(FlexibilityTranslations.SYSTEM_TRANSFORMATION_EQUALIZATION_FEEDBACK));
                setShowFeedback(true);
                break;
            }
            case Method.Substitution: {
                setFeedback(t(FlexibilityTranslations.SYSTEM_TRANSFORMATION_SUBSTITUTION_FEEDBACK));
                setShowFeedback(true);
                break;
            }
            case Method.Elimination: {

                setFeedback(t(FlexibilityTranslations.SYSTEM_TRANSFORMATION_ELIMINATION_FEEDBACK));
                setShowFeedback(true);
                break;
            }
        }
    }
}

function isEliminationMethodApplicable(firstEquation: FlexibilityEquation, secondEquation: FlexibilityEquation, firstVariable: Variable, secondVariable: Variable): boolean {
    let containedInFirst: boolean = termsContainVariable(firstEquation.leftTerms, firstVariable);
    let containedInSecond: boolean = termsContainVariable(secondEquation.leftTerms, firstVariable);
    if (containedInFirst ? !containedInSecond : containedInSecond) {
        // XOR
        containedInFirst = termsContainVariable(firstEquation.leftTerms, secondVariable);
        containedInSecond = termsContainVariable(secondEquation.leftTerms, secondVariable);
        return containedInFirst === containedInSecond;
    }
    return true;
}

function termsContainVariable(terms: FlexibilityTerm[], variable: Variable): boolean {
    return terms.some((term: FlexibilityTerm) => term.variable !== null && term.variable === variable.name);
}

function TransformableSystem({
                                 firstEquation,
                                 secondEquation,
                                 firstVariable,
                                 secondVariable,
                                 setTransformedSystem,
                                 isolatedVariables,
                                 setIsolatedVariables,
                                 transformationInfo,
                                 setTransformationInfo,
                                 isTransformed = false,
                                 trackAction,
                                 incrementStepCount,
                                 transformationStepCount,
                                 getHint,

                             }: {
    firstEquation: FlexibilityEquation;
    secondEquation: FlexibilityEquation;
    firstVariable: Variable;
    secondVariable: Variable;
    setTransformedSystem: (value: React.SetStateAction<[FlexibilityEquation, FlexibilityEquation] | undefined>) => void;
    isolatedVariables: [IsolatedIn, IsolatedIn];
    setIsolatedVariables: (value: React.SetStateAction<[IsolatedIn, IsolatedIn]>) => void;
    transformationInfo: [IsolatedIn, IsolatedIn];
    setTransformationInfo: (value: React.SetStateAction<[IsolatedIn, IsolatedIn]>) => void;
    isTransformed?: boolean;
    trackAction: (action: string) => void;
    incrementStepCount: () => void;
    transformationStepCount: number;
    getHint: () => void;

}) {
    const { t } = useTranslation(TranslationNamespaces.Flexibility);

    const firstEqIsTransformableInFirstVar: boolean = isTransformable(isolatedVariables[0]) || isolatedVariables[0] === IsolatedIn.Second;
    const firstEqIsTransformableInSecondVar: boolean = isTransformable(isolatedVariables[0]) || isolatedVariables[0] === IsolatedIn.First;
    const secondEqIsTransformableInFirstVar: boolean = isTransformable(isolatedVariables[1]) || isolatedVariables[1] === IsolatedIn.Second;
    const secondEqIsTransformableInSecondVar: boolean = isTransformable(isolatedVariables[1]) || isolatedVariables[1] === IsolatedIn.First;

    const firstOptions: ReactElement = (
        <div className={"system-transformation__options"}>
            {firstEqIsTransformableInFirstVar && (
                <button
                    className={"button transparent-button"}
                    onClick={() => {
                        trackAction("transform FIRST eq in FIRST var");
                        incrementStepCount();
                        if(transformationStepCount > 3){
                            getHint();
                        }
                        const transformedEquation: FlexibilityEquation = computeTransformedEquation(firstEquation, firstVariable);
                        setTransformedSystem([transformedEquation, secondEquation]);
                        setIsolatedVariables([IsolatedIn.First, isolatedVariables[1]]);
                        setTransformationInfo([IsolatedIn.First, transformationInfo[1]]);
                    }}
                >
                    {t(FlexibilityTranslations.BUTTON_SOLVE_X)}
                </button>
            )}
            {firstEqIsTransformableInSecondVar && (
                <button
                    className={"button transparent-button"}
                    onClick={() => {
                        trackAction("transform FIRST eq in SECOND var");
                        incrementStepCount();
                        if(transformationStepCount > 3){
                            getHint();
                        }
                        const transformedEquation: FlexibilityEquation = computeTransformedEquation(firstEquation, secondVariable);
                        setTransformedSystem([transformedEquation, secondEquation]);
                        setIsolatedVariables([IsolatedIn.Second, isolatedVariables[1]]);
                        setTransformationInfo([IsolatedIn.Second, transformationInfo[1]]);
                    }}
                >
                    {t(FlexibilityTranslations.BUTTON_SOLVE_Y)}
                </button>
            )}
        </div>
    );

    const secondOptions: ReactElement = (
        <div className={"system-transformation__options"}>
            {secondEqIsTransformableInFirstVar && (
                <button
                    className={"button transparent-button"}
                    onClick={() => {
                        trackAction("transform SECOND eq in FIRST var");
                        incrementStepCount();
                        if(transformationStepCount > 3){
                            getHint();
                        }
                        const transformedEquation: FlexibilityEquation = computeTransformedEquation(secondEquation, firstVariable);
                        setTransformedSystem([firstEquation, transformedEquation]);
                        setIsolatedVariables([isolatedVariables[0], IsolatedIn.First]);
                        setTransformationInfo([transformationInfo[0], IsolatedIn.First]);
                    }}
                >
                    {t(FlexibilityTranslations.BUTTON_SOLVE_X)}
                </button>
            )}
            {secondEqIsTransformableInSecondVar && (
                <button
                    className={"button transparent-button"}
                    onClick={() => {
                        trackAction("transform SECOND eq in SECOND var");
                        incrementStepCount();
                        if(transformationStepCount > 3){
                            getHint();
                        }
                        const transformedEquation: FlexibilityEquation = computeTransformedEquation(secondEquation, secondVariable);
                        setTransformedSystem([firstEquation, transformedEquation]);
                        setIsolatedVariables([isolatedVariables[0], IsolatedIn.Second]);
                        setTransformationInfo([transformationInfo[0], IsolatedIn.Second]);
                    }}
                >
                    {t(FlexibilityTranslations.BUTTON_SOLVE_Y)}
                </button>
            )}
        </div>
    );

    return (
        <div className={"system-transformation__transformable-system"}>
            {isTransformed && <img src={EquivalenceSymbol} alt={"equivalent"} />}
            <LinearSystemWithActions firstEquation={firstEquation} secondEquation={secondEquation} firstAction={firstOptions} secondAction={secondOptions} />
        </div>
    );
}

function isTransformable(isolatedIn: IsolatedIn): boolean {
    return isolatedIn === IsolatedIn.None || isolatedIn === IsolatedIn.FirstMultiple || isolatedIn === IsolatedIn.SecondMultiple;
}

function computeTransformedEquation(equation: FlexibilityEquation, variable: Variable): FlexibilityEquation {
    const indexIsolatedLeft: number = equation.leftTerms.findIndex((term: FlexibilityTerm) => term.variable !== null && term.variable === variable.name);

    if (indexIsolatedLeft >= 0) {
        if (equation.leftTerms.length === 1) {
            return divideEquationByFactor(equation.leftTerms[0], equation.rightTerms);
        } else {
            return transformEquation(indexIsolatedLeft, equation.leftTerms, equation.rightTerms, variable);
        }
    } else {
        if (equation.rightTerms.length === 1) {
            return divideEquationByFactor(equation.rightTerms[0], equation.leftTerms);
        } else {
            const indexIsolatedRight: number = equation.rightTerms.findIndex((term: FlexibilityTerm) => term.variable !== null && term.variable === variable.name);
            return transformEquation(indexIsolatedRight, equation.rightTerms, equation.leftTerms, variable);
        }
    }
}

function divideEquationByFactor(isolatedTerm: FlexibilityTerm, otherTerms: FlexibilityTerm[]): FlexibilityEquation {
    const terms: FlexibilityTerm[] = [];
    divideTermsByFactor(otherTerms, terms, isolatedTerm.coefficient);
    return new FlexibilityEquation([new FlexibilityTerm(math.fraction(1), isolatedTerm.variable)], terms);
}

function divideTermsByFactor(oldTerms: FlexibilityTerm[], newTerms: FlexibilityTerm[], multiplicationFactor: Fraction): void {
    oldTerms.forEach((term: FlexibilityTerm): void => {
        const coefficient: Fraction = math.divide(term.coefficient, multiplicationFactor) as Fraction;
        newTerms.push(new FlexibilityTerm(coefficient, term.variable));
    });
}

function transformEquation(isolatedTermIndex: number, termsWithVariable: FlexibilityTerm[], otherTerms: FlexibilityTerm[], variable: Variable): FlexibilityEquation {
    const multiplicationFactor: Fraction = termsWithVariable[isolatedTermIndex].coefficient;

    const terms: FlexibilityTerm[] = [];
    divideTermsByFactor(otherTerms, terms, multiplicationFactor);

    termsWithVariable.forEach((term: FlexibilityTerm, index: number): void => {
        if (index !== isolatedTermIndex) {
            const coefficient: Fraction = math.divide(term.coefficient, multiplicationFactor) as Fraction;
            terms.push(new FlexibilityTerm(math.unaryMinus(coefficient), term.variable));
        }
    });

    return new FlexibilityEquation([new FlexibilityTerm(math.fraction(1), variable.name)], terms);
}
