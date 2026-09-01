import axios from "axios";

const BACKEND = "http://localhost:7273";

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
    completedAt: string;
}

export interface ReflectionHistoryEntry {
    role: string;       // "pippin" | "student" | "system"
    text: string;
    insightXp: number;
    itemType: string;
    itemId: string;
}

export interface ReflectionEvaluateResult {
    feedback: string;
    aligned: boolean;
    insightXp: number;
    nextStep: string;
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
    language: string
): Promise<ReflectionEvaluateResult> {
    const { data } = await axios.post<ReflectionEvaluateResult>(`${BACKEND}/student-progress/reflection/evaluate`, {
        studentId,
        queueItemId,
        questionNumber,
        mode,
        answer,
        language,
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
