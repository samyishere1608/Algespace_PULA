import useAxios from "axios-hooks";
import { plainToClass } from "class-transformer";
import { ReactElement, useState } from "react";
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
import { useTranslation } from "react-i18next";
import { TranslationNamespaces, getCurrentLanguage } from "@/i18n.ts";
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
import type { StudyGoal } from "@/types/student/goal.ts";
import {
    addAccuracyEntry,
    getExerciseDecisions,
    getExerciseErrorCount,
    getExerciseHintCount,
    logExerciseCompletion,
    resetExerciseDecisions,
    resetExerciseErrorCount,
    resetExerciseHintCount,
} from "@utils/progressUtils.ts";
import { getActiveGoals } from "@utils/activeGoals.ts";
import { GOAL_RESOLVE_XP, asTranslate, describeGoal } from "@utils/goalCatalog.ts";
import { claimCompletedGoals, earliestGoalStart, fetchGoalEventsAfterExercise } from "@utils/goalProgress.ts";
import { forgetAvoidanceProfile } from "@utils/avoidanceProfile.ts";
import { AgencyXpToast, showAgencyToast } from "@components/shared/AgencyXpToast.tsx";

export default function FlexibilityExercise({ isStudyExample }: { isStudyExample: boolean }): ReactElement {
    const [exitOverlay, setExitOverlay] = useState<[boolean, boolean]>([false, false]);
    const { t } = useTranslation(TranslationNamespaces.Student);
    const location = useLocation();
    const { exerciseId } = useParams();

    const concreteExerciseType: FlexibilityExerciseType | FlexibilityStudyExerciseType | undefined = location.state?.exerciseType;
    const concreteExerciseId: number | undefined = location.state?.exerciseId;

    // ── Goal celebration state ────────────────────────────────────────────────
    const [celebrationData, setCelebrationData] = useState<{
        goals: StudyGoal[];
        resolveXpEarned: number;
        navigateTo: string;
    } | null>(null);

    const { student } = useAuth();

    // The Solo/Pippin choice screen was removed along with the free-text chat. Every student now
    // goes straight into the exercise. Agency is exercised through the in-exercise decision anchors
    // instead, which are recorded and drive the avoidance profile.

    if (exerciseId === undefined || exerciseId === "undefined" || concreteExerciseType === undefined || concreteExerciseId === undefined) {
        return <ErrorScreen text={ErrorTranslations.ERROR_EXERCISE_ID} routeToReturn={Paths.FlexibilityStudyExamplesPath} showFrownIcon={true} />;
    }

    const id: number = parseInt(exerciseId);
    const currentExercise: number | undefined = getExerciseNumber(id, location.state?.exercises);

    /**
     * Where this page sends a student who is finishing, or leaving without finishing.
     *
     * A logged-in student is working INSIDE the dashboard. That is where their goals live, where
     * their stats are, and where the walkthrough now tells them to practise from — the dashboard's
     * Exercises tab opens these very exercises. Dropping them on the standalone flexibility list
     * after they finish would put them on a page they never came from, and would make the dashboard
     * feel like the entrance to a set of separate apps rather than the one system it is.
     *
     * The flexibility module is also used ON ITS OWN, by students with no account and therefore no
     * dashboard to return to. For them nothing changes: they get the list, exactly as before.
     *
     * Studies keep the screen they have always had. A study participant must not be handed off to
     * the dashboard mid-sequence, so `isStudyExample` is checked first and wins.
     */
    const leaveTo: string = isStudyExample
        ? Paths.FlexibilityPath
        : student ? Paths.StudentDashboardPath : Paths.FlexibilityPath;

    /**
     * Called by each exercise component when the student finishes.
     *
     * `moduleHome` is the flexibility module's own list. It is the destination when there is no
     * account — see `leaveTo` above for why a logged-in student goes somewhere else.
     */
    function buildHandleEnd(moduleHome: string, exerciseTypeName: string): () => void {
        return function () {
            const navigateTo = student ? Paths.StudentDashboardPath : moduleHome;
            const errors = getExerciseErrorCount();
            const hints = getExerciseHintCount();
            const decisions = getExerciseDecisions();

            // Reset counters for the next exercise
            resetExerciseErrorCount();
            resetExerciseHintCount();
            resetExerciseDecisions();

            // Nothing else can be done without a student: the goal check reads their own history,
            // and the completion log has nowhere to go.
            if (!student) {
                window.location.href = navigateTo;
                return;
            }

            // Always log exercise completion for stats (non-blocking). The decisions ride along so
            // the reflection can tell what the student actually chose, not just how many times they
            // slipped.
            void logExerciseCompletion(student.id, exerciseTypeName, errors, hints, decisions);
            addAccuracyEntry(student.id, errors, hints);

            // This exercise just changed the avoidance profile, so the cached reading is stale. The
            // next exercise's first declined decision must not be judged on the old one.
            forgetAvoidanceProfile(student.id);

            // The goals are a server read now, so the check begins by asking for them. When there
            // are none the student leaves straight away; the round trip is the price of the goals
            // surviving a cleared browser, and it happens once per finished exercise.
            void (async () => {
                const goals = await getActiveGoals(student.id);
                if (goals.length === 0) {
                    window.location.href = navigateTo;
                    return;
                }

                try {
                    // The tracker posts this attempt immediately before handing control back, and
                    // that post is not awaited — so the read has to wait for it to land. See
                    // `fetchGoalEventsAfterExercise` for how that race is closed and why giving up
                    // is safe.
                    const events = await fetchGoalEventsAfterExercise(student.id, earliestGoalStart(goals));
                    const completed = await claimCompletedGoals(
                        student.id, goals, events, (goal) => describeGoal(goal, asTranslate(t)));

                    if (completed.length === 0) {
                        window.location.href = navigateTo;
                        return;
                    }

                    setCelebrationData({
                        goals: completed.map((entry) => entry.goal),
                        resolveXpEarned: completed.length * GOAL_RESOLVE_XP,
                        navigateTo,
                    });

                    // The XP is announced where it was earned. Waiting for the dashboard would put
                    // the toast a screen away from the thing that caused it.
                    showAgencyToast("resolve", completed.length * GOAL_RESOLVE_XP);
                } catch {
                    // A failed check must never trap the student in the exercise.
                    window.location.href = navigateTo;
                }
            })();
        };
    }

    return (
        <ErrorBoundary key={location.pathname}
                       FallbackComponent={() => <ErrorScreen text={ErrorTranslations.ERROR_RETURN} routeToReturn={leaveTo} />}
        >
            <div className={"full-page"} style={{ background: "linear-gradient(180deg, var(--blue-background) 0%, #044a6d 100%)", paddingBottom: "1rem" }}>
                <NavigationBar mainRoute={GeneralTranslations.FLEXIBILITY_TRAINING}
                               handleSelection={isStudyExample ? undefined : (isHome: boolean) => handleNavigationClick(isHome, setExitOverlay)}
                               currentExercise={currentExercise} isStudy={isStudyExample} exercisesCount={location.state?.exercises?.length ?? undefined}
                               style={{ minHeight: "3.5rem" }} />
                <div className={"flexibility-view__container"}>
                    <div className={"flexibility-view__contents"}>
                        {isStudyExample ?
                            <ExampleExercise concreteExerciseType={concreteExerciseType as FlexibilityStudyExerciseType} concreteExerciseId={concreteExerciseId}
                                             flexibilityId={id} navigateBackTo={Paths.FlexibilityStudyExamplesPath} /> :
                            <ExerciseRouter concreteExerciseType={concreteExerciseType as FlexibilityStudyExerciseType} concreteExerciseId={concreteExerciseId} flexibilityId={id}
                                      navigateBackTo={Paths.FlexibilityPath} buildHandleEnd={buildHandleEnd} />                        }
                    </div>
                </div>
            </div>
            {!isStudyExample && exitOverlay[0] &&
                <ExitExerciseOverlay returnToHome={exitOverlay[1]} routeToReturn={leaveTo} closeOverlay={() => setExitOverlay([false, false])} />}
            <AgencyXpToast />
            {celebrationData && (
                <GoalCelebrationOverlay
                    completedGoals={celebrationData.goals}
                    resolveXpEarned={celebrationData.resolveXpEarned}
                    onContinue={() => {
                        // The goals were already removed from storage when they were claimed, so the
                        // dashboard reads the updated list without any work here.
                        window.location.href = celebrationData.navigateTo;
                    }}
                />
            )}
        </ErrorBoundary>
    );
}

/**
 * Routes a concrete exercise type to its component.
 *
 * Exported because the walkthrough renders the REAL exercise rather than a copy of it, on its own
 * route, with a no-op `buildHandleEnd` and with tracking switched off by `PreviewContext`. Sharing
 * this switch is what keeps the two from drifting apart.
 */
export function ExerciseRouter({ concreteExerciseType, concreteExerciseId, flexibilityId, navigateBackTo, buildHandleEnd }: {
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