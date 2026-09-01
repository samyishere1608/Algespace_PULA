import useAxios from "axios-hooks";
import { plainToClass } from "class-transformer";
import { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { EqualizationExercise as EqualizationExerciseProps } from "@/types/equalization/equalizationExercise.ts";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import EqualizationGame from "@components/equalization/EqualizationGame.tsx";
import ErrorScreen from "@components/shared/ErrorScreen.tsx";
import { OnboardingProgressOverlay } from "@components/shared/ExerciseOverlay.tsx";
import Loader from "@components/shared/Loader.tsx";
import CKExercise from "@components/views/CKExercise.tsx";
import { Paths, getPathToExercise, getPathToExercises } from "@routes/paths.ts";
import { setOnboardingStep } from "@utils/storageUtils.ts";
import "@styles/equalization/equalization.scss";
import "@styles/shared/draggable.scss";

export default function OnboardingEqualizationExercise(): ReactElement {
    return (
        <CKExercise
            routeToReturn={Paths.EqualizationGameTutorialPath}
            mainRoute={GeneralTranslations.EQUALIZATION}
            subRoute={GeneralTranslations.NAV_GAME}
            renderExercise={(exerciseId: number) => <Exercise exerciseId={exerciseId} />}
        />
    );
}

function Exercise({ exerciseId }: { exerciseId: number }): ReactElement {
    const navigate = useNavigate();
    const { student } = useAuth();
    const { t } = useTranslation(TranslationNamespaces.Student);

    const [{ data, loading, error }] = useAxios(getPathToExercise(Paths.EqualizationGamePath, exerciseId));
    const [{ data: elData, loading: elLoading }] = useAxios(getPathToExercises(Paths.EliminationGamePath));

    if (loading) return <Loader />;
    if (error) {
        console.error(error);
        return <ErrorScreen text={ErrorTranslations.ERROR_LOAD} routeToReturn={Paths.EqualizationGameTutorialPath} showFrownIcon={true} />;
    }

    const equalizationExercise: EqualizationExerciseProps = plainToClass(EqualizationExerciseProps, data as EqualizationExerciseProps);
    equalizationExercise.firstEquation.initializeItemArrays(equalizationExercise);
    equalizationExercise.secondEquation.initializeItemArrays(equalizationExercise);

    const firstElId = (elData as { id: number }[] | undefined)?.[0]?.id;

    const overlay = (
        <OnboardingProgressOverlay
            message={t("onboarding-equalization-message")}
            buttonText={t("onboarding-equalization-cta")}
            disabled={elLoading}
            onContinue={() => {
                if (student) setOnboardingStep(student.id, "elimination");
                navigate(Paths.EliminationGameTutorialPath, {
                    state: { exercises: firstElId !== undefined ? [firstElId] : [], onboarding: true }
                });
            }}
        />
    );

    return <EqualizationGame key={equalizationExercise.id} exercise={equalizationExercise} actionOverlay={overlay} />;
}
