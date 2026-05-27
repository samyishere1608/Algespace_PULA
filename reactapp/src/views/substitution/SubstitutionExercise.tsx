import useAxios from "axios-hooks";
import { plainToClass } from "class-transformer";
import { ReactElement } from "react";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { SubstitutionExercise as SubstitutionExerciseProps } from "@/types/substitution/conceptual-knowledge/substitutionExercise.ts";
import ErrorScreen from "@components/shared/ErrorScreen.tsx";
import { ContinueWithNextExerciseOverlay } from "@components/shared/ExerciseOverlay.tsx";
import Loader from "@components/shared/Loader.tsx";
import SubstitutionGame from "@components/substitution/conceptual-knowledge/SubstitutionGame.tsx";
import CKExercise from "@components/views/CKExercise.tsx";
import { Paths, getPathToExercise } from "@routes/paths.ts";
import "@styles/substitution/substitution.scss";

export default function SubstitutionExercise(): ReactElement {
    return <CKExercise routeToReturn={Paths.SubstitutionPath} mainRoute={GeneralTranslations.SUBSTITUTION} subRoute={GeneralTranslations.NAV_GAME} renderExercise={(exerciseId: number, exercises?: number[]) => <Exercise exerciseId={exerciseId} exercises={exercises} />} />;
}

function Exercise({ exerciseId, exercises }: { exerciseId: number; exercises?: number[] }): ReactElement {
    const [{ data, loading, error }] = useAxios(getPathToExercise(Paths.SubstitutionGamePath, exerciseId));

    if (loading) return <Loader />;
    if (error) {
        console.error(error);
        return <ErrorScreen text={ErrorTranslations.ERROR_LOAD} routeToReturn={Paths.SubstitutionPath} showFrownIcon={true} />;
    }

    // Transform JSON object to class instance
    const substitutionExercise: SubstitutionExerciseProps = plainToClass(SubstitutionExerciseProps, data as SubstitutionExerciseProps);

    return <SubstitutionGame key={substitutionExercise.id} exercise={substitutionExercise} actionOverlay={<ContinueWithNextExerciseOverlay currentExercise={exerciseId} exercises={exercises} routeToReturn={Paths.SubstitutionPath} routeToNextExercise={Paths.SubstitutionGamePath + Paths.ExercisesSubPath} />} />;
}
