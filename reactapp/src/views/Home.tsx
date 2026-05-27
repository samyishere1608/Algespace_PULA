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
import Logo from "@images/home/logo640.png";
import "@styles/views/homepage.scss";

export default function Home(): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.General);
    const navigate = useNavigate();
    const { student, logoutStudent } = useAuth();
    const onboardingStep = student ? getOnboardingStep(student.id) : null;

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
                        {onboardingStep === "complete" ? (
                            <Link className={"homepage__student-badge-action"} to={Paths.StudentDashboardPath}>
                                Dashboard
                            </Link>
                        ) : (
                            <Link className={"homepage__student-badge-action"} to={Paths.OnboardingResumePath}>
                                Continue Tutorial
                            </Link>
                        )}
                        <button
                            className={"homepage__student-badge-logout"}
                            title="Logout"
                            onClick={() => logoutStudent()}
                        >
                            <FontAwesomeIcon icon={faRightFromBracket} />
                        </button>
                    </div>
                ) : (
                    <Link className={"link"} to={Paths.StudentLoginPath}>
                        Login
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
                    <div className={"homepage__navigation-item equalization-item"} onClick={() => navigate(Paths.EqualizationPath)}>
                        <p> {t(GeneralTranslations.EQUALIZATION, { ns: TranslationNamespaces.General })}</p>
                    </div>
                    <div className={"homepage__navigation-item substitution-item"} onClick={() => navigate(Paths.SubstitutionPath)}>
                        <p> {t(GeneralTranslations.SUBSTITUTION, { ns: TranslationNamespaces.General })}</p>
                    </div>
                    <div className={"homepage__navigation-item elimination-item"} onClick={() => navigate(Paths.EliminationPath)}>
                        <p> {t(GeneralTranslations.ELIMINATION, { ns: TranslationNamespaces.General })}</p>
                    </div>
                    <div className={"homepage__navigation-item flexibility-item"} onClick={() => navigate(Paths.FlexibilityPath)}>
                        <p> {t(GeneralTranslations.FLEXIBILITY_TRAINING, { ns: TranslationNamespaces.General })}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
