import { ReactElement, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useLocation, useParams } from "react-router-dom";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import ErrorScreen from "@components/shared/ErrorScreen.tsx";
import { ExitExerciseOverlay } from "@components/shared/ExerciseOverlay.tsx";
import NavigationBar from "@components/shared/NavigationBar.tsx";
import OrientationModal from "@components/shared/OrientationModal.tsx";
import { getExerciseNumber, handleNavigationClick } from "@utils/utils.ts";

export default function CKExercise({ routeToReturn, mainRoute, subRoute, renderExercise }: {
    routeToReturn: string;
    mainRoute: string;
    subRoute: string;
    renderExercise: (exerciseId: number, exercises?: number[]) => ReactElement
}): ReactElement {
    const [exitOverlay, setExitOverlay] = useState<[boolean, boolean]>([false, false]);
    const location = useLocation();
    const { exerciseId } = useParams();

    if (exerciseId === undefined || exerciseId === "undefined") {
        return <ErrorScreen text={ErrorTranslations.ERROR_EXERCISE_ID} routeToReturn={routeToReturn} showFrownIcon={true} />;
    }

    const id: number = parseInt(exerciseId);
    const currentExercise: number | undefined = getExerciseNumber(id, location.state?.exercises);

    return (
        <ErrorBoundary key={location.pathname} FallbackComponent={() => <ErrorScreen text={ErrorTranslations.ERROR_RETURN} routeToReturn={routeToReturn} />}>
            <div className={"full-page"}>
                <NavigationBar mainRoute={mainRoute} subRoute={subRoute} handleSelection={(isHome: boolean) => handleNavigationClick(isHome, setExitOverlay)}
                               currentExercise={currentExercise} exercisesCount={location.state?.exercises?.length ?? undefined} />
                {renderExercise(id, location.state?.exercises ?? undefined)}
            </div>
            {exitOverlay[0] && <ExitExerciseOverlay returnToHome={exitOverlay[1]} routeToReturn={routeToReturn} closeOverlay={() => setExitOverlay([false, false])} />}
            <OrientationModal />
        </ErrorBoundary>
    );
}