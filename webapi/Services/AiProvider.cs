using Microsoft.Extensions.Configuration;

namespace webapi.Services
{
    /// <summary>
    /// Where the chat-completions calls go, and which model they ask for.
    ///
    /// The provider is OpenAI-COMPATIBLE rather than OpenAI specifically, so the endpoint and the model
    /// are configuration rather than constants. Swapping to another compatible service — an academic
    /// cloud, a self-hosted vLLM, Azure — is then three settings and no code change.
    ///
    /// The keys are read from the EXISTING `OpenAI` section deliberately. The API key already lives
    /// there, so adding two sibling keys means a deployment that has not been updated keeps working
    /// exactly as before: both fall back to the old hardcoded values.
    ///
    /// `BaseUrl` is expected to include the version segment (`.../v1`); `chat/completions` is appended.
    /// </summary>
    public static class AiProvider
    {
        /// <summary>Used when <c>OpenAI:BaseUrl</c> is absent, so an un-updated config still works.</summary>
        public const string DefaultBaseUrl = "https://api.openai.com/v1";

        /// <summary>Used when <c>OpenAI:Model</c> is absent.</summary>
        public const string DefaultModel = "gpt-4o-mini";

        /// <summary>
        /// The API base, without a trailing slash. A configured value that already ends in `/` — or in
        /// `/v1/` — is normalised rather than producing `...//chat/completions`.
        /// </summary>
        public static string BaseUrl(IConfiguration configuration)
        {
            var configured = configuration.GetValue<string>("OpenAI:BaseUrl");

            return string.IsNullOrWhiteSpace(configured)
                ? DefaultBaseUrl
                : configured.Trim().TrimEnd('/');
        }

        /// <summary>
        /// The model name to request. There is no way to guess a provider's model ids, so this is
        /// entirely configuration: an OpenAI-compatible endpoint that does not serve `gpt-4o-mini`
        /// will reject the request, and the reply surfaces as a normal provider error.
        /// </summary>
        public static string Model(IConfiguration configuration)
        {
            var configured = configuration.GetValue<string>("OpenAI:Model");

            return string.IsNullOrWhiteSpace(configured) ? DefaultModel : configured.Trim();
        }

        /// <summary>Full chat-completions URL for the configured provider.</summary>
        public static string ChatCompletionsUrl(IConfiguration configuration) =>
            $"{BaseUrl(configuration)}/chat/completions";

        /// <summary>
        /// Whether to ask a reasoning model to skip its thinking phase.
        ///
        /// WHY THIS MATTERS HERE. A reasoning model answers by streaming its chain of thought into a
        /// separate `reasoning` field and leaving `content` NULL until it finishes. Measured on the
        /// configured Qwen model: with a 300-token budget the model spent all 300 on thinking and
        /// returned `content: null` with `finish_reason: length` — so every reply parsed as "no answer"
        /// and the app fell back. With thinking disabled the same prompt returned `content: "OK"` in
        /// **2** tokens. Every task here is a couple of sentences or a small JSON object, where the
        /// thinking phase is pure overhead on top of a budget that cannot afford it.
        ///
        /// DEFAULTS BY PROVIDER because `chat_template_kwargs` is a vLLM extension and OpenAI itself
        /// REJECTS unknown body parameters with a 400. So it is sent for any non-OpenAI endpoint and
        /// withheld for OpenAI's, and `OpenAI:DisableThinking` overrides either way.
        /// </summary>
        public static bool DisableThinking(IConfiguration configuration)
        {
            var configured = configuration.GetValue<bool?>("OpenAI:DisableThinking");

            return configured ?? !BaseUrl(configuration)
                .Contains("api.openai.com", StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Adds the thinking flag to a request body when it applies. Mutates the payload so callers can
        /// build their body normally and then call this once, rather than each deciding for itself —
        /// a payload that forgot the flag would silently go back to returning null content.
        /// </summary>
        public static void ApplyThinkingFlag(IDictionary<string, object> payload, IConfiguration configuration)
        {
            if (DisableThinking(configuration))
            {
                payload["chat_template_kwargs"] = new { enable_thinking = false };
            }
        }

        /// <summary>
        /// One line naming the provider and model, and whether a key is present — never the key itself.
        /// Printed at startup because "AI calls fail in production" is otherwise very hard to tell apart
        /// from "the key was never set" or "the model does not exist on this provider".
        /// </summary>
        public static string Describe(IConfiguration configuration) =>
            $"provider={BaseUrl(configuration)} model={Model(configuration)} " +
            $"key={(string.IsNullOrWhiteSpace(configuration["OpenAI:ApiKey"]) ? "MISSING" : "set")}";
    }
}
