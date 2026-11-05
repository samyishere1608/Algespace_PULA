using System.Text.RegularExpressions;

namespace webapi.Services
{
    /// <summary>
    /// Decides whether what a student typed into a reflection box is an answer at all.
    ///
    /// WHY THIS EXISTS. A written answer is judged by the model, and the model is accommodating: asked
    /// whether "aaaaaaa" confirmed anything about an Efficiency exercise, it answered that it did and
    /// the student was paid for it. Anything at all could earn Insight that way, which makes the award
    /// mean nothing and teaches that filling the box is the point. The judge is also a full provider
    /// round trip, and spending one on a keyboard mash makes the real answers wait longer.
    ///
    /// WHAT IT IS NOT. It is not a grader and not a language checker. It never looks at spelling,
    /// grammar, length beyond "is there a word here at all", or whether the answer is *right* — a
    /// student writing something vague, mistaken or off-topic is making a real attempt and the judge
    /// handles them. This only catches text that no reader could take for an answer: a held-down key,
    /// a keyboard mash, or an attempt to address the system instead of answering.
    ///
    /// Deliberately conservative. Every rule here is one a genuine answer cannot trip, because the
    /// cost of a false positive is a child's honest sentence being thrown away.
    /// </summary>
    public static class FreeTextGuard
    {
        /// <summary>Why this is not an answer, or null when it is one.</summary>
        public static string? WhyNotAnAnswer(string? text)
        {
            var trimmed = (text ?? "").Trim();
            if (trimmed.Length == 0) return "empty";

            // One character is not a sentence in any of the three languages this ships in, and it is
            // what a mis-tap produces.
            if (trimmed.Length < 2) return "too-short";

            if (!trimmed.Any(char.IsLetter)) return "no-words";

            // A held-down key: the same character four times in a row. Three is allowed, because "sooo",
            // "はーい" and "okkk" are things children write.
            if (Regex.IsMatch(trimmed, @"(.)\1{3,}", RegexOptions.None, TimeSpan.FromMilliseconds(50)))
                return "gibberish";

            // A keyboard mash: one run of Latin letters with almost no variety in it. "asfasfa" is seven
            // letters drawn from three; "explained" is nine drawn from seven, and "hmmm" is four drawn
            // from two but too short for this rule to reach.
            var tokens = Regex.Matches(trimmed, @"[A-Za-z]{6,}");
            foreach (Match token in tokens)
            {
                var word = token.Value.ToLowerInvariant();
                var distinct = word.Distinct().Count();
                if (distinct * 2 < word.Length) return "gibberish";

                // …or almost no vowels, which is what the middle row of a keyboard looks like. Eight
                // letters is the floor: real short words ("rhythm", "myths") are not answers on their
                // own, and a longer word with no vowel at all is not one either.
                var vowels = word.Count(c => "aeiouy".Contains(c));
                if (word.Length >= 8 && vowels * 6 < word.Length) return "gibberish";
            }

            // Asking the system for something instead of answering. The judge is already told to treat
            // the answer as data, so this is not the only defence — but a reply written to a prompt like
            // this one is not a reflection, and it should not be paid for either.
            foreach (var pattern in InstructionPatterns)
            {
                if (Regex.IsMatch(trimmed, pattern, RegexOptions.IgnoreCase, TimeSpan.FromMilliseconds(50)))
                    return "instruction";
            }

            return null;
        }

        /// <summary>
        /// The shapes that mean "I am talking to the software, not answering the question".
        ///
        /// Kept short and unmistakable. A twelve-year-old reflecting on an exercise has no reason to
        /// write any of these about their own work, so the risk of catching an honest sentence is
        /// close to zero — which is what makes them safe to act on.
        /// </summary>
        private static readonly string[] InstructionPatterns =
        [
            @"ignore\s+(all\s+)?(the\s+)?(previous|above|prior|earlier)",
            @"disregard\s+(all\s+)?(the\s+)?(previous|above|instructions)",
            @"system\s*prompt",
            @"you\s+are\s+now\s+(a|an|the)\b",
            @"as\s+an\s+ai\b",
            @"\bjailbreak\b",
            @"(give|award|grant)\s+me\s+(\d+\s*)?(xp|points?|insight|resolve|choice)",
            @"increase\s+my\s+(xp|score|points)",
            @"指示を無視",
            @"システムプロンプト",
            @"あなたは今(から)?",
            @"すべて忘れて",
            @"(ポイント|XP|経験値|点数)(を|も)(くれ|ください|上げ)",
        ];
    }
}
