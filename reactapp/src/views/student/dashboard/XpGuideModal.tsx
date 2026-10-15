import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import { AgencyWallet } from "@utils/wardrobeUtils.ts";

/**
 * What each of the three XP kinds is paid for.
 *
 * This is the same content that used to sit behind a small info icon beside the XP bars. The bars
 * show how much of each has been earned, which is the question a student has while looking at them;
 * "what do I have to DO" is a different question, asked less often, and an icon that small made it
 * hard to find. It lives in the companion menu now, next to the other ways of customising what the
 * XP is for.
 */
const WALLETS: AgencyWallet[] = ["choice", "insight", "resolve"];

const LABEL_KEYS: Record<AgencyWallet, string> = {
    choice: "agency-choice",
    insight: "agency-insight",
    resolve: "agency-resolve",
};

const DESC_KEYS: Record<AgencyWallet, string> = {
    choice: "agency-choice-desc",
    insight: "agency-insight-desc",
    resolve: "agency-resolve-desc",
};

export default function XpGuideModal({ onClose }: { onClose: () => void }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Student);

    return (
        <div className={"dash-modal-backdrop"} onClick={onClose}>
            <div className={"dash-modal"} onClick={(e) => e.stopPropagation()}>
                <div className={"dash-modal__header"}>
                    <h3>{t("agency-info-title")}</h3>
                    <button className={"dash-modal__close"} onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                <div className={"xp-guide"}>
                    {WALLETS.map((wallet) => (
                        <div className={"xp-info-popover__item"} key={wallet}>
                            <span className={`xp-info-popover__dot xp-info-popover__dot--${wallet}`} />
                            <div className={"xp-info-popover__body"}>
                                <strong>{t(LABEL_KEYS[wallet])} XP</strong>
                                <p>{t(DESC_KEYS[wallet])}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
