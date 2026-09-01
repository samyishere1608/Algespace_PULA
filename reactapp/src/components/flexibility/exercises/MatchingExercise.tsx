import { AgentCondition, AgentType, IsolatedIn, MatchingExerciseState, Method, SelectedEquation } from "@/types/flexibility/enums.ts";
import { Fragment, ReactElement, useMemo, useState } from "react";
import { PippinChat } from "@components/flexibility/PippinChat.tsx";
import { equationToString } from "@utils/equationUtils.ts";
import { MatchingExercise as MatchingExerciseProps } from "@/types/flexibility/matchingExercise.ts";
import { getRandomAgent, setPKExerciseCompleted, setFlexibilityStudyExerciseCompleted, logFlexibilityMethodChoice } from "@utils/storageUtils.ts";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { GameError, GameErrorType } from "@/types/shared/error.ts";
import useFlexibilityTracker from "@hooks/useFlexibilityTracker.ts";
import { IUser } from "@/types/studies/user.ts";
import { FlexibilityExerciseActionPhase, FlexibilityExerciseChoicePhase, FlexibilityExercisePhase, FlexibilityStudyExerciseType } from "@/types/studies/enums.ts";
import { SystemTransformation } from "@components/flexibility/system/SystemTransformation.tsx";
import { FlexibilityEquation as FlexibilityEquationProps, FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { EqualizationMethod } from "@components/flexibility/equalization/EqualizationMethod.tsx";
import { SubstitutionMethod } from "@components/flexibility/substitution/SubstitutionMethod.tsx";
import { SubstitutionParameters } from "@/types/flexibility/substitutionParameters.ts";
import { EliminationMethod } from "@components/flexibility/elimination/EliminationMethod.tsx";
import { EliminationParameters } from "@/types/flexibility/eliminationParameters.ts";
import { FirstSolution } from "@components/flexibility/solution/FirstSolution.tsx";
import { EquationSelection } from "@components/flexibility/solution/EquationSelection.tsx";
import { determineSecondEquation } from "@utils/utils.ts";
import { SecondSolution } from "@components/flexibility/solution/SecondSolution.tsx";
import { EfficiencyExerciseEnd } from "@components/flexibility/solution/EfficiencyExerciseEnd.tsx";
import { SystemSelection } from "@components/flexibility/choice/SystemSelection.tsx";
import { SelfExplanationForSystemMatching } from "@components/flexibility/choice/SelfExplanationExercise.tsx";

export function MatchingExercise({ flexibilityExerciseId, exercise, condition, handleEnd, isStudy = false, studyId }: {
    flexibilityExerciseId: number,
    exercise: MatchingExerciseProps;
    condition: AgentCondition;
    handleEnd: () => void;
    isStudy?: boolean;
    studyId?: number;
}): ReactElement {
    const agentType: AgentType | undefined = useMemo(() => {
        if (condition !== AgentCondition.None) {
            return getRandomAgent(isStudy ? sessionStorage : localStorage);
        }
        return undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const { user } = useAuth();
    if (isStudy) {
        if (user === undefined) {
            throw new GameError(GameErrorType.AUTH_ERROR);
        }
        if (studyId === undefined) {
            throw new GameError(GameErrorType.STUDY_ID_ERROR);
        }
    }

    const {
        trackActionInPhase,
        trackChoice,
        trackType,
        trackErrorInPhase,
        trackHintsInPhase,
        setNextTrackingPhase,
        endTrackingPhase,
        endTracking,
        decideCalculationIntervention,
        decideExplainIntervention

    } = useFlexibilityTracker(isStudy, user as IUser, studyId as number, flexibilityExerciseId, exercise.id, FlexibilityStudyExerciseType.Matching, performance.now(), condition, agentType, FlexibilityExercisePhase.SystemSelection);

    const randomOrder = useMemo(() => {
        return getRandomOrder(exercise.alternativeSystems.length + 1);
    }, [exercise.alternativeSystems.length]);

    const [exerciseState, setExerciseState] = useState<MatchingExerciseState>(MatchingExerciseState.SystemSelection);
    const [transformedSystem, setTransformedSystem] = useState<[FlexibilityEquation, FlexibilityEquation]>();
    const [isolatedVariables, setIsolatedVariables] = useState<[IsolatedIn, IsolatedIn]>([exercise.firstEquationIsIsolatedIn, exercise.secondEquationIsIsolatedIn]);
    const [methodApplicationResult, setMethodApplicationResult] = useState<[FlexibilityEquation, boolean]>();
    const [substitutionInfo, setSubstitutionInfo] = useState<SubstitutionParameters | undefined>();
    const [selectedEquation, setSelectedEquation] = useState<[FlexibilityEquation, SelectedEquation] | undefined>();

    let content: ReactElement;
    switch (exerciseState) {
        case MatchingExerciseState.SystemSelection: {
            content = (
                <SystemSelection
                    firstEquation={exercise.firstEquation}
                    secondEquation={exercise.secondEquation}
                    method={exercise.method}
                    alternativeSystems={exercise.alternativeSystems}
                    randomOrder={randomOrder}
                    loadNextStep={handleSelection}
                    question={exercise.question}
                    agentType={agentType}
                    additionalMessage={(condition === AgentCondition.Agent || condition == AgentCondition.None) ? undefined : exercise.agentMessageForSelfExplanation}
                    trackAction={(action: string) => trackActionInPhase(action, FlexibilityExerciseActionPhase.SystemMatchingActions)}
                    trackError={trackErrorInPhase}
                    trackHints={trackHintsInPhase}
                    trackChoice={(choice: string) => trackChoice(choice, FlexibilityExerciseChoicePhase.SelfExplanationChoice)}
                    trackChoiceIntervention={(choice: string) => trackChoice(choice, FlexibilityExerciseChoicePhase.SelfExplanationInterventionChoice)}
                    trackType={(type: number) => trackType(type, FlexibilityExerciseChoicePhase.StudentTypeSelfExplanation)}
                    condition={condition}
                    decidePersonalIntervention={decideExplainIntervention}

                />
            );
            break;
        }

        case MatchingExerciseState.SelfExplanation: {
            content = <SelfExplanationForSystemMatching
                method={exercise.method}
                firstEquation={exercise.firstEquation}
                secondEquation={exercise.secondEquation}
                alternativeSystems={exercise.alternativeSystems}
                selfExplanation={exercise.selfExplanationTask}
                loadNextStep={() => {
                    setNextTrackingPhase(FlexibilityExercisePhase.Transformation);
                    setExerciseState(MatchingExerciseState.SystemTransformation);
                }}
                agentType={agentType}
                trackAction={(action: string) => trackActionInPhase(action, FlexibilityExerciseActionPhase.SelfExplanationActions)}
                trackError={trackErrorInPhase}
                trackHints={trackHintsInPhase}
            />;
            break;
        }

        case MatchingExerciseState.SystemTransformation: {
            content = (
                <SystemTransformation
                    firstEquation={exercise.firstEquation}
                    secondEquation={exercise.secondEquation}
                    firstVariable={exercise.firstVariable}
                    secondVariable={exercise.secondVariable}
                    method={exercise.method}
                    initialIsolatedVariables={isolatedVariables}
                    agentType={agentType}
                    loadNextStep={(transformedSystem?: [FlexibilityEquation, FlexibilityEquation], isolatedVariables?: [IsolatedIn, IsolatedIn]): void => {
                        setTransformedSystem(transformedSystem);
                        setExerciseState(() => assignStateByMethod(exercise.method, setNextTrackingPhase));
                        if (isolatedVariables !== undefined) {
                            setIsolatedVariables(isolatedVariables);
                        }
                    }}
                    trackAction={(action: string) => trackActionInPhase(action, FlexibilityExerciseActionPhase.TransformationActions)}
                    trackError={trackErrorInPhase}
                    trackHints={trackHintsInPhase}
                />
            );
            break;
        }

        case MatchingExerciseState.EqualizationMethod: {
            content = (
                <EqualizationMethod
                    initialSystem={[exercise.firstEquation, exercise.secondEquation]}
                    transformedSystem={transformedSystem}
                    agentType={agentType}
                    loadNextStep={(equation: FlexibilityEquation): void => {
                        setNextTrackingPhase(FlexibilityExercisePhase.FirstSolution);
                        // For equalization: both equations isolate the same variable.
                        // If they isolate y → resulting equation has x (first var) → containsFirst = true
                        // If they isolate x → resulting equation has y (second var) → containsFirst = false
                        const firstIsolatesY = isolatedVariables[0] === IsolatedIn.Second || isolatedVariables[0] === IsolatedIn.SecondMultiple;
                        setMethodApplicationResult([equation, firstIsolatesY]);
                        setExerciseState(MatchingExerciseState.FirstSolution);
                    }}
                    trackAction={(action: string) => trackActionInPhase(action, FlexibilityExerciseActionPhase.EqualizationActions)}
                    trackError={trackErrorInPhase}
                    trackHints={trackHintsInPhase}
                />
            );
            break;
        }

        case MatchingExerciseState.SubstitutionMethod: {
            content = (
                <SubstitutionMethod
                    initialSystem={[exercise.firstEquation, exercise.secondEquation]}
                    transformedSystem={transformedSystem}
                    firstVariable={exercise.firstVariable}
                    secondVariable={exercise.secondVariable}
                    isolatedVariables={isolatedVariables}
                    agentType={agentType}
                    loadNextStep={(equation: FlexibilityEquation, containsFirst: boolean, params?: SubstitutionParameters): void => {
                        setNextTrackingPhase(FlexibilityExercisePhase.FirstSolution);
                        setMethodApplicationResult([equation, containsFirst]);
                        setExerciseState(MatchingExerciseState.FirstSolution);
                        setSubstitutionInfo(params);
                    }}
                    trackAction={(action: string) => trackActionInPhase(action, FlexibilityExerciseActionPhase.SubstitutionActions)}
                    trackError={trackErrorInPhase}
                    trackHints={trackHintsInPhase}
                />
            );
            break;
        }

        case MatchingExerciseState.EliminationMethod: {
            content = (
                <EliminationMethod
                    initialSystem={[exercise.firstEquation, exercise.secondEquation]}
                    transformedSystem={transformedSystem}
                    firstVariable={exercise.firstVariable}
                    secondVariable={exercise.secondVariable}
                    agentType={agentType}
                    loadNextStep={(equation: FlexibilityEquation, containsFirst: boolean, _?: EliminationParameters, firstMultipliedEquation?: FlexibilityEquationProps, secondMultipliedEquation?: FlexibilityEquationProps): void => {
                        setNextTrackingPhase(FlexibilityExercisePhase.FirstSolution);
                        setMethodApplicationResult([equation, containsFirst]);
                        if (firstMultipliedEquation !== undefined) {
                            if (secondMultipliedEquation !== undefined) {
                                setTransformedSystem([firstMultipliedEquation, secondMultipliedEquation]);
                            } else {
                                const secondTransformedEquation = transformedSystem !== undefined ? transformedSystem[1] : exercise.secondEquation;
                                setTransformedSystem([firstMultipliedEquation, secondTransformedEquation]);
                            }
                        } else if (secondMultipliedEquation !== undefined) {
                            const firstTransformedEquation = transformedSystem !== undefined ? transformedSystem[0] : exercise.firstEquation;
                            setTransformedSystem([firstTransformedEquation, secondMultipliedEquation]);
                        }
                        setExerciseState(MatchingExerciseState.FirstSolution);
                    }}
                    trackAction={(action: string) => trackActionInPhase(action, FlexibilityExerciseActionPhase.EliminationActions)}
                    trackError={trackErrorInPhase}
                    trackHints={trackHintsInPhase}
                    loadPreviousStep={()=> handleSelection(true)}
                />
            );
            break;
        }

        case MatchingExerciseState.FirstSolution: {
            if (methodApplicationResult === undefined) {
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }
            content = (
                <FirstSolution
                    method={exercise.method}
                    initialSystem={[exercise.firstEquation, exercise.secondEquation]}
                    transformedSystem={transformedSystem}
                    methodEquation={methodApplicationResult[0]}
                    variable={methodApplicationResult[1] ? exercise.firstVariable : exercise.secondVariable}
                    agentType={agentType}
                    additionalMessage={(condition === AgentCondition.Agent || condition == AgentCondition.None) ? undefined: exercise.agentMessageForFirstSolution}
                    loadNextStep={() => {
                        endTrackingPhase();
                        setExerciseState(MatchingExerciseState.EquationSelection);
                    }}
                    trackAction={(action: string) => trackActionInPhase(action, FlexibilityExerciseActionPhase.FirstSolutionActions)}
                    trackError={trackErrorInPhase}
                    trackChoice={(choice: string) => trackChoice(choice, FlexibilityExerciseChoicePhase.FirstSolutionChoice)}
                    trackInterventionChoice={(choice: string) => trackChoice(choice, FlexibilityExerciseChoicePhase.FirstSolutionInterventionChoice)}
                    trackType={(type: number) => trackType(type, FlexibilityExerciseChoicePhase.StudentTypeFirstSolution)}
                    condition={condition}
                    decideCalculationIntervention = {decideCalculationIntervention}
                />
            );
            break;
        }

        case MatchingExerciseState.EquationSelection: {
            if (methodApplicationResult === undefined) {
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }
            content = (
                <EquationSelection
                    method={exercise.method}
                    initialSystem={[exercise.firstEquation, exercise.secondEquation]}
                    transformedSystem={transformedSystem}
                    methodEquation={methodApplicationResult[0]}
                    firstSolutionVar={methodApplicationResult[1] ? exercise.firstVariable : exercise.secondVariable}
                    otherVariable={methodApplicationResult[1] ? exercise.secondVariable : exercise.firstVariable}
                    substitutionInfo={substitutionInfo}
                    loadNextStep={(selectedEquation: SelectedEquation): void => {
                        trackActionInPhase(`${SelectedEquation[selectedEquation]}`, FlexibilityExerciseActionPhase.EquationSelection);
                        setNextTrackingPhase(FlexibilityExercisePhase.SecondSolution);
                        setExerciseState(MatchingExerciseState.SecondSolution);
                        determineSecondEquation(selectedEquation, setSelectedEquation, exercise, transformedSystem);
                    }}
                />
            );
            break;
        }

        case MatchingExerciseState.SecondSolution: {
            if (methodApplicationResult === undefined || selectedEquation === undefined) {
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }
            content = (
                <SecondSolution
                    method={exercise.method}
                    initialSystem={[exercise.firstEquation, exercise.secondEquation]}
                    transformedSystem={transformedSystem}
                    methodEquation={methodApplicationResult[0]}
                    selectedEquation={selectedEquation[0]}
                    firstSolutionVariable={methodApplicationResult[1] ? exercise.firstVariable : exercise.secondVariable}
                    otherVariable={methodApplicationResult[1] ? exercise.secondVariable : exercise.firstVariable}
                    substitutionInfo={substitutionInfo}
                    agentType={agentType}
                    additionalMessage={(condition === AgentCondition.Agent || condition == AgentCondition.None) ? undefined : exercise.agentMessageForSecondSolution }
                    loadNextStep={() => {
                        endTrackingPhase();
                        setExerciseState(MatchingExerciseState.SystemSolution);
                    }}
                    trackAction={(action: string) => trackActionInPhase(action, FlexibilityExerciseActionPhase.SecondSolutionActions)}
                    trackError={trackErrorInPhase}
                    trackChoice={(choice: string) => trackChoice(choice, FlexibilityExerciseChoicePhase.SecondSolutionChoice)}
                    trackInterventionChoice={(choice: string) => trackChoice(choice, FlexibilityExerciseChoicePhase.SecondSolutionInterventionChoice)}
                    trackType={(type: number) => trackType(type, FlexibilityExerciseChoicePhase.StudentTypeSecondSolution)}
                    condition={condition}
                    decideCalculationIntervention = {decideCalculationIntervention}
                />
            );
            break;
        }

        case MatchingExerciseState.SystemSolution: {
            if (methodApplicationResult === undefined || selectedEquation === undefined) {
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }
            content = (
                <EfficiencyExerciseEnd
                    method={exercise.method}
                    initialSystem={[exercise.firstEquation, exercise.secondEquation]}
                    transformedSystem={transformedSystem}
                    methodEquation={methodApplicationResult[0]}
                    selectedEquation={selectedEquation[0]}
                    firstSolutionVar={methodApplicationResult[1] ? exercise.firstVariable : exercise.secondVariable}
                    firstSolutionIsFirstVariable={methodApplicationResult[1]}
                    otherVariable={methodApplicationResult[1] ? exercise.secondVariable : exercise.firstVariable}
                    agentType={agentType}
                    loadNextStep={() => {
                        endTracking();
                        handleExerciseEnd();
                    }}
                    substitutionInfo={substitutionInfo}
                />
            );
            break;
        }
    }

    // Build context string for Pippin AI
    const pippinContext = [
        `Exercise type: Matching`,
        `Current step: ${MatchingExerciseState[exerciseState]}`,
        `Equation 1: ${equationToString(exercise.firstEquation)}`,
        `Equation 2: ${equationToString(exercise.secondEquation)}`,
        `Variables: ${exercise.firstVariable.name} and ${exercise.secondVariable.name}`,
    ].filter(Boolean).join("\n");

    return (
        <Fragment>
            {content}
            <PippinChat exerciseContext={pippinContext} />
        </Fragment>
    );

    function handleSelection(selfExplain: boolean): void {
        if (selfExplain) {
            setNextTrackingPhase(FlexibilityExercisePhase.SelfExplanation);
            setExerciseState(MatchingExerciseState.SelfExplanation);
        } else {
            setNextTrackingPhase(FlexibilityExercisePhase.Transformation);
            setExerciseState(MatchingExerciseState.SystemTransformation);
        }
    }


    function handleExerciseEnd(): void {
        if (isStudy) {
            setFlexibilityStudyExerciseCompleted(studyId as number, flexibilityExerciseId);
        } else {
            setPKExerciseCompleted(flexibilityExerciseId, "flexibility-training");
            logFlexibilityMethodChoice(exercise.method, flexibilityExerciseId);
        }
        handleEnd();
    }
}

function getRandomOrder(length: number): number[] {
    const array = Array.from({ length: length }, (_, i) => i);
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];  // Swap elements
    }
    return array;
}

function assignStateByMethod(method: Method, setNextTrackingPhase: (newPhase: FlexibilityExercisePhase) => void): MatchingExerciseState {
    switch (method) {
        case Method.Equalization:
            setNextTrackingPhase(FlexibilityExercisePhase.Equalization);
            return MatchingExerciseState.EqualizationMethod;

        case Method.Substitution:
            setNextTrackingPhase(FlexibilityExercisePhase.Substitution);
            return MatchingExerciseState.SubstitutionMethod;

        case Method.Elimination:
            setNextTrackingPhase(FlexibilityExercisePhase.Elimination);
            return MatchingExerciseState.EliminationMethod;
    }
}
