using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using webapi.Models.Flexibility;
using webapi.Models.Math;
using webapi.Models.User;

namespace webapi.Services
{
    /// <summary>
    /// Outcome of inspecting a reply. <see cref="Variable"/> and <see cref="Value"/> are filled in
    /// only when a leak was found, purely so the caller can log what was caught.
    /// </summary>
    public sealed record LeakVerdict(bool Leaked, string? Variable = null, double? Value = null);

    /// <summary>
    /// Detects a reply that states the answer for a specific exercise.
    /// </summary>
    public interface IAnswerLeakGuard
    {
        /// <summary>
        /// Inspects a reply. Never throws.
        /// </summary>
        LeakVerdict Inspect(string? reply, string? exerciseType, long? exerciseId);

        /// <summary>
        /// The localised message used when a leak cannot be replaced with a useful rewrite.
        /// </summary>
        string Fallback(string? language);
    }

    /// <summary>
    /// Last line of defence against the tutor giving away the answer.
    ///
    /// It detects the shape a leak takes — a variable assigned a number, such as "x = 4" — and then
    /// compares that number against the exercise's real solution. Only a match counts as a leak.
    ///
    /// That comparison is the whole point. The earlier version fired on ANY stated value, which meant
    /// a perfectly good explanation ("imagine x = 7, then...") was thrown away even though it revealed
    /// nothing. Teaching with examples is exactly what the tutor is for, so the guard has to tell a
    /// worked example apart from the answer itself, and the stored solution is what makes that
    /// possible.
    ///
    /// When the solution is unknown (missing data, or a shape this can't read) the guard cannot tell
    /// the two apart, so it falls back to the conservative rule and treats any stated value as a leak.
    /// The failure mode is therefore "sometimes too strict", never "silently allows a leak".
    ///
    /// LIMITS, stated deliberately: this catches "x = 4" but not "the answer is 4" or "the two numbers
    /// are 4 and 1", and it cannot distinguish a hypothetical ("if x = 0") from a leak. It guards the
    /// most common failure, it is not a proof. That is why it complements careful prompting rather
    /// than replacing it.
    ///
    /// Always on by design: protective, deterministic, and cheap. Switching it off would only increase
    /// risk, so it is not behind a feature flag.
    /// </summary>
    public class AnswerLeakGuard(IFlexibilityExerciseService exerciseService) : IAnswerLeakGuard
    {
        private readonly IFlexibilityExerciseService _exerciseService = exerciseService;

        /// <summary>
        /// Two values count as the same solution when they agree to this many decimals. It is loose
        /// on purpose: a solution like 10/3 is often written as "3.33", and rejecting that would let a
        /// genuine leak through. It is far tighter than the gap between a solution and a typical
        /// made-up example number, so the two cases stay far apart.
        /// </summary>
        private const double SolutionTolerance = 0.005;

        public LeakVerdict Inspect(string? reply, string? exerciseType, long? exerciseId)
        {
            var text = reply ?? string.Empty;
            if (text.Length == 0) return new LeakVerdict(false);

            try
            {
                foreach (var (name, solution) in Variables(exerciseType, exerciseId))
                {
                    foreach (var stated in FindStatedValues(text, name))
                    {
                        // Precise rule: a stated value is a leak only when it IS the solution.
                        // An unreadable solution keeps the conservative rule — see the class comment.
                        if (solution is null || ValuesMatch(stated, solution.Value))
                            return new LeakVerdict(true, name, stated);

                        // A value that is not the solution is a worked example, which is exactly what
                        // the tutor is supposed to do, so it passes. Worth logging, because a guard
                        // that quietly allows things is hard to trust.
                        Console.WriteLine(
                            $"[Chat] Answer-leak guard: '{name} = {stated.ToString(CultureInfo.InvariantCulture)}' " +
                            $"ignored — the solution is {solution.Value.ToString(CultureInfo.InvariantCulture)} " +
                            "(treated as a worked example).");
                    }
                }
            }
            catch
            {
                // A guard failure must never break the chat, so no leak is reported.
            }

            return new LeakVerdict(false);
        }

        /// <summary>
        /// The replacement is student-facing prose, so it has to match the language of the reply it
        /// is standing in for.
        /// </summary>
        public string Fallback(string? language)
        {
            var tag = language?.Trim().ToLowerInvariant() ?? string.Empty;

            if (tag.StartsWith("de", StringComparison.Ordinal))
            {
                return "Machen wir weiter — arbeite den Schritt durch, an dem du gerade bist, "
                     + "und ich helfe dir, deinen Gedankengang zu prüfen.";
            }

            if (tag.StartsWith("ja", StringComparison.Ordinal))
            {
                return "そのまま進めましょう。今のステップを自分の式でやってみて、"
                     + "考えを一緒に確認しましょう。";
            }

            return "Let's keep going — work through the step you're on, and I'll help you check your thinking.";
        }

        // ── Internals ────────────────────────────────────────────────────────

        /// <summary>
        /// Variable names paired with their solution, or a null solution when the value could not be
        /// read. Language is irrelevant here — only names and values are needed — so English is
        /// requested to keep the lookup single-path.
        /// </summary>
        private List<(string Name, double? Solution)> Variables(string? exerciseType, long? exerciseId)
        {
            if (string.IsNullOrWhiteSpace(exerciseType) || exerciseId is null || exerciseId <= 0)
                return [];

            var id = exerciseId.Value;
            var variables = new List<(string, double?)>();

            switch (exerciseType.Trim().ToLowerInvariant())
            {
                case "suitability":
                    var suitability = _exerciseService.GetSuitabilityExerciseById(id, Language.en);
                    if (suitability is not null)
                        Add(variables, suitability.FirstVariable, suitability.SecondVariable);
                    break;

                case "efficiency":
                    var efficiency = _exerciseService.GetEfficiencyExerciseById(id, Language.en);
                    if (efficiency is not null)
                        Add(variables, efficiency.FirstVariable, efficiency.SecondVariable);
                    break;

                case "matching":
                    var matching = _exerciseService.GetMatchingExerciseById(id, Language.en);
                    if (matching is not null)
                        Add(variables, matching.FirstVariable, matching.SecondVariable);
                    break;
            }

            return variables;
        }

        private static void Add(List<(string Name, double? Solution)> target, Variable? first, Variable? second)
        {
            foreach (var variable in new[] { first, second })
            {
                if (variable is null || string.IsNullOrWhiteSpace(variable.Name)) continue;
                if (target.Any(v => string.Equals(v.Name, variable.Name, StringComparison.OrdinalIgnoreCase)))
                    continue;

                target.Add((variable.Name, TryAsNumber(variable.Value)));
            }
        }

        /// <summary>
        /// Every value the reply states for a variable, in order of appearance.
        ///
        /// Matches "x = 4", "x = -2", "x = 1.5", "x = 1/2" and the German "x = 1,5", in any casing.
        ///
        /// The lookbehind rejects a preceding letter or digit, because "2x = 4" is an equation the
        /// student is working with, not a statement that x equals 4 — without that, every coefficient
        /// form would trip the guard.
        ///
        /// ALL mentions are returned, not just the first. A reply can use a made-up number in an
        /// example and still state the real answer further down the sentence, and stopping at the
        /// first match would let that leak straight through.
        /// </summary>
        private static IEnumerable<double> FindStatedValues(string text, string variable)
        {
            var pattern =
                @"(?<![\p{L}\d])" + Regex.Escape(variable) + @"\s*=\s*" +
                @"(?<val>[+\-]?\d+(?:[.,]\d+)?(?:\s*/\s*[+\-]?\d+)?)(?![\d\p{L}])";

            foreach (Match match in Regex.Matches(text, pattern, RegexOptions.IgnoreCase))
            {
                if (TryParseNumber(match.Groups["val"].Value, out var value)) yield return value;
            }
        }

        private static bool ValuesMatch(double a, double b) => Math.Abs(a - b) <= SolutionTolerance;

        /// <summary>Reads a solution coefficient, which may be an int, a double, or a fraction string.</summary>
        private static double? TryAsNumber(Coefficient? coefficient)
        {
            if (coefficient is null) return null;

            object? raw = coefficient.Value;
            if (raw is null) return null;

            // Exercises read back from the database hold their coefficients as JsonElement, not as
            // plain numbers: Coefficient.Value is dynamic, so System.Text.Json materialises it that
            // way. Convert.ToDouble throws on a JsonElement, which silently pushed every comparison
            // into the conservative branch and made the guard block ordinary worked examples again.
            //
            // The text form is the one representation every source agrees on, so read that and parse
            // it. That covers 4, 2.5, "1/2", "13/3" and "-1/6" alike.
            var text = raw switch
            {
                string value => value,
                JsonElement element => element.ToString(),
                _ => Convert.ToString(raw, CultureInfo.InvariantCulture),
            };

            return text is not null && TryParseNumber(text, out var parsed) ? parsed : null;
        }

        /// <summary>Parses a plain number or a fraction such as "1/2", "-1/6" or "10/3".</summary>
        private static bool TryParseNumber(string raw, out double value)
        {
            value = 0;

            // A comma is the decimal separator in German, so "1,5" means 1.5.
            var text = raw.Trim().Replace(',', '.');

            var slash = text.IndexOf('/');
            if (slash > 0)
            {
                if (double.TryParse(text[..slash], NumberStyles.Any, CultureInfo.InvariantCulture, out var numerator) &&
                    double.TryParse(text[(slash + 1)..], NumberStyles.Any, CultureInfo.InvariantCulture, out var denominator) &&
                    denominator != 0)
                {
                    value = numerator / denominator;
                    return true;
                }

                return false;
            }

            return double.TryParse(text, NumberStyles.Any, CultureInfo.InvariantCulture, out value);
        }
    }
}
