import { useAuth } from "@/contexts/AuthProvider.tsx";
import useAxios from "axios-hooks";
import { plainToClass } from "class-transformer";
import { ReactElement } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { EliminationExercise as EliminationExerciseProps } from "@/types/elimination/eliminationExercise.ts";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import EliminationGame from "@components/elimination/EliminationGame.tsx";
import ErrorScreen from "@components/shared/ErrorScreen.tsx";
import Loader from "@components/shared/Loader.tsx";
import CKStudyExercise from "@components/views/CKStudyExercise.tsx";
import { Paths, getPathToStudyExercise } from "@routes/paths.ts";

export default function EliminationStudyExercise(): ReactElement {
    const location = useLocation();
    const collectData = location.state?.collectData ?? true;
    return <CKStudyExercise mainRoute={GeneralTranslations.ELIMINATION} subRoute={GeneralTranslations.NAV_GAME} renderExercise={(exerciseId: string, studyId: string) => <Exercise exerciseId={exerciseId} studyId={studyId} collectData={collectData} />} />;
}

function Exercise({ exerciseId, studyId, collectData }: { exerciseId: string; studyId: string; collectData: boolean }): ReactElement {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [{ data, loading, error }] = useAxios({
        url: getPathToStudyExercise(Paths.EliminationGamePath, exerciseId),
        headers: {
            Authorization: "Bearer " + user?.token
        }
    });

    if (loading) return <Loader />;
    if (error) {
        console.error(error);
        if (error.response?.status === 401) {
            logout();
            navigate(Paths.StudiesLoginPath);
        }
        return <ErrorScreen text={ErrorTranslations.ERROR_LOAD} routeToReturn={Paths.CKStudyPath + studyId} showFrownIcon={true} />;
    }

    // Transform JSON object to class instance
    const eliminationExercise: EliminationExerciseProps = plainToClass(EliminationExerciseProps, data as EliminationExerciseProps);

    return <EliminationGame key={eliminationExercise.id} exercise={eliminationExercise} isStudy={true} studyId={parseInt(studyId)} collectData={collectData} />;
}
