import axios from "axios";
import { addAccuracyEntry } from "./progressUtils";

const BACKEND = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7273";

const SEED_FLAG_PREFIX = "demo_seeded_";

/**
 * Seeds realistic demo data for a demo account so the dashboard/analytics
 * tabs have something to show. Runs once per browser (guarded by a localStorage flag).
 *
 * Seeds:
 *  - Rolling accuracy (localStorage) → avg accuracy KPI + errors/hints
 *  - Agency XP (backend) → XP split donut + focus step
 *  - Goals this week (backend) → difficulty counts + goals list
 *  - Exercise log (backend) → exercises-completed KPI
 *  - Solving methods (backend) → methods bar chart
 */
export async function seedDemoData(studentId: number): Promise<void> {
    const flag = `${SEED_FLAG_PREFIX}${studentId}`;
    if (localStorage.getItem(flag)) return;

    const post = async (url: string, body: unknown): Promise<void> => {
        try {
            await axios.post(url, body);
        } catch {
            // Non-critical — demo data is best-effort
        }
    };

    // ── 1. Rolling accuracy (localStorage only) ────────────────────────────
    // Ends at: 4 errors + 4 hints across 5 exercises → ~68% accuracy
    const samples: Array<[number, number]> = [
        [1, 0],
        [0, 1],
        [2, 1],
        [0, 0],
        [1, 2],
    ];
    for (const [errors, hints] of samples) {
        addAccuracyEntry(studentId, errors, hints);
    }

    // ── 2. Agency XP (backend — dashboard pulls it via syncAgencyFromBackend)
    await post(`${BACKEND}/student-progress/log-agency-xp`, { studentId, xpType: "choice", amount: 140, source: "demo" });
    await post(`${BACKEND}/student-progress/log-agency-xp`, { studentId, xpType: "insight", amount: 90, source: "demo" });
    await post(`${BACKEND}/student-progress/log-agency-xp`, { studentId, xpType: "resolve", amount: 70, source: "demo" });

    // ── 3. Goals completed this week ───────────────────────────────────────
    // goalId is the category, so the dashboard can map a completion back to a goal type.
    const goals: Array<{ goalId: string; goalLabel: string; xpEarned: number; exerciseType: string }> = [
        { goalId: "method",         goalLabel: "5 Elimination exercises",         xpEarned: 5, exerciseType: "Suitability" },
        { goalId: "exerciseType",   goalLabel: "3 Suitability exercises",         xpEarned: 5, exerciseType: "Suitability" },
        { goalId: "solveOnOwn",     goalLabel: "Work out 3 solutions yourself",  xpEarned: 5, exerciseType: "Efficiency" },
        { goalId: "selfExplanation", goalLabel: "Explain your own reasoning 3 times", xpEarned: 5, exerciseType: "Efficiency" },
        { goalId: "methodComparison", goalLabel: "Compare methods 3 times",       xpEarned: 5, exerciseType: "Matching" },
        { goalId: "hintsAndErrors", goalLabel: "3 exercises with at most 1 hint", xpEarned: 5, exerciseType: "Matching" },
    ];
    for (const g of goals) {
        await post(`${BACKEND}/student-progress/log-goal`, {
            studentId,
            goalId: g.goalId,
            goalLabel: g.goalLabel,
            xpEarned: g.xpEarned,
            exerciseType: g.exerciseType,
            totalErrors: 1,
            totalHints: 1,
        });
    }

    // ── 4. Exercise log → exercises-completed KPI + method counts ──────────
    const exerciseTypes = [
        "Suitability", "Suitability", "Suitability", "Suitability", "Suitability",
        "Efficiency", "Efficiency", "Efficiency", "Efficiency",
        "Matching", "Matching", "Matching",
    ];
    for (const exerciseType of exerciseTypes) {
        await post(`${BACKEND}/student-progress/log-exercise`, { studentId, exerciseType });
    }

    // ── 5. Actual solving methods → methods bar chart ──────────────────────
    const completions: Array<{ category: string; exerciseKey: string; exerciseId: string }> = [
        { category: "procedural-knowledge", exerciseKey: "elimination",   exerciseId: "demo-elim-1" },
        { category: "procedural-knowledge", exerciseKey: "elimination",   exerciseId: "demo-elim-2" },
        { category: "conceptual-knowledge", exerciseKey: "elimination",   exerciseId: "demo-elim-3" },
        { category: "procedural-knowledge", exerciseKey: "equalization",  exerciseId: "demo-eq-1" },
        { category: "conceptual-knowledge", exerciseKey: "equalization",  exerciseId: "demo-eq-2" },
        { category: "procedural-knowledge", exerciseKey: "substitution",  exerciseId: "demo-sub-1" },
        { category: "procedural-knowledge", exerciseKey: "substitution",  exerciseId: "demo-sub-2" },
        { category: "conceptual-knowledge", exerciseKey: "substitution",  exerciseId: "demo-sub-3" },
        { category: "procedural-knowledge", exerciseKey: "substitution",  exerciseId: "demo-sub-4" },
    ];
    for (const c of completions) {
        await post(`${BACKEND}/student-progress/exercises/${studentId}`, {
            studentId,
            category: c.category,
            exerciseKey: c.exerciseKey,
            exerciseId: c.exerciseId,
        });
    }

    localStorage.setItem(flag, "1");
}

/** Clears the seed flag so demo data re-seeds on next dashboard load. */
export function clearDemoSeedFlag(studentId: number | string): void {
    localStorage.removeItem(`${SEED_FLAG_PREFIX}${studentId}`);
}
