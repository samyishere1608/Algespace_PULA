import { Language, TranslationNamespaces } from "@/i18n.ts";
import { markLanguageChoice } from "@utils/studentState.ts";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import FlagDe from "@images/home/flag-de.svg";
import FlagEn from "@images/home/flag-en.svg";
import FlagJa from "@images/home/flag-ja.svg";
import "@styles/views/language-switch.scss";

export default function LanguageSwitch(): ReactElement {
    const { i18n } = useTranslation();
    const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
    const { t } = useTranslation(TranslationNamespaces.General);

    const changeLanguage = (language: Language): void => {
        i18n.changeLanguage(language);
        setSelectedLanguage(language);

        // Picking a language is a decision, so it is recorded as one: marked as this user's own
        // choice so that logging in can never override it (see `explicitLanguageChoice`), and written
        // to the signed-in student's record so their next seat opens in the same language. Read from
        // storage rather than from context because this switch also renders on the home page, where
        // nobody is signed in yet and the id is therefore simply absent.
        let studentId: number | null = null;
        try {
            const raw = localStorage.getItem("student");
            if (raw !== null) {
                const parsed = JSON.parse(raw) as { id?: unknown };
                studentId = typeof parsed.id === "number" ? parsed.id : null;
            }
        } catch { /* no stored identity: the choice is still marked below */ }

        markLanguageChoice(studentId, language);
    };

    return (
        <div className="language-switch">
            <img className={"language-switch__image"} src={selectedLanguage === Language.DE ? FlagDe : selectedLanguage === Language.JA ? FlagJa : FlagEn} alt={"flag"} />
            <div className={"language-switch__select"}>
                <select className={"language-switch__select"} id="language-select" onChange={(e) => changeLanguage(e.target.value as Language)} value={selectedLanguage}>
                    <option value={Language.EN}>{t("language-en")}</option>
                    <option value={Language.DE}>{t("language-de")}</option>
                    <option value={Language.JA}>{t("language-ja")}</option>
                </select>
                <FontAwesomeIcon icon={faChevronDown} />
            </div>
        </div>
    );
}
