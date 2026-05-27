import useAxios from "axios-hooks";
import { plainToClass } from "class-transformer";
import { ReactElement } from "react";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { BarteringExercise as BarteringExerciseProps } from "@/types/substitution/bartering/barteringExercise.ts";
import ErrorScreen from "@components/shared/ErrorScreen.tsx";
import { ContinueWithNextExerciseOverlay } from "@components/shared/ExerciseOverlay.tsx";
import Loader from "@components/shared/Loader.tsx";
import BarteringGame from "@components/substitution/bartering/BarteringGame.tsx";
import CKExercise from "@components/views/CKExercise.tsx";
import { Paths, getPathToExercise } from "@routes/paths.ts";

export default function BarteringExercise(): ReactElement {
    return <CKExercise routeToReturn={Paths.SubstitutionPath} mainRoute={GeneralTranslations.SUBSTITUTION} subRoute={GeneralTranslations.BARTERING} renderExercise={(exerciseId: number, exercises?: number[]) => <Exercise exerciseId={exerciseId} exercises={exercises} />} />;
}

function Exercise({ exerciseId, exercises }: { exerciseId: number; exercises?: number[] }): ReactElement {
    const [{ data, loading, error }] = useAxios(getPathToExercise(Paths.BarteringGamePath, exerciseId));

    if (loading) return <Loader />;
    if (error) {
        console.error(error);
        return <ErrorScreen text={ErrorTranslations.ERROR_LOAD} routeToReturn={Paths.SubstitutionPath} showFrownIcon={true} />;
    }

    // Transform JSON object to class instance
    const barteringExercise: BarteringExerciseProps = plainToClass(BarteringExerciseProps, data as BarteringExerciseProps);
    // Initialize trade objects
    barteringExercise.setTrade();
    barteringExercise.firstMerchant.setTrade();
    barteringExercise.secondMerchant.setTrade();
    barteringExercise.thirdMerchant.setTrade();

    return <BarteringGame key={barteringExercise.id} exercise={barteringExercise} actionOverlay={<ContinueWithNextExerciseOverlay currentExercise={exerciseId} exercises={exercises} routeToReturn={Paths.SubstitutionPath} routeToNextExercise={Paths.BarteringGamePath + Paths.ExercisesSubPath} />} />;
}
