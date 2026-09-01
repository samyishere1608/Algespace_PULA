import { ReactElement, useEffect, useState } from "react";
import { StudyGoal } from "@views/student/dashboard/SetStudyPlanModal.tsx";
import "@styles/shared/goal-celebration.scss";
import completionSound from "@/assets/sounds/gamecompletionsound.mp3";

interface Props {
    completedGoals: StudyGoal[];
    xpEarned: number;
    newTotalXP: number;
    onContinue: () => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
    math: "📐",
    decision: "🎯",
    ai: "🤖",
    engagement: "⭐",
    independence: "🦾",
};

export function GoalCelebrationOverlay({ completedGoals, xpEarned, newTotalXP, onContinue }: Props): ReactElement {
    const [visible, setVisible] = useState(false);

    // Trigger entry animation and play sound on mount
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 50);
        const audio = new Audio(completionSound);
        audio.volume = 0.6;
        audio.play().catch(() => { /* autoplay may be blocked — silently ignore */ });
        return () => clearTimeout(t);
    }, []);

    function handleContinue(): void {
        setVisible(false);
        setTimeout(onContinue, 350); // wait for exit animation
    }

    return (
        <div className={`goal-celebration__backdrop${visible ? " goal-celebration__backdrop--visible" : ""}`}>
            <div className={`goal-celebration__card${visible ? " goal-celebration__card--visible" : ""}`}>
                {/* Confetti dots */}
                <div className={"goal-celebration__confetti"} aria-hidden>
                    {Array.from({ length: 16 }).map((_, i) => (
                        <span key={i} className={`goal-celebration__dot goal-celebration__dot--${(i % 4) + 1}`} />
                    ))}
                </div>

                <div className={"goal-celebration__trophy"}>🏆</div>
                <h2 className={"goal-celebration__title"}>Goal Complete!</h2>

                {/* List of completed goals */}
                <div className={"goal-celebration__goals"}>
                    {completedGoals.map((goal) => (
                        <div key={goal.id} className={"goal-celebration__goal-row"}>
                            <span className={"goal-celebration__goal-icon"}>
                                {CATEGORY_EMOJI[goal.category] ?? "🎖️"}
                            </span>
                            <span className={"goal-celebration__goal-name"}>{goal.label}</span>
                        </div>
                    ))}
                </div>

                {/* Goals completed count */}
                <div className={"goal-celebration__xp-badge"}>
                    <span className={"goal-celebration__xp-earned"}>
                        {completedGoals.length === 1
                            ? "Goal Achieved! 🎉"
                            : `${completedGoals.length} Goals Achieved! 🎉`}
                    </span>
                    <span className={"goal-celebration__xp-total"}>Keep it up — you're growing!</span>
                </div>

                <button className={"goal-celebration__continue-btn"} onClick={handleContinue}>
                    Continue
                </button>
            </div>
        </div>
    );
}
