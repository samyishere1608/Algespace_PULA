import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { faCircleQuestion } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TranslationNamespaces } from "@/i18n.ts";
import type { TourSection } from "@utils/onboardingTour.ts";

interface Props {
    section: TourSection;
    /** Plays the section. The caller mounts the overlay, because that is where it belongs. */
    onPlay: (section: TourSection) => void;
    /** Rendered instead of the label, for a place where a label would not fit. */
    iconOnly?: boolean;
}

/**
 * The standing invitation to replay one section.
 *
 * This is the other half of the offer: the offer is asked once and never again, and this is what
 * makes that acceptable — the part it belongs to keeps the tutorial one tap away for good. It is
 * deliberately quiet (a small secondary control beside the thing it explains), because a student who
 * opens goal setting wants to set a goal.
 */
export function ShowSectionTourButton({ section, onPlay, iconOnly = false }: Props): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Student);
    const label = t("tour-show-btn");

    return (
        <button
            type={"button"}
            className={`show-tour-btn${iconOnly ? " show-tour-btn--icon" : ""}`}
            title={label}
            aria-label={label}
            onClick={() => onPlay(section)}
        >
            <FontAwesomeIcon icon={faCircleQuestion} />
            {!iconOnly && <span>{label}</span>}
        </button>
    );
}
