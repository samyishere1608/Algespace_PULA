import { ReactElement, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy } from "@fortawesome/free-solid-svg-icons";
import { TranslationNamespaces } from "@/i18n.ts";
import type { StudyGoal } from "@/types/student/goal.ts";
import { asTranslate, describeGoal, getCategoryDef } from "@utils/goalCatalog.ts";
import "@styles/shared/goal-celebration.scss";
import completionSound from "@/assets/sounds/gamecompletionsound.mp3";

interface Props {
    completedGoals: StudyGoal[];
    resolveXpEarned: number;
    onContinue: () => void;
}

/**
 * Shown the moment a goal is reached.
 *
 * Only Resolve is celebrated here. Insight and Choice are earned elsewhere and for different acts —
 * facing something you had been avoiding, or opting into reflection — and presenting all three
 * together would teach that the currencies are interchangeable.
 */
export function GoalCelebrationOverlay({ completedGoals, resolveXpEarned, onContinue }: Props): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Student);
    const [visible, setVisible] = useState(false);

    // Trigger entry animation and play sound on mount
    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 50);
        const audio = new Audio(completionSound);
        audio.volume = 0.6;
        audio.play().catch(() => { /* autoplay may be blocked — silently ignore */ });
        return () => clearTimeout(timer);
    }, []);

    function handleContinue(): void {
        setVisible(false);
        setTimeout(onContinue, 350); // wait for exit animation
    }

    const describe = asTranslate(t);

    return (
        <div className={`goal-celebration__backdrop${visible ? " goal-celebration__backdrop--visible" : ""}`}>
            <div className={`goal-celebration__card${visible ? " goal-celebration__card--visible" : ""}`}>
                <div className={"goal-celebration__confetti"} aria-hidden>
                    {Array.from({ length: 16 }).map((_, i) => (
                        <span key={i} className={`goal-celebration__dot goal-celebration__dot--${(i % 4) + 1}`} />
                    ))}
                </div>

                <div className={"goal-celebration__trophy"} aria-hidden>
                    <FontAwesomeIcon icon={faTrophy} />
                </div>
                <h2 className={"goal-celebration__title"}>{t("goals-celebration-title")}</h2>

                <div className={"goal-celebration__goals"}>
                    {completedGoals.map((goal) => (
                        <div key={goal.id} className={"goal-celebration__goal-row"}>
                            <FontAwesomeIcon icon={getCategoryDef(goal.category).icon} className={"goal-celebration__goal-icon"} />
                            <span className={"goal-celebration__goal-name"}>{describeGoal(goal, describe)}</span>
                        </div>
                    ))}
                </div>

                <div className={"goal-celebration__xp-badge"}>
                    <span className={"goal-celebration__xp-earned"}>
                        {t("goals-celebration-count", { count: completedGoals.length })}
                    </span>
                    <span className={"goal-celebration__xp-total"}>
                        +{resolveXpEarned} {t("agency-resolve")} XP
                    </span>
                </div>

                <button className={"goal-celebration__continue-btn"} onClick={handleContinue}>
                    {t("goals-celebration-continue")}
                </button>
            </div>
        </div>
    );
}
