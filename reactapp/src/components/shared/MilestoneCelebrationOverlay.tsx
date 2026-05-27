import { ReactElement, useEffect, useState } from "react";
import "@styles/shared/milestone-celebration.scss";
import levelUpSound from "@/assets/sounds/LevelUp.mp3";

interface Props {
    milestone: number;  // e.g. 500, 1000, 1500
    onDismiss: () => void;
}

export function MilestoneCelebrationOverlay({ milestone, onDismiss }: Props): ReactElement {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 30);
        const audio = new Audio(levelUpSound);
        audio.volume = 0.7;
        audio.play().catch(() => { /* autoplay blocked — ignore */ });
        return () => clearTimeout(t);
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

                <div className={"milestone-cel__icon"}>🏆</div>

                <h2 className={"milestone-cel__title"}>Milestone Reached!</h2>
                <p className={"milestone-cel__xp"}>{milestone.toLocaleString()} XP</p>
                <p className={"milestone-cel__sub"}>
                    You've crossed the <strong>{milestone.toLocaleString()} XP</strong> milestone.
                    Keep it up — next stop: <strong>{(milestone + 500).toLocaleString()} XP</strong>!
                </p>

                <button className={"milestone-cel__btn"} onClick={handleDismiss}>
                    Keep Going 🚀
                </button>
            </div>
        </div>
    );
}
