import { faCheck, faLightbulb, faRobot, faSpinner, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import { fetchAIGoalSuggestions, GoalPlanResponse } from "@utils/goalUtils.ts";

export type GoalDifficulty = "EASY" | "MEDIUM" | "HARD";
export type GoalCategory = "math" | "decision" | "ai" | "engagement" | "independence";
export type GoalPeriod = "session" | "daily" | "weekly" | "milestone";
export type GoalPath = "independence" | "math-mastery" | "consistency" | "self-awareness";

export interface StudyGoal {
    id: string;
    label: string;
    description: string;
    difficulty: GoalDifficulty;
    category: GoalCategory;
    period: GoalPeriod;
    path: GoalPath;
    xpReward: number;
    coinReward: number;
}

// ── Path metadata ─────────────────────────────────────────────────────────────
export const GOAL_PATHS: { id: GoalPath; emoji: string; labelKey: string }[] = [
    { id: "independence", emoji: "🛡️", labelKey: "goals-path-independence" },
    { id: "math-mastery", emoji: "🎯", labelKey: "goals-path-math-mastery" },
    { id: "consistency", emoji: "📅", labelKey: "goals-path-consistency" },
    { id: "self-awareness", emoji: "🧠", labelKey: "goals-path-self-awareness" },
];

// ── Goal catalogue ────────────────────────────────────────────────────────────
export const ALL_STUDY_GOALS: StudyGoal[] = [
    // ── Tier 1: First Steps (EASY) ───────────────────────────────────────────
    {
        id: "try-suitability",
        label: "Try a Suitability Exercise",
        description: "Complete 1 Suitability exercise — decide which method fits best.",
        difficulty: "EASY", category: "math", period: "session", path: "math-mastery",
        xpReward: 0, coinReward: 0,
    },
    {
        id: "try-efficiency",
        label: "Try an Efficiency Exercise",
        description: "Complete 1 Efficiency exercise — choose the fastest method.",
        difficulty: "EASY", category: "math", period: "session", path: "math-mastery",
        xpReward: 0, coinReward: 0,
    },
    {
        id: "try-matching",
        label: "Try a Matching Exercise",
        description: "Complete 1 Matching exercise — pair equations to methods.",
        difficulty: "EASY", category: "math", period: "session", path: "math-mastery",
        xpReward: 0, coinReward: 0,
    },
    {
        id: "choose-solo-once",
        label: "Go Solo Once",
        description: "Complete 1 exercise choosing \"Solve on my own\" without unlocking Pippin.",
        difficulty: "EASY", category: "independence", period: "session", path: "independence",
        xpReward: 0, coinReward: 0,
    },
    // ── Tier 2: Growing Independence (MEDIUM) ────────────────────────────────
    {
        id: "hint-free-run",
        label: "Hint-Free Run",
        description: "Complete an exercise using 0 hints and 0 Pippin messages.",
        difficulty: "MEDIUM", category: "ai", period: "session", path: "independence",
        xpReward: 0, coinReward: 0,
    },
    {
        id: "no-ai-day",
        label: "Pippin-Free Day",
        description: "Complete 2 exercises today without using Pippin at all.",
        difficulty: "MEDIUM", category: "ai", period: "daily", path: "independence",
        xpReward: 0, coinReward: 0,
    },
    {
        id: "method-explorer",
        label: "Method Explorer",
        description: "Use all 3 solving methods (Substitution, Elimination, Equalization) in one session.",
        difficulty: "MEDIUM", category: "math", period: "session", path: "consistency",
        xpReward: 0, coinReward: 0,
    },
    {
        id: "three-day-streak",
        label: "3-Day Practice Streak",
        description: "Complete at least one exercise on 3 consecutive days.",
        difficulty: "MEDIUM", category: "engagement", period: "weekly", path: "consistency",
        xpReward: 0, coinReward: 0,
    },
    // ── Tier 3: Decision Mastery (HARD) ──────────────────────────────────────
    {
        id: "master-suitability",
        label: "Master Suitability",
        description: "Correctly identify the best method in 3 Suitability exercises.",
        difficulty: "HARD", category: "math", period: "milestone", path: "math-mastery",
        xpReward: 0, coinReward: 0,
    },
    {
        id: "master-efficiency",
        label: "Master Efficiency",
        description: "Identify the most efficient method and explain why in 3 Efficiency exercises.",
        difficulty: "HARD", category: "math", period: "milestone", path: "math-mastery",
        xpReward: 0, coinReward: 0,
    },
    {
        id: "master-matching",
        label: "Master Matching",
        description: "Correctly match 3 equation systems to their optimal methods.",
        difficulty: "HARD", category: "math", period: "milestone", path: "math-mastery",
        xpReward: 0, coinReward: 0,
    },
    {
        id: "perfect-solo-session",
        label: "Perfect Solo Session",
        description: "Complete 3 consecutive solo exercises with 0 errors and 0 hints.",
        difficulty: "HARD", category: "independence", period: "session", path: "independence",
        xpReward: 0, coinReward: 0,
    },
    {
        id: "accuracy-sharp",
        label: "Sharp Shooter",
        description: "Maintain over 80% accuracy across 5 consecutive exercises.",
        difficulty: "HARD", category: "math", period: "weekly", path: "self-awareness",
        xpReward: 0, coinReward: 0,
    },
    // ── Tier 4: Self-Directed Growth (HARD) ──────────────────────────────────
    {
        id: "set-and-complete-plan",
        label: "Plan Fulfilled",
        description: "Set 3+ goals and complete ALL of them within the same week.",
        difficulty: "HARD", category: "engagement", period: "weekly", path: "consistency",
        xpReward: 0, coinReward: 0,
    },
    {
        id: "face-your-weakness",
        label: "Face Your Weakness",
        description: "Identify your weakest exercise type using the dashboard, then complete 3 exercises of that type.",
        difficulty: "HARD", category: "decision", period: "milestone", path: "self-awareness",
        xpReward: 0, coinReward: 0,
    },
    {
        id: "seven-day-streak",
        label: "7-Day Practice Streak",
        description: "Complete at least one exercise on 7 consecutive days.",
        difficulty: "HARD", category: "engagement", period: "weekly", path: "consistency",
        xpReward: 0, coinReward: 0,
    },
    {
        id: "reflect-and-improve",
        label: "Reflect & Improve",
        description: "Write a reflection after a session, then complete an exercise applying what you learned.",
        difficulty: "HARD", category: "engagement", period: "milestone", path: "self-awareness",
        xpReward: 0, coinReward: 0,
    },
    {
        id: "independence-champion",
        label: "Independence Champion",
        description: "Complete 10 exercises total in solo mode without ever unlocking Pippin.",
        difficulty: "HARD", category: "independence", period: "milestone", path: "independence",
        xpReward: 0, coinReward: 0,
    },
];

interface Props {
    currentGoalIds: string[];
    studentId: number | string;
    onSave: (selectedIds: string[], aiSuggestedIds: string[]) => void;
    onClose: () => void;
}

export default function SetStudyPlanModal({ currentGoalIds, studentId, onSave, onClose }: Props): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Student);
    const [selected, setSelected] = useState<Set<string>>(new Set(currentGoalIds));
    const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

    // ── AI suggestion state ──────────────────────────────────────────────────
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState(false);
    const [aiPlan, setAiPlan] = useState<GoalPlanResponse | null>(null);
    // Persist original AI-suggested IDs even if panel is dismissed or toggled
    const [sessionAiIds, setSessionAiIds] = useState<Set<string>>(new Set());

    // Build a lookup: goalId → AI reason (from current or past suggestions)
    const aiReasonMap: Record<string, string> = {};
    if (aiPlan?.goals) {
        aiPlan.goals.forEach((s) => { aiReasonMap[s.id] = s.reason; });
    }
    // Also mark any goal that was ever AI-suggested in this session
    const isAiSourced = (id: string): boolean => sessionAiIds.has(id);

    // ── Group goals by path ──────────────────────────────────────────────────
    const goalsByPath = useMemo(() => {
        const map = new Map<GoalPath, StudyGoal[]>();
        GOAL_PATHS.forEach((p) => map.set(p.id, []));
        ALL_STUDY_GOALS.forEach((g) => {
            const arr = map.get(g.path);
            if (arr) arr.push(g);
        });
        return map;
    }, []);

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

    async function handleAskAI(): Promise<void> {
        setAiLoading(true);
        setAiError(false);
        setAiPlan(null);
        try {
            const plan = await fetchAIGoalSuggestions(typeof studentId === "number" ? studentId : 1);

            // Special case: no data available
            if (plan && plan.goals.length === 0 && plan.planNarrative) {
                setAiPlan(plan);
                return;
            }

            if (!plan || plan.goals.length === 0) {
                setAiError(true);
                return;
            }

            const validIds = new Set(ALL_STUDY_GOALS.map((g) => g.id));
            const valid = plan.goals
                .filter((s) => validIds.has(s.id))
                .filter((s) => !currentGoalIds.includes(s.id));  // exclude already-active goals

            if (valid.length === 0) {
                setAiError(true);
            } else {
                setAiPlan({ ...plan, goals: valid });
                // Store original AI-suggested IDs for save-time tracking
                setSessionAiIds((prev) => {
                    const next = new Set(prev);
                    valid.forEach((s) => next.add(s.id));
                    return next;
                });
                // Auto-select the AI-suggested goals
                setSelected((prev) => {
                    const next = new Set(prev);
                    valid.forEach((s) => next.add(s.id));
                    return next;
                });
            }
        } catch {
            setAiError(true);
        } finally {
            setAiLoading(false);
        }
    }

    return (
        <div className={"dash-modal-backdrop"} onClick={onClose}>
            <div className={"dash-modal"} onClick={(e) => e.stopPropagation()}>
                <div className={"dash-modal__header"}>
                    <h3>{t("goals-title")}</h3>
                    <button className={"dash-modal__close"} onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                <p className={"dash-modal__subtitle"}>{t("goals-subtitle")}</p>

                {/* ── AI Mini-Plan Card ─────────────────────────────────── */}
                {aiPlan && (
                    aiPlan.goals.length === 0 ? (
                        <div className="ai-miniplan ai-miniplan--nodata">
                            <FontAwesomeIcon icon={faLightbulb} className="ai-miniplan__icon" />
                            <div className="ai-miniplan__body">
                                <p className="ai-miniplan__narrative">{aiPlan.planNarrative}</p>
                            </div>
                            <button className="ai-miniplan__dismiss" onClick={() => setAiPlan(null)}>
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                    ) : (
                        <div className="ai-miniplan">
                            <div className="ai-miniplan__header">
                                <FontAwesomeIcon icon={faLightbulb} className="ai-miniplan__icon" />
                                <div className="ai-miniplan__title-wrap">
                                    <span className="ai-miniplan__badge">{t("goals-ai-plan-badge")}</span>
                                    <h4 className="ai-miniplan__title">{aiPlan.planTitle}</h4>
                                </div>
                                <button className="ai-miniplan__dismiss" onClick={() => setAiPlan(null)}>
                                    <FontAwesomeIcon icon={faTimes} />
                                </button>
                            </div>
                            <p className="ai-miniplan__narrative">{aiPlan.planNarrative}</p>
                            <div className="ai-miniplan__footer">
                                <span>{t("goals-ai-indicator", { count: aiPlan.goals.length })}</span>
                            </div>
                        </div>
                    )
                )}

                <div className="dash-modal__goals-scroll">
                {GOAL_PATHS.map((pathMeta) => {
                    const pathGoals = goalsByPath.get(pathMeta.id) ?? [];
                    if (pathGoals.length === 0) return null;
                    return (
                        <div key={pathMeta.id} className="goal-path-group">
                            <div className="goal-path-group__header">
                                <span className="goal-path-group__emoji">{pathMeta.emoji}</span>
                                <span className="goal-path-group__label">{t(pathMeta.labelKey, pathMeta.id)}</span>
                            </div>
                            {pathGoals.map((goal) => {
                                const isSelected = selected.has(goal.id);
                                const description = t(`goals-desc-${goal.id}`, goal.description);
                                const isExpanded = expandedGoalId === goal.id;
                                const aiReason = aiReasonMap[goal.id];
                                const aiSourced = isAiSourced(goal.id);
                                const isAlreadyActive = currentGoalIds.includes(goal.id);
                                return (
                                    <div
                                        key={goal.id}
                                        className={`goal-row${isSelected ? " goal-row--selected" : ""}${isAlreadyActive ? " goal-row--active" : ""}`}
                                        onClick={() => { if (!isAlreadyActive) toggle(goal.id); }}
                                        title={isAlreadyActive ? t("goals-already-active") : undefined}
                                    >
                                        <div className={`goal-row__check${isSelected ? " goal-row__check--checked" : ""}`}>
                                            {isSelected && <FontAwesomeIcon icon={faCheck} />}
                                        </div>
                                        <div className={"goal-row__body"}>
                                            <span className={"goal-row__label"}>
                                                {t(`goals-label-${goal.id}`, goal.label)}
                                                {aiSourced && (
                                                    <span className="goal-ai-badge" title={t("goals-ai-suggested-badge")}>
                                                        <FontAwesomeIcon icon={faLightbulb} />
                                                    </span>
                                                )}
                                            </span>
                                            {aiReason && (
                                                <span className="goal-row__ai-reason">
                                                    <FontAwesomeIcon icon={faLightbulb} className="goal-row__ai-reason-icon" />
                                                    {aiReason}
                                                </span>
                                            )}
                                            <div className={"goal-row__desc-wrap"}>
                                                <span
                                                    className={`goal-row__desc${isExpanded ? " goal-row__desc--expanded" : ""}`}
                                                    title={description}
                                                >
                                                    {description}
                                                </span>
                                                <button
                                                    type={"button"}
                                                    className={"goal-row__info-btn"}
                                                    aria-label={"Toggle full goal description"}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExpandedGoalId((prev) => (prev === goal.id ? null : goal.id));
                                                    }}
                                                >
                                                    {isExpanded ? "-" : "i"}
                                                </button>
                                            </div>
                                            <div className={"goal-row__tags"}>
                                                <span className={`goal-row__tag goal-row__tag--${goal.category}`}>{t(`goals-category-${goal.category}`, goal.category)}</span>
                                                <span className={`goal-row__tag goal-row__tag--period`}>{t(`goals-period-${goal.period}`, goal.period)}</span>
                                            </div>
                                        </div>
                                        <div className={"goal-row__meta"}>
                                            <span className={`goal-row__difficulty goal-row__difficulty--${goal.difficulty}`}>
                                                {t(`goals-difficulty-${goal.difficulty.toLowerCase()}`, goal.difficulty)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
                </div>

                {aiError && (
                    <div className="goal-ai-error">
                        <span>{t("goals-ai-error")}</span>
                    </div>
                )}

                <div className={"dash-modal__footer"}>
                    <button className={"dash-modal__action-btn"} onClick={() => onSave(Array.from(selected), Array.from(sessionAiIds))}>
                        {t("goals-set-plan")}
                    </button>
                    <button
                        className={"dash-modal__ai-link"}
                        onClick={handleAskAI}
                        disabled={aiLoading}
                    >
                        {aiLoading ? (
                            <><FontAwesomeIcon icon={faSpinner} spin /> {t("goals-ai-loading")}</>
                        ) : (
                            <><FontAwesomeIcon icon={faRobot} /> {t("goals-ask-ai")}</>
                        )}
                    </button>
                    <span className={"dash-modal__default-note"}>{t("goals-default-plan")}</span>
                </div>
            </div>
        </div>
    );
}
