import {
    faBell,
    faBullseye,
    faChartBar,
    faCheck,
    faCircleInfo,
    faFire,
    faGaugeHigh,
    faHome,
    faLightbulb,
    faRightFromBracket,
    faShieldHalved,
    faTimes,
    faTree,
    faTrophy,
    faUserCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { Paths } from "@routes/paths.ts";
import { TranslationNamespaces } from "@/i18n.ts";
import logo from "@images/home/logo320.png";
import dashboardBackground from "@images/Dashboardbackground.png";
import dashboardVideo from "@images/Dashboardimage.mp4";
import "@styles/views/dashboard.scss";
import ChooseBuddyModal, { BUDDIES } from "./dashboard/ChooseBuddyModal.tsx";
import SetStudyPlanModal, { ALL_STUDY_GOALS, StudyGoal } from "./dashboard/SetStudyPlanModal.tsx";
import CharacterShopModal, { CHARACTER_CATALOGUE, resolveOutfitSrc, type CharacterDef } from "./dashboard/CharacterShopModal.tsx";
import CharacterUnlockModal from "./dashboard/CharacterUnlockModal.tsx";
import { DailyIntentionModal } from "./dashboard/DailyIntentionModal.tsx";
import { EndSessionModal } from "./dashboard/EndSessionModal.tsx";
import { ReflectionModal } from "./dashboard/ReflectionModal.tsx";
import { getEquippedOutfitId, persistEquippedOutfitId, getActiveBuddyId, persistActiveBuddyId, getAgencyLevel, getWalletXp, getAnnouncedUnlocks, markUnlockAnnounced } from "@utils/wardrobeUtils.ts";
import { fetchStudentProgress, getGoalProgress, setAISuggestedGoals, fetchWeakness, setWeaknessTargetType, WeaknessResponse, getAccuracyLast5, getAccuracyStats } from "@utils/goalUtils.ts";
import type { StudentProgressData } from "@utils/goalUtils.ts";
import { getAgencyProgress, getDailyIntention, setDailyIntention, checkIntentionFollowThrough, syncAgencyFromBackend, addResolveXP, addInsightXP, addChoiceXP } from "@utils/agencyUtils.ts";
import { seedDemoData } from "@utils/demoData.ts";
import { fetchReflectionQueue, completeReflection, ReflectionQueueItem } from "@utils/reflectionUtils.ts";
import { MilestoneCelebrationOverlay } from "@components/shared/MilestoneCelebrationOverlay.tsx";
import { GrowingTree } from "@components/shared/GrowingTree.tsx";
import { AgencyXpToast, showAgencyToast } from "@components/shared/AgencyXpToast.tsx";

// ─── Placeholder data types — swap with real API data when available ──────────

interface LeaderboardEntry {
    rank: number;
    username: string;
    xp: number;
}

// ─── Placeholder static data — replace with API calls when backend is ready ──

const PLACEHOLDER_STATS = {
    exercisesCompleted: 0,
    exercisesDelta: "+0 this week",
    currentXP: 0,
    xpForNextLevel: 500,
    level: 1,
    levelName: "Beginner",
    streakDays: 0,
};

// Missions start empty — user adds them via SET STUDY PLAN

const PLACEHOLDER_LEADERBOARD: LeaderboardEntry[] = [
    { rank: 1, username: "—", xp: 0 },
    { rank: 2, username: "—", xp: 0 },
    { rank: 3, username: "—", xp: 0 },
];

// ─────────────────────────────────────────────────────────────────────────────

// Every 500 XP = one level. Tier names change every 2 levels.
const TIER_NAMES = [
    "Beginner",    // levels 1–2   (0 – 999 XP)
    "Apprentice",  // levels 3–4   (1000 – 1999 XP)
    "Explorer",    // levels 5–6   (2000 – 2999 XP)
    "Solver",      // levels 7–8   (3000 – 3999 XP)
    "Expert",      // levels 9–10  (4000 – 4999 XP)
    "Master",      // levels 11+   (5000+ XP)
];

function getLevelInfo(xp: number): { level: number; levelName: string } {
    const level = Math.floor(xp / 500) + 1;
    const tierIndex = Math.min(Math.floor((level - 1) / 2), TIER_NAMES.length - 1);
    const levelInTier = ((level - 1) % 2) + 1;
    return { level: levelInTier, levelName: TIER_NAMES[tierIndex] };
}

export default function StudentDashboard(): ReactElement {
    const { student, logoutStudent } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation(TranslationNamespaces.Student);

    // ── Agency XP (replaces old XP + coins system) ───────────────────────────
    const [agency, setAgency] = useState(() => getAgencyProgress(student?.id ?? "guest"));
    const [exercisesCompleted, setExercisesCompleted] = useState(0);
    const [showAllGoals, setShowAllGoals] = useState(false);
    const [streakDays, setStreakDays] = useState(0);
    const [goalsThisWeek, setGoalsThisWeek] = useState<StudentProgressData["goalsThisWeek"]>([]);
    const [solvingMethodCounts, setSolvingMethodCounts] = useState<{ method: string; value: number }[]>([]);
    const [pendingMilestone, setPendingMilestone] = useState<number | null>(null);
    const [weakness, setWeakness] = useState<WeaknessResponse | null>(null);

    // ── Dashboard tabs (side navigation) ─────────────────────────────────────
    const [activeTab, setActiveTab] = useState<"main" | "analytics" | "leaderboard" | "tree">("main");

    // ── Daily Intention Check-In ──────────────────────────────────────────────
    const [showDailyIntention, setShowDailyIntention] = useState(false);

    // ── End Session Reflection (Anchor 5.1) ───────────────────────────────────
    const [showEndSession, setShowEndSession] = useState(false);

    // ── Character unlock celebration ─────────────────────────────────────────
    const [unlockQueue, setUnlockQueue] = useState<CharacterDef[]>([]);

    useEffect(() => {
        if (!student) return;

        // Seed demo data for the demo account (one-time, before fetching)
        const init = student.username === "userdemo1"
            ? seedDemoData(student.id)
            : Promise.resolve();

        init.then(() => {
            // Sync agency XP from backend (also updates localStorage)
            syncAgencyFromBackend(student.id).then((progress) => {
                setAgency(progress);
            });

            // Also fetch legacy progress for charts/stats
            fetchStudentProgress(student.id)
                .then((data) => {
                    setExercisesCompleted(data.exercisesCompleted ?? 0);
                    setStreakDays(data.streakDays ?? 0);
                    setGoalsThisWeek(data.goalsThisWeek ?? []);
                    setSolvingMethodCounts(data.solvingMethodCounts ?? []);

                    // ── Weakness detection ────────────────────────────────
                    fetchWeakness(student.id).then((w) => {
                        if (w) setWeakness(w);
                    }).catch(() => {});

                    // ── Follow-through check for daily intention ──────────
                    const today = new Date().toISOString().slice(0, 10);
                    const goalsToday = data.goalsThisWeek?.filter(
                        (g) => g.completedAt?.slice(0, 10) === today
                    ).length ?? 0;
                    const resolveXp = checkIntentionFollowThrough(
                        student.id,
                        data.exercisesCompleted ?? 0,
                        goalsToday
                    );
                    if (resolveXp > 0) {
                        addResolveXP(student.id, resolveXp, "daily-intention-follow-through");
                        showAgencyToast("resolve", resolveXp);
                        setAgency(getAgencyProgress(student.id));
                    }
                })
                .catch(() => { /* use defaults */ });

            // Fetch pending reflection items → show Pippin prompt bubble
            fetchReflectionQueue(student.id).then((items) => {
                if (items.length > 0) {
                    setReflectionQueue(items);
                    setShowReflectionPrompt(true);
                }
            }).catch(() => { /* no reflection prompt */ });

            // Show daily intention popup if not already set today
            const existing = getDailyIntention(student.id);
            if (!existing) {
                setShowDailyIntention(true);
            }
        });
    }, [student]);

    // ── Legacy level info (derived from total agency XP for now) ─────────────
    const totalAgency = agency.totalXP;
    const agencyWallets = { choiceXP: agency.choiceXP, insightXP: agency.insightXP, resolveXP: agency.resolveXP };
    const stats = { ...PLACEHOLDER_STATS, currentXP: totalAgency, exercisesCompleted, streakDays, ...getLevelInfo(totalAgency) };
    const leaderboard = PLACEHOLDER_LEADERBOARD;

    // ── Newly unlocked characters — one-time celebration popup ──────────────
    useEffect(() => {
        if (!student) return;
        const announced = getAnnouncedUnlocks(student.id);
        const newly = CHARACTER_CATALOGUE.filter((c) => {
            if (c.unlockLevel === 0) return false;          // starter buddy — no popup
            if (announced.includes(c.id)) return false;     // already celebrated
            const xp = getWalletXp(agencyWallets, c.unlockWallet);
            return getAgencyLevel(xp) >= c.unlockLevel;
        });
        if (newly.length > 0) setUnlockQueue(newly);
    }, [student, agency]);

    const currentUnlock = unlockQueue[0];

    function handleUnlockClose(): void {
        if (currentUnlock && student) {
            markUnlockAnnounced(student.id, currentUnlock.id);
        }
        setUnlockQueue((q) => q.slice(1));
    }

    // ── Analytics computations ────────────────────────────────────────────────
    const avgAccuracy = student ? getAccuracyLast5(student.id) : 100;
    const accuracyStats = student
        ? getAccuracyStats(student.id)
        : { errors: 0, hints: 0, exercises: 0, avgErrors: 0, avgHints: 0 };

    // Goals completed this week grouped by difficulty
    const difficultyCounts: Record<"easy" | "medium" | "hard", number> = { easy: 0, medium: 0, hard: 0 };
    for (const g of goalsThisWeek) {
        const goal = ALL_STUDY_GOALS.find((sg) => sg.id === g.goalId);
        if (!goal) continue;
        const diff = goal.difficulty.toLowerCase();
        if (diff === "easy" || diff === "medium" || diff === "hard") {
            difficultyCounts[diff] += 1;
        }
    }

    // Agency XP split + focus step for the weakest wallet
    const xpSplit = [
        { key: "choice", name: t("agency-choice"), value: agency.choiceXP, color: "#ffd166" },
        { key: "insight", name: t("agency-insight"), value: agency.insightXP, color: "#06d6a0" },
        { key: "resolve", name: t("agency-resolve"), value: agency.resolveXP, color: "#ef476f" },
    ];
    const xpTotalDisplay = xpSplit.reduce((sum, x) => sum + x.value, 0);
    const xpTotal = xpTotalDisplay || 1;
    const weakestWallet = [...xpSplit].sort((a, b) => a.value - b.value)[0];
    const focusStepKeys: Record<string, string> = {
        choice: "analytics-focus-choice",
        insight: "analytics-focus-insight",
        resolve: "analytics-focus-resolve",
    };

    // Actual solving methods (Elimination / Equalization / Substitution)
    const solvingMethodLabels = ["Elimination", "Equalization", "Substitution"];
    const solvingMethods = solvingMethodLabels.map((label) => {
        const found = solvingMethodCounts.find((m) => m.method.toLowerCase() === label.toLowerCase());
        return { method: label, value: found?.value ?? 0 };
    });

    // Chart-friendly data + colors
    const METHOD_COLORS: Record<string, string> = {
        Elimination: "#219ebc",
        Equalization: "#8ecae6",
        Substitution: "#06d6a0",
    };
    const solvingMethodsChartData = solvingMethods.map((m) => ({
        method: t(`method-${m.method.toLowerCase()}`, m.method),
        value: m.value,
        fill: METHOD_COLORS[m.method] ?? "#219ebc",
    }));
    const accuracyRingColor = avgAccuracy >= 80 ? "#4caf50" : avgAccuracy >= 60 ? "#ffc107" : "#ef476f";

    // ── Modals ────────────────────────────────────────────────────────────────
    const [showBuddyPopup, setShowBuddyPopup] = useState(false);
    const [showStudyPlan, setShowStudyPlan] = useState(false);
    const [showBuddyChooser, setShowBuddyChooser] = useState(false);
    const [showShop, setShowShop] = useState(false);
    const [showXpInfo, setShowXpInfo] = useState(false);

    // ── Post-exercise reflection (Pippin prompt) ──────────────────────────
    const [reflectionQueue, setReflectionQueue] = useState<ReflectionQueueItem[]>([]);
    const [showReflectionPrompt, setShowReflectionPrompt] = useState(false);
    const [showReflectionModal, setShowReflectionModal] = useState(false);

    const [activeBuddyId, setActiveBuddyId] = useState(() => getActiveBuddyId(student?.id ?? "guest"));
    const [activeGoalIds, setActiveGoalIds] = useState<string[]>(() => {
        try {
            const key = `active_goal_ids_${student?.id ?? "guest"}`;
            return JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
        }
        catch { return []; }
    });

    // Track equipped outfit per character, initialised from localStorage (scoped per student)
    const [equippedOutfitIds, setEquippedOutfitIds] = useState<Record<string, string>>(() => {
        const result: Record<string, string> = {};
        for (const char of CHARACTER_CATALOGUE) {
            const id = getEquippedOutfitId(student?.id ?? "guest", char.id);
            if (id) result[char.id] = id;
        }
        return result;
    });

    const activeBuddy = BUDDIES.find((b) => b.id === activeBuddyId) ?? BUDDIES[0];
    const activeCatalogue = CHARACTER_CATALOGUE.find((c) => c.id === activeBuddyId);
    // Use equipped outfit image, fall back to character base image
    const buddyImgSrc: string | undefined =
        (equippedOutfitIds[activeBuddyId]
            ? resolveOutfitSrc(activeBuddyId, equippedOutfitIds[activeBuddyId])
            : undefined) ?? activeCatalogue?.baseSrc;

    const activeGoals: StudyGoal[] = ALL_STUDY_GOALS.filter((g) => activeGoalIds.includes(g.id));

    function handleRemoveGoal(id: string): void {
        setActiveGoalIds((prev) => {
            const updated = prev.filter((gid) => gid !== id);
            const key = `active_goal_ids_${student?.id ?? "guest"}`;
            localStorage.setItem(key, JSON.stringify(updated));
            return updated;
        });
    }

    async function handleSavePlan(ids: string[], aiSuggestedIds: string[]): Promise<void> {
        setActiveGoalIds(ids);
        const key = `active_goal_ids_${student?.id ?? "guest"}`;
        localStorage.setItem(key, JSON.stringify(ids));
        // Track which goals were AI-suggested
        if (student) {
            setAISuggestedGoals(student.id, aiSuggestedIds);
            // If Face Your Weakness is selected, fetch weakness and set target
            if (ids.includes("face-your-weakness")) {
                const weakness = await fetchWeakness(student.id);
                if (weakness?.weakest?.recommendedExercise) {
                    setWeaknessTargetType(student.id, weakness.weakest.recommendedExercise);
                }
            }

            // ── Insight XP: Student naturally targets their weak area ──
            // Fetch weakness if not already loaded
            let weakData = weakness;
            if (!weakData) {
                weakData = await fetchWeakness(student.id);
                if (weakData) setWeakness(weakData);
            }
            if (weakData?.weakest) {
                const weaknessKey = weakData.weakest.key;
                // Map weakness dimension → helpful goal categories
                const WEAKNESS_TO_CATEGORIES: Record<string, string[]> = {
                    "decision-accuracy": ["decision"],
                    "efficiency-judgment": ["decision"],
                    "method-recognition": ["decision"],
                    "computational-skill": ["math"],
                    "independence": ["ai", "independence"],
                    "consistency": ["engagement"],
                };
                const helpfulCategories = WEAKNESS_TO_CATEGORIES[weaknessKey] ?? [];
                // Check if any selected NON-AI goals target the weak area
                const aiSet = new Set(aiSuggestedIds);
                const selfPickedForWeakness = ids.filter((id) => {
                    if (aiSet.has(id)) return false; // not self-awareness if AI did it
                    const goal = ALL_STUDY_GOALS.find((g) => g.id === id);
                    return goal && helpfulCategories.includes(goal.category);
                });
                if (selfPickedForWeakness.length > 0) {
                    const insightAmount = Math.min(selfPickedForWeakness.length * 8, 24);
                    addInsightXP(student.id, insightAmount, "targeted-weak-area");
                    showAgencyToast("insight", insightAmount);
                    setAgency(getAgencyProgress(student.id));
                }
            }
        }
        setShowStudyPlan(false);
    }

    function handleSelectBuddy(id: string): void {
        setActiveBuddyId(id);
        persistActiveBuddyId(student?.id ?? "guest", id);
        setShowBuddyChooser(false);
    }

    function handleEquip(charId: string, itemId: string): void {
        persistEquippedOutfitId(student?.id ?? "guest", charId, itemId);
        setEquippedOutfitIds((prev) => ({ ...prev, [charId]: itemId }));
        setShowShop(false);
    }

    function handleLogout(): void {
        logoutStudent();
        navigate(Paths.HomePath);
    }

    function handleDailyIntention(choice: string, customText?: string, detectedCategory?: string): void {
        if (!student) return;
        setDailyIntention(student.id, choice, customText ?? "", exercisesCompleted, detectedCategory ?? "unclear");

        // Don't close modal for custom text — AI feedback shows inside modal
        if (choice !== "custom") {
            setShowDailyIntention(false);
        }

        // Navigate based on choice
        if (choice === "practice") {
            navigate(Paths.FlexibilityPath);
        } else if (choice === "goal") {
            setShowStudyPlan(true);
        } else if (choice === "review") {
            // "Review my progress" — jump straight to the Analytics tab
            setActiveTab("analytics");
        }
        // "custom" — AI feedback shows inside modal, then stays on dashboard
    }

    function handleSkipIntention(): void {
        if (student) {
            // Persist a "skipped" marker so the popup doesn't re-appear on every reload
            setDailyIntention(student.id, "skip");
        }
        setShowDailyIntention(false);
    }

    // ── Reflection handlers ───────────────────────────────────────────────
    function handleReflectionYes(): void {
        if (!student) return;
        setShowReflectionPrompt(false);
        addChoiceXP(student.id, 5, "reflection-opted-in");
        showAgencyToast("choice", 5);
        setAgency(getAgencyProgress(student.id));
        setShowReflectionModal(true);
    }

    function handleReflectionNo(): void {
        if (!student) return;
        setShowReflectionPrompt(false);
        // Mark pending items skipped so they don't re-prompt this session
        reflectionQueue.forEach((item) => {
            void completeReflection(student.id, item.id, [], true);
        });
        setReflectionQueue([]);
    }

    function handleReflectionInsight(amount: number): void {
        if (!student) return;
        addInsightXP(student.id, amount, "reflection-aligned");
        showAgencyToast("insight", amount);
        setAgency(getAgencyProgress(student.id));
    }

    return (
        <div className={"dashboard"}>
            {/* ── Animated background (video + dim overlay) ─────────────── */}
            <video
                className={"dashboard__bg-video"}
                src={dashboardVideo}
                poster={dashboardBackground}
                autoPlay
                muted
                loop
                playsInline
            />
            <div className={"dashboard__bg-overlay"} />

            {/* ── Top Nav ─────────────────────────────────────────────────── */}
            <nav className={"dashboard__nav"}>
                <span className={"dashboard__nav-logo"}>
                    <img src={logo} alt="AlgeSPACE Logo" />
                </span>

                <div className={"dashboard__nav-xp"}>
                    <span className={"dashboard__nav-xp-label"}>
                        {t("dashboard-agency-progress")}
                        <button
                            className={"xp-info-btn"}
                            onClick={() => setShowXpInfo((v) => !v)}
                            title={t("agency-info-title")}
                            aria-label={t("agency-info-title")}
                        >
                            <FontAwesomeIcon icon={faCircleInfo} />
                        </button>
                    </span>
                    {showXpInfo && (
                        <div className={"xp-info-popover"}>
                            <div className={"xp-info-popover__header"}>
                                <span>{t("agency-info-title")}</span>
                                <button onClick={() => setShowXpInfo(false)} aria-label={t("dashboard-modal-close")}>
                                    <FontAwesomeIcon icon={faTimes} />
                                </button>
                            </div>
                            <div className={"xp-info-popover__item"}>
                                <span className={"xp-info-popover__dot xp-info-popover__dot--choice"} />
                                <div className={"xp-info-popover__body"}>
                                    <strong>{t("agency-choice")}</strong>
                                    <p>{t("agency-choice-desc")}</p>
                                </div>
                            </div>
                            <div className={"xp-info-popover__item"}>
                                <span className={"xp-info-popover__dot xp-info-popover__dot--insight"} />
                                <div className={"xp-info-popover__body"}>
                                    <strong>{t("agency-insight")}</strong>
                                    <p>{t("agency-insight-desc")}</p>
                                </div>
                            </div>
                            <div className={"xp-info-popover__item"}>
                                <span className={"xp-info-popover__dot xp-info-popover__dot--resolve"} />
                                <div className={"xp-info-popover__body"}>
                                    <strong>{t("agency-resolve")}</strong>
                                    <p>{t("agency-resolve-desc")}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className={"dashboard__nav-agency-bars"}>
                        <div className={"dashboard__nav-agency-item"}>
                            <span className={"dashboard__nav-agency-label"} style={{ color: "#ffd166" }}>
                                <FontAwesomeIcon icon={faBullseye} /> {t("agency-choice")}</span>
                            <div className={"dashboard__nav-bar-track"}>
                                <div className={"dashboard__nav-bar-fill dashboard__nav-bar-fill--choice"} style={{ width: `${Math.min((agency.choiceXP / 100) * 100, 100)}%` }} />
                            </div>
                            <span className={"dashboard__nav-agency-value"}>{agency.choiceXP}</span>
                        </div>
                        <div className={"dashboard__nav-agency-item"}>
                            <span className={"dashboard__nav-agency-label"} style={{ color: "#06d6a0" }}>
                                <FontAwesomeIcon icon={faLightbulb} /> {t("agency-insight")}</span>
                            <div className={"dashboard__nav-bar-track"}>
                                <div className={"dashboard__nav-bar-fill dashboard__nav-bar-fill--insight"} style={{ width: `${Math.min((agency.insightXP / 100) * 100, 100)}%` }} />
                            </div>
                            <span className={"dashboard__nav-agency-value"}>{agency.insightXP}</span>
                        </div>
                        <div className={"dashboard__nav-agency-item"}>
                            <span className={"dashboard__nav-agency-label"} style={{ color: "#ef476f" }}>
                                <FontAwesomeIcon icon={faShieldHalved} /> {t("agency-resolve")}</span>
                            <div className={"dashboard__nav-bar-track"}>
                                <div className={"dashboard__nav-bar-fill dashboard__nav-bar-fill--resolve"} style={{ width: `${Math.min((agency.resolveXP / 100) * 100, 100)}%` }} />
                            </div>
                            <span className={"dashboard__nav-agency-value"}>{agency.resolveXP}</span>
                        </div>
                    </div>
                </div>

                <button
                    className="dashboard__end-session-pill"
                    title={t("end-session-dash-btn")}
                    onClick={() => setShowEndSession(true)}
                >
                    <FontAwesomeIcon icon={faCheck} />
                    <span>{t("end-session-dash-btn")}</span>
                </button>

                <div className={"dashboard__nav-right"}>
                    <button className={"dashboard__nav-bell"} title={t("dashboard-notifications")}>
                        <FontAwesomeIcon icon={faBell} />
                    </button>
                    <div className={"dashboard__nav-user"}>
                        <div className={"dashboard__nav-user-info"}>
                            <span className={"dashboard__nav-user-name"}>{student?.username ?? "Student"}</span>
                            <span className={"dashboard__nav-user-level"}>
                                {t(`dashboard-tier-${stats.levelName.toLowerCase()}`, stats.levelName)} {stats.level}
                            </span>
                        </div>
                        <div className={"dashboard__nav-user-avatar"}>
                            {student?.username?.[0]?.toUpperCase() ?? <FontAwesomeIcon icon={faUserCircle} />}
                        </div>
                    </div>
                    <button
                        className={"dashboard__nav-bell"}
                        title={t("dashboard-home")}
                        onClick={() => navigate(Paths.HomePath)}
                    >
                        <FontAwesomeIcon icon={faHome} />
                    </button>
                    <button
                        className={"dashboard__nav-bell"}
                        title={t("dashboard-logout")}
                        onClick={handleLogout}
                    >
                        <FontAwesomeIcon icon={faRightFromBracket} />
                    </button>
                </div>
            </nav>

            {/* ── Body ────────────────────────────────────────────────────── */}
            <div className={"dashboard__body"}>
                {/* ── Side tab navigation ─────────────────────────────────── */}
                <aside className={"dashboard__tabs"} role="tablist" aria-label="Dashboard sections">
                    <button
                        role="tab"
                        aria-selected={activeTab === "main"}
                        className={`dashboard__tab${activeTab === "main" ? " dashboard__tab--active" : ""}`}
                        onClick={() => setActiveTab("main")}
                    >
                        <FontAwesomeIcon icon={faGaugeHigh} />
                        <span>{t("dashboard-tab-main")}</span>
                    </button>
                    <button
                        role="tab"
                        aria-selected={activeTab === "analytics"}
                        className={`dashboard__tab${activeTab === "analytics" ? " dashboard__tab--active" : ""}`}
                        onClick={() => setActiveTab("analytics")}
                    >
                        <FontAwesomeIcon icon={faChartBar} />
                        <span>{t("dashboard-tab-analytics")}</span>
                    </button>
                    <button
                        role="tab"
                        aria-selected={activeTab === "leaderboard"}
                        className={`dashboard__tab${activeTab === "leaderboard" ? " dashboard__tab--active" : ""}`}
                        onClick={() => setActiveTab("leaderboard")}
                    >
                        <FontAwesomeIcon icon={faTrophy} />
                        <span>{t("dashboard-tab-leaderboard")}</span>
                    </button>
                    <button
                        role="tab"
                        aria-selected={activeTab === "tree"}
                        className={`dashboard__tab${activeTab === "tree" ? " dashboard__tab--active" : ""}`}
                        onClick={() => setActiveTab("tree")}
                    >
                        <FontAwesomeIcon icon={faTree} />
                        <span>{t("dashboard-tab-tree")}</span>
                    </button>
                </aside>

                {/* ── Tab content ─────────────────────────────────────────── */}
                <div className={"dashboard__content"}>
                    {activeTab === "main" && (
                    <div className={"dashboard__main"}>
                    {/* Stats row */}
                    <div className={"dashboard__stats-row"}>
                        <div className={"dash-stat"}>
                            <span className={"dash-stat__label"}>{t("dashboard-exercises-completed")}</span>
                            <FontAwesomeIcon icon={faCheck} className={"dash-stat__icon"} />
                            <span className={"dash-stat__value"}>{stats.exercisesCompleted}</span>
                            <span className={"dash-stat__sub"}>{stats.exercisesDelta}</span>
                        </div>
                        <div className={"dash-stat"}>
                            <span className={"dash-stat__label"}>{t("dashboard-avg-accuracy")}</span>
                            <FontAwesomeIcon icon={faBullseye} className={"dash-stat__icon"} />
                            <span className={"dash-stat__value"}>
                                {avgAccuracy}
                                <span className={"dash-stat__unit"}>%</span>
                            </span>
                            <span className={"dash-stat__sub"}>{t("dashboard-accuracy-desc")}</span>
                        </div>
                        <div className={"dash-stat"}>
                            <span className={"dash-stat__label"}>{t("dashboard-practice-streak")}</span>
                            <FontAwesomeIcon icon={faFire} className={"dash-stat__icon"} />
                            <span className={"dash-stat__value"}>{stats.streakDays}</span>
                            <span className={"dash-stat__sub"}>{t("dashboard-days-in-row")}</span>
                        </div>
                    </div>

                    {/* Active Missions */}
                    <div>
                        <div className={"dashboard__section-header dashboard__section-header--missions"}>
                            <h2>{t("dashboard-active-missions")}</h2>
                            {activeGoals.length > 0 && (
                                <button
                                    className={"dashboard__section-header-cta dashboard__section-header-cta--missions"}
                                    onClick={() => setShowStudyPlan(true)}
                                >
                                    {t("dashboard-set-study-plan")}
                                </button>
                            )}
                        </div>

                        {activeGoals.length === 0 && (
                            <div className={"missions-empty"}>
                                <p>{t("dashboard-no-missions")}</p>
                                <button
                                    className={"missions-empty__cta"}
                                    onClick={() => setShowStudyPlan(true)}
                                >
                                    {t("dashboard-set-plan-cta")}
                                </button>
                            </div>
                        )}

                        {activeGoals.map((goal) => {
                            const progress = getGoalProgress(goal.id, student?.id ?? "guest", totalAgency, streakDays);
                            return (
                            <div key={goal.id} className={`mission-card mission-card--${goal.difficulty.toLowerCase()}`}>
                                <div className={"mission-card__top"}>
                                    <div className={"mission-card__icon"}>Σ</div>
                                    <div className={"mission-card__info"}>
                                        <div className={"mission-card__title"}>{t(`goals-label-${goal.id}`, goal.label)}</div>
                                        <div className={"mission-card__desc"}>{t(`goals-difficulty-${goal.difficulty.toLowerCase()}`, goal.difficulty)}</div>
                                    </div>
                                    <div className={"mission-card__actions"}>
                                        <span className={"mission-card__badge mission-card__badge--active"}>{t("dashboard-mission-active")}</span>
                                        <button
                                            className={"mission-card__remove"}
                                            title={t("dashboard-mission-remove")}
                                            onClick={() => handleRemoveGoal(goal.id)}
                                        >
                                            <FontAwesomeIcon icon={faTimes} />
                                        </button>
                                    </div>
                                </div>
                                <div className={"mission-card__progress-row"}>
                                    <div className={"mission-card__progress-track"}>
                                        <div className={"mission-card__progress-fill"} style={{ width: `${progress.percent}%` }} />
                                    </div>
                                    <span className={"mission-card__progress-label"}>{progress.label}</span>
                                </div>
                            </div>
                            );
                        })}
                    </div>

                    {/* Goals Completed This Week */}
                    {goalsThisWeek.length > 0 && (
                        <div>
                            <div className={"dashboard__section-header dashboard__section-header--goals"}>
                                <h2>{t("dashboard-goals-this-week")}</h2>
                                {goalsThisWeek.length > 3 && (
                                    <button
                                        className={"dashboard__section-header-cta"}
                                        onClick={() => setShowAllGoals((v) => !v)}
                                    >
                                        {showAllGoals ? t("dashboard-show-less") : t("dashboard-show-more", { count: goalsThisWeek.length - 3 })}
                                    </button>
                                )}
                            </div>
                            <div className={`goals-completed-list${showAllGoals ? " goals-completed-list--expanded" : ""}`}>
                                {(showAllGoals ? goalsThisWeek : goalsThisWeek.slice(0, 3)).map((goal) => (
                                    <div key={goal.id} className={"goals-completed-list__item"}>
                                        <span className={"goals-completed-list__icon"}>🏆</span>
                                        <span className={"goals-completed-list__label"}>{t(`goals-label-${goal.goalId}`, goal.goalLabel)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    </div>
                    )}

                    {activeTab === "leaderboard" && (
                    <div className={"dashboard__leaderboard-tab"}>
                        <div className={"dash-card dash-card--leaderboard"}>
                            <div className={"dashboard__leaderboard-title"}>
                                <span>🏆</span> {t("dashboard-leaderboard")}
                            </div>
                            {leaderboard.map((entry) => (
                                <div
                                    key={entry.rank}
                                    className={`leaderboard-entry${entry.username === student?.username ? " leaderboard-entry--current" : ""}`}
                                >
                                    <span className={"leaderboard-entry__rank"}>
                                        {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                                    </span>
                                    <span className={"leaderboard-entry__name"}>{entry.username}</span>
                                    <span className={"leaderboard-entry__xp"}>{entry.xp} XP</span>
                                </div>
                            ))}
                            <p className={"dashboard__leaderboard-hint"}>{t("dashboard-leaderboard-hint")}</p>
                        </div>
                    </div>
                    )}

                    {activeTab === "analytics" && (
                    <div className={"dashboard__analytics"}>
                        {/* Goals by difficulty */}
                        <div className={"analytics-section"}>
                            <div className={"analytics-section__title"}>{t("analytics-difficulty-title")}</div>
                            <div className={"analytics-difficulty-row"}>
                                {(["easy", "medium", "hard"] as const).map((diff) => (
                                    <div key={diff} className={`analytics-difficulty analytics-difficulty--${diff}`}>
                                        <span className={"analytics-difficulty__label"}>{t(`goals-difficulty-${diff}`)}</span>
                                        <span className={"analytics-difficulty__value"}>{difficultyCounts[diff]}</span>
                                        <span className={"analytics-difficulty__sub"}>{t("analytics-goals-completed")}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={"analytics-grid"}>
                            {/* Methods used (actual solving methods) */}
                            <div className={"analytics-section analytics-section--chart"}>
                                <div className={"analytics-section__title"}>{t("analytics-method-title")}</div>
                                <ResponsiveContainer width="100%" height={210}>
                                    <BarChart data={solvingMethodsChartData} margin={{ top: 16, right: 4, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                                        <XAxis dataKey="method" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <YAxis allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            cursor={{ fill: "rgba(255,255,255,0.04)" }}
                                            contentStyle={{ backgroundColor: "#012638", border: "1px solid rgba(33,158,188,0.35)", borderRadius: "0.5rem", fontSize: "0.75rem" }}
                                            labelStyle={{ color: "#fff" }}
                                            itemStyle={{ color: "#8ecae6" }}
                                        />
                                        <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={46}>
                                            {solvingMethodsChartData.map((entry) => (
                                                <Cell key={entry.method} fill={entry.fill} />
                                            ))}
                                            <LabelList dataKey="value" position="top" fill="#fff" fontSize={12} fontWeight={700} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                                {solvingMethods.every((m) => m.value === 0) && (
                                    <p className={"analytics-empty"}>{t("analytics-no-method-data")}</p>
                                )}
                            </div>

                            {/* XP split + focus step */}
                            <div className={"analytics-section analytics-section--chart"}>
                                <div className={"analytics-section__title"}>{t("analytics-xp-title")}</div>
                                <div className={"analytics-xp-split"}>
                                    <div className={"analytics-xp-split__donut"}>
                                        <ResponsiveContainer width="100%" height={168}>
                                            <PieChart>
                                                <Pie
                                                    data={xpSplit}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    innerRadius={46}
                                                    outerRadius={70}
                                                    paddingAngle={4}
                                                    strokeWidth={0}
                                                    isAnimationActive
                                                >
                                                    {xpSplit.map((xp) => (
                                                        <Cell key={xp.key} fill={xp.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: "#012638", border: "1px solid rgba(33,158,188,0.35)", borderRadius: "0.5rem", fontSize: "0.75rem" }}
                                                    labelStyle={{ color: "#fff" }}
                                                    itemStyle={{ color: "#8ecae6" }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className={"analytics-xp-split__center"}>
                                            <span className={"analytics-xp-split__total"}>{xpTotalDisplay}</span>
                                            <span className={"analytics-xp-split__caption"}>{t("analytics-xp-total")}</span>
                                        </div>
                                    </div>
                                    <div className={"analytics-xp-split__legend"}>
                                        {xpSplit.map((xp) => (
                                            <div key={xp.key} className={"analytics-xp-split__item"}>
                                                <span className={"analytics-xp-split__dot"} style={{ background: xp.color }} />
                                                <span className={"analytics-xp-split__name"}>{xp.name}</span>
                                                <span className={"analytics-xp-split__value"}>{xp.value}</span>
                                                <span className={"analytics-xp-split__pct"}>{Math.round((xp.value / xpTotal) * 100)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className={"analytics-focus"}>
                                    <FontAwesomeIcon icon={faLightbulb} className={"analytics-focus__icon"} />
                                    <p>{t(focusStepKeys[weakestWallet.key], t("analytics-focus-default"))}</p>
                                </div>
                            </div>
                        </div>

                        {/* Accuracy: ring gauge + avg errors/hints */}
                        <div className={"analytics-section"}>
                            <div className={"analytics-section__title"}>{t("analytics-accuracy-title")}</div>
                            <div className={"analytics-accuracy-layout"}>
                                <div className={"analytics-ring"}>
                                    <svg viewBox="0 0 100 100" className={"analytics-ring__svg"} role="img" aria-label={`${avgAccuracy}%`}>
                                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="11" />
                                        <circle
                                            cx="50" cy="50" r="42" fill="none"
                                            stroke={accuracyRingColor}
                                            strokeWidth="11"
                                            strokeLinecap="round"
                                            strokeDasharray={`${Math.min(avgAccuracy, 100) * 2.64} 264`}
                                            transform="rotate(-90 50 50)"
                                        />
                                    </svg>
                                    <div className={"analytics-ring__value"}>{avgAccuracy}%</div>
                                    <div className={"analytics-ring__label"}>{t("analytics-avg-accuracy")}</div>
                                </div>
                                <div className={"analytics-accuracy-row"}>
                                    <div className={"analytics-accuracy"}>
                                        <span className={"analytics-accuracy__label"}>{t("analytics-avg-errors")}</span>
                                        <span className={"analytics-accuracy__value"}>{accuracyStats.avgErrors}</span>
                                    </div>
                                    <div className={"analytics-accuracy"}>
                                        <span className={"analytics-accuracy__label"}>{t("analytics-avg-hints")}</span>
                                        <span className={"analytics-accuracy__value"}>{accuracyStats.avgHints}</span>
                                    </div>
                                </div>
                            </div>
                            <p className={"analytics-empty"}>{t("analytics-accuracy-hint")}</p>
                        </div>
                    </div>
                    )}

                    {activeTab === "tree" && (
                    <div className={"dashboard__tree-tab"}>
                        <GrowingTree choiceXP={agency.choiceXP} insightXP={agency.insightXP} resolveXP={agency.resolveXP} />
                    </div>
                    )}
                </div>
            </div>

            {/* ── Buddy widget ─────────────────────────────────────────────── */}
            <div className={"dashboard__buddy"}>
                {showReflectionPrompt && reflectionQueue.length > 0 && (
                    <div className={"buddy-reflection-bubble"}>
                        <div className={"buddy-reflection-bubble__head"}>
                            <span className={"buddy-reflection-bubble__avatar"}>
                                {buddyImgSrc ? <img src={buddyImgSrc} alt={activeBuddy.name} /> : <span>{activeBuddy.emoji}</span>}
                            </span>
                            <strong>{activeBuddy.name}</strong>
                        </div>
                        <p className={"buddy-reflection-bubble__text"}>
                            {t("reflection-prompt-text", { label: reflectionQueue[0].itemLabel })}
                        </p>
                        <div className={"buddy-reflection-bubble__actions"}>
                            <button className={"buddy-reflection-bubble__no"} onClick={handleReflectionNo}>
                                {t("reflection-prompt-no")}
                            </button>
                            <button className={"buddy-reflection-bubble__yes"} onClick={handleReflectionYes}>
                                {t("reflection-prompt-yes")}
                            </button>
                        </div>
                    </div>
                )}
                {showBuddyPopup && (
                    <div className={"buddy-popup"}>
                        <button
                            className={"buddy-popup__btn"}
                            onClick={() => { setShowBuddyPopup(false); setShowBuddyChooser(true); }}
                        >
                            {t("dashboard-change-buddy")}
                        </button>
                        <button
                            className={"buddy-popup__btn"}
                            onClick={() => { setShowBuddyPopup(false); setShowShop(true); }}
                        >
                            {t("dashboard-wardrobe")}
                        </button>
                    </div>
                )}
                <button
                    className={"dashboard__buddy-btn"}
                    onClick={() => setShowBuddyPopup((v) => !v)}
                    title={t("dashboard-buddy-menu")}
                >
                    {buddyImgSrc ? (
                        <img src={buddyImgSrc} alt={activeBuddy.name} />
                    ) : (
                        <span>{activeBuddy.emoji}</span>
                    )}
                </button>
            </div>

            {/* ── Modals ───────────────────────────────────────────────────── */}
            {showStudyPlan && (
                <SetStudyPlanModal
                    currentGoalIds={activeGoalIds}
                    studentId={student?.id ?? "guest"}
                    onSave={handleSavePlan}
                    onClose={() => setShowStudyPlan(false)}
                />
            )}
            {showBuddyChooser && (
                <ChooseBuddyModal
                    currentBuddyId={activeBuddyId}
                    wallets={agencyWallets}
                    onSelect={handleSelectBuddy}
                    onClose={() => setShowBuddyChooser(false)}
                />
            )}
            {showShop && (
                <CharacterShopModal
                    characterId={activeBuddyId}
                    wallets={agencyWallets}
                    equippedOutfitId={equippedOutfitIds[activeBuddyId]}
                    onEquip={handleEquip}
                    onClose={() => setShowShop(false)}
                />
            )}
            {pendingMilestone !== null && (
                <MilestoneCelebrationOverlay
                    milestone={pendingMilestone}
                    onDismiss={() => setPendingMilestone(null)}
                />
            )}
            {showEndSession && (
                <EndSessionModal
                    studentId={student?.id ?? "guest"}
                    onEndSession={handleLogout}
                    onClose={() => setShowEndSession(false)}
                />
            )}
            {showReflectionModal && student && (
                <ReflectionModal
                    studentId={student.id}
                    items={reflectionQueue}
                    buddyName={activeBuddy.name}
                    buddyEmoji={activeBuddy.emoji}
                    buddyImgSrc={buddyImgSrc}
                    onAwardInsight={handleReflectionInsight}
                    onClose={() => {
                        setShowReflectionModal(false);
                        setReflectionQueue([]);
                    }}
                />
            )}
            {showDailyIntention && (
                <DailyIntentionModal
                    studentId={student?.id ?? "guest"}
                    studentName={student?.username ?? "Student"}
                    buddyName={activeBuddy.name}
                    buddyEmoji={activeBuddy.emoji}
                    buddyImgSrc={buddyImgSrc}
                    onSelectPlan={handleDailyIntention}
                    onSkip={handleSkipIntention}
                />
            )}
            {currentUnlock && student && (
                <CharacterUnlockModal
                    character={currentUnlock}
                    userName={student.username ?? "Student"}
                    onClose={handleUnlockClose}
                />
            )}
            <AgencyXpToast />
        </div>
    );
}

