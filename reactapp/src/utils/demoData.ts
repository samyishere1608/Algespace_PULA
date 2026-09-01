import axios from "axios";
import { addAccuracyEntry } from "./goalUtils";

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

    // ── 3. Goals completed this week (varied difficulties) ─────────────────
    const goals: Array<{ goalId: string; goalLabel: string; xpEarned: number; exerciseType: string }> = [
        { goalId: "try-suitability",   goalLabel: "Try a Suitability Exercise", xpEarned: 20, exerciseType: "Suitability" },
        { goalId: "try-efficiency",    goalLabel: "Try an Efficiency Exercise", xpEarned: 20, exerciseType: "Efficiency" },
        { goalId: "choose-solo-once",  goalLabel: "Go Solo Once",               xpEarned: 25, exerciseType: "Suitability" },
        { goalId: "hint-free-run",     goalLabel: "Hint-Free Run",              xpEarned: 30, exerciseType: "Efficiency" },
        { goalId: "method-explorer",   goalLabel: "Method Explorer",            xpEarned: 35, exerciseType: "Matching" },
        { goalId: "master-matching",   goalLabel: "Master Matching",            xpEarned: 50, exerciseType: "Matching" },
        { goalId: "face-your-weakness", goalLabel: "Face Your Weakness",        xpEarned: 55, exerciseType: "Substitution" },
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
            pippinMessages: 0,
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
