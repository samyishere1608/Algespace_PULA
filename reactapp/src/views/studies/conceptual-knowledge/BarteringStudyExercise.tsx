import { useAuth } from "@/contexts/AuthProvider.tsx";
import useAxios from "axios-hooks";
import { plainToClass } from "class-transformer";
import { ReactElement } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { BarteringExercise as BarteringExerciseProps } from "@/types/substitution/bartering/barteringExercise.ts";
import ErrorScreen from "@components/shared/ErrorScreen.tsx";
import Loader from "@components/shared/Loader.tsx";
import BarteringGame from "@components/substitution/bartering/BarteringGame.tsx";
import CKStudyExercise from "@components/views/CKStudyExercise.tsx";
import { Paths, getPathToStudyExercise } from "@routes/paths.ts";

export default function BarteringStudyExercise(): ReactElement {
    const location = useLocation();
    const collectData = location.state?.collectData ?? true;
    return <CKStudyExercise mainRoute={GeneralTranslations.SUBSTITUTION} subRoute={GeneralTranslations.BARTERING} renderExercise={(exerciseId: string, studyId: string) => <Exercise exerciseId={exerciseId} studyId={studyId} collectData={collectData} />} />;
}

function Exercise({ exerciseId, studyId, collectData }: { exerciseId: string; studyId: string; collectData: boolean }): ReactElement | undefined {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [{ data, loading, error }] = useAxios({
        url: getPathToStudyExercise(Paths.BarteringGamePath, exerciseId),
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
    const barteringExercise: BarteringExerciseProps = plainToClass(BarteringExerciseProps, data as BarteringExerciseProps);
    // Initialize trade objects
    barteringExercise.setTrade();
    barteringExercise.firstMerchant.setTrade();
    barteringExercise.secondMerchant.setTrade();
    barteringExercise.thirdMerchant.setTrade();

    return <BarteringGame key={barteringExercise.id} exercise={barteringExercise} isStudy={true} studyId={parseInt(studyId)} collectData={collectData} />;
}
