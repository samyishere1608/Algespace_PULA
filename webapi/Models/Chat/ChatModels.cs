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
        /// Plain-text description of the current exercise step and equations,
        /// assembled by the frontend so the AI has full context.
        /// </summary>
        public string ExerciseContext { get; set; } = string.Empty;

        /// <summary>The student's latest message.</summary>
        public string UserMessage { get; set; } = string.Empty;

        /// <summary>Prior turns in this session so Gemini can maintain continuity.</summary>
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
