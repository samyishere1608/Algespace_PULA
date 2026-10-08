import { ReactElement } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { OnboardingTour } from "@components/shared/OnboardingTour.tsx";
import { TOUR_STEPS, isTourActive, readTourStep } from "@utils/onboardingTour.ts";

/**
 * Resumes the walkthrough on the pages it walks the student through.
 *
 * A component mounted inside the router is unmounted the moment the tour navigates, and the walkthrough
 * spans routes by design — it takes the student out of the dashboard and into the flexibility training
 * area. So the overlay is mounted by whichever page is currently on screen, and the step index plus
 * the "in progress" flag (both in sessionStorage) carry it across the navigation instead of restarting.
 *
 * Renders NOTHING unless a tour is genuinely under way AND the current step belongs to this page. That
 * second condition matters: the flag is cleared when a tour ends or is skipped, but a student who
 * leaves a half-finished tour some other way — the browser's Back button, or typing a URL — leaves it
 * set. Without the check, the overlay would then land on top of an unrelated page for the rest of the
 * tab's session. With it, the worst case is that the tour resumes where it stopped, which is exactly
 * what it is meant to do.
 *
 * This also means a student who merely browses to the flexibility list is never shown a tour.
 */
export function TourHost(): ReactElement | null {
    const { student } = useAuth();
    const { pathname } = useLocation();

    if (!isTourActive()) return null;

    const index = Math.min(readTourStep(), TOUR_STEPS.length - 1);
    const step = TOUR_STEPS[index];
    if (step === undefined || step.route !== pathname) return null;

    return <OnboardingTour studentId={student?.id ?? "guest"} steps={TOUR_STEPS} />;
}
