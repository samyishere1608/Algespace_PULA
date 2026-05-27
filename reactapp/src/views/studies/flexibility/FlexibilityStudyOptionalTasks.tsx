import { ReactElement} from "react";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { useNavigate, useParams } from "react-router-dom";
import ErrorScreen from "@components/shared/ErrorScreen.tsx";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { Paths } from "@routes/paths.ts";
import ViewLayout from "@components/views/ViewLayout.tsx";
import { StudyTranslations } from "@/types/studies/studyTranslations.ts";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import "@styles/flexibility/flexibility.scss";


import { useEffect } from "react";


export function FlexibilityStudyOptional(): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Study);
    const navigate = useNavigate();
    const {logout} = useAuth();
    const { studyId } = useParams();

    useEffect(() => {
        if (studyId === undefined || studyId === "undefined") {
            logout();
        }
    }, [studyId, logout]);

    if (studyId === undefined || studyId === "undefined") {
        return (
            <ErrorScreen
                text={ErrorTranslations.ERROR_STUDY_ID}
                routeToReturn={Paths.StudiesLoginPath}
                showFrownIcon={true}
            />
        );
    }


    return (
        <ViewLayout title={t(StudyTranslations.WELCOME)} isStudy={true}>
            <div className={"flexibility-view__contents flexibility-study-optional"}>
                <p>{t(StudyTranslations.FLEXIBILITY_STUDY_1)}</p>
                <h2 style={{color: "white"}}>{t(StudyTranslations.ALGE_SPACE)}</h2>
                <p>{t(StudyTranslations.ALGE_SPACE_EX)}</p>
                <h2 style={{color: "white"}}>{t(StudyTranslations.OPTIONAL)}</h2>
                <p>{t(StudyTranslations.OPTIONAL_1)}</p>
                <p>{t(StudyTranslations.TYPES)}</p>

                <ul style={{color: "white"}}>
                    <li><strong>{t(StudyTranslations.CALCULATION)}</strong>{t(StudyTranslations.CALCULATION2)}</li>
                    <li><strong>{t(StudyTranslations.EXPLAIN)}</strong> {t(StudyTranslations.EXPLAIN2)}</li>
                        <li><strong>{t(StudyTranslations.COMPARISON)}</strong>{t(StudyTranslations.COMPARISON2)}</li>
                            <li><strong>{t(StudyTranslations.RESOLVING)}</strong>{t(StudyTranslations.RESOLVING2)}</li>
                                </ul>

                                <p>{t(StudyTranslations.OPTIONAL_CHOICE)}</p>

                                <button
                    className={"button primary-button"}
                    onClick={() => navigate(Paths.FlexibilityStudyPath + studyId)}
                >
                    <FontAwesomeIcon icon={faArrowRight}/>
                    {t(StudyTranslations.BUTTON_CONTINUE)}
                </button>
            </div>
        </ViewLayout>
    );
}
