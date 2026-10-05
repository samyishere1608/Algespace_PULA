using webapi.Models.Analytics;

namespace webapi.Services
{
    /// <summary>
    /// Decides whether a reflection answer is about the exercise at all.
    ///
    /// Why this exists: the reflection prompt already tells the model to treat nonsense as
    /// off-topic, but in practice an unrelated word ("burger") still came back praised as a good
    /// answer and earned Insight XP. So this is the deterministic backstop, and it runs BEFORE the
    /// model is called — junk is never graded in the first place, and the student is asked to write
    /// the reflection again instead.
    ///
    /// Deliberately conservative. A false positive silently discards a real reflection, which is the
    /// worst failure this feature could have, so the rule is "flag only when there is NO signal of
    /// relevance at all", never "flag when a signal is missing". A single digit, a single feeling
    /// word ("it was hard"), or any domain vocabulary is enough to pass.
    ///
    /// Short answers a human would accept are therefore safe: "hard", "it was easy", "I found it
    /// tricky" and "難しかった" all pass.
    /// </summary>
    public static class OffTopicDetector
    {
        /// <summary>
        /// Below this there is not enough text to judge anything. Counted in characters rather than
        /// words so the threshold means the same thing in English, German and Japanese.
        /// </summary>
        private const int MinCharacters = 3;

        /// <summary>Any of these appearing is treated as evidence the answer is on-topic.</summary>
        private static readonly string[] ReflectionVocabulary =
        {
            // English
            "think", "thought", "felt", "feel", "learn", "underst", "notic", "improv", "better",
            "worse", "confiden", "guess", "tried", "attempt", "step", "solv", "answer", "result",
            "math", "method", "mistake", "hint", "realis", "realiz", "confus", "rememb", "forgot",
            "sure", "clear", "know", "ok", "right", "wrong", "hard", "easy",
            // German
            "denk", "fand", "fühl", "fuhl", "gelernt", "lern", "versteh", "bemerkt", "besser",
            "schlecht", "sicher", "versucht", "schritt", "lösung", "losung", "ergebnis", "aufgabe",
            "falsch", "richtig", "fehler", "hinweis", "erkannt", "verwirrt", "erinner", "vergess",
            "übung", "ubung",
            // Japanese
            "思", "感", "分か", "わか", "理解", "気づ", "上達", "苦手", "自信", "試し", "ステップ",
            "解", "答え", "結果", "数学", "方法", "問題", "間違", "正し", "ヒント", "混乱", "覚え", "忘",
            // Conjugated difficulty/ease forms, matched as stems because Japanese inflects. These are
            // needed here even though the extractor has affect markers, because those hold dictionary
            // forms ("難しい") which do not substring-match what students write ("難しかった"). The
            // gate must not reject a valid answer just because the extractor's vocabulary is narrower
            // than the language.
            "難", "簡", "大変", "つら", "嫌", "楽",
        };

        private static readonly char[] MathSymbols = { '+', '-', '*', '/', '=', '^', '<', '>' };

        /// <summary>
        /// True when the answer carries no signal of relevance to the exercise whatsoever.
        ///
        /// <paramref name="features"/> is optional on purpose: when the NLP flag is off it is null
        /// and the check degrades to the text-only signals (digits, symbols, vocabulary) rather than
        /// being skipped. The gate is about safety, so it must not depend on a feedback flag.
        /// </summary>
        public static bool IsOffTopic(string? text, NlpFeatures? features)
        {
            if (string.IsNullOrWhiteSpace(text)) return true;

            var raw = text.Trim();
            var length = features?.CharacterCount ?? raw.Length;
            if (length < MinCharacters) return true;

            // ── Evidence that the answer IS about the work. Any one is enough to pass. ──
            if (raw.Any(char.IsDigit)) return false;
            if (raw.Any(c => MathSymbols.Contains(c))) return false;

            if (features is not null)
            {
                if (features.HasDomainTerm || features.MentionsMethod || features.MethodsMentioned.Count > 0)
                    return false;

                // Hedging, a reason, or any expression of how it felt all count as engagement.
                if (features.AffectMarkers.Count > 0) return false;
                if (features.UncertaintyMarkers.Count > 0) return false;
                if (features.ReasoningMarkers.Count > 0) return false;
            }

            var lower = raw.ToLowerInvariant();
            if (ReflectionVocabulary.Any(w => lower.Contains(w, StringComparison.Ordinal))) return false;

            return true;
        }

        /// <summary>
        /// The message shown when an answer is rejected. Student-facing prose, so it follows the
        /// language of the answer being rejected.
        ///
        /// This is the one place the reflection flow is allowed to ask the student something, since
        /// the whole point is to invite a rewrite. The "never ask a follow-up question" rule governs
        /// the model's feedback, not this system string.
        /// </summary>
        public static string RetryMessage(string? language)
        {
            var tag = language?.Trim().ToLowerInvariant() ?? string.Empty;

            if (tag.StartsWith("de", StringComparison.Ordinal))
            {
                return "Hmm, das schien nichts mit der Übung zu tun zu haben, die du gerade gemacht hast. "
                     + "Magst du es noch einmal versuchen und mir schreiben, wie es gelaufen ist — "
                     + "was war knifflig, oder was war leicht?";
            }

            if (tag.StartsWith("ja", StringComparison.Ordinal))
            {
                return "うーん、今やった練習とは関係なさそうでした。もう一度書いてもらえますか？"
                     + "どこが難しかったか、どこが簡単だったかを教えてください。";
            }

            return "Hmm, that didn't seem to be about the exercise you just did. "
                 + "Could you have another go and tell me how it went — what was tricky, or what felt easy?";
        }
    }
}
