import { useAuth } from "@/contexts/AuthProvider.tsx";
import NavigationBar from "@components/shared/NavigationBar.tsx";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { ReactElement } from "react";
import { StudyTranslations } from "@/types/studies/studyTranslations.ts";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightFromBracket } from "@fortawesome/free-solid-svg-icons";

export function FlexibilityStudyEnd(): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Study);
    const { logout } = useAuth();

    return <div className={"full-page"} style={{ background: "linear-gradient(180deg, var(--blue-background) 0%, #044a6d 100%)", paddingBottom: "1rem" }}>
        <NavigationBar mainRoute={GeneralTranslations.FLEXIBILITY_STUDY} isStudy={true} style={{ minHeight: "3rem" }} />
        <div className={"flexibility-view__container"}>
            <div className={"flexibility-view__contents"}>
                <p style={{ textAlign: "center" }}>{t(StudyTranslations.THANK_YOU)}</p>
                <button className={"button primary-button"} onClick={logout}>
                    Logout
                    <FontAwesomeIcon icon={faArrowRightFromBracket} />
                </button>
            </div>
        </div>
    </div>;
}