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
    phases: { labelKey: string; seconds: number }[];
    /** One entry per exercise, in order. Empty when the mistakes are what the question asks about, and
     * also when the total is safe but the split is not — the split is what answers "did they go down". */
    runs: { position: number; mistakes: number }[];
    /** Mistakes across the item: this exercise's, or the window's summed. The safe half of the pair. */
    mistakes: number | null;
    /** How many exercises the item covers, so the wording can say "in this one" or "altogether". */
    runCount: number;
    /** Hints taken, or null when the hints are what the question asks about. */
    hints: number | null;
    /** Whether something is still held back until an answer is sent. */
    heldBack: boolean;
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
        subjectTerms: subjectTerms ?? [],
    });
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
