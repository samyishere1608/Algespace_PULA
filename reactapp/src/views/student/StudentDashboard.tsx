import {
    faBell,
    faBook,
    faCheck,
    faFire,
    faHome,
    faRightFromBracket,
    faTimes,
    faUserCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Legend,
    Line,
    LineChart,
    PolarAngleAxis,
    PolarGrid,
    Radar,
    RadarChart,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { Paths } from "@routes/paths.ts";
import logo from "@images/home/logo320.png";
import "@styles/views/dashboard.scss";
import ChooseBuddyModal, { BUDDIES } from "./dashboard/ChooseBuddyModal.tsx";
import SetStudyPlanModal, { ALL_STUDY_GOALS, StudyGoal } from "./dashboard/SetStudyPlanModal.tsx";
import CharacterShopModal, { CHARACTER_CATALOGUE, resolveOutfitSrc } from "./dashboard/CharacterShopModal.tsx";
import { getEquippedOutfitId, persistEquippedOutfitId, persistOwnedOutfitId, getActiveBuddyId, persistActiveBuddyId, getCoins, spendCoins } from "@utils/wardrobeUtils.ts";
import { fetchStudentProgress, getGoalProgress } from "@utils/goalUtils.ts";
import { MilestoneCelebrationOverlay } from "@components/shared/MilestoneCelebrationOverlay.tsx";
import { GrowingTree } from "@components/shared/GrowingTree.tsx";
import { CoinPot } from "@components/shared/CoinPot.tsx";

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
    avgEfficiency: 0,
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

const PLACEHOLDER_VERSATILITY = [
    { method: "Substitution", value: 0 },
    { method: "Equalization", value: 0 },
    { method: "Elimination", value: 0 },
];

const PLACEHOLDER_PERFORMANCE = [
    { day: "Mon", xp: 0 },
    { day: "Tue", xp: 0 },
    { day: "Wed", xp: 0 },
    { day: "Thu", xp: 0 },
    { day: "Fri", xp: 0 },
    { day: "Sat", xp: 0 },
    { day: "Sun", xp: 0 },
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

    // ── Real XP from backend ──────────────────────────────────────────────────
    const [currentXP, setCurrentXP] = useState(0);
    const [currentCoins, setCurrentCoins] = useState(() => getCoins(student?.id ?? "guest"));
    const [exercisesCompleted, setExercisesCompleted] = useState(0);
    const [showAllGoals, setShowAllGoals] = useState(false);
    const [streakDays, setStreakDays] = useState(0);
    const [goalsThisWeek, setGoalsThisWeek] = useState<string[]>([]);
    const [methodCounts, setMethodCounts] = useState<{ method: string; value: number }[]>([]);
    const [dailyXp, setDailyXp] = useState<{ day: string; xp: number }[]>([]);
    const [pendingMilestone, setPendingMilestone] = useState<number | null>(null);

    useEffect(() => {
        if (student) {
            fetchStudentProgress(student.id)
                .then((data) => {
                    const xp = data.totalXP ?? 0;
                    setCurrentXP(xp);
                    setExercisesCompleted(data.exercisesCompleted ?? 0);
                    setStreakDays(data.streakDays ?? 0);
                    setGoalsThisWeek(data.goalsThisWeek?.map((g) => g.goalLabel) ?? []);
                    setMethodCounts(data.methodCounts ?? []);
                    setDailyXp(data.dailyXp ?? []);

                    // Check if we should show a milestone celebration
                    const XP_STEP = 500;
                    const achievedMilestone = Math.floor(xp / XP_STEP) * XP_STEP;
                    if (achievedMilestone > 0) {
                        const seenKey = `milestone_seen_${student.id}_${achievedMilestone}`;
                        if (!localStorage.getItem(seenKey)) {
                            localStorage.setItem(seenKey, "1");
                            setPendingMilestone(achievedMilestone);
                        }
                    }
                })
                .catch(() => { /* use defaults */ });
        }
    }, [student]);

    const stats = { ...PLACEHOLDER_STATS, currentXP, exercisesCompleted, streakDays, ...getLevelInfo(currentXP) };
    const leaderboard = PLACEHOLDER_LEADERBOARD;

    // ── Milestone XP bar: rolls over every 500 XP ────────────────────────────
    const XP_PER_MILESTONE = 500;
    const milestoneTier = Math.floor(currentXP / XP_PER_MILESTONE);
    const milestoneStart = milestoneTier * XP_PER_MILESTONE;
    const milestoneEnd = (milestoneTier + 1) * XP_PER_MILESTONE;
    const xpInTier = currentXP - milestoneStart;
    const xpPercent = (xpInTier / XP_PER_MILESTONE) * 100;

    // ── Modals ────────────────────────────────────────────────────────────────
    const [showBuddyPopup, setShowBuddyPopup] = useState(false);
    const [showStudyPlan, setShowStudyPlan] = useState(false);
    const [showBuddyChooser, setShowBuddyChooser] = useState(false);
    const [showShop, setShowShop] = useState(false);

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

    function handleSavePlan(ids: string[]): void {
        setActiveGoalIds(ids);
        const key = `active_goal_ids_${student?.id ?? "guest"}`;
        localStorage.setItem(key, JSON.stringify(ids));
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

    function handleBuy(charId: string, itemId: string, coinCost: number): void {
        if (!student) return;
        try {
            const newTotal = spendCoins(student.id, coinCost);
            persistOwnedOutfitId(student.id, charId, itemId);
            persistEquippedOutfitId(student.id, charId, itemId);
            setEquippedOutfitIds((prev) => ({ ...prev, [charId]: itemId }));
            setCurrentCoins(newTotal);
            setShowShop(false);
        } catch {
            alert("Not enough coins to buy this outfit!");
        }
    }

    function handleLogout(): void {
        logoutStudent();
        navigate(Paths.HomePath);
    }

    return (
        <div className={"dashboard"}>
            {/* ── Top Nav ─────────────────────────────────────────────────── */}
            <nav className={"dashboard__nav"}>
                <span className={"dashboard__nav-logo"}>
                    <img src={logo} alt="AlgeSPACE Logo" />
                </span>

                <div className={"dashboard__nav-xp"}>
                    <span className={"dashboard__nav-xp-label"}>Global XP Progress</span>
                    <div className={"dashboard__nav-bar-track"}>
                        <div className={"dashboard__nav-bar-fill"} style={{ width: `${xpPercent}%` }} />
                    </div>
                    <span className={"dashboard__nav-xp-values"}>
                        {currentXP.toLocaleString()} / {milestoneEnd.toLocaleString()} XP
                    </span>
                </div>

                <div className={"dashboard__nav-right"}>
                    <button className={"dashboard__nav-bell"} title={"Notifications"}>
                        <FontAwesomeIcon icon={faBell} />
                    </button>
                    <div className={"dashboard__nav-user"}>
                        <div className={"dashboard__nav-user-info"}>
                            <span className={"dashboard__nav-user-name"}>{student?.username ?? "Student"}</span>
                            <span className={"dashboard__nav-user-level"}>
                                {stats.levelName} {stats.level}
                            </span>
                        </div>
                        <div className={"dashboard__nav-user-avatar"}>
                            {student?.username?.[0]?.toUpperCase() ?? <FontAwesomeIcon icon={faUserCircle} />}
                        </div>
                    </div>
                    <button
                        className={"dashboard__nav-bell"}
                        title={"Home"}
                        onClick={() => navigate(Paths.HomePath)}
                    >
                        <FontAwesomeIcon icon={faHome} />
                    </button>
                    <button
                        className={"dashboard__nav-bell"}
                        title={"Logout"}
                        onClick={handleLogout}
                    >
                        <FontAwesomeIcon icon={faRightFromBracket} />
                    </button>
                </div>
            </nav>

            {/* ── Body ────────────────────────────────────────────────────── */}
            <div className={"dashboard__body"}>
                {/* ── Left panel ──────────────────────────────────────────── */}
                <div className={"dashboard__left-panel"}>
                    <GrowingTree xp={currentXP} />
                </div>
                {/* ── Main column ─────────────────────────────────────────── */}
                <div className={"dashboard__main"}>
                    {/* Stats row */}
                    <div className={"dashboard__stats-row"}>
                        <div className={"dash-stat"}>
                            <span className={"dash-stat__label"}>Exercises Completed</span>
                            <FontAwesomeIcon icon={faCheck} className={"dash-stat__icon"} />
                            <span className={"dash-stat__value"}>{stats.exercisesCompleted}</span>
                            <span className={"dash-stat__sub"}>{stats.exercisesDelta}</span>
                        </div>
                        <div className={"dash-stat"}>
                            <span className={"dash-stat__label"}>Avg. Efficiency</span>
                            <FontAwesomeIcon icon={faBook} className={"dash-stat__icon"} />
                            <span className={"dash-stat__value"}>
                                {stats.avgEfficiency}
                                <span className={"dash-stat__unit"}>%</span>
                            </span>
                            <span className={"dash-stat__sub"}>Optimal path logic</span>
                        </div>
                        <div className={"dash-stat"}>
                            <span className={"dash-stat__label"}>Practice Streak</span>
                            <FontAwesomeIcon icon={faFire} className={"dash-stat__icon"} />
                            <span className={"dash-stat__value"}>{stats.streakDays}</span>
                            <span className={"dash-stat__sub"}>days in a row</span>
                        </div>
                    </div>

                    {/* Active Missions */}
                    <div>
                        <div className={"dashboard__section-header"}>
                            <h2>Active Missions</h2>
                            <button
                                className={"dashboard__section-header-cta"}
                                onClick={() => setShowStudyPlan(true)}
                            >
                                + SET STUDY PLAN
                            </button>
                        </div>

                        {activeGoals.length === 0 && (
                            <div className={"missions-empty"}>
                                <p>No active missions yet.</p>
                                <button
                                    className={"missions-empty__cta"}
                                    onClick={() => setShowStudyPlan(true)}
                                >
                                    + Set your study plan
                                </button>
                            </div>
                        )}

                        {activeGoals.map((goal) => {
                            const progress = getGoalProgress(goal.id, student?.id ?? "guest", currentXP, streakDays);
                            return (
                            <div key={goal.id} className={"mission-card"}>
                                <div className={"mission-card__top"}>
                                    <div className={"mission-card__icon"}>Σ</div>
                                    <div className={"mission-card__info"}>
                                        <div className={"mission-card__title"}>{goal.label}</div>
                                        <div className={"mission-card__desc"}>{goal.difficulty}</div>
                                    </div>
                                    <div className={"mission-card__actions"}>
                                        <span className={"mission-card__badge mission-card__badge--active"}>Active</span>
                                        <button
                                            className={"mission-card__remove"}
                                            title={"Remove mission"}
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
                            <div className={"dashboard__section-header"}>
                                <h2>Goals Completed This Week</h2>
                                {goalsThisWeek.length > 3 && (
                                    <button
                                        className={"dashboard__section-header-cta"}
                                        onClick={() => setShowAllGoals((v) => !v)}
                                    >
                                        {showAllGoals ? "Show less ▲" : `+${goalsThisWeek.length - 3} more ▼`}
                                    </button>
                                )}
                            </div>
                            <div className={`goals-completed-list${showAllGoals ? " goals-completed-list--expanded" : ""}`}>
                                {(showAllGoals ? goalsThisWeek : goalsThisWeek.slice(0, 3)).map((label, i) => (
                                    <div key={i} className={"goals-completed-list__item"}>
                                        <span className={"goals-completed-list__icon"}>🏆</span>
                                        <span className={"goals-completed-list__label"}>{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Charts */}
                    <div className={"dashboard__charts-row"}>
                        <div className={"dash-chart"}>
                            <div className={"dash-chart__title"}>Method Versatility</div>
                            <ResponsiveContainer width="100%" height={200}>
                                <RadarChart data={
                                    methodCounts.length > 0
                                        ? methodCounts.map((m) => ({ method: m.method, value: m.value }))
                                        : PLACEHOLDER_VERSATILITY
                                }>
                                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                    <PolarAngleAxis dataKey="method" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} />
                                    <Radar
                                        name="Exercises"
                                        dataKey="value"
                                        stroke="#219ebc"
                                        fill="#219ebc"
                                        fillOpacity={0.35}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#012638", border: "1px solid rgba(33,158,188,0.3)", borderRadius: "0.5rem", fontSize: "0.85rem" }}
                                        labelStyle={{ color: "#fff" }}
                                        itemStyle={{ color: "#8ecae6" }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className={"dash-chart"}>
                            <div className={"dash-chart__title"}>Performance History (XP / day)</div>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={dailyXp.length > 0 ? dailyXp : PLACEHOLDER_PERFORMANCE}>
                                    <Line
                                        type="monotone"
                                        dataKey="xp"
                                        stroke="#219ebc"
                                        strokeWidth={2}
                                        dot={{ fill: "#219ebc", r: 3 }}
                                        activeDot={{ r: 5 }}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#012638", border: "1px solid rgba(33,158,188,0.3)", borderRadius: "0.5rem", fontSize: "0.85rem" }}
                                        labelStyle={{ color: "#fff" }}
                                        itemStyle={{ color: "#8ecae6" }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* ── Sidebar ──────────────────────────────────────────────── */}
                <div className={"dashboard__sidebar"}>                    
                    <div className={"dash-card"}>
                        <CoinPot coins={currentCoins} />
                    </div>
                    <div className={"dash-card"}>
                        <div className={"dashboard__leaderboard-title"}>
                            <span>🏆</span> Class Leaderboard
                        </div>
                        {leaderboard.map((entry) => (
                            <div
                                key={entry.rank}
                                className={`leaderboard-entry${entry.username === student?.username ? " leaderboard-entry--current" : ""}`}
                            >
                                <span className={"leaderboard-entry__rank"}>{entry.rank}</span>
                                <span className={"leaderboard-entry__name"}>{entry.username}</span>
                                <span className={"leaderboard-entry__xp"}>{entry.xp} XP</span>
                            </div>
                        ))}
                        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.25)", marginTop: "0.75rem", textAlign: "center" }}>
                            Leaderboard unlocks when more students join
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Buddy widget ─────────────────────────────────────────────── */}
            <div className={"dashboard__buddy"}>
                {showBuddyPopup && (
                    <div className={"buddy-popup"}>
                        <button
                            className={"buddy-popup__btn"}
                            onClick={() => { setShowBuddyPopup(false); setShowBuddyChooser(true); }}
                        >
                            Change Buddy
                        </button>
                        <button
                            className={"buddy-popup__btn"}
                            onClick={() => { setShowBuddyPopup(false); setShowShop(true); }}
                        >
                            Wardrobe
                        </button>
                    </div>
                )}
                <div className={"dashboard__buddy-bubble"}></div>
                <button
                    className={"dashboard__buddy-btn"}
                    onClick={() => setShowBuddyPopup((v) => !v)}
                    title={"Open buddy menu"}
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
                    onSave={handleSavePlan}
                    onClose={() => setShowStudyPlan(false)}
                />
            )}
            {showBuddyChooser && (
                <ChooseBuddyModal
                    currentBuddyId={activeBuddyId}
                    currentXp={stats.currentXP}
                    onSelect={handleSelectBuddy}
                    onClose={() => setShowBuddyChooser(false)}
                />
            )}
            {showShop && (
                <CharacterShopModal
                    studentId={student?.id ?? "guest"}
                    characterId={activeBuddyId}
                    currentXp={stats.currentXP}
                    currentCoins={currentCoins}
                    equippedOutfitId={equippedOutfitIds[activeBuddyId]}
                    onEquip={handleEquip}
                    onBuy={handleBuy}
                    onClose={() => setShowShop(false)}
                />
            )}
            {pendingMilestone !== null && (
                <MilestoneCelebrationOverlay
                    milestone={pendingMilestone}
                    onDismiss={() => setPendingMilestone(null)}
                />
            )}
        </div>
    );
}

