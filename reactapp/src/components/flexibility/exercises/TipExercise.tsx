import { ReactElement, useMemo, useState } from "react";
import { AgentCondition, AgentType, IsolatedIn, Method, SelectedEquation, TipExerciseState } from "@/types/flexibility/enums.ts";
import { SubstitutionParameters } from "@/types/flexibility/substitutionParameters.ts";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { GameError, GameErrorType } from "@/types/shared/error.ts";
import { EqualizationMethod } from "@components/flexibility/equalization/EqualizationMethod.tsx";
import { EfficiencyExerciseEnd } from "@components/flexibility/solution/EfficiencyExerciseEnd.tsx";
import { EquationSelection } from "@components/flexibility/solution/EquationSelection.tsx";
import { FirstSolution } from "@components/flexibility/solution/FirstSolution.tsx";
import { SecondSolution } from "@components/flexibility/solution/SecondSolution.tsx";
import { SubstitutionMethod } from "@components/flexibility/substitution/SubstitutionMethod.tsx";
import { determineSecondEquation } from "@utils/utils.ts";
import "@styles/flexibility/flexibility.scss";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import useFlexibilityTracker from "@hooks/useFlexibilityTracker.ts";
import { IUser } from "@/types/studies/user.ts";
import { FlexibilityExerciseActionPhase, FlexibilityExerciseChoicePhase, FlexibilityExercisePhase, FlexibilityStudyExerciseType } from "@/types/studies/enums.ts";
import { getRandomAgent, setPKExerciseCompleted, setFlexibilityStudyExerciseCompleted } from "@utils/storageUtils.ts";
import { OptionalExercise } from "@components/flexibility/choice/OptionalExercise.tsx";
import { TipExercise as TipExerciseProps } from "@/types/flexibility/tipExercise.ts";

export function TipExercise({ flexibilityExerciseId, exercise, condition, handleEnd, isStudy = false, studyId }: {
    flexibilityExerciseId: number,
    exercise: TipExerciseProps;
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
        initializeTrackingPhase,
        trackActionInPhase,
        trackChoice,
        trackType,
        trackErrorInPhase,
        trackHintsInPhase,
        setNextTrackingPhase,
        endTrackingPhase,
        endTracking,
        decideCalculationIntervention

    } = useFlexibilityTracker(isStudy, user as IUser, studyId as number, flexibilityExerciseId, exercise.id, FlexibilityStudyExerciseType.TipExercise, performance.now(), condition, agentType, FlexibilityExercisePhase.EfficiencySelection);



    const [exerciseState, setExerciseState] = useState<TipExerciseState>(TipExerciseState.Choice);
    const [methodApplicationResult, setMethodApplicationResult] = useState<[FlexibilityEquation, boolean]>();
    const [substitutionInfo, setSubstitutionInfo] = useState<SubstitutionParameters | undefined>();
    const [selectedEquation, setSelectedEquation] = useState<[FlexibilityEquation, SelectedEquation] | undefined>();

    let content: ReactElement;
    switch (exerciseState) {
        case TipExerciseState.Choice: {
            content = (
                <OptionalExercise
                    loadNextStep={(choice: boolean) => {
                        if (choice) {
                            setExerciseState(assignStateByMethod(exercise.method, initializeTrackingPhase));
                        } else {
                            endTracking();
                            handleExerciseEnd();

                        }
                    }}
                    question={exercise.question}
                    agentType={agentType}
                    additionalMessage={(condition === AgentCondition.Agent || condition == AgentCondition.None) ? undefined: exercise.agentMessageForTask}
                    trackChoice={(choice: string) => trackChoice(choice, FlexibilityExerciseChoicePhase.TipChoice)}
                />
            );
            break;
        }

        case TipExerciseState.EqualizationMethod: {
            content = (
                <EqualizationMethod
                    initialSystem={[exercise.firstEquation, exercise.secondEquation]}
                    agentType={agentType}
                    loadNextStep={(equation: FlexibilityEquation): void => {
                        setNextTrackingPhase(FlexibilityExercisePhase.FirstSolution);
                        const containsFirstVariable: boolean = exercise.firstEquationIsIsolatedIn !== IsolatedIn.First && exercise.firstEquationIsIsolatedIn !== IsolatedIn.FirstMultiple;
                        setMethodApplicationResult([equation, containsFirstVariable]);
                        setExerciseState(TipExerciseState.FirstSolution);
                    }}
                    trackAction={(action: string) => trackActionInPhase(action, FlexibilityExerciseActionPhase.EqualizationActions)}
                    trackError={trackErrorInPhase}
                    trackHints={trackHintsInPhase}
                />
            );
            break;
        }

        case TipExerciseState.SubstitutionMethod: {
            content = (
                <SubstitutionMethod
                    isTip={true}
                    initialSystem={[exercise.firstEquation, exercise.secondEquation]}
                    firstVariable={exercise.firstVariable}
                    secondVariable={exercise.secondVariable}
                    isolatedVariables={[exercise.firstEquationIsIsolatedIn, exercise.secondEquationIsIsolatedIn]}
                    agentType={agentType}
                    loadNextStep={(equation: FlexibilityEquation, containsFirst: boolean, params?: SubstitutionParameters): void => {
                        setNextTrackingPhase(FlexibilityExercisePhase.FirstSolution);
                        setMethodApplicationResult([equation, containsFirst]);
                        setExerciseState(TipExerciseState.FirstSolution);
                        setSubstitutionInfo(params);
                    }}
                    trackAction={(action: string) => trackActionInPhase(action, FlexibilityExerciseActionPhase.SubstitutionActions)}
                    trackError={trackErrorInPhase}
                    trackHints={trackHintsInPhase}
                />
            );
            break;
        }

        case TipExerciseState.FirstSolution: {
            if (methodApplicationResult === undefined) {
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }
            content = (
                <FirstSolution
                    method={exercise.method}
                    initialSystem={[exercise.firstEquation, exercise.secondEquation]}
                    methodEquation={methodApplicationResult[0]}
                    variable={methodApplicationResult[1] ? exercise.firstVariable : exercise.secondVariable}
                    agentType={agentType}
                    additionalMessage={(condition === AgentCondition.Agent || condition == AgentCondition.None) ? undefined: exercise.agentMessageForFirstSolution}
                    loadNextStep={() => {
                        endTrackingPhase();
                        setExerciseState(TipExerciseState.EquationSelection);
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

        case TipExerciseState.EquationSelection: {
            if (methodApplicationResult === undefined) {
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }
            content = (
                <EquationSelection
                    method={exercise.method}
                    initialSystem={[exercise.firstEquation, exercise.secondEquation]}
                    methodEquation={methodApplicationResult[0]}
                    firstSolutionVar={methodApplicationResult[1] ? exercise.firstVariable : exercise.secondVariable}
                    otherVariable={methodApplicationResult[1] ? exercise.secondVariable : exercise.firstVariable}
                    substitutionInfo={substitutionInfo}
                    loadNextStep={(selectedEquation: SelectedEquation): void => {
                        trackActionInPhase(`${SelectedEquation[selectedEquation]}`, FlexibilityExerciseActionPhase.EquationSelection);
                        setNextTrackingPhase(FlexibilityExercisePhase.SecondSolution);
                        setExerciseState(TipExerciseState.SecondSolution);
                        determineSecondEquation(selectedEquation, setSelectedEquation, exercise, undefined);
                    }}
                />
            );
            break;
        }

        case TipExerciseState.SecondSolution: {
            if (methodApplicationResult === undefined || selectedEquation === undefined) {
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }
            content = (
                <SecondSolution
                    method={exercise.method}
                    initialSystem={[exercise.firstEquation, exercise.secondEquation]}
                    methodEquation={methodApplicationResult[0]}
                    selectedEquation={selectedEquation[0]}
                    firstSolutionVariable={methodApplicationResult[1] ? exercise.firstVariable : exercise.secondVariable}
                    otherVariable={methodApplicationResult[1] ? exercise.secondVariable : exercise.firstVariable}
                    substitutionInfo={substitutionInfo}
                    agentType={agentType}
                    additionalMessage={(condition === AgentCondition.Agent || condition == AgentCondition.None) ? undefined : exercise.agentMessageForSecondSolution }
                    loadNextStep={() => {
                        endTrackingPhase();
                        setExerciseState(TipExerciseState.SystemSolution);
                    }}
                    trackAction={(action: string) => trackActionInPhase(action, FlexibilityExerciseActionPhase.SecondSolutionActions)}
                    trackError={trackErrorInPhase}
                    trackChoice={(choice: string) => trackChoice(choice, FlexibilityExerciseChoicePhase.SecondSolutionChoice)}
                    trackType={(type: number) => trackType(type, FlexibilityExerciseChoicePhase.StudentTypeFirstSolution)}
                    trackInterventionChoice={(choice: string) => trackChoice(choice, FlexibilityExerciseChoicePhase.SecondSolutionInterventionChoice)}
                    condition={condition}
                    decideCalculationIntervention = {decideCalculationIntervention}
                />
            );
            break;
        }

        case TipExerciseState.SystemSolution: {
            if (methodApplicationResult === undefined || selectedEquation === undefined) {
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }
            content = (
                <EfficiencyExerciseEnd
                    method={exercise.method}
                    initialSystem={[exercise.firstEquation, exercise.secondEquation]}
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

    return content;

    function handleExerciseEnd(): void {
        if (isStudy) {
            setFlexibilityStudyExerciseCompleted(studyId as number, flexibilityExerciseId);
        } else {
            setPKExerciseCompleted(flexibilityExerciseId, "flexibility-training");
        }
        handleEnd();
    }
}

function assignStateByMethod(method: Method, initializeTrackingPhase: (phase: FlexibilityExercisePhase) => void): TipExerciseState {
    switch (method) {
        case Method.Equalization:
            initializeTrackingPhase(FlexibilityExercisePhase.Equalization);
            return TipExerciseState.EqualizationMethod;

        case Method.Substitution:
            initializeTrackingPhase(FlexibilityExercisePhase.Substitution);
            return TipExerciseState.SubstitutionMethod;

        case Method.Elimination:
            throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
    }
}