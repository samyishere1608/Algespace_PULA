import useAxios from "axios-hooks";
import { ReactElement, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import Loader from "@components/shared/Loader.tsx";
import { Paths, getPathToExercises } from "@routes/paths.ts";
import { getOnboardingStep } from "@utils/storageUtils.ts";

/**
 * Intermediate route that reads the student's current onboarding step,
 * fetches the first exercise for that module, and redirects to the right tutorial.
 * Used by the "Continue Tutorial" button on the home page.
 */
export default function OnboardingResume(): ReactElement {
    const { student } = useAuth();
    const navigate = useNavigate();

    const step = student ? (getOnboardingStep(student.id) ?? "bartering") : "bartering";

    const exercisePath =
        step === "equalization" ? Paths.EqualizationGamePath :
        step === "elimination" ? Paths.EliminationGamePath :
        Paths.BarteringGamePath;

    const tutorialPath =
        step === "equalization" ? Paths.EqualizationGameTutorialPath :
        step === "elimination" ? Paths.EliminationGameTutorialPath :
        Paths.BarteringGameTutorialPath;

    const [{ data, loading, error }] = useAxios(getPathToExercises(exercisePath));

    useEffect(() => {
        if (loading) return;
        if (error || !data) {
            navigate(tutorialPath, { state: { exercises: [], onboarding: true } });
            return;
        }
        const firstId = (data as { id: number }[])[0]?.id;
        navigate(tutorialPath, {
            state: { exercises: firstId !== undefined ? [firstId] : [], onboarding: true }
        });
    }, [loading, data, error]);

    return <Loader />;
}
