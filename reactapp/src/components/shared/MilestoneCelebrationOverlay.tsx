import { ReactElement, useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy } from "@fortawesome/free-solid-svg-icons";
import { TranslationNamespaces } from "@/i18n.ts";
import "@styles/shared/milestone-celebration.scss";
import levelUpSound from "@/assets/sounds/LevelUp.mp3";

interface Props {
    milestone: number;  // e.g. 500, 1000, 1500
    onDismiss: () => void;
}

export function MilestoneCelebrationOverlay({ milestone, onDismiss }: Props): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Student);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Named `timer`, not `t`: the old name shadowed the translation function for the whole effect.
        const timer = setTimeout(() => setVisible(true), 30);
        const audio = new Audio(levelUpSound);
        audio.volume = 0.7;
        audio.play().catch(() => { /* autoplay blocked — ignore */ });
        return () => clearTimeout(timer);
    }, []);

    function handleDismiss(): void {
        setVisible(false);
        setTimeout(onDismiss, 350);
    }

    const stars = Array.from({ length: 18 }, (_, i) => i);

    return (
        <div
            className={`milestone-cel__backdrop${visible ? " milestone-cel__backdrop--visible" : ""}`}
            onClick={handleDismiss}
        >
            {/* Floating stars */}
            {stars.map((i) => (
                <div
                    key={i}
                    className={"milestone-cel__star"}
                    style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${(i * 0.12).toFixed(2)}s`,
                        animationDuration: `${1.2 + (i % 4) * 0.3}s`,
                    }}
                />
            ))}

            <div
                className={`milestone-cel__card${visible ? " milestone-cel__card--visible" : ""}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={"milestone-cel__burst"} />

                <div className={"milestone-cel__icon"} aria-hidden>
                    <FontAwesomeIcon icon={faTrophy} />
                </div>

                <h2 className={"milestone-cel__title"}>{t("milestone-title")}</h2>
                <p className={"milestone-cel__xp"}>{milestone.toLocaleString()} XP</p>
                <p className={"milestone-cel__sub"}>
                    <Trans
                        i18nKey="milestone-subtitle"
                        ns={TranslationNamespaces.Student}
                        values={{
                            milestone: milestone.toLocaleString(),
                            next: (milestone + 500).toLocaleString(),
                        }}
                        components={{ strong: <strong /> }}
                    />
                </p>

                <button className={"milestone-cel__btn"} onClick={handleDismiss}>
                    {t("milestone-continue")}
                </button>
            </div>
        </div>
    );
}
