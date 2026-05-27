import { TranslationNamespaces } from "@/i18n.ts";
import { faArrowRight, faFaceFrown, faFaceSurprise, faLeftLong } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { Paths } from "@routes/paths.ts";
import "@styles/views/errorScreen.scss";
import { FlexibilityExerciseResponse } from "@/types/flexibility/flexibilityExerciseResponse.ts";
import { navigateToNextExercise } from "@utils/utils.ts";
import { AgentCondition } from "@/types/flexibility/enums.ts";

export default function ErrorScreen({ text, routeToReturn, showFrownIcon = false }: { text: string; routeToReturn: string; showFrownIcon?: boolean }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.Error]);
    const navigate = useNavigate();

    return (
        <div className={"error-screen"}>
            <FontAwesomeIcon icon={showFrownIcon ? faFaceFrown : faFaceSurprise} />
            <p>{t(text, { ns: TranslationNamespaces.Error })}</p>
            <button className={"button primary-button"} onClick={(): void => navigate(routeToReturn)}>
                <FontAwesomeIcon icon={faLeftLong} />
                {t(GeneralTranslations.BUTTON_RETURN, { ns: TranslationNamespaces.General })}
            </button>
        </div>
    );
}

export function RouteNotFound(): ReactElement {
    return <ErrorScreen text={ErrorTranslations.ERROR_404} routeToReturn={Paths.HomePath} />;
}

export function HomeErrorFallback(): ReactElement {
    const { t } = useTranslation();

    return (
        <div className={"error-screen"}>
            <FontAwesomeIcon icon={faFaceSurprise} />
            <p>{t(ErrorTranslations.ERROR_HOME, { ns: TranslationNamespaces.Error })}</p>
        </div>
    );
}

export function FlexibilityStudyErrorScreen({ studyId, currentExerciseId, exercises, condition }: {
    studyId: number;
    currentExerciseId: number;
    exercises: FlexibilityExerciseResponse[];
    condition: AgentCondition
}): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.Error]);
    const navigate = useNavigate();

    return (
        <div className={"error-screen"}>
            <FontAwesomeIcon icon={faFaceFrown} />
            <p>{t(ErrorTranslations.ERROR_STUDY_ERROR, { ns: TranslationNamespaces.Error })}</p>
            <button className={"button primary-button"} onClick={() => navigateToNextExercise(studyId, currentExerciseId, exercises, condition, navigate)}>
                <FontAwesomeIcon icon={faArrowRight} />
                {t(GeneralTranslations.BUTTON_CONTINUE, { ns: TranslationNamespaces.General })}
            </button>
        </div>
    );
}
