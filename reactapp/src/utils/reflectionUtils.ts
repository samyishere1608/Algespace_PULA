import axios from "axios";

const BACKEND = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7273";

/**
 * One chip under a question.
 *
 * The wording and the correct answer are decided by the server, so nothing here needs to know which
 * chip is right; the client renders them and sends back the one that was chosen.
 */
export interface ReflectionChip {
    id: string;
    textKey: string;
    /** Literal text for a chip that is a number, so it needs no translating. */
    label?: string;
    /**
     * The figure the chip's own sentence is about, for a menu built from the day's numbers
     * ("3 of them had no mistakes"). Passed to t() so a plural key picks the right form.
     */
    count?: number | null;
    /** How many there were in all, when the sentence says "3 of 5". */
    total?: number | null;
}

export interface ReflectionQuestion {
    id: string;
    /** "observation" | "judgement" | "next-action". The last one never pays Insight. */
    kind: string;
    itemType: string;
    textKey: string;
    /** Slot name to translation KEY, resolved with t() before interpolating. */
    slots: Record<string, string>;
    /** Slot name to literal text, e.g. the student's own numbers. */
    values: Record<string, string>;
    chips: ReflectionChip[];
    /**
     * The record's context for this question, with the fact the chips are graded on left out.
     *
     * The server decides what belongs here per question — see `HiddenFacts` in the bank — because the
     * question and the fact it is graded on have to be described in one place. This side only renders it.
     */
    panel: ReflectionPanel;
}

/**
 * The context beside a question: what the student may see while answering.
 *
 * It is the record, not a verdict. Every field is optional and the server leaves out whatever would let
 * the answer be read off the screen, so an empty panel is a real answer and not a failure. `heldBack`
 * says something is being kept for after the answer, so the panel can promise it rather than sit there
 * with a silent hole in it.
 */
export interface ReflectionPanel {
    /** Translation key for the method, or empty when naming it would answer the question. */
    methodLabelKey: string;
    /**
     * Phase times for ONE run, largest first. Time only — the server never sends a phase's mistakes.
     *
     * One run and not the window, because phase times sum to the run's total, and on a goal's "what went
     * well" the trend in those totals is one of the chips.
     */
    phases: { labelKey: string; seconds: number; mistakes: number; hints: number }[];
    /** One entry per exercise, in order. Empty when the mistakes are what the question asks about, and
     * also when the total is safe but the split is not — the split is what answers "did they go down". */
    runs: { position: number; mistakes: number; hints: number; seconds: number }[];
    /** Mistakes across the item: this exercise's, or the window's summed. The safe half of the pair. */
    mistakes: number | null;
    /** How many exercises the item covers, so the wording can say "in this one" or "altogether". */
    runCount: number;
    /**
     * How many exercises the goal counted in all, when that is more than `runCount`.
     *
     * The panel shows a capped window, and a minutes goal has no bound on how many exercises it takes, so
     * this is what lets the plate say "your last 5 of 9" rather than showing five without a word. 0 when
     * nothing was left out.
     */
    countedRuns?: number;
    /** Hints taken, or null when the hints are what the question asks about. */
    hints: number | null;
    /** Whether something is still held back until an answer is sent. */
    heldBack: boolean;
    /** The decisions the student made, shown as dashboard rows. */
    decisions: { labelKey: string; valueKey: string; icon: string; count: number; total: number }[];
    /**
     * How long their earlier attempts at this exercise type took, in seconds, when there are any.
     *
     * The "I was in a hurry" chip is checked against it, so it is shown: a description of their own work
     * that they cannot verify before choosing it is a guess dressed up as a reflection.
     */
    usualSeconds?: number | null;
}

export interface ReflectionQueueItem {
    id: number;
    studentId: number;
    itemType: string;   // "goal" | "exercise"
    itemId: string;
    itemLabel: string;
    status: string;
    errors: number;
    hints: number;
    pippinMessages: number;
    method: string;
    focus: string;
    completedAt: string;
    /** Built by the server, in order: observe, judge, look forward. */
    questions: ReflectionQuestion[];
}

/**
 * The words to print for "You just finished …".
 *
 * A GOAL's label is written by the app when the goal completes (`describeGoal`), so it is already in the
 * student's language and is used as it stands.
 *
 * An EXERCISE's label is not: the server stores the exercise TYPE, because that is what it is handed
 * (`"Suitability"`, `"Efficiency"`, `"Matching"` — the same words the database keys on). Printed raw, a
 * Japanese student was asked to reflect on "Suitability". The three known types are translated here
 * instead — on the client, so rows already queued are fixed too and no migration is needed — and
 * anything unrecognised falls through unchanged rather than becoming a missing-key placeholder.
 */
export function reflectionItemLabel(
    item: { itemType: string; itemLabel: string },
    t: (key: string, options?: Record<string, unknown>) => string
): string {
    const label = item.itemLabel ?? "";

    // The session's own label ("Today's session") is already said by the tag beside it.
    if (item.itemType === "session") return "";

    const exerciseType = EXERCISE_TYPE_KEYS[label.trim().toLowerCase()];
    return exerciseType ? t(exerciseType) : label;
}

/** The three exercise kinds as the server spells them, and the key each one is printed from. */
const EXERCISE_TYPE_KEYS: Record<string, string> = {
    suitability: "exercise-type-suitability",
    efficiency: "exercise-type-efficiency",
    matching: "exercise-type-matching",
};

export interface ReflectionHistoryEntry {
    role: string;       // "pippin" | "student" | "system"
    text: string;
    insightXp: number;
    itemType: string;
    itemId: string;
    /** Which question this turn answered, so questions can be compared later. */
    questionId?: string;
    /** The chip chosen. Written on the student's own row, which is the one row that holds the answer. */
    choice?: string;
}

export interface ReflectionEvaluateResult {
    feedback: string;
    aligned: boolean;
    insightXp: number;
    nextStep: string;
    /**
     * The same panel, with nothing held back.
     *
     * It arrives here rather than with the question so the facts the chips are graded on cannot be read
     * off the payload the student is answering from. Once the answer is in they can no longer help, so
     * they open — which is what the lock on the panel was promising.
     */
    panel?: ReflectionPanel | null;
    /**
     * The goal that would carry out the commitment they just made, when the catalogue has one.
     *
     * The same shape as `StudyGoal` so the client can hand it straight to its own goal wording, which
     * is why no sentence arrives from the server: every word the student reads about a goal, and every
     * legal target, belongs to this side.
     */
    suggestedGoal?: {
        category: string;
        metric: string;
        target: number;
        focus: string;
        quality: string;
        maxPerExercise: number;
    } | null;
    /**
     * The next question, when this answer changes what it should ask.
     *
     * The plan question names the reason the student just gave and puts the plan that answers it
     * first, which can only be written once the reason is in. Null when the next question does not
     * depend on the answer, which is every question but the reason one.
     */
    nextQuestion?: ReflectionQuestion | null;
}

export async function fetchReflectionQueue(studentId: number): Promise<ReflectionQueueItem[]> {
    try {
        const { data } = await axios.get<ReflectionQueueItem[]>(`${BACKEND}/student-progress/reflection-queue/${studentId}`);
        return data ?? [];
    } catch {
        return [];
    }
}

/**
 * Opens the end-of-session reflection: two questions about the day as a whole.
 *
 * Not fetched from the queue, because it is not earned by finishing something. It is asked for at the
 * moment the student chooses to look back, and the server builds it from the exercises the day actually
 * contains. Returns null when it cannot be built, which is what the caller renders as "nothing to show".
 */
export async function startSessionReflection(
    studentId: number,
    label: string
): Promise<ReflectionQueueItem | null> {
    try {
        const { data } = await axios.post<ReflectionQueueItem>(
            `${BACKEND}/student-progress/session-reflection/${studentId}`,
            null,
            { params: { label } }
        );
        return data ?? null;
    } catch {
        return null;
    }
}

/**
 * The promise the student made at the end of their last session.
 *
 * Read when the check-in opens so it can be shown before they choose anything today — a commitment
 * nobody reads back is not a commitment.
 */
export async function fetchSessionPromise(studentId: number): Promise<{ choice: string; textKey: string } | null> {
    try {
        const { data } = await axios.get<{ choice: string; textKey: string }>(
            `${BACKEND}/student-progress/session-promise/${studentId}`
        );
        return data?.textKey ? data : null;
    } catch {
        return null;
    }
}

/**
 * Offers today's intention against the promise made at the end of the last session.
 *
 * Called when the student picks their intention, because that is the one moment both halves exist: the
 * intention is only ever held here, and the promise is a row the server wrote yesterday. Returns the
 * Resolve the server has already paid, which is normally 0.
 */
export async function settleSessionPromise(
    studentId: number,
    intentionChoice: string,
    intentionText: string,
    detectedCategory: string
): Promise<number> {
    try {
        const { data } = await axios.post<{ resolveAwarded: number }>(
            `${BACKEND}/student-progress/session-reflection/settle`,
            { studentId, intentionChoice, intentionText, detectedCategory }
        );
        return data?.resolveAwarded ?? 0;
    } catch {
        return 0;
    }
}

export async function evaluateReflection(
    studentId: number,
    queueItemId: number,
    questionNumber: number,
    mode: "self" | "pippin",
    language: string,
    questionId?: string,
    choice?: string,
    subjectTerms?: string[],
    choiceLabel?: string
): Promise<ReflectionEvaluateResult> {
    const { data } = await axios.post<ReflectionEvaluateResult>(`${BACKEND}/student-progress/reflection/evaluate`, {
        studentId,
        queueItemId,
        questionNumber,
        mode,
        language,
        // Which question was asked and which chip was chosen. The server rebuilds the question and grades
        // the chip against its own answer key, so the verdict never travels from the client.
        questionId: questionId ?? "",
        choice: choice ?? "",
        // The words the student actually saw on the chip they chose. Sent separately from the id
        // because a reply that says "step-solve" is a reply about our data structure, not about
        // their work.
        choiceLabel: choiceLabel ?? "",
        subjectTerms: subjectTerms ?? [],    });
    return data;
}

export async function completeReflection(
    studentId: number,
    queueItemId: number,
    history: ReflectionHistoryEntry[],
    skip = false
): Promise<void> {
    try {
        await axios.post(`${BACKEND}/student-progress/reflection/complete`, {
            studentId,
            queueItemId,
            skip,
            history,
        });
    } catch {
        // Non-critical
    }
}
