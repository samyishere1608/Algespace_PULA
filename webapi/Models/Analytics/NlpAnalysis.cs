using Dapper;
using Microsoft.Data.Sqlite;

namespace webapi.Models.Analytics
{
    /// <summary>
    /// One row of derived NLP features for a single student-authored reflection turn.
    ///
    /// This table is derived research data only: it is written by an offline batch job and is never
    /// read by the tutoring flow or any AI prompt. The source rows (ReflectionHistory,
    /// ReflectionQueue) are only ever READ, never modified, so running the pipeline cannot affect
    /// the study or a participant's experience.
    ///
    /// Context columns (Method / Errors / Hints / PippinMessages) are copied from ReflectionQueue so
    /// this table can be analysed standalone — text features alongside the performance data for the
    /// same item — without a join.
    /// </summary>
    public class NlpAnalysisRecord
    {
        public long Id { get; set; }
        public long StudentId { get; set; }

        /// <summary>ReflectionHistory.Id this row was derived from.</summary>
        public long HistoryId { get; set; }

        public string ItemType { get; set; } = string.Empty;
        public string ItemId { get; set; } = string.Empty;

        public string Language { get; set; } = string.Empty;

        /// <summary>"word" or "character" — never pool measures across units.</summary>
        public string TokenUnit { get; set; } = string.Empty;

        public int CharacterCount { get; set; }
        public int TokenCount { get; set; }
        public int UniqueTokenCount { get; set; }
        public double VocabularyVariety { get; set; }

        /// <summary>JSON arrays of the matched terms, kept so every row is auditable.</summary>
        public string MethodsMentioned { get; set; } = "[]";
        public string ReasoningMarkers { get; set; } = "[]";
        public string UncertaintyMarkers { get; set; } = "[]";
        public string AffectMarkers { get; set; } = "[]";

        public int DomainTermCount { get; set; }
        public bool GivesReason { get; set; }
        public bool MentionsMethod { get; set; }
        public bool HasDomainTerm { get; set; }

        // ── Context copied from ReflectionQueue ──────────────────────────────
        public string Method { get; set; } = string.Empty;
        public int Errors { get; set; }
        public int Hints { get; set; }
        public int PippinMessages { get; set; }

        /// <summary>Extractor version that produced this row (see NlpFeatureExtractor.Version).</summary>
        public string PipelineVersion { get; set; } = string.Empty;

        public string CreatedAt { get; set; } = string.Empty;
    }

    /// <summary>Summary of one batch run. Returned to the caller for verification.</summary>
    public class NlpRunResult
    {
        public string PipelineVersion { get; set; } = string.Empty;
        public long? StudentId { get; set; }

        /// <summary>Student-authored reflection turns found.</summary>
        public int CandidateRows { get; set; }

        /// <summary>Rows newly written by this run.</summary>
        public int Analyzed { get; set; }

        /// <summary>Rows already present for this pipeline version (idempotent re-runs).</summary>
        public int AlreadyAnalyzed { get; set; }

        /// <summary>Rows skipped because the text was blank.</summary>
        public int Blank { get; set; }

        /// <summary>True when the source tables do not exist yet (fresh database).</summary>
        public bool SourceTablesMissing { get; set; }
    }

    public static class NlpAnalysisSettings
    {
        public const string Table = "NlpAnalysis";

        public const string Scheme =
            "Id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "StudentId INTEGER NOT NULL, " +
            "HistoryId INTEGER NOT NULL, " +
            "ItemType TEXT NOT NULL DEFAULT '', " +
            "ItemId TEXT NOT NULL DEFAULT '', " +
            "Language TEXT NOT NULL DEFAULT '', " +
            "TokenUnit TEXT NOT NULL DEFAULT '', " +
            "CharacterCount INTEGER NOT NULL DEFAULT 0, " +
            "TokenCount INTEGER NOT NULL DEFAULT 0, " +
            "UniqueTokenCount INTEGER NOT NULL DEFAULT 0, " +
            "VocabularyVariety REAL NOT NULL DEFAULT 0, " +
            "MethodsMentioned TEXT NOT NULL DEFAULT '[]', " +
            "ReasoningMarkers TEXT NOT NULL DEFAULT '[]', " +
            "UncertaintyMarkers TEXT NOT NULL DEFAULT '[]', " +
            "AffectMarkers TEXT NOT NULL DEFAULT '[]', " +
            "DomainTermCount INTEGER NOT NULL DEFAULT 0, " +
            "GivesReason INTEGER NOT NULL DEFAULT 0, " +
            "MentionsMethod INTEGER NOT NULL DEFAULT 0, " +
            "HasDomainTerm INTEGER NOT NULL DEFAULT 0, " +
            "Method TEXT NOT NULL DEFAULT '', " +
            "Errors INTEGER NOT NULL DEFAULT 0, " +
            "Hints INTEGER NOT NULL DEFAULT 0, " +
            "PippinMessages INTEGER NOT NULL DEFAULT 0, " +
            "PipelineVersion TEXT NOT NULL, " +
            "CreatedAt TEXT NOT NULL";

        /// <summary>
        /// Creates the table and indexes if absent. Safe to call repeatedly.
        /// The unique index is what makes re-running the batch idempotent: a given
        /// source turn can only be analysed once per pipeline version.
        /// </summary>
        public static void EnsureTable(SqliteConnection conn)
        {
            conn.Execute($"CREATE TABLE IF NOT EXISTS {Table} ({Scheme})");
            conn.Execute(
                $"CREATE UNIQUE INDEX IF NOT EXISTS UX_{Table}_HistoryId_Version " +
                $"ON {Table} (HistoryId, PipelineVersion)");
            conn.Execute(
                $"CREATE INDEX IF NOT EXISTS IX_{Table}_StudentId " +
                $"ON {Table} (StudentId)");
        }

        public static string NowStamp() => DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss");
    }
}
