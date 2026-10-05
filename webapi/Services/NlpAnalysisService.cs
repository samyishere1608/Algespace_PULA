using System.Text.Encodings.Web;
using System.Text.Json;
using Dapper;
using webapi.Models.Analytics;
using webapi.Models.Database;
using webapi.Models.Student;

namespace webapi.Services
{
    /// <summary>
    /// Deterministic Phase-1 NLP pipeline: turns already-stored student reflections into a
    /// structured research table.
    ///
    /// Properties that matter for a study:
    /// - Read-only over existing tables. Only <c>NlpAnalysis</c> is written.
    /// - Idempotent: a source turn is analysed at most once per pipeline version, enforced by a
    ///   unique index rather than by application logic.
    /// - Versioned: every row records the extractor version that produced it, so improving the
    ///   lexicons later never silently rewrites history — a new version writes new rows.
    /// - No LLM calls. This layer is fully reproducible and costs nothing to re-run.
    /// </summary>
    public class NlpAnalysisService : INlpAnalysisService
    {
        /// <summary>
        /// Keeps Japanese (and umlauts) as readable UTF-8 instead of \uXXXX escapes. The default
        /// encoder is stricter than this data needs: these values are stored in a database and read
        /// by analysis scripts, never injected into HTML, so relaxed escaping is safe here and makes
        /// exported datasets far easier to inspect.
        /// </summary>
        private static readonly JsonSerializerOptions MarkerJsonOptions = new()
        {
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        };

        private const string InsertSql =
            $"INSERT OR IGNORE INTO {NlpAnalysisSettings.Table} " +
            "(StudentId, HistoryId, ItemType, ItemId, Language, TokenUnit, CharacterCount, TokenCount, " +
            "UniqueTokenCount, VocabularyVariety, MethodsMentioned, ReasoningMarkers, UncertaintyMarkers, " +
            "AffectMarkers, DomainTermCount, GivesReason, MentionsMethod, HasDomainTerm, " +
            "Method, Errors, Hints, PippinMessages, PipelineVersion, CreatedAt) " +
            "VALUES (@StudentId, @HistoryId, @ItemType, @ItemId, @Language, @TokenUnit, @CharacterCount, @TokenCount, " +
            "@UniqueTokenCount, @VocabularyVariety, @MethodsMentioned, @ReasoningMarkers, @UncertaintyMarkers, " +
            "@AffectMarkers, @DomainTermCount, @GivesReason, @MentionsMethod, @HasDomainTerm, " +
            "@Method, @Errors, @Hints, @PippinMessages, @PipelineVersion, @CreatedAt)";

        public NlpRunResult Run(long? studentId = null)
        {
            var result = new NlpRunResult
            {
                PipelineVersion = NlpFeatureExtractor.Version,
                StudentId = studentId,
            };

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();

            // A fresh database has no reflection tables yet — nothing to analyse, not an error.
            if (!TableExists(conn, StudentProgressDBSettings.ReflectionHistoryTable))
            {
                result.SourceTablesMissing = true;
                return result;
            }

            NlpAnalysisSettings.EnsureTable(conn);

            var scope = studentId.HasValue ? " AND StudentId = @StudentId" : string.Empty;

            // Only student-authored turns carry the student's own reasoning; "pippin" and "system"
            // turns are excluded so the dataset contains no model-generated text.
            var turns = conn.Query<ReflectionHistoryRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ReflectionHistoryTable} " +
                $"WHERE Role = 'student'{scope} ORDER BY Id",
                new { StudentId = studentId }).ToList();

            result.CandidateRows = turns.Count;

            if (turns.Count == 0) return result;

            var context = LoadQueueContext(conn, studentId);

            foreach (var turn in turns)
            {
                if (string.IsNullOrWhiteSpace(turn.Text))
                {
                    result.Blank++;
                    continue;
                }

                // No UI language is stored alongside a historical turn, so detection relies on the
                // text itself. That is also more robust: a student may write a different language
                // than the interface.
                var features = NlpFeatureExtractor.Extract(turn.Text);

                context.TryGetValue(ContextKey(turn.ItemType, turn.ItemId), out var item);

                var written = conn.Execute(InsertSql, new
                {
                    StudentId = turn.StudentId,
                    HistoryId = turn.Id,
                    ItemType = turn.ItemType,
                    ItemId = turn.ItemId,
                    features.Language,
                    features.TokenUnit,
                    features.CharacterCount,
                    features.TokenCount,
                    features.UniqueTokenCount,
                    features.VocabularyVariety,
                    MethodsMentioned = JsonSerializer.Serialize(features.MethodsMentioned, MarkerJsonOptions),
                    ReasoningMarkers = JsonSerializer.Serialize(features.ReasoningMarkers, MarkerJsonOptions),
                    UncertaintyMarkers = JsonSerializer.Serialize(features.UncertaintyMarkers, MarkerJsonOptions),
                    AffectMarkers = JsonSerializer.Serialize(features.AffectMarkers, MarkerJsonOptions),
                    features.DomainTermCount,
                    GivesReason = features.GivesReason ? 1 : 0,
                    MentionsMethod = features.MentionsMethod ? 1 : 0,
                    HasDomainTerm = features.HasDomainTerm ? 1 : 0,
                    Method = item?.Method ?? string.Empty,
                    Errors = item?.Errors ?? 0,
                    Hints = item?.Hints ?? 0,
                    PippinMessages = item?.PippinMessages ?? 0,
                    PipelineVersion = NlpFeatureExtractor.Version,
                    CreatedAt = NlpAnalysisSettings.NowStamp(),
                });

                if (written > 0) result.Analyzed++;
                else result.AlreadyAnalyzed++;
            }

            return result;
        }

        // ── Helpers ──────────────────────────────────────────────────────────────

        private static bool TableExists(Microsoft.Data.Sqlite.SqliteConnection conn, string tableName) =>
            conn.ExecuteScalar<long>(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = @Name",
                new { Name = tableName }) > 0;

        /// <summary>
        /// Performance context for each reflection item, keyed by item type + id.
        /// If several queue rows share a key (the same item reflected on twice, or a queue row that
        /// was later skipped), the original record wins so the context stays stable across re-runs.
        /// </summary>
        private static Dictionary<string, ReflectionQueueRecord> LoadQueueContext(
            Microsoft.Data.Sqlite.SqliteConnection conn,
            long? studentId)
        {
            if (!TableExists(conn, StudentProgressDBSettings.ReflectionQueueTable))
                return [];

            var scope = studentId.HasValue ? " WHERE StudentId = @StudentId" : string.Empty;

            var rows = conn.Query<ReflectionQueueRecord>(
                $"SELECT * FROM {StudentProgressDBSettings.ReflectionQueueTable}{scope} ORDER BY Id",
                new { StudentId = studentId }).ToList();

            var map = new Dictionary<string, ReflectionQueueRecord>(StringComparer.Ordinal);
            foreach (var row in rows)
            {
                map.TryAdd(ContextKey(row.ItemType, row.ItemId), row);
            }

            return map;
        }

        private static string ContextKey(string? itemType, string? itemId) =>
            $"{itemType ?? string.Empty}|{itemId ?? string.Empty}";
    }
}
