/**
 * Setup and teardown for a load run: the test account, the ids the scenarios need, and the purge.
 *
 * Everything here runs OUTSIDE the timed window. Ids are discovered by probing the running server
 * rather than hardcoded, because the exercise tables are rewritten from code on every startup — a
 * hardcoded id would silently start returning 404 and the suite would spend its run measuring a
 * failure it caused itself.
 */

import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { rmSync } from "node:fs";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Row counts for the tables a run touches, printed in the header.
 *
 * A load test's numbers are only comparable between runs if the data underneath them is comparable —
 * latency that doubles as a table grows is a different problem from latency that doubles with
 * concurrency. Recording this alongside every result is what makes two runs comparable at all.
 */
export function keyTableCounts() {
    const names = [
        "Students", "FlexibilityAttempt", "AnchorRecord", "StudentProgress",
        "ActiveGoals", "GoalCompletions", "ExerciseLog", "ExerciseCompletions",
        "AgencyLog", "ReflectionQueue", "ReflectionHistory",
    ];

    const db = new DatabaseSync(STUDENTS_DB, { readOnly: true });
    const counts = {};

    try {
        for (const name of names) {
            if (!tableExists(db, name)) continue;
            counts[name] = db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get().n;
        }
    } finally {
        db.close();
    }

    return counts;
}

/**
 * Measures what one committed row costs where the database actually lives.
 *
 * This is in the report because it turned out to explain everything else in it. SQLite commits with
 * an fsync, so the cost of a commit is a property of the volume, not of the schema or the query — and
 * on this machine the project folder costs ~170 ms per commit while a local temp folder costs ~0.4 ms.
 * Since SQLite permits one writer at a time, that single number sets the ceiling on every write route,
 * and no amount of query tuning moves it.
 *
 * Writes to a throwaway file next to the real database and deletes it again. It never touches
 * `students.db` itself.
 */
export function measureCommitCost(directory, commits = 15) {
    const file = `${directory}/.loadtest-commit-cost.db`;
    const result = { file, commits, msPerCommit: 0, journalMode: "unknown", error: null };

    let db;
    try {
        try { rmSync(file, { force: true }); } catch { /* first run */ }

        db = new DatabaseSync(file);
        result.journalMode = db.prepare("PRAGMA journal_mode=wal").get().journal_mode;
        db.exec("CREATE TABLE IF NOT EXISTS Probe (Id INTEGER PRIMARY KEY AUTOINCREMENT, Value TEXT)");

        const insert = db.prepare("INSERT INTO Probe (Value) VALUES (?)");

        const started = performance.now();
        for (let i = 0; i < commits; i++) insert.run(`probe-${i}`);
        result.msPerCommit = (performance.now() - started) / commits;
    } catch (error) {
        result.error = error.message;
    } finally {
        try { db?.close(); } catch { /* already closed */ }
        try { rmSync(file, { force: true }); } catch { /* nothing to remove */ }
        // WAL leaves a sidecar behind; it is a throwaway file either way.
        try { rmSync(`${file}-wal`, { force: true }); } catch { /* nothing to remove */ }
        try { rmSync(`${file}-shm`, { force: true }); } catch { /* nothing to remove */ }
    }

    return result;
}

/** Where the database files live. Resolved from this file so the suite runs from any directory. */
export const DATABASES_DIR = resolve(HERE, "..", "..", "webapi", "Data", "databases");

/**
 * Creates or signs in a pool of accounts, one per simulated student.
 *
 * WHY ONE ACCOUNT PER STUDENT
 * A single shared account would put the same database work on the server and would measure the same
 * thing — but not quite. Goals, the agency log and the reflection queue are all per-student, and with
 * one account every student would be adding and removing each other's goals, which is a race the real
 * system never sees. Distinct accounts keep the simulation honest.
 *
 * Setup runs outside the measured window, but it is still throttled: 120 sign-ins fired at once would
 * make the server allocate a connection pool and a thread per request before the run has started.
 */
export async function resolveAccountPool(client, { count, prefix = "lt_s", password = "loadtest-pw", onProgress }) {
    const accounts = [];
    const batchSize = 8;

    for (let start = 1; start <= count; start += batchSize) {
        const batch = [];

        for (let index = start; index < Math.min(start + batchSize, count + 1); index++) {
            const username = `${prefix}${String(index).padStart(3, "0")}`;

            batch.push(
                resolveStudent(client, { username, password })
                    .then((account) => { accounts.push(account); })
                    // One unreachable account must not abort a 120-student setup; it is reported by
                    // the pool being smaller than requested, and the run simply uses fewer students.
                    .catch(() => { }),
            );
        }

        await Promise.all(batch);
        onProgress?.(accounts.length);
    }

    return accounts;
}

/** The application database. */
export const STUDENTS_DB = resolve(DATABASES_DIR, "students.db");

/** The exercise database — read-only for every request, so it is the control in any comparison. */
export const ALGESPACE_DB = resolve(DATABASES_DIR, "algespace.db");

/**
 * Journal mode and size of each database.
 *
 * Part of the report because it is the explanation for most of what a run measures. In the default
 * `delete` journal mode a writer excludes readers and readers exclude writers for the whole
 * transaction, so a single write serialises the entire file. In WAL, readers proceed against the last
 * committed snapshot while a write happens. The difference shows up here as latency on every route
 * that touches that file, which is otherwise easy to mistake for a slow query.
 */
export function inspectDatabases() {
    const files = [
        ["algespace.db", ALGESPACE_DB],
        ["students.db", STUDENTS_DB],
    ];

    return files.map(([name, file]) => {
        try {
            const db = new DatabaseSync(file, { readOnly: true });
            const journal = db.prepare("PRAGMA journal_mode").get()?.journal_mode ?? "unknown";
            const pages = db.prepare("PRAGMA page_count").get()?.page_count ?? 0;
            const pageSize = db.prepare("PRAGMA page_size").get()?.page_size ?? 0;
            db.close();
            return { name, journal, megabytes: (pages * pageSize) / 1024 / 1024 };
        } catch (error) {
            return { name, journal: "unreadable", megabytes: 0, error: error.message };
        }
    });
}

/** Every table that holds something belonging to one student. Order does not matter for DELETEs. */
const STUDENT_TABLES = [
    "AnchorRecord",
    "FlexibilityAttempt",
    "ActiveGoals",
    "StudentProgress",
    "GoalCompletions",
    "ExerciseLog",
    "ExerciseCompletions",
    "AgencyLog",
    "ReflectionQueue",
    "ChatTranscript",
];

/**
 * Exercise types, with the values the BACKEND assigns them (`FlexibilityStudyExerciseType`).
 *
 * These are not the values you would guess. The backend enum is
 * `WorkedExamples 0, Efficiency 1, Suitability 2, Matching 3, TipExercise 4, PlainExercise 5`, and
 * the exercise tables are seeded with the exercise's own 1-based id in the same field. The client has
 * a second, legacy three-member `FlexibilityExerciseType` (`Efficiency 0, Suitability 1, Matching 2`)
 * which is NOT what the API sends — using those values here silently buckets every exercise under the
 * wrong type and drops Matching entirely. Verified against `FlexibilityExercises` in the database.
 */
export const EXERCISE_TYPE = {
    WorkedExamples: 0,
    Efficiency: 1,
    Suitability: 2,
    Matching: 3,
    TipExercise: 4,
    PlainExercise: 5,
};

/** Choice phases, from `FlexibilityExerciseChoicePhase`. */
export const CHOICE_PHASE = {
    SelfExplanationChoice: 1,
    ComparisonChoice: 2,
    FirstSolutionChoice: 4,
    SecondSolutionChoice: 5,
    StudentTypeSelfExplanation: 13,
    StudentTypeComparison: 12,
};

/** Phase names, from `FlexibilityExercisePhase`. Used as the anchor record's name. */
export const PHASE = { Comparison: 0, SelfExplanation: 4, FirstSolution: 13, SecondSolution: 14 };

/** Action phases, from `FlexibilityExerciseActionPhase`. */
export const ACTION_PHASE = {
    SelectedMethod: 0,
    SelfExplanationActions: 3,
    TransformationActions: 4,
    FirstSolutionActions: 8,
    SecondSolutionActions: 10,
};

/**
 * Signs in the load-test account, registering it first if it does not exist yet.
 *
 * One fixed account is reused across runs on purpose: registration is a write to the same database
 * the run is about to hammer, so creating an account per run would put setup traffic inside the
 * measurement window for no benefit.
 */
export async function resolveStudent(client, { username, password }) {
    const login = () => client.post("/student/authenticate", { username, password }, "authenticate");

    let response = await login();

    if (!response.ok && response.status === 400) {
        const registered = await client.post("/student/register", { username, password }, "register");
        if (!registered.ok) {
            throw new Error(`Could not register ${username}: ${registered.status} ${registered.text.slice(0, 200)}`);
        }
        response = await login();
    }

    if (!response.ok || !response.json?.id) {
        throw new Error(`Could not sign in as ${username}: ${response.status} ${response.text.slice(0, 200)}`);
    }

    return { id: response.json.id, username: response.json.username, token: response.json.token };
}

/**
 * Finds exercise ids the running server will actually serve.
 *
 * `getFlexibilityExercises` returns the catalogue, but the single-exercise routes are keyed on the row
 * id of the per-type exercise table, which is not the same field. Rather than assume which one it is,
 * both candidates are probed once and only the ones that answer are kept. If an area yields nothing,
 * its scenario is skipped and said so — measuring 404s would be measuring the fixture, not the server.
 */
export async function discoverIds(client, { language = "en", perType = 4 } = {}) {
    const list = await client.get("/flexibility-training/getFlexibilityExercises", "catalogue");

    if (!list.ok || !Array.isArray(list.json)) {
        return { ok: false, reason: `getFlexibilityExercises returned ${list.status}`, byType: {}, entryIds: [] };
    }

    const routeFor = {
        [EXERCISE_TYPE.Suitability]: "getSuitabilityExercise",
        [EXERCISE_TYPE.Efficiency]: "getEfficiencyExercise",
        [EXERCISE_TYPE.Matching]: "getMatchingExercise",
    };

    const byType = { [EXERCISE_TYPE.Suitability]: [], [EXERCISE_TYPE.Efficiency]: [], [EXERCISE_TYPE.Matching]: [] };
    const entryIds = [];

    for (const entry of list.json) {
        const route = routeFor[entry.exerciseType];
        if (route === undefined) continue;

        entryIds.push(entry.exerciseId);

        if (byType[entry.exerciseType].length >= perType) continue;

        for (const candidate of [entry.exerciseId, entry.id]) {
            if (candidate === undefined || candidate === null) continue;
            const probe = await client.get(`/flexibility-training/${language}/${route}/${candidate}`, "probe");
            if (probe.ok) {
                byType[entry.exerciseType].push(candidate);
                break;
            }
        }
    }

    return { ok: true, byType, entryIds, total: list.json.length };
}

/**
 * The same discovery for the conceptual-knowledge and bartering exercises.
 *
 * These live under per-method controllers and have their own id space, so they get their own pass.
 * Only the first few entries of each list are probed — enough to keep the detail read in the mix
 * without spending the whole setup phase on it.
 */
export async function discoverCkIds(client, { perArea = 3 } = {}) {
    const listRoutes = {
        equalization: "/equalization/conceptual-knowledge/exercises/getExercises",
        substitution: "/substitution/conceptual-knowledge/exercises/getExercises",
        elimination: "/elimination/conceptual-knowledge/exercises/getExercises",
        bartering: "/substitution/bartering/exercises/getExercises",
    };

    const detailRoutes = {
        equalization: "/equalization/conceptual-knowledge/exercises/getExercise",
        substitution: "/substitution/conceptual-knowledge/exercises/getExercise",
        elimination: "/elimination/conceptual-knowledge/exercises/getExercise",
        bartering: "/substitution/bartering/exercises/getExercise",
    };

    const out = { equalization: [], substitution: [], elimination: [], bartering: [] };

    for (const [area, listRoute] of Object.entries(listRoutes)) {
        const list = await client.get(listRoute, "ck-discovery");
        if (!list.ok || !Array.isArray(list.json)) continue;

        for (const entry of list.json.slice(0, perArea)) {
            if (out[area].length >= perArea) break;

            // The list and the single-item route may key on different fields depending on the
            // controller, so both are tried rather than assumed.
            for (const candidate of [entry?.id, entry?.exerciseId, entry?.Id, entry?.ExerciseId]) {
                if (candidate === undefined || candidate === null) continue;
                const probe = await client.get(`${detailRoutes[area]}/${candidate}`, "ck-discovery");
                if (probe.ok) { out[area].push(candidate); break; }
            }
        }
    }

    return out;
}

/**
 * True when a table exists.
 *
 * Deliberately NOT wrapped in a try/catch. An earlier version swallowed every failure and reported
 * "table absent", which meant that a database the run had left locked silently disabled the entire
 * integrity phase — the tool reported a clean run while having checked nothing. A caller that cannot
 * read the database must be told, not reassured.
 */
export function tableExists(db, name) {
    return db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name) !== undefined;
}

/**
 * Waits until the database can be read, returning the last error if it never becomes readable.
 *
 * A stress run can leave a write in flight after the client has given up, so the integrity phase can
 * legitimately arrive while the file is locked. Waiting briefly keeps that from being reported as a
 * data problem; failing loudly afterwards keeps it from being hidden.
 */
export async function waitForReadable(timeoutMs = 10000, intervalMs = 250) {
    const deadline = Date.now() + timeoutMs;
    let lastError = null;

    for (;;) {
        try {
            const db = new DatabaseSync(STUDENTS_DB);
            try {
                db.prepare("SELECT COUNT(*) AS n FROM sqlite_master").get();
                return null;
            } finally {
                db.close();
            }
        } catch (error) {
            lastError = error;
        }

        if (Date.now() >= deadline) return lastError;
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
}

/** Accepts one student id or many. A simulation has one account per virtual student. */
function idList(studentIds) {
    const ids = Array.isArray(studentIds) ? studentIds : [studentIds];
    return ids.filter((id) => Number.isFinite(id));
}

/** `?,?,?` for an IN clause, so the queries work for one account or for a whole cohort. */
function marks(ids) {
    return ids.map(() => "?").join(",");
}

/**
 * Removes every row a load run created, for one student or for a whole simulated cohort.
 *
 * The ACCOUNTS are deliberately NOT deleted. Purging data is routine; deleting accounts is not, and
 * this file cannot tell a load-test account from a real one by looking at it. Only the username
 * prefix check in the caller separates them, so the data is removed and the accounts are left.
 *
 * `NlpAnalysis` is keyed by reflection id rather than student id, so it goes first, while the rows
 * that join it are still there to describe which ones it was.
 */
export function purgeStudent(studentIds) {
    const ids = idList(studentIds);
    if (ids.length === 0) return [];

    const list = marks(ids);
    const db = new DatabaseSync(STUDENTS_DB);
    const removed = [];

    try {
        if (tableExists(db, "NlpAnalysis") && tableExists(db, "ReflectionHistory")) {
            const nlp = db.prepare(
                `DELETE FROM NlpAnalysis WHERE HistoryId IN ` +
                `(SELECT Id FROM ReflectionHistory WHERE StudentId IN (${list}))`,
            ).run(...ids);
            if (nlp.changes > 0) removed.push(["NlpAnalysis", nlp.changes]);
        }

        for (const table of [...STUDENT_TABLES, "ReflectionHistory"]) {
            if (!tableExists(db, table)) continue;
            const result = db.prepare(`DELETE FROM ${table} WHERE StudentId IN (${list})`).run(...ids);
            if (result.changes > 0) removed.push([table, result.changes]);
        }
    } finally {
        db.close();
    }

    return removed;
}

/** Read-only counts for one student or a whole cohort, used to baseline a run. */
export function countRows(studentIds) {
    const ids = idList(studentIds);
    const counts = {};
    if (ids.length === 0) return counts;

    const list = marks(ids);
    const db = new DatabaseSync(STUDENTS_DB);

    try {
        for (const table of [...STUDENT_TABLES, "ReflectionHistory"]) {
            if (!tableExists(db, table)) continue;
            counts[table] = db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE StudentId IN (${list})`).get(...ids).n;
        }
    } finally {
        db.close();
    }

    return counts;
}

/** Total across every table, for the one-line summary a run prints. */
export function totalRows(counts) {
    return Object.values(counts).reduce((sum, n) => sum + n, 0);
}
