using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using webapi.Models.Analytics;
using webapi.Models.Chat;
using webapi.Models.Database;
using webapi.Models.User;
using webapi.Services;

namespace webapi.Controllers
{
    [ApiController]
    [Route("chat")]
    public class ChatController(
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        ICurriculumContextService curriculumContextService,
        IAnswerLeakGuard answerLeakGuard) : ControllerBase
    {
        private readonly IConfiguration _configuration = configuration;
        private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;
        private readonly ICurriculumContextService _curriculumContextService = curriculumContextService;
        private readonly IAnswerLeakGuard _answerLeakGuard = answerLeakGuard;

        // Kept short to minimise token usage on free tier
        private static string BuildSystemPrompt(string buddyName, string language)
        {
            var langInstruction = language switch
            {
                "de" => "IMPORTANT: You must respond ONLY in German (Deutsch). Never switch to another language.",
                "ja" => "IMPORTANT: You must respond ONLY in Japanese (日本語). Never switch to another language.",
                _    => "Respond in English."
            };
            return $"You are {buddyName}, a friendly AI tutor in AlgeSpace helping high-school students solve systems of linear equations. " +
                   "The student is meant to work it out themselves, so the ONE thing you must never do is give the answer away: never state the values of the variables (for example never write \"x = 4\"), and never say which method is correct. " +
                   "Everything else is allowed and encouraged — explain ideas in simpler words, use an everyday analogy or a short story, walk through the method step by step, and show a worked example as long as you use DIFFERENT numbers from this exercise. " +
                   "If the student asks you to explain differently, simplify it, or give an example, do exactly that; that is what you are here for. " +
                   "Keep replies short (2-4 sentences) and discuss only the step the student is on right now — do not describe later steps. " +
                   "FORMATTING: write all mathematics as plain text, for example: y = 2 + x or 2x + y = 5. " +
                   "Write fractions inline with a slash, for example 1/2x + y = 5 or (2x + 1)/3 = 4, using brackets where they are needed to keep the meaning clear. " +
                   "Do NOT use LaTeX or any markup, and never surround mathematics with backslash-bracket or dollar-sign delimiters. " +
                   "Be warm and encouraging. Ignore off-topic questions politely. " +
                   "If authored lesson content is supplied, keep your terminology consistent with it, but never quote it back or reveal it wholesale. " +
                   langInstruction;
        }

        [HttpPost("flexibility")]
        public async Task<ActionResult<FlexibilityChatResponse>> Chat([FromBody] FlexibilityChatRequest request)
        {
            var apiKey = _configuration["OpenAI:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
                return StatusCode(503, "AI chat is not configured.");

            // Keep last 4 history turns max to stay lean on tokens
            var trimmedHistory = request.History.Count > 4
                ? request.History.Skip(request.History.Count - 4).ToList()
                : request.History;

            var messages = new List<object>
            {
                new { role = "system", content = BuildSystemPrompt(request.BuddyName, request.Language) }
            };

            // Add conversation history (Gemini's "model" maps to OpenAI's "assistant")
            foreach (var msg in trimmedHistory)
            {
                messages.Add(new
                {
                    role = msg.Role == "model" ? "assistant" : "user",
                    content = msg.Text
                });
            }

            // Add the new student message, with the exercise context and — when enabled — the
            // authored lesson content for this exercise prepended once.
            var grounding = _configuration.GetValue("AiFeatures:CurriculumGrounding", false)
                ? _curriculumContextService.GetGroundingBlock(
                    request.ExerciseType, request.ExerciseId, request.ExercisePhase, ResolveLanguage(request.Language))
                : string.Empty;

            var userText = string.IsNullOrWhiteSpace(grounding)
                ? $"[Context: {request.ExerciseContext}]\n\nStudent: {request.UserMessage}"
                : $"[Context: {request.ExerciseContext}]\n\n{grounding}\nStudent: {request.UserMessage}";

            if (!string.IsNullOrWhiteSpace(grounding))
            {
                Console.WriteLine(
                    $"[Chat] Curriculum grounding applied — type={request.ExerciseType}, " +
                    $"id={request.ExerciseId}, phase={request.ExercisePhase}, length={grounding.Length} chars");
            }

            messages.Add(new { role = "user", content = userText });

            var payload = new
            {
                model = "gpt-4o-mini",
                messages,
                temperature = 0.4,
                max_tokens = 200  // short hints only
            };

            var json = JsonSerializer.Serialize(payload);
            var httpClient = _httpClientFactory.CreateClient();
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            HttpResponseMessage response;
            try
            {
                response = await httpClient.PostAsync(
                    "https://api.openai.com/v1/chat/completions",
                    new StringContent(json, Encoding.UTF8, "application/json"));
            }
            catch (Exception ex)
            {
                return StatusCode(502, $"Failed to reach OpenAI API: {ex.Message}");
            }

            if (!response.IsSuccessStatusCode)
            {
                if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                    return StatusCode(429, "Pippin is a little overwhelmed right now! Please wait a few seconds and try again.");

                var error = await response.Content.ReadAsStringAsync();
                return StatusCode(502, $"OpenAI error: {error}");
            }

            var responseBody = await response.Content.ReadAsStringAsync();
            string reply;
            try
            {
                using var doc = JsonDocument.Parse(responseBody);
                reply = doc.RootElement
                    .GetProperty("choices")[0]
                    .GetProperty("message")
                    .GetProperty("content")
                    .GetString() ?? "I'm not sure how to answer that. Try rephrasing!";
            }
            catch
            {
                return StatusCode(502, "Unexpected response format from OpenAI.");
            }

            // Defensive: models add LaTeX delimiters even when told not to, and the chat window
            // renders plain text, so the delimiters would show up as noise to the student.
            var cleanedReply = AiTextFormatter.StripMathDelimiters(reply);
            if (!string.Equals(cleanedReply, reply, StringComparison.Ordinal))
            {
                Console.WriteLine("[Chat] Stripped maths delimiters from reply.");
            }

            // Last line of defence: never let the stated answer reach the student.
            var verdict = _answerLeakGuard.Inspect(cleanedReply, request.ExerciseType, request.ExerciseId);
            if (verdict.Leaked)
            {
                Console.WriteLine(
                    $"[Chat] Answer-leak guard fired — reply stated {verdict.Variable} = {verdict.Value} " +
                    $"(type={request.ExerciseType}, id={request.ExerciseId}). Requesting a rewrite.");

                // Swapping in a canned "let's keep going" throws the explanation away and leaves the
                // student with nothing, which is what made the tutor feel over-guarded. Ask for the
                // same idea with the answer removed instead; only use the canned message if that
                // fails or leaks again.
                var revised = await RewriteWithoutAnswer(httpClient, messages, cleanedReply);
                if (revised is not null
                    && !_answerLeakGuard.Inspect(revised, request.ExerciseType, request.ExerciseId).Leaked)
                {
                    cleanedReply = revised;
                    Console.WriteLine("[Chat] Rewrite accepted — the help was kept without the answer.");
                }
                else
                {
                    cleanedReply = _answerLeakGuard.Fallback(request.Language);
                    Console.WriteLine("[Chat] Rewrite unavailable or still leaking — using the safe fallback.");
                }
            }

            PersistTurns(request, cleanedReply, request.History.Count);

            return Ok(new FlexibilityChatResponse { Reply = cleanedReply });
        }

        /// <summary>
        /// One corrective retry, used when the tutor has already written the answer into its reply.
        ///
        /// The alternative — swapping in a generic "let's keep going" — throws the explanation away
        /// and leaves the student with nothing, which is what made the tutor feel over-guarded. Asking
        /// for the same idea with the values removed keeps it useful while still withholding the
        /// answer. Returns null if the retry fails or comes back empty, so the caller can fall back.
        /// </summary>
        private static async Task<string?> RewriteWithoutAnswer(
            HttpClient httpClient,
            List<object> messages,
            string offendingReply)
        {
            try
            {
                // The system prompt — including the language rule — is already in messages, so the
                // rewrite still comes back in the student's language.
                var correction = new List<object>(messages)
                {
                    new { role = "assistant", content = offendingReply },
                    new
                    {
                        role = "user",
                        content = "Your reply gave away the final values. Say the same thing again, but WITHOUT "
                                + "stating the values of the variables and without saying which method is correct. "
                                + "You may explain it more simply, use an analogy, or use an example with different "
                                + "numbers. Keep it to 2-3 sentences."
                    }
                };

                var payload = new
                {
                    model = "gpt-4o-mini",
                    messages = correction,
                    temperature = 0.4,
                    max_tokens = 200
                };

                var response = await httpClient.PostAsync(
                    "https://api.openai.com/v1/chat/completions",
                    new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));

                if (!response.IsSuccessStatusCode) return null;

                using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                var text = doc.RootElement
                    .GetProperty("choices")[0]
                    .GetProperty("message")
                    .GetProperty("content")
                    .GetString();

                return string.IsNullOrWhiteSpace(text) ? null : AiTextFormatter.StripMathDelimiters(text);
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// Maps the client's BCP-47 language tag onto the lesson-content language.
        ///
        /// Japanese matters here: the exercise deserializers serve Japanese self-explanation options,
        /// reasons, agent messages and tip questions (via ExerciseContentJapanese), so requesting ja
        /// keeps that authored Japanese.
        /// </summary>
        private static Language ResolveLanguage(string? language)
        {
            var tag = language?.Trim().ToLowerInvariant();
            if (string.IsNullOrEmpty(tag)) return Language.en;

            if (tag.StartsWith("de", StringComparison.Ordinal)) return Language.de;
            if (tag.StartsWith("ja", StringComparison.Ordinal)) return Language.ja;

            return Language.en;
        }

        // ── Analytics: transcript persistence ────────────────────────────────        //
        // Observational only. Runs after the reply has been produced and swallows all
        // failures, so a logging problem can never break or slow the student's chat.
        // Mirrors the existing ReflectionHistory pattern; nothing here feeds back into
        // what the tutor says.

        private static void PersistTurns(FlexibilityChatRequest request, string reply, int baseTurnIndex)
        {
            if (request.StudentId <= 0) return; // guest / unauthenticated session

            try
            {
                using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
                conn.Open();
                ChatTranscriptSettings.EnsureTable(conn);

                InsertTurn(conn, request, "user", request.UserMessage, baseTurnIndex);
                InsertTurn(conn, request, "pippin", reply, baseTurnIndex + 1);
            }
            catch
            {
                // Intentionally swallowed — logging must never affect the chat experience.
            }
        }

        private static void InsertTurn(
            SqliteConnection conn,
            FlexibilityChatRequest request,
            string role,
            string? text,
            int turnIndex)
        {
            if (string.IsNullOrWhiteSpace(text)) return;

            conn.Execute(
                $"INSERT INTO {ChatTranscriptSettings.Table} " +
                "(StudentId, Role, Text, TurnIndex, Language, BuddyName, ExerciseType, ExerciseId, ExercisePhase, ExerciseContext, CreatedAt) " +
                "VALUES (@StudentId, @Role, @Text, @TurnIndex, @Language, @BuddyName, @ExerciseType, @ExerciseId, @ExercisePhase, @ExerciseContext, @CreatedAt)",
                new
                {
                    StudentId = request.StudentId,
                    Role = role,
                    Text = text,
                    TurnIndex = turnIndex,
                    Language = request.Language ?? string.Empty,
                    BuddyName = request.BuddyName ?? string.Empty,
                    ExerciseType = request.ExerciseType ?? string.Empty,
                    ExerciseId = request.ExerciseId,
                    ExercisePhase = request.ExercisePhase ?? string.Empty,
                    ExerciseContext = request.ExerciseContext ?? string.Empty,
                    CreatedAt = ChatTranscriptSettings.NowStamp(),
                });
        }
    }
}

