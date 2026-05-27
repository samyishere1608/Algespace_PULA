import { TranslationNamespaces } from "@/i18n.ts";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { CSSProperties, ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import Logo from "@images/home/logo320.png";
import "@styles/shared/navigation.scss";

export default function NavigationBar({ mainRoute, subRoute, handleSelection, currentExercise, exercisesCount, isStudy = false, style }: { mainRoute: string; subRoute?: string; handleSelection?: (isHome: boolean) => void; currentExercise?: number; exercisesCount?: number; isStudy?: boolean; style?: CSSProperties }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.General);

    return (
        <div className={`navigation ${isStudy ? "study" : ""}`} style={style}>
            <img src={Logo} alt={"logo"} onClick={() => handleClick(true)} />
            <FontAwesomeIcon icon={faChevronRight} />
            <p className={`main-route ${isStudy ? "study" : ""}`} onClick={() => handleClick(false)}>
                {t(mainRoute)}
            </p>
            {subRoute && (
                <React.Fragment>
                    <FontAwesomeIcon icon={faChevronRight} />
                    <p>{t(subRoute)}</p>
                </React.Fragment>
            )}
            {currentExercise && (
                <React.Fragment>
                    <FontAwesomeIcon icon={faChevronRight} />
                    <p>{t(GeneralTranslations.NAV_EXERCISE) + " " + currentExercise + (exercisesCount !== undefined ? " / " + exercisesCount : "")}</p>
                </React.Fragment>
            )}
        </div>
    );

    function handleClick(isHome: boolean): void {
        if (isStudy) {
            return;
        }
        if (handleSelection) {
            handleSelection(isHome);
        }
    }
}
