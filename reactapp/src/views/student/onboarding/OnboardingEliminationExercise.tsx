import useAxios from "axios-hooks";
import { plainToClass } from "class-transformer";
import { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { EliminationExercise as EliminationExerciseProps } from "@/types/elimination/eliminationExercise.ts";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import EliminationGame from "@components/elimination/EliminationGame.tsx";
import ErrorScreen from "@components/shared/ErrorScreen.tsx";
import { OnboardingProgressOverlay } from "@components/shared/ExerciseOverlay.tsx";
import Loader from "@components/shared/Loader.tsx";
import CKExercise from "@components/views/CKExercise.tsx";
import { Paths, getPathToExercise } from "@routes/paths.ts";
import { setOnboardingStep } from "@utils/storageUtils.ts";
import "@styles/elimination/elimination.scss";

export default function OnboardingEliminationExercise(): ReactElement {
    return (
        <CKExercise
            routeToReturn={Paths.EliminationGameTutorialPath}
            mainRoute={GeneralTranslations.ELIMINATION}
            subRoute={GeneralTranslations.NAV_GAME}
            renderExercise={(exerciseId: number) => <Exercise exerciseId={exerciseId} />}
        />
    );
}

function Exercise({ exerciseId }: { exerciseId: number }): ReactElement {
    const navigate = useNavigate();
    const { student } = useAuth();
    const { t } = useTranslation(TranslationNamespaces.Student);

    const [{ data, loading, error }] = useAxios(getPathToExercise(Paths.EliminationGamePath, exerciseId));

    if (loading) return <Loader />;
    if (error) {
        console.error(error);
        return <ErrorScreen text={ErrorTranslations.ERROR_LOAD} routeToReturn={Paths.EliminationGameTutorialPath} showFrownIcon={true} />;
    }

    const eliminationExercise: EliminationExerciseProps = plainToClass(EliminationExerciseProps, data as EliminationExerciseProps);

    const overlay = (
        <OnboardingProgressOverlay
            message={t("onboarding-elimination-message")}
            buttonText={t("onboarding-elimination-cta")}
            onContinue={() => {
                if (student) setOnboardingStep(student.id, "complete");
                navigate(Paths.StudentDashboardPath);
            }}
        />
    );

    return <EliminationGame key={eliminationExercise.id} exercise={eliminationExercise} actionOverlay={overlay} />;
}
