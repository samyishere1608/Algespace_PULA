import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { CSSProperties, ReactElement, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import unlockSound from "@/assets/sounds/Characterunlok.mp3";
import { CharacterDef } from "./CharacterShopModal.tsx";

interface Props {
    character: CharacterDef;
    userName: string;
    onClose: () => void;
}

export default function CharacterUnlockModal({ character, userName, onClose }: Props): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Student);

    useEffect(() => {
        const audio = new Audio(unlockSound);
        audio.volume = 0.7;
        audio.play().catch(() => { /* autoplay may be blocked — silently ignore */ });
    }, []);

    return (
        <div className={"dash-modal-backdrop char-unlock-backdrop"} onClick={onClose}>
            <div
                className={"char-unlock"}
                style={{ "--char-color": character.baseColor } as CSSProperties}
                onClick={(e) => e.stopPropagation()}
            >
                <button className={"char-unlock__close"} onClick={onClose} aria-label={t("dashboard-modal-close")}>
                    <FontAwesomeIcon icon={faTimes} />
                </button>

                {character.baseSrc ? (
                    <img className={"char-unlock__img"} src={character.baseSrc} alt={character.name} />
                ) : (
                    <div className={"char-unlock__emoji"}>{character.baseEmoji}</div>
                )}

                <h3 className={"char-unlock__title"}>{t("char-unlock-title")}</h3>
                <h2 className={"char-unlock__name"}>{character.name}</h2>
                <p className={"char-unlock__greeting"}>{t("char-unlock-greeting", { user: userName, character: character.name })}</p>

                <button className={"char-unlock__btn"} onClick={onClose}>
                    {t("char-unlock-btn")}
                </button>
            </div>
        </div>
    );
}
