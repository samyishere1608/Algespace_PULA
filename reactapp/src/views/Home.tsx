import { TranslationNamespaces } from "@/i18n.ts";
import { faRightFromBracket, faUserCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import LanguageSwitch from "@components/views/LanguageSwitch.tsx";
import NavLink from "@components/views/NavLink.tsx";
import { Paths } from "@routes/paths.ts";
import { getOnboardingStep } from "@utils/storageUtils.ts";
import { SKIP_CONCEPT_TUTORIAL } from "@/config/study.ts";
import { isControlStudent } from "@utils/studyCondition.ts";
import Logo from "@images/home/logo640.png";
import "@styles/views/homepage.scss";

export default function Home(): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.General);
    const navigate = useNavigate();
    const { student, logoutStudent } = useAuth();
    const onboardingStep = student ? getOnboardingStep(student.id) : null;
    // With the concept tutorial skipped for the pilot there is no tour to continue, so the badge is
    // always the way into the dashboard — otherwise a student who shook hands with the login page
    // without ever completing a tour (or who signed in on a fresh browser) is offered a link into it.
    const hasDashboard = SKIP_CONCEPT_TUTORIAL || onboardingStep === "complete";
    // A control student has no dashboard to be offered: their badge leads to the exercise list, which
    // is the whole of the system they have. The login already puts them there; this is for the case
    // where they come back to the home page and need a way in again.
    const isControl = isControlStudent(student);

    return (
        <div className={"homepage"}>
            <div className={"homepage__header"}>
                <NavLink to={Paths.AboutPath} translationKey={"about"} />
                
                {<NavLink to={Paths.StudiesLoginPath} translationKey={"studies"} />}
                 <LanguageSwitch />
                {student ? (
                    <div className={"homepage__student-badge"}>
                        <FontAwesomeIcon icon={faUserCircle} className={"homepage__student-badge-icon"} />
                        <span className={"homepage__student-badge-name"}>{student.username}</span>
                        {isControl ? (
                            <Link className={"homepage__student-badge-action"} to={Paths.FlexibilityPath}>
                                {t(GeneralTranslations.HEADER_FLEXIBILITY_TRAINING)}
                            </Link>
                        ) : hasDashboard ? (
                            <Link className={"homepage__student-badge-action"} to={Paths.StudentDashboardPath}>
                                {t("home-dashboard")}
                            </Link>
                        ) : (
                            <Link className={"homepage__student-badge-action"} to={Paths.OnboardingResumePath}>
                                {t("home-continue-tutorial")}
                            </Link>
                        )}
                        <button
                            className={"homepage__student-badge-logout"}
                            title={t("home-logout")}
                            onClick={() => logoutStudent()}
                        >
                            <FontAwesomeIcon icon={faRightFromBracket} />
                        </button>
                    </div>
                ) : (
                    <Link className={"link"} to={Paths.StudentLoginPath}>
                        {t("home-login")}
                    </Link>
                )}
               
            </div>
            <div className={"homepage__contents"}>
                <div className={"homepage__contents-left"}>
                    <img className={"homepage__logo"} src={Logo} alt={"logo"} />
                    <div className={"homepage__description"}>
                        <p> {t(GeneralTranslations.PROJECT_DESCRIPTION_1, { ns: TranslationNamespaces.General })} </p>
                        <p> {t(GeneralTranslations.PROJECT_DESCRIPTION_2, { ns: TranslationNamespaces.General })} </p>
                    </div>
                </div>
                <div className={"homepage__contents-right"}>
                    {/*
                        One destination only. The three method games are not part of the pilot, and a
                        treatment student reaches flexibility training from the dashboard, while a
                        control student has nothing but the exercise list — so a single tile is the
                        whole map: sign in, or the one place you can go.
                    */}
                    {!student ? (
                        <div className={"homepage__navigation-item homepage__navigation-item--plain"} onClick={() => navigate(Paths.StudentLoginPath)}>
                            <p> {t("home-login")}</p>
                        </div>
                    ) : isControl ? (
                        <div className={"homepage__navigation-item flexibility-item"} onClick={() => navigate(Paths.FlexibilityPath)}>
                            <p> {t(GeneralTranslations.FLEXIBILITY_TRAINING, { ns: TranslationNamespaces.General })}</p>
                        </div>
                    ) : hasDashboard ? (
                        <div className={"homepage__navigation-item homepage__navigation-item--plain"} onClick={() => navigate(Paths.StudentDashboardPath)}>
                            <p> {t("home-dashboard")}</p>
                        </div>
                    ) : (
                        <div className={"homepage__navigation-item homepage__navigation-item--plain"} onClick={() => navigate(Paths.OnboardingResumePath)}>
                            <p> {t("home-continue-tutorial")}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
