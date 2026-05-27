import useAxios from "axios-hooks";
import { plainToClass } from "class-transformer";
import { ReactElement, useRef, useState } from "react";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import ErrorScreen from "@components/shared/ErrorScreen.tsx";
import { ExitExerciseOverlay } from "@components/shared/ExerciseOverlay.tsx";
import { GoalCelebrationOverlay } from "@components/shared/GoalCelebrationOverlay.tsx";
import Loader from "@components/shared/Loader.tsx";
import { Paths } from "@routes/paths.ts";
import "@styles/views/flexibility.scss";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FlexibilityStudyExerciseType } from "@/types/studies/enums.ts";
import { AgentCondition, FlexibilityExerciseType } from "@/types/flexibility/enums.ts";
import { getExerciseNumber, handleNavigationClick } from "@utils/utils.ts";
import { ErrorBoundary } from "react-error-boundary";
import NavigationBar from "@components/shared/NavigationBar.tsx";
import { getCurrentLanguage } from "@/i18n.ts";
import { SuitabilityExercise as SuitabilityExerciseProps } from "@/types/flexibility/suitabilityExercise.ts";
import { SuitabilityExercise } from "@components/flexibility/exercises/SuitabilityExercise.tsx";
import { EfficiencyExercise } from "@components/flexibility/exercises/EfficiencyExercise.tsx";
import { EfficiencyExercise as EfficiencyExerciseProps } from "@/types/flexibility/efficiencyExercise.ts";
import { MatchingExercise as MatchingExerciseProps } from "@/types/flexibility/matchingExercise.ts";
import { TipExercise as TipExerciseProps } from "@/types/flexibility/tipExercise.ts";
import { MatchingExercise } from "@components/flexibility/exercises/MatchingExercise.tsx";
import { WorkedExamples } from "@components/flexibility/exercises/WorkedExamples.tsx";
import { TipExercise } from "@components/flexibility/exercises/TipExercise.tsx";
import { PlainExercise as PlainExerciseProps } from "@/types/flexibility/plainExercise.ts";
import { PlainExercise } from "@components/flexibility/exercises/PlainExercise.tsx";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { StudyGoal } from "@views/student/dashboard/SetStudyPlanModal.tsx";
import {
    checkCompletedGoals,
    logGoalCompletion,
    logExerciseCompletion,
    getPippinExerciseCount,
    resetPippinExerciseCount,
    getExerciseErrorCount,
    resetExerciseErrorCount,
    getExerciseHintCount,
    resetExerciseHintCount,
    incrementPippinFreeCount,
    ExerciseCompletionData,
} from "@utils/goalUtils.ts";
import { addCoins } from "@utils/wardrobeUtils.ts";
import { CoinCelebrationOverlay } from "@components/shared/CoinCelebrationOverlay.tsx";
import { PippinLockContext } from "@/contexts/PippinLockContext.tsx";
import { SolveChoiceScreen } from "@components/flexibility/SolveChoiceScreen.tsx";

export default function FlexibilityExercise({ isStudyExample }: { isStudyExample: boolean }): ReactElement {
    const [exitOverlay, setExitOverlay] = useState<[boolean, boolean]>([false, false]);
    const location = useLocation();
    const { exerciseId } = useParams();

    const concreteExerciseType: FlexibilityExerciseType | FlexibilityStudyExerciseType | undefined = location.state?.exerciseType;
    const concreteExerciseId: number | undefined = location.state?.exerciseId;

    // ── Goal celebration state ────────────────────────────────────────────────
    const [celebrationData, setCelebrationData] = useState<{
        goals: StudyGoal[];
        xpEarned: number;
        newTotalXP: number;
        coinsEarned: number;
        navigateTo: string;
    } | null>(null);
    const [showCoinScreen, setShowCoinScreen] = useState(false);

    const { student } = useAuth();

    // ── Solo/Pippin choice ─────────────────────────────────────────
    // null = choice screen visible; "solo"/"pippin" = exercise running
    const [solveChoice, setSolveChoice] = useState<"solo" | "pippin" | null>(
        isStudyExample || !student ? "pippin" : null
    );
    const [pippinUnlocked, setPippinUnlocked] = useState(false);
    // Refs so buildHandleEnd closures always read the latest values
    const solveChoiceRef = useRef<"solo" | "pippin">("pippin");
    const pippinUnlockedRef = useRef(false);

    // Active goal IDs stored in localStorage by the dashboard, scoped per student
    const goalKey = `active_goal_ids_${student?.id ?? "guest"}`;
    const activeGoalIds: string[] = JSON.parse(
        localStorage.getItem(goalKey) ?? "[]"
    ) as string[];

    if (exerciseId === undefined || exerciseId === "undefined" || concreteExerciseType === undefined || concreteExerciseId === undefined) {
        return <ErrorScreen text={ErrorTranslations.ERROR_EXERCISE_ID} routeToReturn={Paths.FlexibilityStudyExamplesPath} showFrownIcon={true} />;
    }

    const id: number = parseInt(exerciseId);
    const currentExercise: number | undefined = getExerciseNumber(id, location.state?.exercises);

    /** Called by each exercise component when the student finishes. */
    function buildHandleEnd(navigateTo: string, exerciseTypeName: string): () => void {
        return function () {
            const data: ExerciseCompletionData = {
                exerciseType: exerciseTypeName,
                totalErrors: getExerciseErrorCount(),
                totalHints: getExerciseHintCount(),
                pippinMessages: getPippinExerciseCount(),
            };

            // Reset counters for the next exercise
            resetExerciseErrorCount();
            resetExerciseHintCount();
            resetPippinExerciseCount();

            // Always log exercise completion for stats (non-blocking)
            if (student) {
                void logExerciseCompletion(student.id, exerciseTypeName);
            }

            // Increment pippin-free-day counter if Pippin wasn't used this exercise
            if (data.pippinMessages === 0 && student) {
                incrementPippinFreeCount(student.id);
            }

            // Check which active goals are satisfied
            const completed = checkCompletedGoals(activeGoalIds, data, student?.id);

            if (completed.length > 0 && student) {
                const totalXp = completed.reduce((sum, g) => sum + g.xpReward, 0);
                const coinMultiplier =
                    solveChoiceRef.current === "solo" && !pippinUnlockedRef.current ? 2 : 1;
                const totalCoins = completed.reduce((sum, g) => sum + g.coinReward, 0) * coinMultiplier;

                // Award coins immediately (localStorage — doesn't affect XP/rank)
                addCoins(student.id, totalCoins);

                // Log all to backend in parallel, use total from last call
                Promise.all(completed.map((g) => logGoalCompletion(student.id, g, data)))
                    .then((totals) => {
                        const newTotal = totals[totals.length - 1] ?? 0;
                        setCelebrationData({ goals: completed, xpEarned: totalXp, newTotalXP: newTotal, coinsEarned: totalCoins, navigateTo });
                    })
                    .catch(() => {
                        // If logging fails, still navigate
                        window.location.href = navigateTo;
                    });
            } else {
                window.location.href = navigateTo;
            }
        };
    }

    return (
        <ErrorBoundary key={location.pathname}
                       FallbackComponent={() => <ErrorScreen text={ErrorTranslations.ERROR_RETURN} routeToReturn={Paths.FlexibilityPath} />}
        >
            <div className={"full-page"} style={{ background: "linear-gradient(180deg, var(--blue-background) 0%, #044a6d 100%)", paddingBottom: "1rem" }}>
                <NavigationBar mainRoute={GeneralTranslations.FLEXIBILITY_TRAINING}
                               handleSelection={isStudyExample ? undefined : (isHome: boolean) => handleNavigationClick(isHome, setExitOverlay)}
                               currentExercise={currentExercise} isStudy={isStudyExample} exercisesCount={location.state?.exercises?.length ?? undefined}
                               style={{ minHeight: "3.5rem" }} />
                <div className={"flexibility-view__container"}>
                    <div className={"flexibility-view__contents"}>
                        {solveChoice === null ? (
                            <SolveChoiceScreen onChoose={(mode) => {
                                solveChoiceRef.current = mode;
                                setSolveChoice(mode);
                            }} />
                        ) : (
                            <PippinLockContext.Provider value={{
                                soloMode: solveChoice === "solo",
                                pippinUnlocked,
                                onUnlock: () => {
                                    pippinUnlockedRef.current = true;
                                    setPippinUnlocked(true);
                                },
                            }}>
                                {isStudyExample ?
                                    <ExampleExercise concreteExerciseType={concreteExerciseType as FlexibilityStudyExerciseType} concreteExerciseId={concreteExerciseId}
                                                     flexibilityId={id} navigateBackTo={Paths.FlexibilityStudyExamplesPath} /> :
                                    <Exercise concreteExerciseType={concreteExerciseType as FlexibilityStudyExerciseType} concreteExerciseId={concreteExerciseId} flexibilityId={id}
                                              navigateBackTo={Paths.FlexibilityPath} buildHandleEnd={buildHandleEnd} />
                                }
                            </PippinLockContext.Provider>
                        )}
                    </div>
                </div>
            </div>
            {!isStudyExample && exitOverlay[0] &&
                <ExitExerciseOverlay returnToHome={exitOverlay[1]} routeToReturn={Paths.FlexibilityPath} closeOverlay={() => setExitOverlay([false, false])} />}
            {celebrationData && !showCoinScreen && (
                <GoalCelebrationOverlay
                    completedGoals={celebrationData.goals}
                    xpEarned={celebrationData.xpEarned}
                    newTotalXP={celebrationData.newTotalXP}
                    onContinue={() => {
                        // Remove completed goals so Active Missions updates immediately
                        const completedIds = new Set(celebrationData.goals.map((g) => g.id));
                        const remaining = activeGoalIds.filter((id) => !completedIds.has(id));
                        localStorage.setItem(goalKey, JSON.stringify(remaining));
                        // Show coin screen next
                        setShowCoinScreen(true);
                    }}
                />
            )}
            {celebrationData && showCoinScreen && (
                <CoinCelebrationOverlay
                    completedGoals={celebrationData.goals}
                    coinsEarned={celebrationData.coinsEarned}
                    onContinue={() => {
                        window.location.href = celebrationData.navigateTo;
                    }}
                />
            )}
        </ErrorBoundary>
    );
}

function Exercise({ concreteExerciseType, concreteExerciseId, flexibilityId, navigateBackTo, buildHandleEnd }: {
    concreteExerciseType: FlexibilityStudyExerciseType,
    concreteExerciseId: number;
    flexibilityId: number;
    navigateBackTo: string;
    buildHandleEnd: (navigateTo: string, exerciseTypeName: string) => () => void;
}): ReactElement {
    switch (concreteExerciseType) {
        case FlexibilityStudyExerciseType.Suitability:
            return <ExerciseForSuitability concreteExerciseId={concreteExerciseId} flexibilityId={flexibilityId}
                        handleEnd={buildHandleEnd(navigateBackTo, "Suitability")} />;
        case FlexibilityStudyExerciseType.Efficiency:
            return <ExerciseForEfficiency concreteExerciseId={concreteExerciseId} flexibilityId={flexibilityId}
                        handleEnd={buildHandleEnd(navigateBackTo, "Efficiency")} />;
        case FlexibilityStudyExerciseType.Matching:
            return <ExerciseForMatching concreteExerciseId={concreteExerciseId} flexibilityId={flexibilityId}
                        handleEnd={buildHandleEnd(navigateBackTo, "Matching")} />;
        default:
            return <ErrorScreen text={ErrorTranslations.ERROR_EXERCISE_ID} routeToReturn={navigateBackTo} showFrownIcon={true} />;
    }
}

function ExampleExercise({ concreteExerciseType, concreteExerciseId, flexibilityId, navigateBackTo }: {
    concreteExerciseType: FlexibilityStudyExerciseType,
    concreteExerciseId: number;
    flexibilityId: number;
    navigateBackTo: string
}): ReactElement {
    const navigate = useNavigate();

    switch (concreteExerciseType) {
        case FlexibilityStudyExerciseType.WorkedExamples:
            return <WorkedExamples flexibilityExerciseId={flexibilityId} exerciseId={0} condition={AgentCondition.MotivationalAgent}
                                   handleEnd={() => navigate(navigateBackTo)} />;
        case FlexibilityStudyExerciseType.Suitability:
            return <ExerciseForSuitability concreteExerciseId={concreteExerciseId} flexibilityId={flexibilityId}
                        handleEnd={() => navigate(navigateBackTo)} />;
        case FlexibilityStudyExerciseType.Efficiency:
            return <ExerciseForEfficiency concreteExerciseId={concreteExerciseId} flexibilityId={flexibilityId}
                        handleEnd={() => navigate(navigateBackTo)} />;
        case FlexibilityStudyExerciseType.Matching:
            return <ExerciseForMatching concreteExerciseId={concreteExerciseId} flexibilityId={flexibilityId}
                        handleEnd={() => navigate(navigateBackTo)} />;
        case FlexibilityStudyExerciseType.TipExercise:
            return <ExerciseWithTip concreteExerciseId={concreteExerciseId} flexibilityId={flexibilityId} navigateBackTo={navigateBackTo} />;
        case FlexibilityStudyExerciseType.PlainExercise:
            return <PlainExerciseForStudy concreteExerciseId={concreteExerciseId} flexibilityId={flexibilityId} navigateBackTo={navigateBackTo} />;
    }
}

function ExerciseForSuitability({ concreteExerciseId, flexibilityId, handleEnd }: {
    concreteExerciseId: number,
    flexibilityId: number,
    handleEnd: () => void;
}): ReactElement {
    const [{ data, loading, error }] = useAxios({
        url: `/flexibility-training/${getCurrentLanguage()}/getSuitabilityExercise/${concreteExerciseId}`
    });

    if (loading) return <Loader />;
    if (error) {
        console.error(error);
        return <ErrorScreen text={ErrorTranslations.ERROR_LOAD} routeToReturn={Paths.FlexibilityStudyExamplesPath} showFrownIcon={true} />;
    }

    const exercise: SuitabilityExerciseProps = plainToClass(SuitabilityExerciseProps, data as SuitabilityExerciseProps);

    return <SuitabilityExercise flexibilityExerciseId={flexibilityId} exercise={exercise} condition={AgentCondition.MotivationalAgent}
                                handleEnd={handleEnd} />;
}

function ExerciseForEfficiency({ concreteExerciseId, flexibilityId, handleEnd }: {
    concreteExerciseId: number,
    flexibilityId: number,
    handleEnd: () => void;
}): ReactElement {
    const [{ data, loading, error }] = useAxios({
        url: `/flexibility-training/${getCurrentLanguage()}/getEfficiencyExercise/${concreteExerciseId}`
    });

    if (loading) return <Loader />;
    if (error) {
        console.error(error);
        return <ErrorScreen text={ErrorTranslations.ERROR_LOAD} routeToReturn={Paths.FlexibilityStudyExamplesPath} showFrownIcon={true} />;
    }

    const exercise: EfficiencyExerciseProps = plainToClass(EfficiencyExerciseProps, data as EfficiencyExerciseProps);

    return <EfficiencyExercise flexibilityExerciseId={flexibilityId} exercise={exercise} condition={AgentCondition.MotivationalAgent}
                               handleEnd={handleEnd} />;
}

function ExerciseForMatching({ concreteExerciseId, flexibilityId, handleEnd }: {
    concreteExerciseId: number,
    flexibilityId: number,
    handleEnd: () => void;
}): ReactElement {
    const [{ data, loading, error }] = useAxios({
        url: `/flexibility-training/${getCurrentLanguage()}/getMatchingExercise/${concreteExerciseId}`
    });

    if (loading) return <Loader />;
    if (error) {
        console.error(error);
        return <ErrorScreen text={ErrorTranslations.ERROR_LOAD} routeToReturn={Paths.FlexibilityStudyExamplesPath} showFrownIcon={true} />;
    }

    const exercise: MatchingExerciseProps = plainToClass(MatchingExerciseProps, data as MatchingExerciseProps);

    return <MatchingExercise flexibilityExerciseId={flexibilityId} exercise={exercise} condition={AgentCondition.MotivationalAgent}
                             handleEnd={handleEnd} isStudy={false} studyId={1} />;
}

function ExerciseWithTip({ concreteExerciseId, flexibilityId, navigateBackTo }: {
    concreteExerciseId: number,
    flexibilityId: number,
    navigateBackTo: string
}): ReactElement {
    const navigate = useNavigate();

    const [{ data, loading, error }] = useAxios({
        url: `/flexibility-training/${getCurrentLanguage()}/getTipExercise/${concreteExerciseId}`
    });

    if (loading) return <Loader />;
    if (error) {
        console.error(error);
        return <ErrorScreen text={ErrorTranslations.ERROR_LOAD} routeToReturn={Paths.FlexibilityStudyExamplesPath} showFrownIcon={true} />;
    }

    const exercise: TipExerciseProps = plainToClass(TipExerciseProps, data as TipExerciseProps);

    return <TipExercise flexibilityExerciseId={flexibilityId} exercise={exercise} condition={AgentCondition.MotivationalAgent}
                        handleEnd={() => navigate(navigateBackTo)} />;
}

function PlainExerciseForStudy({ concreteExerciseId, flexibilityId, navigateBackTo }: {
    concreteExerciseId: number,
    flexibilityId: number,
    navigateBackTo: string
}): ReactElement {
    const navigate = useNavigate();

    const [{ data, loading, error }] = useAxios({
        url: `/flexibility-training/${getCurrentLanguage()}/getPlainExercise/${concreteExerciseId}`
    });

    if (loading) return <Loader />;
    if (error) {
        console.error(error);
        return <ErrorScreen text={ErrorTranslations.ERROR_LOAD} routeToReturn={Paths.FlexibilityStudyExamplesPath} showFrownIcon={true} />;
    }

    const exercise: PlainExerciseProps = plainToClass(PlainExerciseProps, data as PlainExerciseProps);

    return <PlainExercise flexibilityExerciseId={flexibilityId} exercise={exercise} condition={AgentCondition.MotivationalAgent}
                          handleEnd={() => navigate(navigateBackTo)} />;
}