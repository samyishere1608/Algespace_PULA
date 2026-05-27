import {Fragment, ReactElement, useMemo, useState} from "react";
import {PippinChat} from "@components/flexibility/PippinChat.tsx";
import {equationToString} from "@utils/equationUtils.ts";
import {EfficiencyExercise as EfficiencyExerciseProps} from "@/types/flexibility/efficiencyExercise.ts";
import {
    AgentCondition,
    AgentType,
    EfficiencyExerciseState,
    IsolatedIn,
    Method,
    SelectedEquation
} from "@/types/flexibility/enums.ts";
import {SelfExplanation} from "@/types/flexibility/selfExplanation.ts";
import {SubstitutionParameters} from "@/types/flexibility/substitutionParameters.ts";
import {FlexibilityEquation as FlexibilityEquationProps, FlexibilityEquation} from "@/types/math/linearEquation.ts";
import {GameError, GameErrorType} from "@/types/shared/error.ts";
import {EfficientMethodSelection} from "@components/flexibility/choice/EfficientMethodSelection.tsx";
import {SelfExplanationExercise} from "@components/flexibility/choice/SelfExplanationExercise.tsx";
import {EliminationMethod} from "@components/flexibility/elimination/EliminationMethod.tsx";
import {EqualizationMethod} from "@components/flexibility/equalization/EqualizationMethod.tsx";
import {EfficiencyExerciseEnd} from "@components/flexibility/solution/EfficiencyExerciseEnd.tsx";
import {EquationSelection} from "@components/flexibility/solution/EquationSelection.tsx";
import {FirstSolution} from "@components/flexibility/solution/FirstSolution.tsx";
import {SecondSolution} from "@components/flexibility/solution/SecondSolution.tsx";
import {SubstitutionMethod} from "@components/flexibility/substitution/SubstitutionMethod.tsx";
import {SystemTransformation} from "@components/flexibility/system/SystemTransformation.tsx";
import {determineSecondEquation} from "@utils/utils.ts";
import "@styles/flexibility/flexibility.scss";
import {useAuth} from "@/contexts/AuthProvider.tsx";
import useFlexibilityTracker from "@hooks/useFlexibilityTracker.ts";
import {IUser} from "@/types/studies/user.ts";
import {
    FlexibilityExerciseActionPhase,
    FlexibilityExerciseChoicePhase,
    FlexibilityExercisePhase,
    FlexibilityStudyExerciseType
} from "@/types/studies/enums.ts";
import {EliminationParameters} from "@/types/flexibility/eliminationParameters.ts";
import {getRandomAgent, setFlexibilityStudyExerciseCompleted, setPKExerciseCompleted} from "@utils/storageUtils.ts";

export function EfficiencyExercise({ flexibilityExerciseId, exercise, condition, handleEnd, isStudy = false, studyId }: {
    flexibilityExerciseId: number,
    exercise: EfficiencyExerciseProps;
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
        decideExplainIntervention,
    } = useFlexibilityTracker(isStudy, user as IUser, studyId as number, flexibilityExerciseId, exercise.id, FlexibilityStudyExerciseType.Efficiency, performance.now(), condition, agentType, FlexibilityExercisePhase.EfficiencySelection);

    const [exerciseState, setExerciseState] = useState<EfficiencyExerciseState>(EfficiencyExerciseState.MethodSelection);
    const [selectedMethod, setSelectedMethod] = useState<Method>();
    const [transformedSystem, setTransformedSystem] = useState<[FlexibilityEquation, FlexibilityEquation]>();
    const [isolatedVariables, setIsolatedVariables] = useState<[IsolatedIn, IsolatedIn]>([exercise.firstEquationIsIsolatedIn, exercise.secondEquationIsIsolatedIn]);
    const [methodApplicationResult, setMethodApplicationResult] = useState<[FlexibilityEquation, boolean]>();
    const [substitutionInfo, setSubstitutionInfo] = useState<SubstitutionParameters | undefined>();
    const [selectedEquation, setSelectedEquation] = useState<[FlexibilityEquation, SelectedEquation] | undefined>();

    let content: ReactElement;
    switch (exerciseState) {
        case EfficiencyExerciseState.MethodSelection: {
            content = (
                <EfficientMethodSelection
                    firstEquation={exercise.firstEquation}
                    secondEquation={exercise.secondEquation}
                    efficientMethods={exercise.efficientMethods}
                    transformationRequired={exercise.transformationRequired}
                    loadNextStep={handleSelection}
                    question={exercise.question}
                    agentType={agentType}
                    additionalMessage={(condition === AgentCondition.Agent || condition == AgentCondition.None) ? undefined : exercise.agentMessageForSelfExplanation}
                    trackAction={(action: string) => trackActionInPhase(action, FlexibilityExerciseActionPhase.EfficiencySelectionActions)}
                    trackError={trackErrorInPhase}
                    trackHints={trackHintsInPhase}
                    trackChoice={(choice: string) => trackChoice(choice, FlexibilityExerciseChoicePhase.SelfExplanationChoice)}
                    trackType={(type:number) => trackType(type, FlexibilityExerciseChoicePhase.StudentTypeSelfExplanation)}
                    trackChoiceIntervention={(choice: string) => trackChoice(choice, FlexibilityExerciseChoicePhase.SelfExplanationInterventionChoice)}
                    condition={condition}
                    decidePersonalIntervention={decideExplainIntervention}
                />
            );
            break;
        }

        case EfficiencyExerciseState.SelfExplanation: {
            const selfExplanation = exercise.selfExplanationTasks.find((task: SelfExplanation) => task.method === selectedMethod);
            if (selectedMethod === undefined || selfExplanation === undefined) {
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }
            content = <SelfExplanationExercise method={selectedMethod}
                                               firstEquation={exercise.firstEquation}
                                               secondEquation={exercise.secondEquation}
                                               transformationsRequired={exercise.transformationRequired}
                                               selfExplanation={selfExplanation}
                                               loadNextStep={continueAfterSelfExplanation}
                                               agentType={agentType}
                                               trackAction={(action: string) => trackActionInPhase(action, FlexibilityExerciseActionPhase.SelfExplanationActions)}
                                               trackError={trackErrorInPhase}
                                               trackHints={trackHintsInPhase}
            />;
            break;
        }

        case EfficiencyExerciseState.SystemTransformation: {
            if (selectedMethod === undefined) {
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }
            content = (
                <SystemTransformation
                    firstEquation={exercise.firstEquation}
                    secondEquation={exercise.secondEquation}
                    firstVariable={exercise.firstVariable}
                    secondVariable={exercise.secondVariable}
                    method={selectedMethod}
                    initialIsolatedVariables={isolatedVariables}
                    agentType={agentType}
                    loadNextStep={(transformedSystem?: [FlexibilityEquation, FlexibilityEquation], isolatedVariables?: [IsolatedIn, IsolatedIn]): void => {
                        setTransformedSystem(transformedSystem);
                        setExerciseState(() => assignStateByMethod(selectedMethod, setNextTrackingPhase));
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

        case EfficiencyExerciseState.EqualizationMethod: {
            content = (
                <EqualizationMethod
                    initialSystem={[exercise.firstEquation, exercise.secondEquation]}
                    transformedSystem={transformedSystem}
                    agentType={agentType}
                    loadNextStep={(equation: FlexibilityEquation): void => {
                        setNextTrackingPhase(FlexibilityExercisePhase.FirstSolution);
                        const containsFirstVariable: boolean = isolatedVariables[0] !== IsolatedIn.First && isolatedVariables[0] !== IsolatedIn.SecondMultiple;
                        setMethodApplicationResult([equation, containsFirstVariable]);
                        setExerciseState(EfficiencyExerciseState.FirstSolution);
                    }}
                    trackAction={(action: string) => trackActionInPhase(action, FlexibilityExerciseActionPhase.EqualizationActions)}
                    trackError={trackErrorInPhase}
                    trackHints={trackHintsInPhase}
                />
            );
            break;
        }

        case EfficiencyExerciseState.SubstitutionMethod: {
            content = (
                <SubstitutionMethod
                    isTip={exercise.useWithTip}
                    initialSystem={[exercise.firstEquation, exercise.secondEquation]}
                    transformedSystem={transformedSystem}
                    firstVariable={exercise.firstVariable}
                    secondVariable={exercise.secondVariable}
                    isolatedVariables={isolatedVariables}
                    agentType={agentType}
                    loadNextStep={(equation: FlexibilityEquation, containsFirst: boolean, params?: SubstitutionParameters): void => {
                        setNextTrackingPhase(FlexibilityExercisePhase.FirstSolution);
                        setMethodApplicationResult([equation, containsFirst]);
                        setExerciseState(EfficiencyExerciseState.FirstSolution);
                        setSubstitutionInfo(params);
                    }}
                    trackAction={(action: string) => trackActionInPhase(action, FlexibilityExerciseActionPhase.SubstitutionActions)}
                    trackError={trackErrorInPhase}
                    trackHints={trackHintsInPhase}
                />
            );
            break;
        }

        case EfficiencyExerciseState.EliminationMethod: {
            content = (
                <EliminationMethod
                    initialSystem={[exercise.firstEquation, exercise.secondEquation]}
                    transformedSystem={transformedSystem}
                    firstVariable={exercise.firstVariable}
                    secondVariable={exercise.secondVariable}
                    agentType={agentType}
                    loadPreviousStep={() => handleSelection(Method.Elimination, true)}
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
                        setExerciseState(EfficiencyExerciseState.FirstSolution);
                    }}
                    trackAction={(action: string) => trackActionInPhase(action, FlexibilityExerciseActionPhase.EliminationActions)}
                    trackError={trackErrorInPhase}
                    trackHints={trackHintsInPhase}
                />
            );
            break;
        }

        case EfficiencyExerciseState.FirstSolution: {
            if (selectedMethod === undefined || methodApplicationResult === undefined) {
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }
            content = (
                <FirstSolution
                    method={selectedMethod}
                    initialSystem={[exercise.firstEquation, exercise.secondEquation]}
                    transformedSystem={transformedSystem}
                    methodEquation={methodApplicationResult[0]}
                    variable={methodApplicationResult[1] ? exercise.firstVariable : exercise.secondVariable}
                    agentType={agentType}
                    additionalMessage={(condition === AgentCondition.Agent || condition == AgentCondition.None) ? undefined: exercise.agentMessageForFirstSolution}
                    loadNextStep={() => {
                        endTrackingPhase();
                        setExerciseState(EfficiencyExerciseState.EquationSelection);
                    }}
                    trackAction={(action: string) => trackActionInPhase(action, FlexibilityExerciseActionPhase.FirstSolutionActions)}
                    trackError={trackErrorInPhase}
                    trackChoice={(choice: string) => trackChoice(choice, FlexibilityExerciseChoicePhase.FirstSolutionChoice)}
                    trackInterventionChoice={(choice: string) => trackChoice(choice, FlexibilityExerciseChoicePhase.FirstSolutionInterventionChoice)}
                    trackType={(type:number) => trackType(type, FlexibilityExerciseChoicePhase.StudentTypeFirstSolution)}
                    condition={condition}
                    decideCalculationIntervention = {decideCalculationIntervention}
                />
            );
            break;
        }

        case EfficiencyExerciseState.EquationSelection: {
            if (selectedMethod === undefined || methodApplicationResult === undefined) {
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }
            content = (
                <EquationSelection
                    method={selectedMethod}
                    initialSystem={[exercise.firstEquation, exercise.secondEquation]}
                    transformedSystem={transformedSystem}
                    methodEquation={methodApplicationResult[0]}
                    firstSolutionVar={methodApplicationResult[1] ? exercise.firstVariable : exercise.secondVariable}
                    otherVariable={methodApplicationResult[1] ? exercise.secondVariable : exercise.firstVariable}
                    substitutionInfo={substitutionInfo}
                    loadNextStep={(selectedEquation: SelectedEquation): void => {
                        trackActionInPhase(`${SelectedEquation[selectedEquation]}`, FlexibilityExerciseActionPhase.EquationSelection);
                        setNextTrackingPhase(FlexibilityExercisePhase.SecondSolution);
                        setExerciseState(EfficiencyExerciseState.SecondSolution);
                        determineSecondEquation(selectedEquation, setSelectedEquation, exercise, transformedSystem);
                    }}
                />
            );
            break;
        }

        case EfficiencyExerciseState.SecondSolution: {
            if (selectedMethod === undefined || methodApplicationResult === undefined || selectedEquation === undefined) {
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }
            content = (
                <SecondSolution
                    method={selectedMethod}
                    initialSystem={[exercise.firstEquation, exercise.secondEquation]}
                    transformedSystem={transformedSystem}
                    methodEquation={methodApplicationResult[0]}
                    selectedEquation={selectedEquation[0]}
                    firstSolutionVariable={methodApplicationResult[1] ? exercise.firstVariable : exercise.secondVariable}
                    otherVariable={methodApplicationResult[1] ? exercise.secondVariable : exercise.firstVariable}
                    substitutionInfo={substitutionInfo}
                    agentType={agentType}
                    additionalMessage={(condition === AgentCondition.Agent || condition == AgentCondition.None) ? undefined : exercise.agentMessageForSecondSolution}
                    loadNextStep={() => {
                        endTrackingPhase();
                        setExerciseState(EfficiencyExerciseState.SystemSolution);
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

        case EfficiencyExerciseState.SystemSolution: {
            if (selectedMethod === undefined || methodApplicationResult === undefined || selectedEquation === undefined) {
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }
            content = (
                <EfficiencyExerciseEnd
                    method={selectedMethod}
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
        `Exercise type: Efficiency`,
        `Current step: ${EfficiencyExerciseState[exerciseState]}`,
        `Equation 1: ${equationToString(exercise.firstEquation)}`,
        `Equation 2: ${equationToString(exercise.secondEquation)}`,
        `Variables: ${exercise.firstVariable.name} and ${exercise.secondVariable.name}`,
        selectedMethod ? `Selected method: ${Method[selectedMethod]}` : null,
    ].filter(Boolean).join("\n");

    return (
        <Fragment>
            {content}
            <PippinChat exerciseContext={pippinContext} />
        </Fragment>
    );

    function handleSelection(method: Method, selfExplain: boolean): void {
        setSelectedMethod(method);
        if (selfExplain) {
            setNextTrackingPhase(FlexibilityExercisePhase.SelfExplanation);
            setExerciseState(EfficiencyExerciseState.SelfExplanation);
        } else if (exercise.transformationRequired) {
            setNextTrackingPhase(FlexibilityExercisePhase.Transformation);
            setExerciseState(EfficiencyExerciseState.SystemTransformation);
        } else {
            setExerciseState(assignStateByMethod(method, setNextTrackingPhase));
        }
    }


    function continueAfterSelfExplanation(): void {
        if (exercise.transformationRequired) {
            setNextTrackingPhase(FlexibilityExercisePhase.Transformation);
            setExerciseState(EfficiencyExerciseState.SystemTransformation);
        } else {
            if (selectedMethod === undefined) {
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }
            setExerciseState(assignStateByMethod(selectedMethod, setNextTrackingPhase));
        }
    }

    function handleExerciseEnd(): void {
        if (isStudy) {
            setFlexibilityStudyExerciseCompleted(studyId as number, flexibilityExerciseId);
        } else {
            setPKExerciseCompleted(flexibilityExerciseId, "flexibility-training");
        }
        handleEnd();
    }
}

function assignStateByMethod(method: Method, setNextTrackingPhase: (newPhase: FlexibilityExercisePhase) => void): EfficiencyExerciseState {
    switch (method) {
        case Method.Equalization:
            setNextTrackingPhase(FlexibilityExercisePhase.Equalization);
            return EfficiencyExerciseState.EqualizationMethod;

        case Method.Substitution:
            setNextTrackingPhase(FlexibilityExercisePhase.Substitution);
            return EfficiencyExerciseState.SubstitutionMethod;

        case Method.Elimination:
            setNextTrackingPhase(FlexibilityExercisePhase.Elimination);
            return EfficiencyExerciseState.EliminationMethod;
    }
}
