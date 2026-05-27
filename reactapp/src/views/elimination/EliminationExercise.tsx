import useAxios from "axios-hooks";
import { plainToClass } from "class-transformer";
import { ReactElement } from "react";
import { EliminationExercise as EliminationExerciseProps } from "@/types/elimination/eliminationExercise.ts";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import EliminationGame from "@components/elimination/EliminationGame.tsx";
import ErrorScreen from "@components/shared/ErrorScreen.tsx";
import { ContinueWithNextExerciseOverlay } from "@components/shared/ExerciseOverlay.tsx";
import Loader from "@components/shared/Loader.tsx";
import CKExercise from "@components/views/CKExercise.tsx";
import { Paths, getPathToExercise } from "@routes/paths.ts";
import "@styles/elimination/elimination.scss";

export default function EliminationExercise(): ReactElement {
    return <CKExercise routeToReturn={Paths.EliminationPath} mainRoute={GeneralTranslations.ELIMINATION} subRoute={GeneralTranslations.NAV_GAME} renderExercise={(exerciseId: number, exercises?: number[]) => <Exercise exerciseId={exerciseId} exercises={exercises} />} />;
}

function Exercise({ exerciseId, exercises }: { exerciseId: number; exercises?: number[] }): ReactElement {
    const [{ data, loading, error }] = useAxios(getPathToExercise(Paths.EliminationGamePath, exerciseId));

    if (loading) return <Loader />;
    if (error) {
        console.error(error);
        return <ErrorScreen text={ErrorTranslations.ERROR_LOAD} routeToReturn={Paths.EliminationPath} showFrownIcon={true} />;
    }

    // Transform JSON object to class instance
    const eliminationExercise: EliminationExerciseProps = plainToClass(EliminationExerciseProps, data as EliminationExerciseProps);

    return <EliminationGame key={eliminationExercise.id} exercise={eliminationExercise} actionOverlay={<ContinueWithNextExerciseOverlay currentExercise={exerciseId} exercises={exercises} routeToReturn={Paths.EliminationPath} routeToNextExercise={Paths.EliminationGamePath + Paths.ExercisesSubPath} />} />;
}
