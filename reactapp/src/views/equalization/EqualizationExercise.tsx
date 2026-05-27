import useAxios from "axios-hooks";
import { plainToClass } from "class-transformer";
import { ReactElement } from "react";
import { EqualizationExercise as EqualizationExerciseProps } from "@/types/equalization/equalizationExercise.ts";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import EqualizationGame from "@components/equalization/EqualizationGame.tsx";
import ErrorScreen from "@components/shared/ErrorScreen.tsx";
import { ContinueWithNextExerciseOverlay } from "@components/shared/ExerciseOverlay.tsx";
import Loader from "@components/shared/Loader.tsx";
import CKExercise from "@components/views/CKExercise.tsx";
import { Paths, getPathToExercise } from "@routes/paths.ts";
import "@styles/equalization/equalization.scss";
import "@styles/shared/draggable.scss";

export default function EqualizationExercise(): ReactElement {
    return <CKExercise routeToReturn={Paths.EqualizationPath} mainRoute={GeneralTranslations.EQUALIZATION} subRoute={GeneralTranslations.NAV_GAME} renderExercise={(exerciseId: number, exercises?: number[]) => <Exercise exerciseId={exerciseId} exercises={exercises} />} />;
}

function Exercise({ exerciseId, exercises }: { exerciseId: number; exercises?: number[] }): ReactElement {
    const [{ data, loading, error }] = useAxios(getPathToExercise(Paths.EqualizationGamePath, exerciseId));

    if (loading) return <Loader />;
    if (error) {
        console.error(error);
        return <ErrorScreen text={ErrorTranslations.ERROR_LOAD} routeToReturn={Paths.EqualizationPath} showFrownIcon={true} />;
    }

    // Transform JSON object to class instance
    const equalizationExercise: EqualizationExerciseProps = plainToClass(EqualizationExerciseProps, data as EqualizationExerciseProps);
    equalizationExercise.firstEquation.initializeItemArrays(equalizationExercise);
    equalizationExercise.secondEquation.initializeItemArrays(equalizationExercise);

    return <EqualizationGame key={equalizationExercise.id} exercise={equalizationExercise} actionOverlay={<ContinueWithNextExerciseOverlay currentExercise={exerciseId} exercises={exercises} routeToReturn={Paths.EqualizationPath} routeToNextExercise={Paths.EqualizationGamePath + Paths.ExercisesSubPath} />} />;
}
