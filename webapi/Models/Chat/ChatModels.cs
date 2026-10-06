namespace webapi.Models.Chat
{
    /// <summary>One message in the conversation history sent from the frontend.</summary>
    public class ChatMessage
    {
        public string Role { get; set; } = string.Empty;   // "user" or "model"
        public string Text { get; set; } = string.Empty;
    }

    /// <summary>Full request body for POST /chat/flexibility</summary>
    public class FlexibilityChatRequest
    {
        /// <summary>
        /// Student this transcript belongs to. Used only to attribute the persisted
        /// transcript for research analysis. 0 (or omitted, e.g. guest sessions) means
        /// no transcript is stored. Never affects the reply.
        /// </summary>
        public long StudentId { get; set; }

        /// <summary>
        /// Plain-text description of the current exercise step and equations,
        /// assembled by the frontend so the AI has full context.
        /// </summary>
        public string ExerciseContext { get; set; } = string.Empty;

        /// <summary>
        /// Exercise type the student is working on ("Suitability" | "Efficiency" | "Matching").
        /// Used together with <see cref="ExerciseId"/> to retrieve the authored curriculum content
        /// for this exercise so the tutor can use the lesson's own terminology.
        /// Omitted or empty means no curriculum grounding is applied.
        /// </summary>
        public string ExerciseType { get; set; } = string.Empty;

        /// <summary>Exercise id within <see cref="ExerciseType"/>. 0 means none available.</summary>
        public long ExerciseId { get; set; }

        /// <summary>
        /// The step the student is currently on (e.g. "FirstSolution", "MethodSelection").
        ///
        /// This gates curriculum grounding: only the hint for the current step may be supplied.
        /// Passing hints for later steps hands the student the answer, so an empty value disables
        /// grounding entirely rather than risking a spoiler.
        /// </summary>
        public string ExercisePhase { get; set; } = string.Empty;

        /// <summary>The student's latest message.</summary>
        public string UserMessage { get; set; } = string.Empty;

        /// <summary>Prior turns in this session so the model can maintain continuity.</summary>
        public List<ChatMessage> History { get; set; } = [];

        /// <summary>The display name of the active buddy character (e.g. "Master Zen").</summary>
        public string BuddyName { get; set; } = "Pippin";

        /// <summary>BCP-47 language code selected by the student (e.g. "en", "de", "ja").</summary>
        public string Language { get; set; } = "en";
    }

    public class FlexibilityChatResponse
    {
        public string Reply { get; set; } = string.Empty;
    }
}
