import { ReactElement, useMemo, useState } from "react";
import { WorkedExampleForEqualization } from "@components/flexibility/workedExamples/WorkedExampleForEqualization.tsx";
import { AgentCondition, AgentType, WorkedExampleExerciseState } from "@/types/flexibility/enums.ts";
import { getRandomAgent, setPKExerciseCompleted, setFlexibilityStudyExerciseCompleted } from "@utils/storageUtils.ts";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { GameError, GameErrorType } from "@/types/shared/error.ts";
import useFlexibilityTracker from "@hooks/useFlexibilityTracker.ts";
import { IUser } from "@/types/studies/user.ts";
import { FlexibilityExerciseChoicePhase, FlexibilityExercisePhase, FlexibilityStudyExerciseType } from "@/types/studies/enums.ts";
import { OptionalExercise } from "@components/flexibility/choice/OptionalExercise.tsx";
import { SystemIntroduction } from "@components/flexibility/workedExamples/SystemIntroduction.tsx";
import { getCurrentLanguage, Language } from "@/i18n.ts";
import { WorkedExampleForSubstitution } from "@components/flexibility/workedExamples/WorkedExampleForSubstitution.tsx";
import { WorkedExampleForElimination } from "@components/flexibility/workedExamples/WorkedExampleForElimination.tsx";

const questionDE: string = "Möchtest du dir zuerst ein kurzes Beispiel zu den einzelnen Verfahren anschauen, bevor du mit dem Lösen der Aufgaben beginnst?";
const questionEN: string = "Would you like to see a short example of the individual methods before you start solving the tasks?";
const agentMessageDE: string = "Das hilft dir dabei, dich noch einmal an die gelernten Themen zu erinnern und die kommenden Aufgaben effizienter zu lösen.";
const agentMessageEN: string = "This helps you to remember the topics you have learnt and to solve upcoming tasks more efficiently.";

export function WorkedExamples({ flexibilityExerciseId, exerciseId, condition, handleEnd, isStudy = false, studyId }: {
    flexibilityExerciseId: number,
    exerciseId: number;
    condition: AgentCondition;
    handleEnd: () => void;
    isStudy?: boolean;
    studyId?: number;
}): ReactElement {
    const language: string = getCurrentLanguage();

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
        trackChoice,
        endTracking
    } = useFlexibilityTracker(isStudy, user as IUser, studyId as number, flexibilityExerciseId, exerciseId, FlexibilityStudyExerciseType.WorkedExamples, performance.now(), condition, agentType, FlexibilityExercisePhase.EfficiencySelection);

    const [exerciseState, setExerciseState] = useState<WorkedExampleExerciseState>(WorkedExampleExerciseState.Choice);
    const [showAllEqualization, setShowAllEqualization] = useState<boolean>(false);
    const [showAllSubstitution, setShowAllSubstitution] = useState<boolean>(false);

    let content: ReactElement;
    switch (exerciseState) {
        case WorkedExampleExerciseState.Choice: {
            content = (
                <OptionalExercise
                    loadNextStep={(choice: boolean) => {
                        if (choice) {
                            setExerciseState(WorkedExampleExerciseState.SystemIntroduction);
                        } else {
                            handleExerciseEnd();
                        }
                    }}
                    question={language === Language.DE ? questionDE : questionEN}
                    agentType={agentType}
                    additionalMessage={(condition === AgentCondition.Agent || condition == AgentCondition.None) ? undefined : (language === Language.DE ? agentMessageDE : agentMessageEN)}
                    trackChoice={(choice: string) => trackChoice(choice, FlexibilityExerciseChoicePhase.WorkedExamplesChoice)}
                />
            );
            break;
        }

        case WorkedExampleExerciseState.SystemIntroduction:
            content = <SystemIntroduction language={language} loadNextStep={() => setExerciseState(WorkedExampleExerciseState.Equalization)} />;
            break;

        case WorkedExampleExerciseState.Equalization:
            content = <WorkedExampleForEqualization language={language} showAll={showAllEqualization}
                                                    loadNextStep={() => setExerciseState(WorkedExampleExerciseState.Substitution)} />;
            break;

        case WorkedExampleExerciseState.Substitution:
            content = <WorkedExampleForSubstitution language={language} showAll={showAllSubstitution}
                                                    loadNextStep={() => setExerciseState(WorkedExampleExerciseState.Elimination)}
                                                    loadPreviousStep={() => {
                                                        setShowAllEqualization(true);
                                                        setExerciseState(WorkedExampleExerciseState.Equalization);
                                                    }} />;
            break;

        case WorkedExampleExerciseState.Elimination:
            content = <WorkedExampleForElimination language={language} loadNextStep={handleExerciseEnd}
                                                   loadPreviousStep={() => {
                                                       setShowAllSubstitution(true);
                                                       setExerciseState(WorkedExampleExerciseState.Substitution);
                                                   }} />;
    }

    return content;

    function handleExerciseEnd(): void {
        if (isStudy) {
            endTracking();
            setFlexibilityStudyExerciseCompleted(studyId as number, flexibilityExerciseId);
        } else {
            setPKExerciseCompleted(flexibilityExerciseId, "flexibility-training");
        }
        handleEnd();
    }
}