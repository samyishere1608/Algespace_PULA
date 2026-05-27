import useAxios from "axios-hooks";
import { plainToClass } from "class-transformer";
import { ReactElement } from "react";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import ErrorScreen, { FlexibilityStudyErrorScreen } from "@components/shared/ErrorScreen.tsx";
import Loader from "@components/shared/Loader.tsx";
import { Paths } from "@routes/paths.ts";
import "@styles/views/flexibility.scss";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FlexibilityStudyExerciseType } from "@/types/studies/enums.ts";
import { AgentCondition } from "@/types/flexibility/enums.ts";
import { ErrorBoundary } from "react-error-boundary";
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
import { FlexibilityExerciseResponse } from "@/types/flexibility/flexibilityExerciseResponse.ts";
import NavigationBar from "@components/shared/NavigationBar.tsx";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { navigateToNextExercise } from "@utils/utils.ts";

export default function FlexibilityStudyExercise(): ReactElement {
    const { logout } = useAuth();
    const { exerciseId, studyId } = useParams();
    const location = useLocation();

    if (studyId === undefined || studyId === "undefined") {
        logout();
        return <ErrorScreen text={ErrorTranslations.ERROR_STUDY_ID} routeToReturn={Paths.StudiesLoginPath} showFrownIcon={true} />;
    }
    if (exerciseId === undefined || exerciseId === "undefined") {
        return <ErrorScreen text={ErrorTranslations.ERROR_EXERCISE_ID} routeToReturn={Paths.FlexibilityStudyPath + studyId} showFrownIcon={true} />;
    }

    const exercises: FlexibilityExerciseResponse[] | undefined = location.state?.exercises;
    if (exercises === undefined) {
        return <ErrorScreen text={ErrorTranslations.ERROR_DATA_MISSING} routeToReturn={Paths.FlexibilityStudyPath + studyId} showFrownIcon={true} />;
    }

    const exerciseProps: FlexibilityExerciseResponse | undefined = exercises.find((entry) => entry.id === parseInt(exerciseId));
    if (exerciseProps === undefined) {
        return <ErrorScreen text={ErrorTranslations.ERROR_DATA_MISSING} routeToReturn={Paths.FlexibilityStudyPath + studyId} showFrownIcon={true} />;
    }

    const condition = location.state?.condition ?? AgentCondition.MotivationalAgent;

    return (
        <ErrorBoundary
            key={location.pathname}
            FallbackComponent={(error) => {
                console.error(error);
                return <FlexibilityStudyErrorScreen studyId={parseInt(studyId)} currentExerciseId={parseInt(exerciseId)} exercises={exercises} condition={condition} />;
            }}
        >
            <div className={"full-page"} style={{ background: "linear-gradient(180deg, var(--blue-background) 0%, #044a6d 100%)", paddingBottom: "1rem" }}>
                <NavigationBar mainRoute={GeneralTranslations.FLEXIBILITY_STUDY} isStudy={true} style={{ minHeight: "3rem" }} />
                <div className={"flexibility-view__container"}>
                    <div className={"flexibility-view__contents"}>
                        <Exercise studyId={parseInt(studyId)} flexibilityExerciseId={parseInt(exerciseId)} concreteExerciseType={exerciseProps.exerciseType}
                                  concreteExerciseId={exerciseProps.exerciseId} exercises={exercises} condition={condition} />
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
}

function Exercise({ studyId, flexibilityExerciseId, concreteExerciseType, concreteExerciseId, exercises, condition }: {
    studyId: number;
    flexibilityExerciseId: number;
    concreteExerciseType: FlexibilityStudyExerciseType,
    concreteExerciseId: number;
    exercises: FlexibilityExerciseResponse[];
    condition: AgentCondition
}): ReactElement {
    switch (concreteExerciseType) {
        case FlexibilityStudyExerciseType.WorkedExamples:
            return <WorkedExamplesForStudy studyId={studyId} flexibilityExerciseId={flexibilityExerciseId} exercises={exercises} condition={condition} />;

        case FlexibilityStudyExerciseType.Suitability :
            return <ExerciseForSuitability studyId={studyId} flexibilityExerciseId={flexibilityExerciseId} concreteExerciseId={concreteExerciseId}
                                           exercises={exercises} condition={condition} />;

        case FlexibilityStudyExerciseType.Efficiency:
            return <ExerciseForEfficiency studyId={studyId} flexibilityExerciseId={flexibilityExerciseId} concreteExerciseId={concreteExerciseId}
                                          exercises={exercises} condition={condition} />;

        case FlexibilityStudyExerciseType.Matching:
            return <ExerciseForMatching studyId={studyId} flexibilityExerciseId={flexibilityExerciseId} concreteExerciseId={concreteExerciseId} exercises={exercises}
                                        condition={condition} />;

        case FlexibilityStudyExerciseType.TipExercise:
            return <ExerciseWithTip studyId={studyId} flexibilityExerciseId={flexibilityExerciseId} concreteExerciseId={concreteExerciseId} exercises={exercises}
                                    condition={condition} />;

        case FlexibilityStudyExerciseType.PlainExercise:
            return <PlainExerciseForStudy studyId={studyId} flexibilityExerciseId={flexibilityExerciseId} concreteExerciseId={concreteExerciseId}
                                          exercises={exercises} condition={condition} />;
    }
}

function WorkedExamplesForStudy({ studyId, flexibilityExerciseId, exercises, condition }: {
    studyId: number;
    flexibilityExerciseId: number;
    exercises: FlexibilityExerciseResponse[];
    condition: AgentCondition
}): ReactElement {
    const navigate = useNavigate();

    return <WorkedExamples flexibilityExerciseId={flexibilityExerciseId} condition={condition} exerciseId={0} isStudy={true}
                           studyId={studyId} handleEnd={() => navigateToNextExercise(studyId, flexibilityExerciseId, exercises, condition, navigate)} />;
}

function ExerciseForSuitability({ studyId, flexibilityExerciseId, concreteExerciseId, exercises, condition }: {
    studyId: number;
    flexibilityExerciseId: number;
    concreteExerciseId: number;
    exercises: FlexibilityExerciseResponse[];
    condition: AgentCondition
}): ReactElement {
    const navigate = useNavigate();

    const [{ data, loading, error }] = useAxios({
        url: `/flexibility-training/${getCurrentLanguage()}/getSuitabilityExercise/${concreteExerciseId}`
    });

    if (loading) return <Loader />;
    if (error) {
        console.error(error);
        return <ErrorScreen text={ErrorTranslations.ERROR_LOAD} routeToReturn={Paths.FlexibilityStudyPath + studyId} showFrownIcon={true} />;
    }

    const exercise: SuitabilityExerciseProps = plainToClass(SuitabilityExerciseProps, data as SuitabilityExerciseProps);

    return <SuitabilityExercise flexibilityExerciseId={flexibilityExerciseId} condition={condition} exercise={exercise} isStudy={true}
                                studyId={studyId} handleEnd={() => navigateToNextExercise(studyId, flexibilityExerciseId, exercises, condition, navigate)} />;
}

function ExerciseForEfficiency({ studyId, flexibilityExerciseId, concreteExerciseId, exercises, condition }: {
    studyId: number;
    flexibilityExerciseId: number;
    concreteExerciseId: number;
    exercises: FlexibilityExerciseResponse[];
    condition: AgentCondition
}): ReactElement {
    const navigate = useNavigate();

    const [{ data, loading, error }] = useAxios({
        url: `/flexibility-training/${getCurrentLanguage()}/getEfficiencyExercise/${concreteExerciseId}`
    });

    if (loading) return <Loader />;
    if (error) {
        console.error(error);
        return <ErrorScreen text={ErrorTranslations.ERROR_LOAD} routeToReturn={Paths.FlexibilityStudyPath + studyId} showFrownIcon={true} />;
    }

    const exercise: EfficiencyExerciseProps = plainToClass(EfficiencyExerciseProps, data as EfficiencyExerciseProps);

    return <EfficiencyExercise flexibilityExerciseId={flexibilityExerciseId} condition={condition} exercise={exercise} isStudy={true}
                               studyId={studyId} handleEnd={() => navigateToNextExercise(studyId, flexibilityExerciseId, exercises, condition, navigate)} />;
}

function ExerciseForMatching({ studyId, flexibilityExerciseId, concreteExerciseId, exercises, condition }: {
    studyId: number;
    flexibilityExerciseId: number;
    concreteExerciseId: number;
    exercises: FlexibilityExerciseResponse[];
    condition: AgentCondition
}): ReactElement {
    const navigate = useNavigate();

    const [{ data, loading, error }] = useAxios({
        url: `/flexibility-training/${getCurrentLanguage()}/getMatchingExercise/${concreteExerciseId}`
    });

    if (loading) return <Loader />;
    if (error) {
        console.error(error);
        return <ErrorScreen text={ErrorTranslations.ERROR_LOAD} routeToReturn={Paths.FlexibilityStudyPath + studyId} showFrownIcon={true} />;
    }

    const exercise: MatchingExerciseProps = plainToClass(MatchingExerciseProps, data as MatchingExerciseProps);

    return <MatchingExercise flexibilityExerciseId={flexibilityExerciseId} condition={condition} exercise={exercise} isStudy={true}
                             studyId={studyId} handleEnd={() => navigateToNextExercise(studyId, flexibilityExerciseId, exercises, condition, navigate)} />;
}

function ExerciseWithTip({ studyId, flexibilityExerciseId, concreteExerciseId, exercises, condition }: {
    studyId: number;
    flexibilityExerciseId: number;
    concreteExerciseId: number;
    exercises: FlexibilityExerciseResponse[];
    condition: AgentCondition
}): ReactElement {
    const navigate = useNavigate();

    const [{ data, loading, error }] = useAxios({
        url: `/flexibility-training/${getCurrentLanguage()}/getTipExercise/${concreteExerciseId}`
    });

    if (loading) return <Loader />;
    if (error) {
        console.error(error);
        return <ErrorScreen text={ErrorTranslations.ERROR_LOAD} routeToReturn={Paths.FlexibilityStudyPath + studyId} showFrownIcon={true} />;
    }

    const exercise: TipExerciseProps = plainToClass(TipExerciseProps, data as TipExerciseProps);

    return <TipExercise flexibilityExerciseId={flexibilityExerciseId} condition={condition} exercise={exercise} isStudy={true}
                        studyId={studyId} handleEnd={() => navigateToNextExercise(studyId, flexibilityExerciseId, exercises, condition, navigate)} />;
}

function PlainExerciseForStudy({ studyId, flexibilityExerciseId, concreteExerciseId, exercises, condition }: {
    studyId: number;
    flexibilityExerciseId: number;
    concreteExerciseId: number;
    exercises: FlexibilityExerciseResponse[];
    condition: AgentCondition
}): ReactElement {
    const navigate = useNavigate();

    const [{ data, loading, error }] = useAxios({
        url: `/flexibility-training/${getCurrentLanguage()}/getPlainExercise/${concreteExerciseId}`
    });

    if (loading) return <Loader />;
    if (error) {
        console.error(error);
        return <ErrorScreen text={ErrorTranslations.ERROR_LOAD} routeToReturn={Paths.FlexibilityStudyPath + studyId} showFrownIcon={true} />;
    }

    const exercise: PlainExerciseProps = plainToClass(PlainExerciseProps, data as PlainExerciseProps);

    return <PlainExercise flexibilityExerciseId={flexibilityExerciseId} condition={condition} exercise={exercise} isStudy={true}
                          studyId={studyId} handleEnd={() => navigateToNextExercise(studyId, flexibilityExerciseId, exercises, condition, navigate)} />;
}