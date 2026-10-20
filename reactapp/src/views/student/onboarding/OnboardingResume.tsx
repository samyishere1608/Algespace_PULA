import useAxios from "axios-hooks";
import { ReactElement, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import Loader from "@components/shared/Loader.tsx";
import { Paths, getPathToExercises } from "@routes/paths.ts";
import { getOnboardingStep, startOnboardingDemos } from "@utils/storageUtils.ts";
import { SKIP_CONCEPT_TUTORIAL } from "@/config/study.ts";

/**
 * Intermediate route that reads the student's current onboarding step,
 * fetches the first exercise for that module, and redirects to the right tutorial.
 * Used by the "Continue Tutorial" button on the home page.
 */
export default function OnboardingResume(): ReactElement {
    const { student } = useAuth();
    const navigate = useNavigate();

    const step = student ? (getOnboardingStep(student.id) ?? "bartering") : "bartering";

    // A stale link or a saved bookmark can still arrive here after the pilot turned the concept tour
    // off. Honour the setting rather than starting a tour the study does not want. The fetch below is
    // skipped entirely in that case: it exists only to find the first exercise of the tour, and it
    // would otherwise finish after this redirect and navigate straight into the tutorial anyway.
    useEffect(() => {
        if (SKIP_CONCEPT_TUTORIAL) navigate(Paths.StudentDashboardPath, { replace: true });
    }, [navigate]);

    // Resuming the tour from the "Continue tutorial" button: still a demonstration.
    useEffect(() => {
        if (!SKIP_CONCEPT_TUTORIAL) startOnboardingDemos();
    }, []);

    const exercisePath =
        step === "equalization" ? Paths.EqualizationGamePath :
        step === "elimination" ? Paths.EliminationGamePath :
        Paths.BarteringGamePath;

    const tutorialPath =
        step === "equalization" ? Paths.EqualizationGameTutorialPath :
        step === "elimination" ? Paths.EliminationGameTutorialPath :
        Paths.BarteringGameTutorialPath;

    // `useAxios` cannot be called conditionally, so the request is made with its own guard instead.
    const [{ data, loading, error }] = useAxios(getPathToExercises(exercisePath), { manual: SKIP_CONCEPT_TUTORIAL });

    useEffect(() => {
        if (SKIP_CONCEPT_TUTORIAL) return;
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
