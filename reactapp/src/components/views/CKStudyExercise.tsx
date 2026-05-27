import { useAuth } from "@/contexts/AuthProvider.tsx";
import { ReactElement } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useLocation, useParams } from "react-router-dom";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import ErrorScreen from "@components/shared/ErrorScreen.tsx";
import NavigationBar from "@components/shared/NavigationBar.tsx";
import OrientationModal from "@components/shared/OrientationModal.tsx";
import { Paths } from "@routes/paths.ts";

export default function CKStudyExercise({ mainRoute, subRoute, renderExercise }: { mainRoute: string; subRoute: string; renderExercise: (exerciseId: string, studyId: string) => ReactElement }): ReactElement {
    const { logout } = useAuth();
    const { exerciseId, studyId } = useParams();
    const location = useLocation();

    if (studyId === undefined || studyId === "undefined") {
        logout();
        return <ErrorScreen text={ErrorTranslations.ERROR_STUDY_ID} routeToReturn={Paths.StudiesLoginPath} showFrownIcon={true} />;
    }

    if (exerciseId === undefined || exerciseId === "undefined") {
        return <ErrorScreen text={ErrorTranslations.ERROR_EXERCISE_ID} routeToReturn={Paths.CKStudyPath + studyId} showFrownIcon={true} />;
    }

    return (
        <ErrorBoundary
            key={location.pathname}
            FallbackComponent={(error) => {
                console.error(error);
                return <ErrorScreen text={ErrorTranslations.ERROR_STUDY_ERROR} routeToReturn={Paths.CKStudyPath + studyId} />;
            }}
        >
            <div className={"full-page"}>
                <NavigationBar mainRoute={mainRoute} subRoute={subRoute} isStudy={true} />
                {renderExercise(exerciseId, studyId)}
            </div>
            <OrientationModal />
        </ErrorBoundary>
    );
}
