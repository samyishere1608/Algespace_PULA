using Dapper;
using Microsoft.Data.Sqlite;

namespace webapi.Models.Anchors
{
    /// <summary>
    /// Storage for our own capture of the adaptive decision anchors.
    ///
    /// WHY THIS EXISTS
    /// The adaptive anchor subsystem (per-phase tracking, student classification, the decision
    /// engines that read history) is fully built, but every part of it is gated behind the study
    /// module's logging flag. Outside that module the anchors render but do not adapt, and nothing
    /// they produce is stored. This store gives the same trackers a destination we own, so the
    /// per-student history the avoidance profile needs actually exists.
    ///
    /// WHY NOT REUSE THE STUDY TABLES
    /// The study schema is one wide table per (studyId, user) with a column per phase and JSON
    /// blobs in each. That shape suits storing one exercise per row; it is hostile to the question
    /// this feature asks, which is "across all attempts, how often does this student avoid X?".
    /// A normalised record table answers that with a single GROUP BY.
    ///
    /// This store lives in students.db — the application database — rather than studies.db, which
    /// is shared at file level with a study we do not control.
    /// </summary>
    public static class AnchorStoreSettings
    {
        public const string Table = "FlexibilityAttempt";
        public const string RecordTable = "AnchorRecord";

        public const string Scheme =
            "Id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "StudentId INTEGER NOT NULL, " +
            "ExerciseType TEXT NOT NULL DEFAULT '', " +
            "ExerciseId INTEGER NOT NULL DEFAULT 0, " +
            "SelectedMethod TEXT NOT NULL DEFAULT '', " +
            "AgentCondition TEXT NOT NULL DEFAULT '', " +
            "IsStudy INTEGER NOT NULL DEFAULT 0, " +
            "StartedAt TEXT NOT NULL, " +
            "CompletedAt TEXT NOT NULL DEFAULT '', " +
            "TotalTime REAL NOT NULL DEFAULT 0, " +
            "TotalErrors INTEGER NOT NULL DEFAULT 0, " +
            "TotalHints INTEGER NOT NULL DEFAULT 0";

        /// <summary>
        /// One row per named tracking point within an attempt: exercise phases (Elimination,
        /// FirstSolution…), choice points (FirstSolutionChoice, ComparisonInterventionChoice…) and
        /// the classifier output (StudentTypeFirstSolution). The name is what the tracker already
        /// sends as its "phase" argument, so the tracker needs no change to write here.
        /// </summary>
        public const string RecordScheme =
            "Id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "AttemptId INTEGER NOT NULL, " +
            "StudentId INTEGER NOT NULL, " +
            "Name TEXT NOT NULL, " +
            "Choice TEXT NOT NULL DEFAULT '', " +
            "MessageType INTEGER, " +
            "Actions TEXT NOT NULL DEFAULT '', " +
            "Time REAL NOT NULL DEFAULT 0, " +
            "Errors INTEGER NOT NULL DEFAULT 0, " +
            "Hints INTEGER NOT NULL DEFAULT 0, " +
            "UpdatedAt TEXT NOT NULL DEFAULT ''";

        public static string NowStamp() => DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss");

        /// <summary>
        /// Creates the tables and indexes. Idempotent, and deliberately NOT called per request —
        /// running DDL on the read path takes write locks and serialises the whole database.
        /// Called once at startup.
        /// </summary>
        public static void EnsureTables(SqliteConnection conn)
        {
            conn.Execute($"CREATE TABLE IF NOT EXISTS {Table} ({Scheme})");
            conn.Execute($"CREATE TABLE IF NOT EXISTS {RecordTable} ({RecordScheme})");

            // One row per named tracking point per attempt. The unique index also makes the
            // upsert idempotent, so a retried tracking call cannot duplicate a decision.
            conn.Execute(
                $"CREATE UNIQUE INDEX IF NOT EXISTS IX_{RecordTable}_Attempt_Name " +
                $"ON {RecordTable} (AttemptId, Name)");

            conn.Execute(
                $"CREATE INDEX IF NOT EXISTS IX_{Table}_Student ON {Table} (StudentId)");
            conn.Execute(
                $"CREATE INDEX IF NOT EXISTS IX_{RecordTable}_Student_Name ON {RecordTable} (StudentId, Name)");
        }
    }
}
