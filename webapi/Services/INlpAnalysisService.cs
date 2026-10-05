using webapi.Models.Analytics;

namespace webapi.Services
{
    /// <summary>
    /// Offline NLP analysis over stored student text.
    ///
    /// Contract: read-only with respect to all existing tables. The only writes are INSERTs into
    /// <c>NlpAnalysis</c>. Implementations must be safe to run repeatedly and must never modify
    /// reflection history, queue items, or any data the study depends on.
    /// </summary>
    public interface INlpAnalysisService
    {
        /// <summary>
        /// Extracts features for every student-authored reflection turn not yet analysed under the
        /// current pipeline version.
        /// </summary>
        /// <param name="studentId">Restrict to one student, or null for all students.</param>
        NlpRunResult Run(long? studentId = null);
    }
}
