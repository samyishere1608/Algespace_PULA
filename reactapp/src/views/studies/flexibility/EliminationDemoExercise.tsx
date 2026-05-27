import { ReactElement, useMemo } from "react";
import NavigationBar from "@components/shared/NavigationBar.tsx";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { setFlexibilityStudyDemosCompleted } from "@utils/storageUtils.ts";
import { CompletedDemo } from "@/types/flexibility/enums.ts";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { useNavigate, useParams } from "react-router-dom";
import ErrorScreen from "@components/shared/ErrorScreen.tsx";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { Paths } from "@routes/paths.ts";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { FlexibilityTerm } from "@/types/math/term.ts";
import { math } from "@/types/math/math.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { Coefficient } from "@/types/math/coefficient.ts";
import { Trans, useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import { EliminationDemo } from "@components/flexibility/elimination/demo/EliminationDemo.tsx";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { LinearSystem } from "@components/math/procedural-knowledge/LinearSystem.tsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { ErrorBoundary } from "react-error-boundary";

export function EliminationDemoExercise(): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.Flexibility, TranslationNamespaces.General]);
    const { logout } = useAuth();
    const { studyId } = useParams();
    const navigate = useNavigate();

    const firstEquation = useMemo(() => getFirstEquation(), []);
    const secondEquation = useMemo(() => getSecondEquation(), []);
    const firstVariable = useMemo(() => getFirstVariable(), []);
    const secondVariable = useMemo(() => getSecondVariable(), []);

    if (studyId === undefined || studyId === "undefined") {
        logout();
        return <ErrorScreen text={ErrorTranslations.ERROR_STUDY_ID} routeToReturn={Paths.StudiesLoginPath} showFrownIcon={true} />;
    }

    return <ErrorBoundary
        key={location.pathname}
        FallbackComponent={(error) => {
            console.error(error);
            return <ErrorScreen text={ErrorTranslations.ERROR_DATA_MISSING} routeToReturn={Paths.FlexibilityStudyPath + studyId} showFrownIcon={true} />;
        }}
    >
        <div className={"full-page"} style={{ background: "linear-gradient(180deg, var(--blue-background) 0%, #044a6d 100%)", paddingBottom: "1rem" }}>
            <NavigationBar mainRoute={GeneralTranslations.FLEXIBILITY_STUDY} isStudy={true} style={{ minHeight: "3rem" }} />
            <div className={"flexibility-view__container"}>
                <div className={"flexibility-view__contents"}>
                    <p>{t(FlexibilityTranslations.INTRO_SYSTEM)}</p>
                    <LinearSystem firstEquation={firstEquation} secondEquation={secondEquation} />
                    <p><Trans ns={TranslationNamespaces.Flexibility} i18nKey={FlexibilityTranslations.ELIMINATION_DEMO} /></p>
                    <EliminationDemo system={[firstEquation, secondEquation]} firstVariable={firstVariable} secondVariable={secondVariable} />
                    <button className={"button primary-button return-study-view-button"} onClick={() => {
                        setFlexibilityStudyDemosCompleted(studyId, CompletedDemo.Elimination);
                        navigate(Paths.FlexibilityStudyPath + studyId);
                    }}>
                        <FontAwesomeIcon icon={faArrowLeft} />
                        {t(GeneralTranslations.BUTTON_RETURN, { ns: TranslationNamespaces.General })}
                    </button>
                </div>
            </div>
        </div>
    </ErrorBoundary>;
}

function getFirstEquation(): FlexibilityEquation {
    const leftTerms: FlexibilityTerm[] = [
        new FlexibilityTerm(math.fraction(2), "x"),
        new FlexibilityTerm(math.fraction(-3), "y")
    ];
    const rightTerms: FlexibilityTerm[] = [new FlexibilityTerm(math.fraction(4), null)];
    return new FlexibilityEquation(leftTerms, rightTerms);
}

function getSecondEquation(): FlexibilityEquation {
    const leftTerms: FlexibilityTerm[] = [
        new FlexibilityTerm(math.fraction(-2), "x"),
        new FlexibilityTerm(math.fraction(1), "y")
    ];
    const rightTerms: FlexibilityTerm[] = [new FlexibilityTerm(math.fraction(5), null)];
    return new FlexibilityEquation(leftTerms, rightTerms);
}

function getFirstVariable(): Variable {
    return new Variable("x", Coefficient.createNumberCoefficient(0));
}

function getSecondVariable(): Variable {
    return new Variable("y", Coefficient.createNumberCoefficient(0));
}