using webapi.Models.User;

namespace webapi.Services
{
    /// <summary>
    /// Supplies the authored curriculum content for a specific exercise so the AI tutor can use the
    /// platform's own terminology and pedagogic intent instead of inventing explanation text.
    ///
    /// Contract: best-effort and read-only. Implementations must never throw and must return an
    /// empty string when content is unavailable, because grounding is an enhancement — it must never
    /// disturb a student's chat.
    /// </summary>
    public interface ICurriculumContextService
    {
        /// <summary>
        /// Returns a prompt-ready block of curriculum content for the student's <b>current phase
        /// only</b>, or an empty string when the exercise or phase cannot be identified.
        /// Implementations must never supply content for phases the student has not reached, and must
        /// return an empty string rather than guessing when the phase is unknown.
        /// </summary>
        string GetGroundingBlock(string? exerciseType, long? exerciseId, string? exercisePhase, Language language);
    }
}
