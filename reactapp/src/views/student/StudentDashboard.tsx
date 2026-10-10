import {
    faArrowRight,
    faBell,
    faBullseye,
    faChartBar,
    faCheck,
    faCircleInfo,
    faCircleQuestion,
    faClipboardList,
    faFire,
    faGaugeHigh,
    faHome,
    faLightbulb,
    faMedal,
    faPlus,
    faRightFromBracket,
    faShieldHalved,
    faTimes,
    faTree,
    faTrophy,
    faUserCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, useCallback, useEffect, useState } from "react";
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
import DashboardExercises from "./dashboard/DashboardExercises.tsx";
import SetGoalsModal from "./dashboard/SetGoalsModal.tsx";
import type { GoalOrigin } from "./dashboard/SetGoalsModal.tsx";
import CharacterShopModal, { CHARACTER_CATALOGUE, resolveOutfitSrc, type CharacterDef } from "./dashboard/CharacterShopModal.tsx";
import CharacterUnlockModal from "./dashboard/CharacterUnlockModal.tsx";
import { DailyIntentionModal } from "./dashboard/DailyIntentionModal.tsx";
import { EndSessionModal } from "./dashboard/EndSessionModal.tsx";
import { ReflectionModal } from "./dashboard/ReflectionModal.tsx";
import { getEquippedOutfitId, persistEquippedOutfitId, getActiveBuddyId, persistActiveBuddyId, getAgencyLevel, getWalletXp, getAnnouncedUnlocks, markUnlockAnnounced } from "@utils/wardrobeUtils.ts";
import { fetchStudentProgress, getAccuracyLast5, getAccuracyStats } from "@utils/progressUtils.ts";
import type { StudentProgressData } from "@utils/progressUtils.ts";
import type { GoalProgress, StudyGoal } from "@/types/student/goal.ts";
import { addGoal, getActiveGoals, removeGoal } from "@utils/activeGoals.ts";
import { GOAL_RESOLVE_XP, asTranslate, describeGoal, getCategoryDef } from "@utils/goalCatalog.ts";
import { claimCompletedGoals, computeProgress, earliestGoalStart, fetchGoalEvents } from "@utils/goalProgress.ts";
import { awardChoiceForSettingAGoal } from "@utils/choiceAwards.ts";
import { getAgencyProgress, getDailyIntention, setDailyIntention, checkIntentionFollowThrough, syncAgencyFromBackend, addResolveXP, addInsightXP, addChoiceXP } from "@utils/agencyUtils.ts";
import { GOAL_CATEGORIES } from "@utils/goalCatalog.ts";
import { getOnboardingStep } from "@utils/storageUtils.ts";
import { OnboardingTour } from "@components/shared/OnboardingTour.tsx";
import { TOUR_STEPS, isTourActive, shouldAutoStartTour, startTour, type TourStep } from "@utils/onboardingTour.ts";
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
    exercisesDelta: 0,
    currentXP: 0,
    xpForNextLevel: 500,
    level: 1,
    levelName: "Beginner",
    streakDays: 0,
};

const PLACEHOLDER_LEADERBOARD: LeaderboardEntry[] = [
    { rank: 1, username: "—", xp: 0 },
    { rank: 2, username: "—", xp: 0 },
    { rank: 3, username: "—", xp: 0 },
];

// ─────────────────────────────────────────────────────────────────────────────

/**
 * The id of the unsaved goal the walkthrough draws on the dashboard.
 *
 * Module scope because two places have to agree on it: the code that invents the goal, and the code
 * that decides not to offer it for removal.
 */
const TOUR_SAMPLE_GOAL_ID = "tour-sample-goal";

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
    const [goalCountsByCategory, setGoalCountsByCategory] = useState<StudentProgressData["goalCountsByCategory"]>([]);
    const [solvingMethodCounts, setSolvingMethodCounts] = useState<{ method: string; value: number }[]>([]);
    const [pendingMilestone, setPendingMilestone] = useState<number | null>(null);

    // ── The student's own goals, and how far along each one is ────────────────
    const [goalProgressMap, setGoalProgressMap] = useState<Record<string, GoalProgress>>({});

    // ── Dashboard tabs (side navigation) ─────────────────────────────────────
    const [activeTab, setActiveTab] = useState<"main" | "exercises" | "analytics" | "leaderboard" | "tree">("main");

    // ── Daily Intention Check-In ──────────────────────────────────────────────
    const [showDailyIntention, setShowDailyIntention] = useState(false);
    // A tour can already be running on arrival. The walkthrough navigates away from the dashboard and
    // back, which unmounts and re-mounts this page; reading the flag instead of starting at `false`
    // is what stops the overlay vanishing the moment the student presses Back.
    const [showTour, setShowTour] = useState(() => isTourActive());
    /**
     * Which step the overlay is on, or null when no tour is running.
     *
     * The overlay owns the step and this page only reacts to it, because a step decides what has to
     * be visible BEHIND it — the goal picker, which of the picker's three screens, and whether the
     * sample goal card is showing yet.
     */
    const [tourStep, setTourStep] = useState<TourStep | null>(null);

    // ── End Session Reflection (Anchor 5.1) ───────────────────────────────────
    const [showEndSession, setShowEndSession] = useState(false);

    // ── Character unlock celebration ─────────────────────────────────────────
    const [unlockQueue, setUnlockQueue] = useState<CharacterDef[]>([]);

    useEffect(() => {
        if (!student) return;

        // Read the goals straight away rather than waiting on the fetches below. They are their own
        // request against their own table now, so a failure of the legacy progress call must not be
        // able to hide the student's goals along with it.
        void refreshGoals(student.id);

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
                    setGoalCountsByCategory(data.goalCountsByCategory ?? []);
                    setSolvingMethodCounts(data.solvingMethodCounts ?? []);

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

            // ── The tour and the daily intention both want this exact moment ──────────────
            // They are two full-screen dialogs, so at most one of them may open here. The tour wins:
            // it happens once, and the intention is asked again the moment the tour closes.
            //
            // A tour that is ALREADY RUNNING comes first, and that ordering is load bearing. The
            // walkthrough navigates to the flexibility list and back, which unmounts and re-mounts
            // this page; on the way back `showTour` seeds itself from this same flag, so the overlay
            // is on screen right now — while `shouldAutoStartTour` reports false, deliberately, so
            // the walkthrough does not restart itself. Testing only that function therefore let this
            // page open the intention ON TOP of the running tour.
            //
            // `startTour` is deliberately NOT called on this branch: it resets the step to one, which
            // would throw away the student's progress through the walkthrough.
            if (isTourActive()) return;

            if (shouldAutoStartTour(student.id, getOnboardingStep(student.id))) {
                // `startTour` records that a tour is running, so the pages the walkthrough navigates to
                // know to resume it. The state here only decides whether THIS page mounts the overlay.
                startTour(student.id);
                setShowTour(true);
                return;
            }

            // Show daily intention popup if not already set today
            const existing = getDailyIntention(student.id);
            if (!existing) {
                setShowDailyIntention(true);
            }
        });
        // Intentionally keyed on the student alone: this runs once per login, and refreshGoals is
        // redefined every render, so listing it would refetch the whole goal progress on any state
        // change anywhere on the dashboard.
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Goals completed per category, all time. Driven off the goal catalogue so this panel cannot
    // drift from the picker: the label and the mark come from the same definition the student chose
    // from. Categories with no completions still render, at zero — "I have never done this one" is
    // exactly what is worth seeing, so dropping empty cards would hide the useful half.
    const goalCategoryRows = GOAL_CATEGORIES.map((def) => {
        const found = goalCountsByCategory.find((row) => row.category === def.category);
        return { category: def.category, labelKey: def.labelKey, icon: def.icon, count: found?.count ?? 0 };
    });
    const goalCategoryTotal = goalCategoryRows.reduce((sum, row) => sum + row.count, 0);

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
    const [showGoals, setShowGoals] = useState(false);
    const [showBuddyChooser, setShowBuddyChooser] = useState(false);
    const [showShop, setShowShop] = useState(false);
    const [showXpInfo, setShowXpInfo] = useState(false);

    // ── Post-exercise reflection (buddy prompt) ───────────────────────────
    const [reflectionQueue, setReflectionQueue] = useState<ReflectionQueueItem[]>([]);
    const [showReflectionPrompt, setShowReflectionPrompt] = useState(false);
    const [showReflectionModal, setShowReflectionModal] = useState(false);

    const [activeBuddyId, setActiveBuddyId] = useState(() => getActiveBuddyId(student?.id ?? "guest"));

    // Empty until the server answers. The goals are a table read now, so there is nothing to seed
    // the list from on the first render — the cards appear with the goals, one fetch later.
    const [activeGoals, setActiveGoals] = useState<StudyGoal[]>([]);

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

    const translate = asTranslate(t);

    // ── The walkthrough ────────────────────────────────────────────────
    // Everything below is derived from the current tour step rather than from the student's taps,
    // because during a step the student cannot tap anything. The picker is the REAL one — it is just
    // handed no-op handlers, so a demonstration cannot save a goal or award any XP.
    const handleTourStep = useCallback((step: TourStep | null): void => {
        setTourStep(step);

        // A step can need one of the dashboard's tabs open behind it — the exercise leg of the
        // walkthrough lives on the Exercises tab now, and a spotlight cannot find an element that
        // was never mounted. Without this the tour would look for the exercise list, find nothing,
        // and spend its grace period doing so before falling back to a centred card.
        if (step?.tab !== undefined) setActiveTab(step.tab);
    }, []);

    const tourPickerStep = tourStep?.picker ?? null;
    const isDemoPicker = tourPickerStep !== null;

    // The walkthrough also opens the real character chooser and wardrobe. Read-only for the same
    // reason the picker is: no-op handlers are passed below in place of the real ones, so a
    // demonstration cannot change the student's companion or equip anything on them.
    const tourBuddyModal = tourStep?.buddyModal ?? null;
    const isDemoChooser = tourBuddyModal === "chooser";
    const isDemoShop = tourBuddyModal === "shop";

    /**
     * The goal the walkthrough pretends was just created.
     *
     * The arc it is showing ends with that goal appearing on the dashboard, and it must end with the
     * student seeing it — but nothing was saved. So the card is drawn from this instead, and only
     * from the step that describes it onwards.
     */
    const tourSampleGoal: StudyGoal | null = tourStep?.showSampleGoal
        ? {
            id: TOUR_SAMPLE_GOAL_ID,
            category: "method",
            focus: null,
            metric: "exercises",
            target: 5,
            createdAt: new Date().toISOString(),
        }
        : null;

    const displayedGoals: StudyGoal[] = tourSampleGoal === null ? activeGoals : [...activeGoals, tourSampleGoal];

    function noopAddGoal(): void { /* the walkthrough saves nothing */ }
    function noopSelectBuddy(): void { /* the walkthrough changes nothing */ }
    function noopEquipOutfit(): void { /* the walkthrough changes nothing */ }

    /**
     * Leaves the goal picker for the exercise list.
     *
     * The picker's job is finished the moment a goal is saved, and the list is otherwise several
     * taps away through the navigation. This is the same destination the daily intention sends a
     * student to when they choose to practise.
     */
    function handleGoToExercises(): void {
        setShowGoals(false);
        navigate(Paths.FlexibilityPath);
    }

    /**
     * Repoints every active goal at the student's own history: refreshes the progress bars, claims
     * any goal that has now been reached, and awards the Resolve XP for it.
     *
     * Run on dashboard load, and again whenever a goal is added or removed. The dashboard is the
     * reliable checkpoint — a goal reached during an exercise can be missed there if the attempt had
     * not been written yet, but by the time the student is back here it cannot be missed.
     */
    async function refreshGoals(studentId: number): Promise<void> {
        const goals = await getActiveGoals(studentId);
        setActiveGoals(goals);

        if (goals.length === 0) {
            setGoalProgressMap({});
            return;
        }

        const events = await fetchGoalEvents(studentId, earliestGoalStart(goals));
        setGoalProgressMap(Object.fromEntries(goals.map((goal) => [goal.id, computeProgress(goal, events)])));

        const completed = await claimCompletedGoals(studentId, goals, events, (goal) => describeGoal(goal, translate));
        if (completed.length === 0) return;

        // Claiming removes the goals on the server, so re-read rather than filtering locally — that
        // keeps one source of truth for what is still active.
        setActiveGoals(await getActiveGoals(studentId));
        setGoalProgressMap((prev) => {
            const next = { ...prev };
            completed.forEach((entry) => delete next[entry.goal.id]);
            return next;
        });

        const xp = completed.length * GOAL_RESOLVE_XP;
        showAgencyToast("resolve", xp);
        setAgency(getAgencyProgress(studentId));
    }

    async function handleAddGoal(goal: StudyGoal, origin: GoalOrigin): Promise<void> {
        if (!student) return;

        setActiveGoals(await addGoal(student.id, goal));

        // Picking your own direction is a Choice act, and Choice does not require having done
        // anything yet — deciding is itself the skill. Bounded to once a day because goals can be
        // added and removed in a loop, which would otherwise pay per click.
        //
        // A goal taken from a suggestion earns nothing: the reward is for deciding, and accepting
        // the system's proposal is not deciding.
        if (origin === "student") awardChoiceForSettingAGoal(student.id);

        // Show the new goal at 0% immediately rather than waiting for the fetch. Nothing in the
        // student's history predates the goal, so the honest starting figure is zero.
        setGoalProgressMap((prev) => ({ ...prev, [goal.id]: computeProgress(goal, []) }));

        void refreshGoals(student.id);
    }

    async function handleRemoveGoal(goalId: string): Promise<void> {
        if (!student) return;

        setActiveGoals(await removeGoal(student.id, goalId));
        setGoalProgressMap((prev) => {
            const next = { ...prev };
            delete next[goalId];
            return next;
        });
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
            setShowGoals(true);
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

                <div className={"dashboard__nav-xp"} data-tour={"nav-agency"}>
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
                    className={"dashboard__tour-pill"}
                    title={t("tour-replay-btn")}
                    aria-label={t("tour-replay-btn")}
                    onClick={() => {
                        // `startTour` clears the "already seen" flag AND reopens at step one, so the
                        // replay button and the automatic first run produce identical state.
                        startTour(student?.id ?? "guest");
                        setShowTour(true);
                    }}
                >
                    <FontAwesomeIcon icon={faCircleQuestion} />
                </button>

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
                <aside className={"dashboard__tabs"} role="tablist" aria-label={t("dashboard-sections")} data-tour={"tabs"}>
                    <button
                        role="tab"
                        aria-selected={activeTab === "main"}
                        className={`dashboard__tab${activeTab === "main" ? " dashboard__tab--active" : ""}`}
                        onClick={() => setActiveTab("main")}
                    >
                        <FontAwesomeIcon icon={faGaugeHigh} />
                        <span>{t("dashboard-tab-main")}</span>
                    </button>
                    {/* Second, right after the overview. The exercises are what the dashboard is for,
                        and the goals above it are what send you there — so the way to practise
                        should not be the fifth thing in the list. */}
                    <button
                        role="tab"
                        aria-selected={activeTab === "exercises"}
                        className={`dashboard__tab${activeTab === "exercises" ? " dashboard__tab--active" : ""}`}
                        onClick={() => setActiveTab("exercises")}
                    >
                        <FontAwesomeIcon icon={faClipboardList} />
                        <span>{t("dashboard-tab-exercises")}</span>
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
                    <div className={"dashboard__stats-row"} data-tour={"stats"}>
                        <div className={"dash-stat"}>
                            <span className={"dash-stat__label"}>{t("dashboard-exercises-completed")}</span>
                            <FontAwesomeIcon icon={faCheck} className={"dash-stat__icon"} />
                            <span className={"dash-stat__value"}>{stats.exercisesCompleted}</span>
                            <span className={"dash-stat__sub"}>{t("dashboard-exercises-delta", { count: stats.exercisesDelta })}</span>
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

                    {/* Active Goals */}
                    <section className={"goals-section"} aria-labelledby={"goals-active-title"} data-tour={"goals-panel"}>
                        <div className={"dashboard__section-header dashboard__section-header--active-goals"}>
                            <h2 id={"goals-active-title"}>{t("goals-active-heading")}</h2>
                            {displayedGoals.length > 0 && (
                                <button
                                    className={"dashboard__section-header-cta dashboard__section-header-cta--active-goals"}
                                    data-tour={"goals-cta"}
                                    onClick={() => setShowGoals(true)}
                                >
                                    <FontAwesomeIcon icon={faPlus} />
                                    {t("goals-add-cta")}
                                </button>
                            )}
                        </div>

                        {displayedGoals.length === 0 && (
                            <div className={"goals-empty"}>
                                <FontAwesomeIcon icon={faBullseye} className={"goals-empty__icon"} />
                                <p className={"goals-empty__text"}>{t("goals-none")}</p>
                                <button
                                    className={"goals-empty__cta"}
                                    data-tour={"goals-cta"}
                                    onClick={() => setShowGoals(true)}
                                >
                                    <FontAwesomeIcon icon={faPlus} />
                                    {t("goals-set-cta")}
                                </button>
                            </div>
                        )}

                        {displayedGoals.length > 0 && (
                        <ul className={"goals-list"}>
                        {displayedGoals.map((goal) => {
                            const progress = goalProgressMap[goal.id];
                            const label = describeGoal(goal, translate);
                            const current = progress?.current ?? 0;
                            const def = getCategoryDef(goal.category);

                            return (
                            <li key={goal.id} className={"goal-card"}>
                                {/* The category mark, in the same tinted chip the rest of the app
                                    uses for a leading icon. */}
                                <span className={"goal-card__icon"} aria-hidden>
                                    <FontAwesomeIcon icon={def.icon} />
                                </span>

                                <div className={"goal-card__body"}>
                                    <p className={"goal-card__label"}>{label}</p>
                                    <div className={"goal-card__progress-row"}>
                                        <div
                                            className={"goal-card__track"}
                                            role={"progressbar"}
                                            aria-label={label}
                                            aria-valuemin={0}
                                            aria-valuemax={goal.target}
                                            aria-valuenow={current}
                                        >
                                            <div className={"goal-card__fill"} style={{ width: `${progress?.percent ?? 0}%` }} />
                                        </div>
                                        {/* The number is what carries the progress to a screen
                                            reader and to anyone who cannot see the bar, so it is
                                            text, never a colour on its own. */}
                                        <span className={"goal-card__value"}>
                                            {translate("goals-progress", {
                                                current,
                                                target: goal.target,
                                                unit: t(`goal-unit-${goal.metric}`),
                                            })}
                                        </span>
                                    </div>

                                    {/* Only the goals that live in a subset of the exercise types
                                        carry this. The other four would just be noise on every card. */}
                                    {def.restrictionKey !== "" && (
                                        <p className={"goal-card__note"}>
                                            <FontAwesomeIcon icon={faCircleInfo} className={"goal-card__note-icon"} />
                                            <span>{t(def.restrictionKey)}</span>
                                        </p>
                                    )}
                                </div>

                                {/* The way from the goal to the work itself. A goal is a target, and
                                    the exercises that move it are otherwise three taps away through
                                    the navigation, which is a long way to go from a card that is
                                    already telling you what to do next.

                                    Not on the walkthrough's sample goal, for the same reason it
                                    has no remove button: that goal does not exist. */}
                                {goal.id !== TOUR_SAMPLE_GOAL_ID && (
                                    <button
                                        type={"button"}
                                        className={"goal-card__practise"}
                                        onClick={handleGoToExercises}
                                    >
                                        <FontAwesomeIcon icon={faArrowRight} />
                                        {t("goals-go-to-exercises")}
                                    </button>
                                )}

                                {/* The walkthrough's sample goal was never saved, so it is not offered
                                    for removal — an honest screen does not offer to delete something
                                    that does not exist. */}
                                {goal.id !== TOUR_SAMPLE_GOAL_ID && (
                                    <button
                                        type={"button"}
                                        className={"goal-card__remove"}
                                        title={t("goals-remove")}
                                        aria-label={t("goals-remove")}
                                        onClick={() => handleRemoveGoal(goal.id)}
                                    >
                                        <FontAwesomeIcon icon={faTimes} />
                                    </button>
                                )}
                            </li>
                            );
                        })}
                        </ul>
                        )}
                    </section>

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
                                        <FontAwesomeIcon icon={faTrophy} className={"goals-completed-list__icon"} />
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
                                <FontAwesomeIcon icon={faTrophy} /> {t("dashboard-leaderboard")}
                            </div>
                            {leaderboard.map((entry) => (
                                <div
                                    key={entry.rank}
                                    className={`leaderboard-entry${entry.username === student?.username ? " leaderboard-entry--current" : ""}`}
                                >
                                    <span className={"leaderboard-entry__rank"} aria-label={`${entry.rank}`}>
                                        {entry.rank <= 3
                                            ? <FontAwesomeIcon icon={faMedal} className={`leaderboard-entry__medal leaderboard-entry__medal--${entry.rank}`} />
                                            : entry.rank}
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
                        <div className={"analytics-grid"}>
                            {/* Goals completed per category, all time. First in the grid on purpose: it
                                answers "what am I actually working on", which is the question this tab
                                gets opened with. Being full-width it needs no explicit row placement —
                                as the first item it takes row 1, and the charts flow in below it. */}
                            <div className={"analytics-section analytics-section--full"}>
                                <div className={"analytics-section__title"}>{t("analytics-category-title")}</div>
                                <div className={"analytics-category-row"}>
                                    {goalCategoryRows.map((row) => (
                                        <div key={row.category} className={`analytics-category${row.count > 0 ? " analytics-category--active" : ""}`}>
                                            <span className={"analytics-category__icon"}><FontAwesomeIcon icon={row.icon} /></span>
                                            <span className={"analytics-category__value"}>{row.count}</span>
                                            <span className={"analytics-category__label"}>{t(row.labelKey)}</span>
                                        </div>
                                    ))}
                                </div>
                                {goalCategoryTotal === 0 && (
                                    <p className={"analytics-empty"}>{t("analytics-category-empty")}</p>
                                )}
                            </div>

                            {/* Methods used (actual solving methods) */}
                            <div className={"analytics-section analytics-section--chart"}>
                                <div className={"analytics-section__title"}>{t("analytics-method-title")}</div>
                                <ResponsiveContainer width="100%" height={210}>
                                    <BarChart data={solvingMethodsChartData} margin={{ top: 16, right: 4, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                                        <XAxis dataKey="method" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 13 }} axisLine={false} tickLine={false} />
                                        <YAxis allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            cursor={{ fill: "rgba(255,255,255,0.04)" }}
                                            contentStyle={{ backgroundColor: "#012638", border: "1px solid rgba(33,158,188,0.35)", borderRadius: "0.5rem", fontSize: "0.9rem" }}
                                            labelStyle={{ color: "#fff" }}
                                            itemStyle={{ color: "#8ecae6" }}
                                        />
                                        <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={46}>
                                            {solvingMethodsChartData.map((entry) => (
                                                <Cell key={entry.method} fill={entry.fill} />
                                            ))}
                                            <LabelList dataKey="value" position="top" fill="#fff" fontSize={14} fontWeight={700} />
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
                                                    contentStyle={{ backgroundColor: "#012638", border: "1px solid rgba(33,158,188,0.35)", borderRadius: "0.5rem", fontSize: "0.9rem" }}
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

                    {activeTab === "exercises" && <DashboardExercises />}
                </div>
            </div>

            {/* ── Buddy widget ─────────────────────────────────────────────── */}
            <div className={"dashboard__buddy"} data-tour={"buddy-widget"}>
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
            {/* The walkthrough opens the REAL picker rather than a copy of it, because a copy would
                drift from the picker the moment the picker changed. It is read-only: nothing is
                saved, because no-op handlers are passed in place of the real ones. */}
            {(showGoals || isDemoPicker) && (
                <SetGoalsModal
                    studentId={student?.id ?? "guest"}
                    demo={isDemoPicker}
                    demoStep={tourPickerStep ?? undefined}
                    onAdd={isDemoPicker ? noopAddGoal : handleAddGoal}
                    onClose={() => setShowGoals(false)}
                />
            )}
            {(showBuddyChooser || isDemoChooser) && (
                <ChooseBuddyModal
                    currentBuddyId={activeBuddyId}
                    wallets={agencyWallets}
                    onSelect={isDemoChooser ? noopSelectBuddy : handleSelectBuddy}
                    onClose={() => setShowBuddyChooser(false)}
                />
            )}
            {(showShop || isDemoShop) && (
                <CharacterShopModal
                    characterId={activeBuddyId}
                    wallets={agencyWallets}
                    equippedOutfitId={equippedOutfitIds[activeBuddyId]}
                    onEquip={isDemoShop ? noopEquipOutfit : handleEquip}
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
            {showTour && student && (
                <OnboardingTour
                    studentId={student.id}
                    steps={TOUR_STEPS}
                    onStepChange={handleTourStep}
                    // The opening steps introduce the student's own buddy and draw their real growth
                    // tree, so the overlay needs to know who they have and what they have earned.
                    buddyName={activeBuddy.name}
                    buddyImage={buddyImgSrc}
                    wallets={agencyWallets}
                    onClose={() => {
                        setShowTour(false);
                        // The overlay unmounts without another callback, so the step is cleared here —
                        // otherwise the read-only picker it opened would be left on screen.
                        setTourStep(null);
                        // The tour deferred the daily intention so the two would not fight over the
                        // same moment. Now that it is out of the way, ask again if it is still unset.
                        if (!getDailyIntention(student.id)) {
                            setShowDailyIntention(true);
                        }
                    }}
                />
            )}
            {/* The `!showTour` is not redundant: it makes "never two dialogs at once" a property of
                the RENDER rather than of one effect happening to read a storage flag at the right
                moment. The tour finishing also asks for the intention, and on that path the flag has
                already been cleared while this state update is still in flight. */}
            {showDailyIntention && !showTour && (
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

