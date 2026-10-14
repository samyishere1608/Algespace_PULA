import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { faArrowRight, faCircleQuestion, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TranslationNamespaces } from "@/i18n.ts";
import type { TourSection } from "@utils/onboardingTour.ts";

interface Props {
    section: TourSection;
    /** They said yes: play the section. */
    onAccept: () => void;
    /** They said "not now": record the offer and carry on with what they were doing. */
    onDismiss: () => void;
}

/**
 * The offer to show one section, made the first time a part of the app is opened.
 *
 * Asked ONCE per section and per student, and the answer is recorded either way — which is what makes
 * it an offer rather than a subscription. Saying "not now" is not a refusal that has to be lived with
 * either: every part keeps its own "Show tutorial" control, so the tutorial is always one tap away.
 *
 * It is a blocking dialog on purpose. The alternative — an unmissable banner over the thing they just
 * asked to open — competes with the screen the student was trying to reach, and the first thing a
 * student does after being offered a tutorial is either take it or get on with their work.
 */
export function TourOffer({ section, onAccept, onDismiss }: Props): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Student);

    return (
        <div className="modal-overlay" role="presentation">
            <div
                className="modal-content tour-offer"
                role="dialog"
                aria-modal="true"
                aria-labelledby={`tour-offer-${section}-title`}
            >
                <button className="modal-close" onClick={onDismiss} aria-label={t("tour-offer-later")}>
                    <FontAwesomeIcon icon={faXmark} />
                </button>

                <span className="tour-offer__icon" aria-hidden>
                    <FontAwesomeIcon icon={faCircleQuestion} />
                </span>

                <h2 id={`tour-offer-${section}-title`} className="tour-offer__title">
                    {t(`tour-offer-${section}-title`)}
                </h2>
                <p className="tour-offer__body">{t(`tour-offer-${section}-body`)}</p>

                <div className="tour-offer__actions">
                    <button className="button secondary-button" onClick={onDismiss}>
                        {t("tour-offer-later")}
                    </button>
                    <button className="button primary-button" onClick={onAccept}>
                        {t("tour-offer-show")} <FontAwesomeIcon icon={faArrowRight} />
                    </button>
                </div>
            </div>
        </div>
    );
}
