using System.Text.RegularExpressions;
using webapi.Models.Analytics;

namespace webapi.Services
{
    /// <summary>
    /// Decides whether a reflection answer is about the exercise at all.
    ///
    /// Why this exists: the reflection prompt already tells the model to treat nonsense as
    /// off-topic, but in practice an unrelated word ("burger") still came back praised as a good
    /// answer and earned Insight XP. So this is the deterministic backstop, and it runs BEFORE the
    /// model is called, so the obvious junk is never graded and the student is asked to write the
    /// reflection again instead.
    ///
    /// IT IS THE FIRST OF TWO GATES, AND THE WEAKER ONE. The model has its own off-topic check, and
    /// that is where anything subtle belongs. This one only has to catch what is obviously not an
    /// answer, which is why it is built to under-reach: a false positive here silently discards a
    /// real reflection and tells the student their work was irrelevant, which is a worse outcome than
    /// letting a clever non-answer through to be judged by the model.
    ///
    /// So it is NOT "flag when a signal is missing". That is what it used to be, and it threw away
    /// answers like "I wrote out why I moved the x term first" — a full sentence about the algebra,
    /// which mentions none of the words on the vocabulary list and no operator symbol. Three passes,
    /// cheapest first:
    ///
    ///   1. A sentence is never junk. Anything of ordinary length is accepted outright, whatever it
    ///      says, and the model decides whether it is any good.
    ///   2. A single variable letter is a maths signal. The old symbol set held only operators, so a
    ///      bare "x" — the most common thing in an algebra reflection — counted for nothing.
    ///   3. Only then does the vocabulary get a say, and only to ACCEPT.
    /// </summary>
    public static class OffTopicDetector
    {
        /// <summary>
        /// Below this there is not enough text to judge anything. Counted in characters rather than
        /// words so the threshold means the same thing in English, German and Japanese.
        /// </summary>
        private const int MinCharacters = 3;

        /// <summary>
        /// At or above this length the answer is accepted without looking at it.
        ///
        /// This is the pass that does the real work. Junk arrives as a word or two; a reflection
        /// arrives as a sentence. Japanese is counted in characters because it has no spaces, and the
        /// two thresholds are set so both mean roughly "this is a sentence".
        /// </summary>
        private const int SentenceWords = 3;
        private const int SentenceCharacters = 12;

        /// <summary>A lone variable letter, as its own word. "x" is a signal; "exercise" is not.</summary>
        private static readonly Regex VariableLetter = new(@"\b[xXyYzZ]\b", RegexOptions.Compiled);

        /// <summary>Any of these appearing is treated as evidence the answer is on-topic.</summary>
        private static readonly string[] ReflectionVocabulary =
        {
            // English
            "think", "thought", "felt", "feel", "learn", "underst", "notic", "improv", "better",
            "worse", "confiden", "guess", "tried", "attempt", "step", "solv", "answer", "result",
            "math", "method", "mistake", "hint", "realis", "realiz", "confus", "rememb", "forgot",
            "sure", "clear", "know", "ok", "right", "wrong", "hard", "easy",
            // English, added after the gate discarded "I wrote out why I moved the x term first": words
            // that describe doing the work without naming a method or a feeling. "why" and "how" carry
            // most of the weight here, because explaining a step is how a student answers these.
            "why", "how", "term", "equation", "number", "wrote", "work", "part", "first", "second",
            "instead", "start", "chang", "move", "went", "took", "got", "did", "made",
            // German
            "denk", "fand", "fühl", "fuhl", "gelernt", "lern", "versteh", "bemerkt", "besser",
            "schlecht", "sicher", "versucht", "schritt", "lösung", "losung", "ergebnis", "aufgabe",
            "falsch", "richtig", "fehler", "hinweis", "erkannt", "verwirrt", "erinner", "vergess",
            "übung", "ubung",
            // German, same reason as the English additions above.
            "warum", "wieso", "wie", "term", "gleichung", "zahl", "geschrieben", "gearbeitet",
            "teil", "erst", "zweit", "statt", "anfang", "geänder", "geander", "verschoben",
            "gegangen", "gemacht", "genommen",
            // German difficulty and ease. "es war schwer" is three words and carries no domain word,
            // so without these the gate discarded it. "schwer" in particular was a plain omission:
            // the list had "schlecht" and "sicher" but not the most common word for "hard".
            "schwer", "schwierig", "leicht", "einfach", "kompliziert", "schaff", "geklappt",
            "geholfen", "verstanden", "gelöst", "gelost", "gemerkt", "gedauert", "gekriegt",
            // Japanese
            "思", "感", "分か", "わか", "理解", "気づ", "上達", "苦手", "自信", "試し", "ステップ",
            "解", "答え", "結果", "数学", "方法", "問題", "間違", "正し", "ヒント", "混乱", "覚え", "忘",
            // Conjugated difficulty/ease forms, matched as stems because Japanese inflects. These are
            // needed here even though the extractor has affect markers, because those hold dictionary
            // forms ("難しい") which do not substring-match what students write ("難しかった"). The
            // gate must not reject a valid answer just because the extractor's vocabulary is narrower
            // than the language.
            "難", "簡", "大変", "つら", "嫌", "楽",
            // Japanese, same reason as the English and German additions above.
            "なぜ", "どう", "式", "項", "数字", "書い", "進め", "部分", "最初", "次", "代わり",
            "変え", "動か", "やり", "使っ",
            // Japanese difficulty and ease in HIRAGANA. The entries above are kanji ("難"), and a
            // student writing "むずかしかった" uses none of them, so the most ordinary way to say
            // "it was hard" in Japanese was being rejected as irrelevant.
            "むずかし", "むつかし", "やさし", "かんたん", "できない", "できなか", "できた", "むり",
            "とけな", "とけた", "まよっ", "つまづ", "なやん",
        };

        private static readonly char[] MathSymbols = { '+', '-', '*', '/', '=', '^', '<', '>' };

        /// <summary>
        /// True when the answer carries no signal of relevance to the exercise whatsoever.
        ///
        /// <paramref name="features"/> is optional on purpose: when the NLP flag is off it is null
        /// and the check degrades to the text-only signals rather than being skipped. The gate is
        /// about safety, so it must not depend on a feedback flag.
        /// </summary>
        public static bool IsOffTopic(string? text, NlpFeatures? features)
        {
            if (string.IsNullOrWhiteSpace(text)) return true;

            var raw = text.Trim();
            var characters = features?.CharacterCount ?? raw.Length;

            // ── 1. A sentence is an answer. Accepted without reading it. ──
            // Japanese is tokenised per character (no word segmentation), so its length is compared in
            // characters rather than words or the check would never fire for it.
            var perCharacter = features?.TokenUnit == "character";
            if (perCharacter ? characters >= SentenceCharacters : WordCount(raw) >= SentenceWords)
                return false;

            // ── 2. Evidence that the answer is about the work. Any one is enough. ──
            // THESE COME BEFORE THE MINIMUM LENGTH, not after. "x" is one character and "7" is one
            // character, and neither is junk: putting the length guard first meant a student answering a
            // numeric question with the number was told their answer was about something else.
            if (raw.Any(char.IsDigit)) return false;
            if (raw.Any(c => MathSymbols.Contains(c))) return false;
            if (VariableLetter.IsMatch(raw)) return false;

            if (features is not null)
            {
                if (features.HasDomainTerm || features.MentionsMethod || features.MethodsMentioned.Count > 0)
                    return false;

                // Hedging, a reason, or any expression of how it felt all count as engagement.
                if (features.AffectMarkers.Count > 0) return false;
                if (features.UncertaintyMarkers.Count > 0) return false;
                if (features.ReasoningMarkers.Count > 0) return false;
            }

            // ── 3. Too short to be an answer, and nothing above recognised it. ──
            if (characters < MinCharacters) return true;

            // ── 4. The vocabulary, used only to accept. ──
            var lower = raw.ToLowerInvariant();
            if (ReflectionVocabulary.Any(w => lower.Contains(w, StringComparison.Ordinal))) return false;

            return true;
        }

        /// <summary>Words, counted by whitespace. Japanese never reaches this path.</summary>
        private static int WordCount(string text) =>
            text.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).Length;

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
