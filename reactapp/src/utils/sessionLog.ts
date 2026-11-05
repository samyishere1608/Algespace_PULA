import axios from "axios";

const BACKEND = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7273";

/**
 * The sitting, as the server records it.
 *
 * A session starts when the student first opens the dashboard and ends when they press End Session
 * (or when they log out, which is the same thing from the outside). Every action the server records
 * during that time is filed under it, so a whole session can be read in order rather than assembled
 * from a date and a pile of timestamps.
 *
 * The id is kept in sessionStorage, which is exactly the right scope: it lasts as long as the tab
 * does. The server also resumes an open session rather than starting a second one, because the
 * dashboard is remounted every time the student comes back from an exercise - without that, one
 * sitting would be split into eight.
 */

const SESSION_KEY = "algespace_session_id";
const SESSION_OWNER_KEY = "algespace_session_student";

/**
 * The id of the sitting in this tab, or "" when the dashboard has not opened one yet.
 *
 * The STUDENT IT BELONGS TO is checked whenever it is known. `sessionStorage` outlives a logout that
 * never happened (a shared classroom machine handed over at the end of a lesson) and a tab the browser
 * restored after a crash, and in both cases it can still hold the previous child's sitting. Answering
 * with that id would have the dashboard skip opening its own sitting, so every event of the new
 * student's afternoon would be filed under no session at all - invisible to the analysis, and nothing
 * the student could have noticed. A stored id that belongs to someone else is treated as absent.
 */
export function currentSessionId(studentId?: number): string {
    try {
        const id = sessionStorage.getItem(SESSION_KEY) ?? "";
        if (!id) return "";

        const owner = Number(sessionStorage.getItem(SESSION_OWNER_KEY) ?? "");
        if (studentId !== undefined && Number.isFinite(owner) && owner > 0 && owner !== studentId) return "";

        return id;
    } catch {
        return "";
    }
}

/**
 * Tells the server the student is here, and remembers the session.
 *
 * Safe to call on every dashboard mount: it returns the session already open rather than replacing
 * it, so the call is cheap and cannot split a sitting.
 */
export async function startSession(studentId: number, language: string): Promise<string> {
    try {
        const { data } = await axios.post<{ sessionId: string }>(`${BACKEND}/student-progress/session/start`, {
            studentId,
            language,
        });
        const id = data?.sessionId ?? "";
        if (id) {
            sessionStorage.setItem(SESSION_KEY, id);
            sessionStorage.setItem(SESSION_OWNER_KEY, String(studentId));
        }
        return id;
    } catch {
        // Not being able to start a session must not stop the student using the app. The server will
        // still record their actions; they simply will not be grouped into a sitting.
        return "";
    }
}

/**
 * Ends the sitting. Called when the student presses End Session, and when they log out.
 *
 * The server works out what the session was made of at this point - including the exercises that were
 * opened and never finished, which is only knowable once the sitting is over.
 */
export async function endSession(studentId: number, reason: string): Promise<void> {
    try {
        await axios.post(`${BACKEND}/student-progress/session/end`, { studentId, reason });
    } catch {
        // Non-critical: the server closes a session that is left open anyway.
    } finally {
        try {
            sessionStorage.removeItem(SESSION_KEY);
            sessionStorage.removeItem(SESSION_OWNER_KEY);
        } catch { /* non-critical */ }
    }
}

/**
 * Records the plan the student chose for today.
 *
 * The check-in used to live only in the browser, so the answer to "what did you plan to do today" -
 * the whole point of asking - was invisible to any analysis of the data.
 */
export async function recordIntention(
    studentId: number,
    plan: "practice" | "goal" | "review",
    followUp: boolean,
): Promise<void> {
    try {
        await axios.post(`${BACKEND}/student-progress/session/intention`, {
            studentId,
            plan,
            followUp,
            language: localStorage.getItem("i18nextLng")?.slice(0, 2) ?? "en",
        });
    } catch {
        // Non-critical.
    }
}
