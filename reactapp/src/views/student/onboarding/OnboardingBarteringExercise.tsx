import useAxios from "axios-hooks";
import { plainToClass } from "class-transformer";
import { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { BarteringExercise as BarteringExerciseProps } from "@/types/substitution/bartering/barteringExercise.ts";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import ErrorScreen from "@components/shared/ErrorScreen.tsx";
import { OnboardingProgressOverlay } from "@components/shared/ExerciseOverlay.tsx";
import Loader from "@components/shared/Loader.tsx";
import BarteringGame from "@components/substitution/bartering/BarteringGame.tsx";
import CKExercise from "@components/views/CKExercise.tsx";
import { Paths, getPathToExercise, getPathToExercises } from "@routes/paths.ts";
import { setOnboardingStep } from "@utils/storageUtils.ts";

export default function OnboardingBarteringExercise(): ReactElement {
    return (
        <CKExercise
            routeToReturn={Paths.BarteringGameTutorialPath}
            mainRoute={GeneralTranslations.SUBSTITUTION}
            subRoute={GeneralTranslations.BARTERING}
            renderExercise={(exerciseId: number) => <Exercise exerciseId={exerciseId} />}
        />
    );
}

function Exercise({ exerciseId }: { exerciseId: number }): ReactElement {
    const navigate = useNavigate();
    const { student } = useAuth();

    const [{ data, loading, error }] = useAxios(getPathToExercise(Paths.BarteringGamePath, exerciseId));
    const [{ data: eqData, loading: eqLoading }] = useAxios(getPathToExercises(Paths.EqualizationGamePath));

    if (loading) return <Loader />;
    if (error) {
        console.error(error);
        return <ErrorScreen text={ErrorTranslations.ERROR_LOAD} routeToReturn={Paths.BarteringGameTutorialPath} showFrownIcon={true} />;
    }

    const barteringExercise: BarteringExerciseProps = plainToClass(BarteringExerciseProps, data as BarteringExerciseProps);
    barteringExercise.setTrade();
    barteringExercise.firstMerchant.setTrade();
    barteringExercise.secondMerchant.setTrade();
    barteringExercise.thirdMerchant.setTrade();

    const firstEqId = (eqData as { id: number }[] | undefined)?.[0]?.id;

    const overlay = (
        <OnboardingProgressOverlay
            message="Great work! Now let's learn about the Equalization method."
            buttonText="Continue to Equalization"
            disabled={eqLoading}
            onContinue={() => {
                if (student) setOnboardingStep(student.id, "equalization");
                navigate(Paths.EqualizationGameTutorialPath, {
                    state: { exercises: firstEqId !== undefined ? [firstEqId] : [], onboarding: true }
                });
            }}
        />
    );

    return <BarteringGame key={barteringExercise.id} exercise={barteringExercise} actionOverlay={overlay} />;
}
