using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using webapi.Models.Chat;

namespace webapi.Controllers
{
    [ApiController]
    [Route("chat")]
    public class ChatController(IConfiguration configuration, IHttpClientFactory httpClientFactory) : ControllerBase
    {
        private readonly IConfiguration _configuration = configuration;
        private readonly IHttpClientFactory _httpClientFactory = httpClientFactory;

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
                   "Rules: NEVER give the full answer — only short hints (2-3 sentences) for the next step. " +
                   "Be warm and encouraging. Ignore off-topic questions politely. " +
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

            // Add the new student message (with exercise context prepended once)
            var userText = $"[Context: {request.ExerciseContext}]\n\nStudent: {request.UserMessage}";
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

            return Ok(new FlexibilityChatResponse { Reply = reply });
        }
    }
}

