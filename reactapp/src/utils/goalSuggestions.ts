import axios from "axios";
import type { GoalCategory, GoalMetric, QualityDimension, StudyGoal } from "@/types/student/goal.ts";
import { getCategoryDef, newGoalId } from "@utils/goalCatalog.ts";

/**
 * Goal suggestions from the server.
 *
 * The server owns the model call and the profile it is fed; the catalogue it suggests from is a
 * mirror of ours, and everything it returns is checked again here. Two guards rather than one,
 * because a suggestion that does not fit the catalogue would either be stored unbuildable or fail
 * silently — and the student would just see nothing happen.
 */

const BACKEND = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7273";

export interface GoalSuggestion {
    category: string;
    focus: string;
    metric: string;
    target: number;
    quality: string;
    maxPerExercise: number;
    reason: string;
}

export interface GoalPlan {
    planTitle: string;
    planNarrative: string;
    /** Empty when there is not enough history yet, with `planNarrative` carrying the explanation. */
    goals: GoalSuggestion[];
}

/**
 * Asks for a plan. Returns null when the request fails outright.
 *
 * A plan with no goals is NOT a failure — it is the server saying it does not know the student well
 * enough yet, and the narrative says so. Collapsing the two would lose that distinction and show an
 * error for what is really a truthful answer.
 *
 * `language` goes with the request because everything that comes back is prose the student reads:
 * the plan title, the narrative and every reason. The server applies it to both paths — it instructs
 * the model, and it selects the wording of the rule-based fallback, which has no model to ask.
 */
export async function fetchGoalSuggestions(studentId: number, language: string): Promise<GoalPlan | null> {
    try {
        const { data } = await axios.post<GoalPlan>(
            `${BACKEND}/student-progress/suggest-goals/${studentId}`,
            null,
            { params: { language } }
        );
        return data ?? null;
    } catch {
        return null;
    }
}

/**
 * Turns one suggestion into a goal the picker could have built itself, or null if it cannot.
 *
 * Every field is checked against the catalogue rather than trusted. The server already normalises,
 * so a rejection here means the two catalogues have drifted — and in that case storing nothing is
 * better than storing a goal nobody can complete.
 */
export function suggestionToGoal(suggestion: GoalSuggestion): StudyGoal | null {
    const category = suggestion.category as GoalCategory;
    const def = getCategoryDefOrNull(category);
    if (!def) return null;

    const metric = (def.metrics as GoalMetric[]).includes(suggestion.metric as GoalMetric)
        ? (suggestion.metric as GoalMetric)
        : def.metrics[0];

    if (!def.targets[metric].includes(suggestion.target)) return null;

    const focus = def.focuses.some((option) => option.value === suggestion.focus)
        ? suggestion.focus
        : null;

    const goal: StudyGoal = {
        id: newGoalId(),
        category,
        focus,
        metric,
        target: suggestion.target,
        createdAt: new Date().toISOString(),
    };

    if (def.qualities) {
        goal.quality = (def.qualities as QualityDimension[]).includes(suggestion.quality as QualityDimension)
            ? (suggestion.quality as QualityDimension)
            : def.qualities[0];
        goal.maxPerExercise = def.qualityLimits?.includes(suggestion.maxPerExercise)
            ? suggestion.maxPerExercise
            : def.qualityLimits?.[0] ?? 0;
    }

    return goal;
}

/** `getCategoryDef` throws on an unknown category, which is correct internally but not here. */
function getCategoryDefOrNull(category: GoalCategory) {
    try {
        return getCategoryDef(category);
    } catch {
        return null;
    }
}
