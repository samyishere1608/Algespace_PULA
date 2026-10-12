import axios from "axios";

const BACKEND = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7273";

/**
 * One chip under a question. A quick answer, not the expected one.
 *
 * The wording and the correct answer are decided by the server, so nothing here needs to know which
 * chip is right; the client renders them and sends back the one that was tapped.
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
    /** The chip tapped, or empty when the student wrote instead. */
    choice?: string;
}

export interface ReflectionEvaluateResult {
    feedback: string;
    aligned: boolean;
    insightXp: number;
    nextStep: string;
    /** True when the answer was off-topic and the student should rewrite it (no XP, not saved). */
    needsRetry: boolean;
}

export async function fetchReflectionQueue(studentId: number): Promise<ReflectionQueueItem[]> {
    try {
        const { data } = await axios.get<ReflectionQueueItem[]>(`${BACKEND}/student-progress/reflection-queue/${studentId}`);
        return data ?? [];
    } catch {
        return [];
    }
}

export async function evaluateReflection(
    studentId: number,
    queueItemId: number,
    questionNumber: 1 | 2 | 3,
    mode: "self" | "pippin",
    answer: string,
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
        answer,
        language,
        // Which question was asked, which chip was tapped, and the localised words the question is
        // about. The last two are what let the grader tell the model what a correct answer has to
        // refer to without the server keeping a second copy of the app's copy.
        questionId: questionId ?? "",
        choice: choice ?? "",
        // The words the student actually saw on the chip they tapped. Sent separately from the id
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
