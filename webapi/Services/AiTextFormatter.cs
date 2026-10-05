using System.Text.RegularExpressions;

namespace webapi.Services
{
    /// <summary>
    /// Cleans model output before a student ever sees it.
    ///
    /// The tutor is instructed to write mathematics as plain text, but language models slip into
    /// LaTeX anyway. The chat window renders plain text, so an unsanitised "\( y = 2 + x \)" reaches
    /// the student with the delimiters showing as noise. Stripping them here guarantees the student
    /// sees "y = 2 + x" no matter what the model produced.
    ///
    /// This is deliberately a formatting-only transform: it removes notation, never mathematical
    /// content.
    /// </summary>
    public static class AiTextFormatter
    {
        /// <summary>LaTeX inline/display math delimiters: \( \) \[ \]</summary>
        private static readonly Regex LatexDelimiters =
            new(@"\\\(|\\\)|\\\[|\\\]", RegexOptions.Compiled);

        /// <summary>Dollar delimiters, single or double.</summary>
        private static readonly Regex DollarDelimiters =
            new(@"\${1,2}", RegexOptions.Compiled);

        /// <summary>
        /// LaTeX fractions, e.g. \frac{2x + 1}{3}. Exercises do contain fractional coefficients, so
        /// this matters: without conversion the student would see the raw \frac markup.
        /// </summary>
        private static readonly Regex LatexFraction =
            new(@"\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}", RegexOptions.Compiled);

        /// <summary>\left( / \right) and friends are LaTeX sizing hints with no textual meaning.</summary>
        private static readonly Regex LatexSizing =
            new(@"\\(left|right|big|Big|bigg|Bigg)\s*", RegexOptions.Compiled);

        /// <summary>\cdot and \times read better as a plain multiplication sign.</summary>
        private static readonly Regex LatexTimes =
            new(@"\\cdot|\\times", RegexOptions.Compiled);

        // Removing a delimiter inside brackets leaves "( y = 2 + x )" behind, so tidy that back up.
        private static readonly Regex SpaceAfterOpenParen = new(@"\(\s+", RegexOptions.Compiled);
        private static readonly Regex SpaceBeforeCloseParen = new(@"\s+\)", RegexOptions.Compiled);

        private static readonly Regex RunsOfSpaces = new(@"[ \t]{2,}", RegexOptions.Compiled);
        private static readonly Regex TrailingSpaces = new(@"[ \t]+(\r?\n)", RegexOptions.Compiled);

        // Removing a closing delimiter leaves "y = 5 ." behind, so close that gap as well.
        private static readonly Regex SpaceBeforePunctuation = new(@"\s+([.,;:!?])", RegexOptions.Compiled);

        /// <summary>
        /// Removes maths delimiters and the spacing artefacts they leave behind.
        /// Returns an empty string for null input; never throws.
        /// </summary>
        public static string StripMathDelimiters(string? text)
        {
            if (string.IsNullOrEmpty(text)) return string.Empty;

            var cleaned = LatexDelimiters.Replace(text, string.Empty);
            cleaned = DollarDelimiters.Replace(cleaned, string.Empty);
            cleaned = LatexSizing.Replace(cleaned, string.Empty);
            cleaned = LatexTimes.Replace(cleaned, "*");

            // Repeat a couple of times so a nested fraction such as \frac{\frac{1}{2}}{3} is also
            // flattened. The pattern cannot match braces nested more deeply than one level per pass.
            for (var pass = 0; pass < 3 && LatexFraction.IsMatch(cleaned); pass++)
            {
                cleaned = LatexFraction.Replace(cleaned, ConvertFraction);
            }

            cleaned = SpaceAfterOpenParen.Replace(cleaned, "(");
            cleaned = SpaceBeforeCloseParen.Replace(cleaned, ")");
            cleaned = SpaceBeforePunctuation.Replace(cleaned, "$1");
            cleaned = TrailingSpaces.Replace(cleaned, "$1");
            cleaned = RunsOfSpaces.Replace(cleaned, " ");

            return cleaned.Trim();
        }

        /// <summary>
        /// Turns \frac{A}{B} into the same inline "A/B" form the app already uses elsewhere
        /// (see equationToString in the frontend), adding brackets only where they change meaning.
        /// </summary>
        private static string ConvertFraction(Match match)
        {
            var numerator = match.Groups[1].Value.Trim();
            var denominator = match.Groups[2].Value.Trim();

            if (numerator.Length == 0 || denominator.Length == 0) return match.Value;

            var left = NeedsBrackets(numerator, "+-") ? $"({numerator})" : numerator;
            var right = NeedsBrackets(denominator, "+-*/") ? $"({denominator})" : denominator;

            return $"{left}/{right}";
        }

        /// <summary>
        /// A leading sign on its own does not make brackets necessary: "-2/3" reads fine, whereas
        /// "(2x+1)/3" must keep them because 2x+1/3 would mean something else.
        /// </summary>
        private static bool NeedsBrackets(string value, string operators)
        {
            var body = value.Length > 0 && (value[0] == '-' || value[0] == '+') ? value[1..] : value;
            return body.IndexOfAny(operators.ToCharArray()) >= 0;
        }
    }
}
