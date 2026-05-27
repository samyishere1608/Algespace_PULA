import { faCheck, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, useState } from "react";

export type GoalDifficulty = "HARD" | "MEDIUM" | "EASY";
export type GoalCategory = "math" | "decision" | "ai" | "engagement";
export type GoalPeriod = "session" | "daily" | "weekly" | "milestone";

export interface StudyGoal {
    id: string;
    label: string;
    description: string;
    difficulty: GoalDifficulty;
    category: GoalCategory;
    period: GoalPeriod;
    xpReward: number;
    coinReward: number;
}

// ── Goal catalogue ────────────────────────────────────────────────────────────
export const ALL_STUDY_GOALS: StudyGoal[] = [
    // ── Engagement (always-available daily) ───────────────────────────────────
    {
        id: "complete-any-exercise",
        label: "Complete any exercise",
        description: "Finish any flexibility exercise — Suitability, Efficiency, or Matching.",
        difficulty: "EASY",
        category: "engagement",
        period: "session",
        xpReward: 50,
        coinReward: 20,
    },
    // ── Math ──────────────────────────────────────────────────────────────────
    {
        id: "no-hints",
        label: "Hint-Free Run",
        description: "Complete an exercise using 0 hints and 0 Pippin messages.",
        difficulty: "MEDIUM",
        category: "math",
        period: "session",
        xpReward: 200,
        coinReward: 50,
    },
    // ── Decision Making ───────────────────────────────────────────────────────
    {
        id: "master-substitution",
        label: "Master Substitution",
        description: "Complete an Efficiency exercise where Substitution is the optimal method.",
        difficulty: "HARD",
        category: "decision",
        period: "session",
        xpReward: 300,
        coinReward: 80,
    },
    // ── AI Discipline ─────────────────────────────────────────────────────────
    {
        id: "no-ai-4",
        label: "Pippin-Free Day",
        description: "Complete 2 exercises today without opening Pippin at all.",
        difficulty: "EASY",
        category: "ai",
        period: "daily",
        xpReward: 280,
        coinReward: 70,
    },
    // ── Weekly ────────────────────────────────────────────────────────────────
    {
        id: "xp-300",
        label: "Gain 300 XP this week",
        description: "Earn a total of 300 XP across all exercises this week.",
        difficulty: "MEDIUM",
        category: "engagement",
        period: "weekly",
        xpReward: 150,
        coinReward: 40,
    },
    {
        id: "streak-3",
        label: "3-Day Practice Streak",
        description: "Complete at least one exercise on 3 consecutive days.",
        difficulty: "EASY",
        category: "engagement",
        period: "weekly",
        xpReward: 200,
        coinReward: 50,
    },
];

interface Props {
    currentGoalIds: string[];
    onSave: (selectedIds: string[]) => void;
    onClose: () => void;
}

export default function SetStudyPlanModal({ currentGoalIds, onSave, onClose }: Props): ReactElement {
    const [selected, setSelected] = useState<Set<string>>(new Set(currentGoalIds));

    function toggle(id: string): void {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    return (
        <div className={"dash-modal-backdrop"} onClick={onClose}>
            <div className={"dash-modal"} onClick={(e) => e.stopPropagation()}>
                <div className={"dash-modal__header"}>
                    <h3>Set Study Plan</h3>
                    <button className={"dash-modal__close"} onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                <p className={"dash-modal__subtitle"}>Select the goals you want to tackle today.</p>

                {ALL_STUDY_GOALS.map((goal) => {
                    const isSelected = selected.has(goal.id);
                    return (
                        <div
                            key={goal.id}
                            className={`goal-row${isSelected ? " goal-row--selected" : ""}`}
                            onClick={() => toggle(goal.id)}
                        >
                            <div className={`goal-row__check${isSelected ? " goal-row__check--checked" : ""}`}>
                                {isSelected && <FontAwesomeIcon icon={faCheck} />}
                            </div>
                            <div className={"goal-row__body"}>
                                <span className={"goal-row__label"}>{goal.label}</span>
                                <span className={"goal-row__desc"}>{goal.description}</span>
                                <div className={"goal-row__tags"}>
                                    <span className={`goal-row__tag goal-row__tag--${goal.category}`}>{goal.category}</span>
                                    <span className={`goal-row__tag goal-row__tag--period`}>{goal.period}</span>
                                </div>
                            </div>
                            <div className={"goal-row__meta"}>
                                <span className={"goal-row__xp"}>+{goal.xpReward} XP</span>
                                <span className={"goal-row__coins"}>🪙 +{goal.coinReward}</span>
                                <span className={`goal-row__difficulty goal-row__difficulty--${goal.difficulty}`}>
                                    {goal.difficulty}
                                </span>
                            </div>
                        </div>
                    );
                })}

                <div className={"dash-modal__footer"}>
                    <button className={"dash-modal__action-btn"} onClick={() => onSave(Array.from(selected))}>
                        Set Plan
                    </button>
                    {/* Placeholder for future AI suggestion feature */}
                    <button className={"dash-modal__ai-link"}>✦ Ask AI</button>
                    <span className={"dash-modal__default-note"}>Default Plan (Set by your teacher)</span>
                </div>
            </div>
        </div>
    );
}
