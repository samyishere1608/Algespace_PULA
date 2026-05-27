import { useAuth } from "@/contexts/AuthProvider.tsx";
import { TranslationNamespaces } from "@/i18n.ts";
import { faArrowLeft, faArrowRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { Paths } from "@routes/paths.ts";
import Logo from "@images/home/logo320.png";
import "@styles/views/exercises.scss";

export default function ViewLayout({ title, children, isStudy = false }: { title: string; children: ReactNode; isStudy?: boolean }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.General);
    const navigate = useNavigate();
    const { logout } = useAuth();

    return (
        <div className={`exercises-view__container${isStudy ? "--study" : ""}`}>
            <div className={`exercises-view${isStudy ? "" : "--image"}`}>
                {isStudy ? (
                    <div className={"exercises-view__header"}>
                        <div>
                            <img
                                id={"logo-view"}
                                className={"align-left"}
                                src={Logo}
                                alt={"logo"}
                                onClick={(): void => {
                                    if (!isStudy) {
                                        navigate(Paths.HomePath);
                                    }
                                }}
                            />
                        </div>
                        <p>{t(title)}</p>
                        <div>
                            <button
                                className={"text-button--white align-right"}
                                onClick={(): void => {
                                    logout();
                                    navigate(Paths.StudiesLoginPath);
                                }}
                            >
                                Logout
                                <FontAwesomeIcon icon={faArrowRightFromBracket} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className={"exercises-view__header"}>
                        <div>
                            <button className={"text-button--white align-left"} onClick={() => navigate(Paths.HomePath)}>
                                <FontAwesomeIcon icon={faArrowLeft} />
                                {t(GeneralTranslations.BUTTON_RETURN_HOME)}
                            </button>
                        </div>
                        <p>{t(title)}</p>
                        <div>
                            <img
                                id={"logo-view"}
                                className={"exercises-view__logo align-right"}
                                src={Logo}
                                alt={"logo"}
                                onClick={(): void => {
                                    if (!isStudy) {
                                        navigate(Paths.HomePath);
                                    }
                                }}
                            />
                        </div>
                    </div>
                )}
                <div className={"exercises-view__contents-container"}>
                    <div className={"exercises-view__contents"}>{children}</div>
                </div>
            </div>
        </div>
    );
}
