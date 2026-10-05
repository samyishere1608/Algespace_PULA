/**
 * Post-run invariants, read straight out of the database.
 *
 * WHY THIS HALF EXISTS
 * A load run can look perfect and still have corrupted the data: every request 200, every latency
 * reasonable, and two workers having written the same anchor record twice or a claim having paid out
 * for one goal twice. Throughput tells you the server stayed up. Only the data tells you it stayed
 * correct, so the suite always checks, and reports the two together.
 *
 * Every query here is read-only, and every check skips itself when its table is absent — an older
 * database must not be reported as broken.
 */

import { DatabaseSync } from "node:sqlite";
import { STUDENTS_DB, tableExists } from "./fixtures.mjs";

/** Cap on the offending rows returned per check. Enough to see the pattern, not enough to flood. */
const LIMIT = 5;

/**
 * @param {object} options
 * @param {number|number[]} options.studentIds   the load-test accounts, one or many
 * @param {object} [options.expectations]        exact counts the run believes it produced
 * @param {object} [options.baseline]            per-table row counts taken before the run
 */
export function runIntegrity({ studentIds, expectations = {}, baseline = {} }) {
    const ids = (Array.isArray(studentIds) ? studentIds : [studentIds]).filter((id) => Number.isFinite(id));
    const list = ids.map(() => "?").join(",");

    const db = new DatabaseSync(STUDENTS_DB);
    const results = [];

    /**
     * Runs one invariant and reports the offending rows themselves, not just how many there were.
     *
     * A check that says "6 problems" and stops there cannot be acted on, so every query below selects
     * the rows that broke the rule instead of counting them. `tables` is verified first: a database
     * that predates one of them is skipped rather than reported as failing, because a missing table is
     * not a data problem.
     */
    const empty = (id, title, tables, sql) => {
        let missing;
        try {
            missing = tables.some((table) => !tableExists(db, table));
        } catch (error) {
            // The database could not be read at all — most often because a write from the run still
            // holds it. That is NOT a missing table and must never be reported as a pass: a checker
            // that silently passes when it cannot check is worse than no checker.
            return results.push({
                id,
                title,
                passed: false,
                detail: `could not read the database: ${error.message}`,
            });
        }

        if (missing) {
            return results.push({ id, title, passed: true, detail: "table absent — skipped" });
        }

        try {
            const offenders = db.prepare(sql).all();
            results.push({
                id,
                title,
                passed: offenders.length === 0,
                // "5+" because the query stops at five; a bare 5 would understate a larger problem.
                detail: offenders.length === 0
                    ? "clean"
                    : `${offenders.length}${offenders.length >= LIMIT ? "+" : ""} offending row(s): ` +
                      offenders
                          .map((row) => Object.entries(row).map(([key, value]) => `${key}=${value}`).join(","))
                          .join(" | "),
            });
        } catch (error) {
            results.push({ id, title, passed: false, detail: `query failed: ${error.message}` });
        }
    };

    // ── Structural integrity of the anchor store ─────────────────────────────
    empty(
        "anchors.orphans",
        "Every anchor record belongs to an attempt that exists",
        ["AnchorRecord", "FlexibilityAttempt"],
        "SELECT DISTINCT r.AttemptId AS attemptId FROM AnchorRecord r " +
        "WHERE NOT EXISTS (SELECT 1 FROM FlexibilityAttempt a WHERE a.Id = r.AttemptId) LIMIT 5",
    );

    empty(
        "anchors.blank-name",
        "No anchor record was written with an empty name",
        ["AnchorRecord"],
        "SELECT Id, AttemptId FROM AnchorRecord WHERE TRIM(COALESCE(Name, '')) = '' LIMIT 5",
    );

    // The (AttemptId, Name) unique index should make this impossible. Checked anyway: if the index
    // were ever dropped or recreated without the constraint, this is the check that would notice.
    empty(
        "anchors.duplicate-points",
        "No (attempt, name) pair was recorded twice",
        ["AnchorRecord"],
        "SELECT AttemptId, Name, COUNT(*) AS times FROM AnchorRecord " +
        "GROUP BY AttemptId, Name HAVING COUNT(*) > 1 LIMIT 5",
    );

    empty(
        "attempts.blank-start",
        "No attempt was created without a start stamp",
        ["FlexibilityAttempt"],
        "SELECT Id, StudentId FROM FlexibilityAttempt WHERE TRIM(COALESCE(StartedAt, '')) = '' LIMIT 5",
    );

    empty(
        "attempts.orphan-student",
        "No attempt refers to a student that does not exist",
        ["FlexibilityAttempt", "Students"],
        "SELECT DISTINCT a.StudentId AS studentId FROM FlexibilityAttempt a " +
        "WHERE NOT EXISTS (SELECT 1 FROM Students s WHERE s.Id = a.StudentId) LIMIT 5",
    );

    // ── Goals ───────────────────────────────────────────────────────────────
    empty(
        "goals.duplicate-instance",
        "No goal instance was stored twice",
        ["ActiveGoals"],
        "SELECT StudentId, Id, COUNT(*) AS times FROM ActiveGoals " +
        "GROUP BY StudentId, Id HAVING COUNT(*) > 1 LIMIT 5",
    );

    empty(
        "goals.dangling-student",
        "No goal refers to a student that does not exist",
        ["ActiveGoals", "Students"],
        "SELECT DISTINCT g.StudentId AS studentId FROM ActiveGoals g " +
        "WHERE NOT EXISTS (SELECT 1 FROM Students s WHERE s.Id = g.StudentId) LIMIT 5",
    );

    empty(
        "goals.malformed",
        "Every stored goal has a category, an id and a positive target",
        ["ActiveGoals"],
        "SELECT Id, Category, Target FROM ActiveGoals WHERE TRIM(COALESCE(Category, '')) = '' " +
        "OR TRIM(COALESCE(Id, '')) = '' OR COALESCE(Target, 0) <= 0 LIMIT 5",
    );

    // ── Reflection queue ────────────────────────────────────────────────────
    // The cap is enforced by an INSERT followed by an UPDATE that keeps the newest three. That is a
    // read-modify-write across two statements, so it is exactly the shape concurrency breaks: two
    // writers can both see five pending and both decide to keep their own three.
    empty(
        "reflection.queue-cap",
        "No student has more than three pending reflections",
        ["ReflectionQueue"],
        "SELECT StudentId, COUNT(*) AS pending FROM ReflectionQueue WHERE Status = 'pending' " +
        "GROUP BY StudentId HAVING COUNT(*) > 3 LIMIT 5",
    );

    empty(
        "reflections.blank-role",
        "No reflection turn was stored without a role",
        ["ReflectionHistory"],
        "SELECT Id, StudentId FROM ReflectionHistory WHERE TRIM(COALESCE(Role, '')) = '' LIMIT 5",
    );

    // ── Orphaned agency rows ────────────────────────────────────────────────
    empty(
        "agency.orphan-student",
        "No agency XP row refers to a student that does not exist",
        ["AgencyLog", "Students"],
        "SELECT DISTINCT l.StudentId AS studentId FROM AgencyLog l " +
        "WHERE NOT EXISTS (SELECT 1 FROM Students s WHERE s.Id = l.StudentId) LIMIT 5",
    );

    // ── What the run believes it produced ────────────────────────────────────
    // The strongest lost-write detector available: the runner counts how many iterations of each
    // write scenario finished, and that number has to match the rows. A lost write still returns 200,
    // so nothing else would notice one.
    //
    // The expectation is a RANGE, not a number, and that is not pedantry: a request that timed out may
    // still have committed server-side, and the client cannot tell which. Reporting a single number
    // made every timeout look like an extra write — the check accusing the server of a bug it had not
    // committed. `min` is what came back confirmed; `max` adds the writes whose replies were lost.
    // `noBaseline` exists for checks whose column is not a ROW COUNT. The tutorial check counts
    // occurrences of a marker inside a JSON array, and that marker only ever comes from this run — so
    // rows that existed before cannot inflate it, and adding the row baseline would accuse the server
    // of a lost write it never lost. (It did exactly that the first time this check ran.)
    const exact = (id, title, table, actualSql, min, max, { noBaseline = false } = {}) => {
        if (min === undefined) return;

        try {
            if (!tableExists(db, table)) {
                return results.push({ id, title, passed: true, detail: "table absent — skipped" });
            }
        } catch (error) {
            return results.push({ id, title, passed: false, detail: `could not read the database: ${error.message}` });
        }

        // Rows that were already there for this student are not this run's doing. The account is
        // reused between runs on purpose, so without this offset a second run would report every row
        // the first run left as an over-count, and the check would be worthless after day one.
        const before = noBaseline ? 0 : (baseline[table] ?? 0);
        const lowest = before + min;
        const highest = before + (max ?? min);

        try {
            // `__IDS__` becomes the placeholder list, so one check covers a single account or a whole
            // simulated cohort without a second code path.
            const actual = db.prepare(actualSql.replace("__IDS__", list)).get(...ids).n;

            let detail;
            let passed = true;

            if (actual < lowest) {
                passed = false;
                detail = `${actual} row(s), expected at least ${lowest} — LOST WRITES`;
            } else if (actual > highest) {
                passed = false;
                detail = `${actual} row(s), expected at most ${highest} — extra writes`;
            } else if (lowest === highest) {
                detail = `${actual} row(s), exactly as expected`;
            } else {
                detail = `${actual} row(s) — within the expected ${lowest}..${highest}: ` +
                         `${highest - lowest} write(s) never got a reply, so they may or may not have landed`;
            }

            results.push({ id, title, passed, detail });
        } catch (error) {
            results.push({ id, title, passed: false, detail: `query failed: ${error.message}` });
        }
    };

    exact(
        "expect.attempts",
        "Attempts written match the exercises that opened one",
        "FlexibilityAttempt",
        "SELECT COUNT(*) AS n FROM FlexibilityAttempt WHERE StudentId IN (__IDS__)",
        expectations.attempts,
        expectations.attemptsMax,
    );

    exact(
        "expect.active-goals",
        "Active goals left behind match the goals added and removed",
        "ActiveGoals",
        "SELECT COUNT(*) AS n FROM ActiveGoals WHERE StudentId IN (__IDS__)",
        expectations.activeGoals,
        expectations.activeGoalsMax,
    );

    exact(
        "expect.goal-completions",
        "Goal completions match the log-goal calls that returned",
        "GoalCompletions",
        "SELECT COUNT(*) AS n FROM GoalCompletions WHERE StudentId IN (__IDS__)",
        expectations.goalCompletions,
        expectations.goalCompletionsMax,
    );

    // Choice, Insight and Resolve all land in this one table, so this is the check that covers every
    // award the agency system makes — opting into reflection, solving alone, and finishing a goal.
    exact(
        "expect.agency-rows",
        "Agency XP rows match the choice/insight/resolve awards that returned",
        "AgencyLog",
        "SELECT COUNT(*) AS n FROM AgencyLog WHERE StudentId IN (__IDS__)",
        expectations.agencyRows,
        expectations.agencyRowsMax,
    );

    exact(
        "expect.reflection-turns",
        "Reflection history rows match the reflections that completed",
        "ReflectionHistory",
        "SELECT COUNT(*) AS n FROM ReflectionHistory WHERE StudentId IN (__IDS__)",
        expectations.reflectionTurns,
        expectations.reflectionTurnsMax,
    );

    // The exercise-completion route (`logFlexibilityMethodChoice`) is idempotent, so the session
    // already counted DISTINCT (category, exerciseKey, exerciseId) tuples rather than calls. Filtered
    // to the category the simulator sends, because the app also records conceptual- and
    // procedural-knowledge completions here.
    exact(
        "expect.exercise-completions",
        "Completed-exercise rows match the distinct exercises the students marked",
        "ExerciseCompletions",
        "SELECT COUNT(*) AS n FROM ExerciseCompletions WHERE StudentId IN (__IDS__) " +
        "AND Category = 'flexibility'",
        expectations.exerciseCompletions,
        expectations.exerciseCompletionsMax,
    );

    // The tutorial route is an UPDATE to a JSON array, so a row count cannot see it — the row exists
    // either way. Instead every call appends a key with a known prefix, and the number of times that
    // prefix occurs across the cohort IS the number of writes that landed.
    // SQLite has no string-count function, so it is derived from two lengths divided by the marker
    // length (8 characters).
    exact(
        "expect.tutorial-steps",
        "Onboarding steps appended match the tutorial syncs that returned",
        "StudentProgress",
        "SELECT COALESCE(SUM((LENGTH(COALESCE(TutorialsCompleted, '')) - " +
        "LENGTH(REPLACE(COALESCE(TutorialsCompleted, ''), 'sim-tut-', ''))) / 8), 0) AS n " +
        "FROM StudentProgress WHERE StudentId IN (__IDS__)",
        expectations.tutorialSteps,
        expectations.tutorialStepsMax,
        { noBaseline: true },
    );

    // Nudge outcomes land in `AnchorRecord` in the same table as every other tracked decision, so
    // they are separated by the name they are written under (`NudgeOutcome:<element>`).
    exact(
        "expect.nudge-records",
        "Nudge-outcome rows match the trackRecord calls that returned",
        "AnchorRecord",
        "SELECT COUNT(*) AS n FROM AnchorRecord WHERE StudentId IN (__IDS__) " +
        "AND Name LIKE 'NudgeOutcome:%'",
        expectations.nudgeRecords,
        expectations.nudgeRecordsMax,
    );

    db.close();
    return results;
}
