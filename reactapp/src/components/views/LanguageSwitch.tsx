import { Language, TranslationNamespaces } from "@/i18n.ts";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import FlagDe from "@images/home/flag-de.svg";
import FlagEn from "@images/home/flag-en.svg";
import "@styles/views/language-switch.scss";

export default function LanguageSwitch(): ReactElement {
    const { i18n } = useTranslation();
    const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
    const { t } = useTranslation(TranslationNamespaces.General);

    const changeLanguage = (language: Language): void => {
        i18n.changeLanguage(language);
        setSelectedLanguage(language);
    };

    return (
        <div className="language-switch">
            <img className={"language-switch__image"} src={selectedLanguage === Language.DE ? FlagDe : FlagEn} alt={"flag"} />
            <div className={"language-switch__select"}>
                <select className={"language-switch__select"} id="language-select" onChange={(e) => changeLanguage(e.target.value as Language)} value={selectedLanguage}>
                    <option value={Language.EN}>{t("language-en")}</option>
                    <option value={Language.DE}>{t("language-de")}</option>
                </select>
                <FontAwesomeIcon icon={faChevronDown} />
            </div>
        </div>
    );
}
