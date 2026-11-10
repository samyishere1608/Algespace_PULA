import axios from "axios";

const BACKEND = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7273";

/**
 * The small things the app used to keep only in this browser.
 *
 * WHY THIS EXISTS. A study runs over several days in a computer lab, so a student does not always get
 * the same seat. Everything below used to live in `localStorage` and nowhere else, which meant that on
 * a different machine the student found their companion back at Pippin, their unlocked characters
 * gone, their accuracy at 0%, and the walkthrough asking to introduce itself again. None of that is a
 * cosmetic glitch: the companion and the unlocks ARE the treatment, and a student who loses them twice
 * has good reason to stop believing the points mean anything.
 *
 * HOW IT WORKS. `localStorage` stays exactly where it is — it is the fast, synchronous copy every
 * feature already reads, and rewriting all of them to be async would have touched the whole app for no
 * user-visible gain. What changes is that every write here is ALSO sent to the server, and at login the
 * server's copy is merged back in BEFORE anything decides what to show. The browser becomes a cache.
 *
 * WHAT IS NOT MIRRORED. The XP wallets, exercise completions, reflections, goals and answers already
 * have their own columns and their own endpoints. They are deliberately absent: a second place to write
 * them would be a second truth, and reconciling two truths is how numbers start disagreeing.
 */

/**
 * The key families this module mirrors.
 *
 * Kept in step with `ClientStateKeys` on the server. A key in this list but not in that one is refused
 * there and never travels, which would look like state that "just stopped following the student" — so
 * the two lists are compared by `tools/pilot-audit/mirrored-state-audit.cjs`.
 */
const MIRRORED: RegExp[] = [
    /^accuracy_last5_\d+$/,
    /^algespace_owned_\d+_[a-z]+$/,
    /^algespace_equipped_\d+_[a-z]+$/,
    /^algespace_active_buddy_\d+$/,
    /^algespace_unlocked_announced_\d+$/,
    /^algespace_nudges_\d+$/,
    /^algespace_choice_goal_awarded_/,
    /^algespace_choice_reflection_awarded_/,
    /^daily_intention_\d+_/,
    /^onboarding-step-\d+$/,
    /^ui-language-\d+$/,
];

/** True when this key is one that has to follow the student between machines. */
export function isMirrored(key: string): boolean {
    return MIRRORED.some((pattern) => pattern.test(key));
}

/**
 * The mirrored keys that carry their own student id, so a stale copy left by the previous child on a
 * shared machine can be recognised and ignored rather than uploaded to the next one.
 *
 * The two "already awarded" claim markers carry no student id — they are keyed by goal or queue item,
 * which is already unique — so they are written when they are written and never scanned for.
 */
const SELF_SCOPED: { pattern: RegExp; id: (key: string) => number }[] = [
    { pattern: /^accuracy_last5_(\d+)$/, id: (k) => Number(/^accuracy_last5_(\d+)$/.exec(k)![1]) },
    { pattern: /^algespace_owned_(\d+)_/, id: (k) => Number(/^algespace_owned_(\d+)_/.exec(k)![1]) },
    { pattern: /^algespace_equipped_(\d+)_/, id: (k) => Number(/^algespace_equipped_(\d+)_/.exec(k)![1]) },
    { pattern: /^algespace_active_buddy_(\d+)$/, id: (k) => Number(/^algespace_active_buddy_(\d+)$/.exec(k)![1]) },
    { pattern: /^algespace_unlocked_announced_(\d+)$/, id: (k) => Number(/^algespace_unlocked_announced_(\d+)$/.exec(k)![1]) },
    { pattern: /^algespace_nudges_(\d+)$/, id: (k) => Number(/^algespace_nudges_(\d+)$/.exec(k)![1]) },
    { pattern: /^daily_intention_(\d+)_/, id: (k) => Number(/^daily_intention_(\d+)_/.exec(k)![1]) },
    { pattern: /^onboarding-step-(\d+)$/, id: (k) => Number(/^onboarding-step-(\d+)$/.exec(k)![1]) },
    { pattern: /^ui-language-(\d+)$/, id: (k) => Number(/^ui-language-(\d+)$/.exec(k)![1]) },
];

/** Whether this local key belongs to this student. Keys with no owner in them are not self-scoped. */
function belongsTo(key: string, studentId: number): boolean {
    const rule = SELF_SCOPED.find((entry) => entry.pattern.test(key));
    return rule !== undefined && rule.id(key) === studentId;
}

// ── Writing ──────────────────────────────────────────────────────────────────

/**
 * Sends whatever has not reached the server yet.
 *
 * Batched on a short timer rather than one request per write: a reflection saves its intention, an
 * unlock and an accuracy figure within the same second, and three round trips for three tiny strings
 * is how a save feels slow. The local write has already happened, so nothing on screen waits for this.
 *
 * An EMPTY value means "deleted". `removeItem` has no wire format, and the empty string lets the other
 * machine tell "this was cleared" from "this was never set": on hydrate an empty value removes the key.
 */
const pending = new Map<number, Map<string, string>>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush(): void {
    if (flushTimer !== null) return;
    flushTimer = setTimeout(() => { void flush(); }, 300);
}

/** Records a value locally (already done by the caller) and queues it for the server. */
export function pushState(studentId: number | string, key: string, value: string | null): void {
    const id = typeof studentId === "number" ? studentId : Number(studentId);
    if (!Number.isFinite(id) || id <= 0) return;
    if (!isMirrored(key)) return;

    let forStudent = pending.get(id);
    if (!forStudent) { forStudent = new Map(); pending.set(id, forStudent); }
    forStudent.set(key, value ?? "");

    scheduleFlush();
}

/** Sends everything queued. Safe any time; also called on the timer and when the tab hides. */
export async function flush(): Promise<void> {
    if (flushTimer !== null) { clearTimeout(flushTimer); flushTimer = null; }
    if (pending.size === 0) return;

    const work = [...pending.entries()];
    pending.clear();

    await Promise.all(work.map(async ([studentId, items]) => {
        try {
            await axios.post(`${BACKEND}/student-progress/client-state`, {
                studentId,
                items: [...items.entries()].map(([key, value]) => ({ key, value })),
            });
        } catch {
            // Put them back so the next flush retries instead of losing them. The local copy is already
            // correct, so the student sees nothing either way.
            let forStudent = pending.get(studentId);
            if (!forStudent) { forStudent = new Map(); pending.set(studentId, forStudent); }
            for (const [key, value] of items) if (!forStudent.has(key)) forStudent.set(key, value);
        }
    }));
}

if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") void flush();
    });
}

// ── Reading ──────────────────────────────────────────────────────────────────

/**
 * Copies the server's values into `localStorage`.
 *
 * THE SERVER WINS. Its row is the one that survives a machine change, so it is the truth; a local
 * value the server has never seen is kept and pushed back up, because that is a write that never
 * arrived rather than a value to throw away. Run BEFORE anything decides what to show.
 */
export async function hydrateStudentState(studentId: number): Promise<void> {
    if (studentId <= 0) return;

    let fromServer: Record<string, string> = {};
    try {
        const { data } = await axios.get<{ items: Record<string, string> }>(
            `${BACKEND}/student-progress/client-state/${studentId}`,
        );
        fromServer = data?.items ?? {};
    } catch {
        // Offline, or the route is unreachable. The local copy is still there and the app works; the
        // next login hydrates again. Failing a login over this would be worse than a stale companion.
        return;
    }

    const localOnly: [string, string][] = [];

    for (const [key, value] of Object.entries(fromServer)) {
        if (!isMirrored(key)) continue;
        try {
            if (value === "") localStorage.removeItem(key);
            else localStorage.setItem(key, value);
        } catch { /* storage unavailable: nothing to do */ }
    }

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key === null || !isMirrored(key) || !belongsTo(key, studentId)) continue;
            if (key in fromServer) continue;
            const value = localStorage.getItem(key);
            if (value !== null) localOnly.push([key, value]);
        }
    } catch { /* storage unavailable */ }

    for (const [key, value] of localOnly) pushState(studentId, key, value);
}

/**
 * The language this student last used, so a Japanese pilot is not asked to pick Japanese again on
 * every machine in the lab.
 *
 * Per student rather than global, because the browser may be shared: the next child at the same seat
 * should not inherit the previous one's language any more than their companion.
 */
export function rememberLanguage(studentId: number, language: string): void {
    const short = (language ?? "").slice(0, 2).toLowerCase();
    if (!short) return;
    try { localStorage.setItem(`ui-language-${studentId}`, short); } catch { /* non-critical */ }
    pushState(studentId, `ui-language-${studentId}`, short);
}

/** The language this student last used, or "" when they have never chosen one. */
export function refreshLanguage(studentId: number): string {
    try {
        return localStorage.getItem(`ui-language-${studentId}`) ?? "";
    } catch {
        return "";
    }
}

/**
 * The language this browser's user picked WITH THEIR OWN HANDS, or "" if they never have.
 *
 * WHY THIS EXISTS, and what it fixes. The remembered language is useful — a student should not have
 * to pick Japanese again on every machine — but it must never beat a choice the student has just
 * made. It used to: the login applied the server's value unconditionally, so a student who selected
 * Japanese on the home page and then signed in was put back into English by their own history, and
 * the dashboard then wrote "en" straight back to the server. The choice was destroyed on every
 * login, forever, and only for the arm that has a dashboard.
 *
 * `i18nextLng` cannot answer this question on its own: i18next's language detector caches whatever
 * it resolved, including the fallback, so a first visit leaves "en" there having never asked anyone.
 * So an explicit choice is marked when it is made, and only that marker counts as a decision.
 */
const EXPLICIT_LANGUAGE_KEY = "algespace-language-chosen-by-student";

/** Records that the student chose a language themselves, so no later step may override it. */
export function markLanguageChoice(studentId: number | null, language: string): void {
    const short = (language ?? "").slice(0, 2).toLowerCase();
    if (!short) return;
    try { localStorage.setItem(EXPLICIT_LANGUAGE_KEY, short); } catch { /* non-critical */ }
    if (studentId !== null && studentId > 0) rememberLanguage(studentId, short);
}

/** The language this browser's user chose themselves, or "" when they never have. */
export function explicitLanguageChoice(): string {
    try {
        return localStorage.getItem(EXPLICIT_LANGUAGE_KEY) ?? "";
    } catch {
        return "";
    }
}
