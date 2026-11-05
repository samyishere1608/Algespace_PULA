import { useAuth } from "@/contexts/AuthProvider.tsx";
import Home from "@/views/Home";
import { ReactElement, useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Navigate, Outlet, RouterProvider, createBrowserRouter } from "react-router-dom";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import About from "@views/About.tsx";
import EliminationExercise from "@views/elimination/EliminationExercise.tsx";
import EliminationGameTutorial from "@views/elimination/EliminationGameTutorial.tsx";
import EliminationView from "@views/elimination/EliminationView.tsx";
import EqualizationExercise from "@views/equalization/EqualizationExercise.tsx";
import EqualizationGameTutorial from "@views/equalization/EqualizationGameTutorial.tsx";
import EqualizationView from "@views/equalization/EqualizationView.tsx";
import FlexibilityStudyExamplesView from "@views/flexibility/FlexibilityStudyExamplesView.tsx";
import FlexibilityView from "@views/flexibility/FlexibilityView.tsx";
import LoginView from "@views/studies/LoginView.tsx";
import {FlexibilityStudyOptional } from "@views/studies/flexibility/FlexibilityStudyOptionalTasks.tsx";
import BarteringStudyExercise from "@views/studies/conceptual-knowledge/BarteringStudyExercise.tsx";
import CKStudyView from "@views/studies/conceptual-knowledge/CKStudyView.tsx";
import EliminationStudyExercise from "@views/studies/conceptual-knowledge/EliminationStudyExercise.tsx";
import EqualizationStudyExercise from "@views/studies/conceptual-knowledge/EqualizationStudyExercise.tsx";
import SubstitutionStudyExercise from "@views/studies/conceptual-knowledge/SubstitutionStudyExercise.tsx";
import BarteringExercise from "@views/substitution/BarteringExercise.tsx";
import BarteringGameTutorial from "@views/substitution/BarteringGameTutorial.tsx";
import SubstitutionExercise from "@views/substitution/SubstitutionExercise.tsx";
import SubstitutionGameTutorial from "@views/substitution/SubstitutionGameTutorial.tsx";
import SubstitutionView from "@views/substitution/SubstitutionView.tsx";
import StudentLoginView from "@views/student/StudentLoginView.tsx";
import StudentRegisterView from "@views/student/StudentRegisterView.tsx";
import StudentDashboard from "@views/student/StudentDashboard.tsx";
import DevReflectionLab from "@views/dev/DevReflectionLab.tsx";
import FlexibilityPreview from "@views/student/dashboard/FlexibilityPreview.tsx";
import OnboardingBarteringExercise from "@views/student/onboarding/OnboardingBarteringExercise.tsx";
import OnboardingEqualizationExercise from "@views/student/onboarding/OnboardingEqualizationExercise.tsx";
import OnboardingEliminationExercise from "@views/student/onboarding/OnboardingEliminationExercise.tsx";
import OnboardingResume from "@views/student/onboarding/OnboardingResume.tsx";
import ErrorScreen, { HomeErrorFallback, RouteNotFound } from "@components/shared/ErrorScreen.tsx";
import UnsupportedDevicesBoundary from "@components/views/UnsupportedDevicesBoundary.tsx";
import AuthenticatedRoute from "@routes/AuthenticatedRoute.tsx";
import { Paths } from "@routes/paths.ts";
import FlexibilityExercise from "@views/flexibility/FlexibilityExercise.tsx";
import { FlexibilityStudyView } from "@views/studies/flexibility/FlexibilityStudyView.tsx";
import FlexibilityStudyExercise from "@views/studies/flexibility/FlexibilityStudyExercise.tsx";
import { FlexibilityStudyEnd } from "@views/studies/flexibility/FlexibilityStudyEnd.tsx";
import { EqualizationDemoExercise } from "@views/studies/flexibility/EqualizationDemoExercise.tsx";
import { SubstitutionDemoExercise } from "@views/studies/flexibility/SubstitutionDemoExercise.tsx";
import { EliminationDemoExercise } from "@views/studies/flexibility/EliminationDemoExercise.tsx";
import { isControlStudent } from "@utils/studyCondition.ts";
import { isPlainMode } from "@utils/plainMode.ts";
import PlainLayout from "@views/plain/PlainLayout.tsx";

/**
 * The dashboard, for the treatment arm only.
 *
 * A control student has no dashboard — they work through the plain flexibility module — so every way
 * into this page has to end up on the exercise list instead: a bookmark, the browser's back button, a
 * typed URL. Guarded as a route rather than inside the dashboard because that view starts several
 * reads the moment it mounts, and a control account should not be fetching analytics for a page it is
 * never going to be shown.
 */
function TreatmentDashboardRoute(): ReactElement {
    const { student } = useAuth();

    if (isControlStudent(student)) {
        return <Navigate to={Paths.FlexibilityPath} replace />;
    }

    return <StudentDashboard />;
}


export default function Routes(): ReactElement {
    const { user } = useAuth();

    const RouteErrorBoundaryLayout = () => (
        <ErrorBoundary key={"route-boundary"} FallbackComponent={() => <ErrorScreen text={"test"} routeToReturn={Paths.HomePath} showFrownIcon={true} />}>
            <Outlet />
        </ErrorBoundary>
    );

    const StudyErrorBoundaryLayout = () => (
        <ErrorBoundary key={"study-boundary"}
                       FallbackComponent={() => <ErrorScreen text={ErrorTranslations.ERROR_INVALID_STUDY} routeToReturn={Paths.StudiesLoginPath} />}>
            <Outlet />
        </ErrorBoundary>
    );

    const homeRoute = [
        {
            path: Paths.HomePath,
            element: (
                <ErrorBoundary key={"home-boundary"} FallbackComponent={HomeErrorFallback}>
                    <UnsupportedDevicesBoundary>
                        <Home />
                    </UnsupportedDevicesBoundary>
                </ErrorBoundary>
            )
        }
    ];

    /**
     * The four modules, listed once.
     *
     * Both the ordinary app and the plain version mount these, so they are written here rather than
     * twice: a module that gains a screen gains it in both entrances, and neither can drift into
     * being a slightly different module. The plain version is not a copy of the app — it is the same
     * screens reached through a different front door.
     */
    const moduleRoutes = [
        {
            path: Paths.EqualizationPath,
            element: (
                <UnsupportedDevicesBoundary>
                    <EqualizationView />
                </UnsupportedDevicesBoundary>
            )
        },
        {
            path: Paths.EqualizationGameExercisePath,
            element: <EqualizationExercise />
        },
        {
            path: Paths.EqualizationGameTutorialPath,
            element: <EqualizationGameTutorial />
        },
        {
            path: Paths.SubstitutionPath,
            element: (
                <UnsupportedDevicesBoundary>
                    <SubstitutionView />
                </UnsupportedDevicesBoundary>
            )
        },
        {
            path: Paths.BarteringGameExercisePath,
            element: <BarteringExercise />
        },
        {
            path: Paths.BarteringGameTutorialPath,
            element: <BarteringGameTutorial />
        },
        {
            path: Paths.SubstitutionGameExercisePath,
            element: <SubstitutionExercise />
        },
        {
            path: Paths.SubstitutionGameTutorialPath,
            element: <SubstitutionGameTutorial />
        },
        {
            path: Paths.EliminationPath,
            element: (
                <UnsupportedDevicesBoundary>
                    <EliminationView />
                </UnsupportedDevicesBoundary>
            )
        },
        {
            path: Paths.EliminationGameExercisePath,
            element: <EliminationExercise />
        },
        {
            path: Paths.EliminationGameTutorialPath,
            element: <EliminationGameTutorial />
        },
        {
            path: Paths.FlexibilityPath,
            element: <FlexibilityView />
        },
        {
            path: Paths.FlexibilityExercisePath,
            element: <FlexibilityExercise isStudyExample={false} />
        }
    ];

    const publicRoutes = [
        {
            element: <RouteErrorBoundaryLayout />,
            children: [
                ...moduleRoutes,
                {
                    path: Paths.AboutPath,
                    element: <About />
                },
                {
                    path: Paths.StudentLoginPath,
                    element: <StudentLoginView />
                },
                {
                    path: Paths.StudentRegisterPath,
                    element: <StudentRegisterView />
                },
                {
                    path: Paths.StudentDashboardPath,
                    element: <TreatmentDashboardRoute />
                },
                // Developer only. Compiled out of a production build rather than merely hidden, so the
                // route cannot be reached on a deployed copy at all.
                ...(import.meta.env.DEV
                    ? [{
                        path: Paths.DevReflectionLabPath,
                        element: <DevReflectionLab />
                    }]
                    : []),
                // A read-only stand-in for a flexibility exercise, used only by the walkthrough. It is
                // a sibling of the dashboard rather than a child of it, because it is its own screen
                // with its own shell — see FlexibilityPreview.tsx for why a real one cannot be used.
                {
                    path: Paths.TourFlexibilityPreviewPath,
                    element: <FlexibilityPreview />
                },
                {
                    path: Paths.OnboardingResumePath,
                    element: <OnboardingResume />
                },
                {
                    path: Paths.OnboardingBarteringGameExercisePath,
                    element: <OnboardingBarteringExercise />
                },
                {
                    path: Paths.OnboardingEqualizationGameExercisePath,
                    element: <OnboardingEqualizationExercise />
                },
                {
                    path: Paths.OnboardingEliminationGameExercisePath,
                    element: <OnboardingEliminationExercise />
                },
                {
                    path: "*",
                    element: <RouteNotFound />
                }
            ]
        }
    ];

    /**
     * The plain version: the ordinary home page with its full module map, the four modules behind it,
     * and nothing else.
     *
     * No sign-in, no dashboard, no study, no tour. The paths are the ordinary ones because this tree
     * is mounted with `/plain` as its basename, which is also what makes the modules' own links work
     * unchanged: `/equalization` typed by a component becomes `/plain/equalization` in the address bar.
     */
    const plainRoutes = [
        {
            element: <RouteErrorBoundaryLayout />,
            children: [
                {
                    element: <PlainLayout />,
                    children: [
                        {
                            path: Paths.HomePath,
                            element: <Home />
                        },
                        {
                            path: Paths.AboutPath,
                            element: <About />
                        },
                        ...moduleRoutes,
                        {
                            path: "*",
                            element: <RouteNotFound />
                        }
                    ]
                }
            ]
        }
    ];

    const authenticatedRoutes = [
        {
            element: <AuthenticatedRoute />,
            children: [
                {
                    element: <StudyErrorBoundaryLayout />,
                    children: [
                        {
                            path: Paths.CKConcreteStudyPath,
                            element: <CKStudyView />
                        },
                        {
                            path: Paths.CKConcreteStudyPath + Paths.EqualizationGameTutorialPath,
                            element: <EqualizationGameTutorial isStudy={true} />
                        },
                        {
                            path: Paths.CKConcreteStudyPath + Paths.EqualizationGameExercisePath,
                            element: <EqualizationStudyExercise />
                        },
                        {
                            path: Paths.CKConcreteStudyPath + Paths.BarteringGameTutorialPath,
                            element: <BarteringGameTutorial isStudy={true} />
                        },
                        {
                            path: Paths.CKConcreteStudyPath + Paths.BarteringGameExercisePath,
                            element: <BarteringStudyExercise />
                        },
                        {
                            path: Paths.CKConcreteStudyPath + Paths.SubstitutionGameTutorialPath,
                            element: <SubstitutionGameTutorial isStudy={true} />
                        },
                        {
                            path: Paths.CKConcreteStudyPath + Paths.SubstitutionGameExercisePath,
                            element: <SubstitutionStudyExercise />
                        },
                        {
                            path: Paths.CKConcreteStudyPath + Paths.EliminationGameTutorialPath,
                            element: <EliminationGameTutorial isStudy={true} />
                        },
                        {
                            path: Paths.CKConcreteStudyPath + Paths.EliminationGameExercisePath,
                            element: <EliminationStudyExercise />
                        },
                        {
                            path: Paths.FlexibilityStudyExamplesPath,
                            element: <FlexibilityStudyExamplesView />
                        },
                        {
                            path: Paths.FlexibilityStudyExamplesExercisePath,
                            element: <FlexibilityExercise isStudyExample={true} />
                        },
                        {
                            path: Paths.FlexibilityConcreteStudyPath,
                            element: <FlexibilityStudyView />
                        },
                        {
                            path: Paths.FlexibilityStudyExercisePath,
                            element: <FlexibilityStudyExercise />
                        },
                        {
                            path: Paths.FlexibilityStudyEqualizationDemoPath,
                            element: <EqualizationDemoExercise />
                        },
                        {
                            path: Paths.FlexibilityStudySubstitutionDemoPath,
                            element: <SubstitutionDemoExercise />
                        },
                        {
                            path: Paths.FlexibilityStudyEliminationDemoPath,
                            element: <EliminationDemoExercise />
                        },
                        {
                            path: Paths.FlexibilityStudyEndPath,
                            element: <FlexibilityStudyEnd />
                        },
                        {
                            path: Paths.FlexibilityStudyOptional,
                            element: <FlexibilityStudyOptional />
                        }
                    ]
                }
            ]
        }
    ];

    const authenticatedForbiddenRoutes = [
        {
            element: <RouteErrorBoundaryLayout />,
            children: [
                {
                    path: Paths.StudiesLoginPath,
                    element: <LoginView />
                }
            ]
        }
    ];

    // Decided once, from the URL. `/plain` is a separate browser router with its own basename rather
    // than a branch inside the ordinary one, because that is what prefixes every existing path and
    // every existing link without a single module knowing it is being reached from somewhere else.
    const plain: boolean = isPlainMode();

    const router = useMemo(
        () =>
            plain
                ? createBrowserRouter(plainRoutes, { basename: Paths.PlainPrefix })
                : createBrowserRouter([...homeRoute, ...publicRoutes, ...authenticatedRoutes, ...(user === undefined ? authenticatedForbiddenRoutes : [])]),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [user, plain]
    );

    //const router = createBrowserRouter([...homeRoute, ...publicRoutes]); // Authenticated routes are only required for conducting studies

    return <RouterProvider router={router} />;
}
