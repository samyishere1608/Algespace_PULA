using Dapper;
using Microsoft.Data.Sqlite;

namespace webapi.Models.Analytics
{
    /// <summary>
    /// One persisted turn of a student's conversation with the AI tutor.
    ///
    /// This mirrors the existing <c>ReflectionHistory</c> pattern: the platform already stores
    /// reflection turns and feeds them back into the prompt, but chat turns were previously
    /// held only in browser state and discarded. Persisting them makes the two consistent and
    /// is the prerequisite for any text analysis over chat.
    ///
    /// Rows are append-only and observational: nothing here influences tutor behaviour.
    /// </summary>
    public class ChatTranscriptRecord
    {
        public long Id { get; set; }
        public long StudentId { get; set; }

        /// <summary>"user" or "pippin".</summary>
        public string Role { get; set; } = string.Empty;

        public string Text { get; set; } = string.Empty;

        /// <summary>Position of this turn within the session, starting at 0.</summary>
        public int TurnIndex { get; set; }

        /// <summary>UI language reported by the client (e.g. "en", "de", "ja").</summary>
        public string Language { get; set; } = string.Empty;

        public string BuddyName { get; set; } = string.Empty;

        /// <summary>Exercise type this turn belongs to ("Suitability" | "Efficiency" | "Matching"), or empty.</summary>
        public string ExerciseType { get; set; } = string.Empty;

        /// <summary>Exercise id within <see cref="ExerciseType"/>. 0 when unknown.</summary>
        public long ExerciseId { get; set; }

        /// <summary>Step the student was on for this turn (e.g. "FirstSolution"), or empty.</summary>
        public string ExercisePhase { get; set; } = string.Empty;

        /// <summary>Exercise context string the frontend sent with the turn.</summary>
        public string ExerciseContext { get; set; } = string.Empty;

        /// <summary>UTC timestamp, ISO-8601 (matches the format used elsewhere in the schema).</summary>
        public string CreatedAt { get; set; } = string.Empty;
    }

    public static class ChatTranscriptSettings
    {
        public const string Table = "ChatTranscript";

        public const string Scheme =
            "Id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "StudentId INTEGER NOT NULL, " +
            "Role TEXT NOT NULL, " +
            "Text TEXT NOT NULL, " +
            "TurnIndex INTEGER NOT NULL DEFAULT 0, " +
            "Language TEXT NOT NULL DEFAULT '', " +
            "BuddyName TEXT NOT NULL DEFAULT '', " +
            "ExerciseType TEXT NOT NULL DEFAULT '', " +
            "ExerciseId INTEGER NOT NULL DEFAULT 0, " +
            "ExercisePhase TEXT NOT NULL DEFAULT '', " +
            "ExerciseContext TEXT NOT NULL DEFAULT '', " +
            "CreatedAt TEXT NOT NULL";

        /// <summary>
        /// Creates the table and its lookup index if absent. Safe to call repeatedly.
        /// </summary>
        public static void EnsureTable(SqliteConnection conn)
        {
            conn.Execute($"CREATE TABLE IF NOT EXISTS {Table} ({Scheme})");

            // Migrate tables created before the exercise columns existed. Safe to run repeatedly:
            // the ALTER simply fails once the column is present.
            TryAddColumn(conn, "ExerciseType", "TEXT NOT NULL DEFAULT ''");
            TryAddColumn(conn, "ExerciseId", "INTEGER NOT NULL DEFAULT 0");
            TryAddColumn(conn, "ExercisePhase", "TEXT NOT NULL DEFAULT ''");

            conn.Execute(
                $"CREATE INDEX IF NOT EXISTS IX_{Table}_StudentId_CreatedAt " +
                $"ON {Table} (StudentId, CreatedAt)");
        }

        private static void TryAddColumn(SqliteConnection conn, string column, string definition)
        {
            try { conn.Execute($"ALTER TABLE {Table} ADD COLUMN {column} {definition}"); }
            catch { /* column already exists */ }
        }

        /// <summary>Current UTC timestamp in the schema's canonical string format.</summary>
        public static string NowStamp() => DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss");
    }
}
