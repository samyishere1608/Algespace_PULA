import { ReactElement, useEffect, useState } from "react";
import { StudyGoal } from "@views/student/dashboard/SetStudyPlanModal.tsx";
import "@styles/shared/coin-celebration.scss";
import coinSound from "@/assets/sounds/Coinsound.mp3";

interface Props {
    completedGoals: StudyGoal[];
    coinsEarned: number;
    onContinue: () => void;
}

export function CoinCelebrationOverlay({ completedGoals, coinsEarned, onContinue }: Props): ReactElement {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 50);
        const audio = new Audio(coinSound);
        audio.volume = 0.7;
        audio.play().catch(() => { /* autoplay may be blocked */ });
        return () => clearTimeout(t);
    }, []);

    function handleContinue(): void {
        setVisible(false);
        setTimeout(onContinue, 350);
    }

    return (
        <div className={`coin-celebration__backdrop${visible ? " coin-celebration__backdrop--visible" : ""}`}>
            <div className={`coin-celebration__card${visible ? " coin-celebration__card--visible" : ""}`}>

                {/* Floating coin particles */}
                <div className={"coin-celebration__particles"} aria-hidden>
                    {Array.from({ length: 14 }).map((_, i) => (
                        <span key={i} className={`coin-celebration__coin-particle coin-celebration__coin-particle--${(i % 7) + 1}`} />
                    ))}
                </div>

                <div className={"coin-celebration__icon"}>🪙</div>
                <h2 className={"coin-celebration__title"}>Coins Earned!</h2>

                {/* Per-goal coin breakdown */}
                <div className={"coin-celebration__goal-list"}>
                    {completedGoals.map((goal) => (
                        <div key={goal.id} className={"coin-celebration__goal-row"}>
                            <span className={"coin-celebration__goal-name"}>{goal.label}</span>
                            <span className={"coin-celebration__goal-coins"}>+{goal.coinReward} 🪙</span>
                        </div>
                    ))}
                </div>

                {/* Total coin badge */}
                <div className={"coin-celebration__badge"}>
                    <span className={"coin-celebration__amount"}>+{coinsEarned}</span>
                    <span className={"coin-celebration__label"}>coins added to your wallet</span>
                </div>

                <button className={"coin-celebration__continue-btn"} onClick={handleContinue}>
                    Awesome!
                </button>
            </div>
        </div>
    );
}
