import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { faHandFist, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TranslationNamespaces } from "../../i18n.ts";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { getActiveBuddyId, getEquippedOutfitId } from "@utils/wardrobeUtils.ts";
import { BUDDIES } from "@views/student/dashboard/ChooseBuddyModal.tsx";
import { resolveOutfitSrc } from "@views/student/dashboard/CharacterShopModal.tsx";

interface Props {
    onChoose: (mode: "solo" | "pippin") => void;
}

export function SolveChoiceScreen({ onChoose }: Props): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Student);
    const { student } = useAuth();
    const studentId = student?.id ?? "guest";
    const activeBuddyId = getActiveBuddyId(studentId);
    const buddy = BUDDIES.find((b) => b.id === activeBuddyId) ?? BUDDIES[0];
    const buddyName = buddy.name;

    // Resolve current character outfit image
    const outfitId = getEquippedOutfitId(studentId, activeBuddyId);
    const characterImgSrc = outfitId
        ? resolveOutfitSrc(activeBuddyId, outfitId)
        : resolveOutfitSrc(activeBuddyId, "default");

    return (
        <div className="solve-choice">
            <h2 className="solve-choice__title">{t("solve-choice-title")}</h2>
            <p className="solve-choice__subtitle">{t("solve-choice-subtitle")}</p>

            <div className="solve-choice__cards">
                {/* Solo card */}
                <button className="solve-choice__card solve-choice__card--solo" onClick={() => onChoose("solo")}>
                    <span className="solve-choice__icon solve-choice__icon--solo"><FontAwesomeIcon icon={faHandFist} /></span>
                    <h3>{t("solve-choice-solo-title")}</h3>
                    <p>{t("solve-choice-solo-desc")}</p>
                    <span className="solve-choice__cta solve-choice__cta--solo">{t("solve-choice-solo-cta")}</span>
                </button>

                <div className="solve-choice__divider">{t("solve-choice-or")}</div>

                {/* Buddy card — shows actual character outfit */}
                <button className="solve-choice__card solve-choice__card--pippin" onClick={() => onChoose("pippin")}>
                    <div className="solve-choice__character-preview">
                        {characterImgSrc ? (
                            <img src={characterImgSrc} alt={buddyName} className="solve-choice__character-img" />
                        ) : (
                            <FontAwesomeIcon icon={faUser} className="solve-choice__character-fallback" />
                        )}
                    </div>
                    <h3>{t("solve-choice-pippin-title", { buddy: buddyName })}</h3>
                    <p>{t("solve-choice-pippin-desc", { buddy: buddyName })}</p>
                    <span className="solve-choice__cta solve-choice__cta--pippin">{t("solve-choice-pippin-cta", { buddy: buddyName })}</span>
                </button>
            </div>
        </div>
    );
}
