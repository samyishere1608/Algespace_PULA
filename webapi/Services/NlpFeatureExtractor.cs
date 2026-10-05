using System.Text;
using System.Text.RegularExpressions;
using webapi.Models.Analytics;

namespace webapi.Services
{
    /// <summary>
    /// Deterministic, LLM-free feature extraction over student free text (reflections, chat).
    ///
    /// Design notes
    /// - Pure function: no I/O, no database access, no LLM calls. Cheap enough to run inline.
    /// - Fully reproducible, so the same output can serve offline research analysis and online
    ///   prompt construction without changing model behaviour between the two.
    /// - Lexicons are curated by hand. The matched terms are returned so every extraction is
    ///   auditable rather than taken on trust.
    /// - Latin terms get a conservative typo-tolerant fallback (edit distance 1-2), because real
    ///   student text is heavily misspelled. Multi-word phrases and short terms stay exact.
    /// - Japanese is not word-segmented (no morphological analyser is bundled), so its records are
    ///   tokenised per character and stamped with TokenUnit = "character". Phrase matching is
    ///   substring-based for Japanese because CJK has no word boundaries, and Japanese lexicons
    ///   therefore favour precision over recall. Character-based and word-based measures must never
    ///   be pooled in analysis.
    /// </summary>
    public static class NlpFeatureExtractor
    {
        /// <summary>
        /// Bump whenever lexicons or matching rules change, so previously stored feature rows
        /// remain attributable to the exact extractor version that produced them.
        /// </summary>
        public const string Version = "nlp-v4";

        private static readonly Regex JapaneseRegex =
            new(@"[\p{IsHiragana}\p{IsKatakana}\p{IsCJKUnifiedIdeographs}]", RegexOptions.Compiled);

        private static readonly Regex GermanCharRegex =
            new(@"[äöüß]", RegexOptions.Compiled | RegexOptions.IgnoreCase);

        private static readonly Regex LetterRunRegex = new(@"\p{L}+", RegexOptions.Compiled);

        // ── Lexicons ─────────────────────────────────────────────────────────────

        /// <summary>Canonical method name → surface forms across EN / DE / JA.</summary>
        private static readonly Dictionary<string, string[]> MethodLexicon = new(StringComparer.Ordinal)
        {
            ["Elimination"] =
            [
                "elimination", "eliminate", "eliminating",
                "eliminieren", "eliminiere", "eliminiert", "eliminierung",
                "additionsverfahren", "eliminationsverfahren",
                "加減法", "消去法", "消去",
            ],
            ["Substitution"] =
            [
                "substitution", "substitute", "substituting",
                "einsetzen", "einsetze", "einsetzt", "einsetzungsverfahren",
                "代入法", "代入",
            ],
            ["Equalization"] =
            [
                "equalization", "equalisation", "equalize", "equalise",
                "gleichsetzen", "gleichsetze", "gleichsetzt", "gleichsetzungsverfahren",
                "等置法", "等置",
            ],
        };

        private static readonly string[] ReasoningMarkers =
        [
            "because", "therefore", "since", "thus", "hence", "thats why", "that's why", "the reason",
            "weil", "deshalb", "darum", "daher", "denn", "deswegen", "aus diesem grund",
            // NOTE: bare "から" is deliberately excluded — it is far more often the postposition
            // "from" than the causal connective, so it produced mostly false positives.
            "ので", "だから", "なぜなら", "理由",
        ];

        private static readonly string[] UncertaintyMarkers =
        [
            "i think", "i guess", "maybe", "not sure", "unsure", "don't know", "dont know",
            "no idea", "confused", "probably",
            "ich glaube", "ich denke", "vielleicht", "nicht sicher", "weiss nicht", "weiß nicht",
            "keine ahnung", "verwirrt", "unsicher",
            "たぶん", "わからない", "分からない", "自信がない", "かもしれない",
        ];

        /// <summary>
        /// Affective / evaluative words: difficulty ("hard", "tough"), ease ("easy", "simple") and
        /// overall appraisal ("good", "fine", "okay").
        ///
        /// Inspecting real reflections showed the original difficulty-only list missed most of what
        /// students actually wrote — nearly every answer contains some evaluation, so this set is
        /// deliberately broad. Note that it therefore conflates difficulty perception with general
        /// satisfaction; split it if those need to be measured separately.
        /// </summary>
        private static readonly string[] AffectMarkers =
        [
            // English
            "hard", "difficult", "easy", "simple", "tough", "challenging",
            "frustrating", "frustrated", "stuck", "struggle", "hate", "enjoy", "makes sense",
            "get it", "confusing", "annoying", "good", "fine", "okay", "ok", "nice", "great",
            "bad", "poor", "smooth", "confident",
            // German
            "schwer", "schwierig", "einfach", "leicht", "herausfordernd", "frustriert",
            "frustrierend", "verstehe", "verstanden", "schaffe", "hasse", "gefällt", "verwirrend",
            "anstrengend", "gut", "schlecht", "toll", "super", "schlimm",
            // Japanese
            "難しい", "簡単", "わかる", "分かる", "苦手", "嫌い", "楽しい", "つらい", "大変",
            "いい", "良い", "悪い",
        ];

        /// <summary>Math vocabulary beyond method names.</summary>
        private static readonly string[] MathLexicon =
        [
            "equation", "equations", "variable", "variables", "solve", "solving", "linear", "unknown",
            "gleichung", "gleichungen", "variablen", "lösen", "lösung", "unbekannte",
            "方程式", "変数", "解く", "連立",
        ];

        // Stopwords exist only to decide whether a short answer is English or German. The original
        // 20-word lists left ~15% of real answers labelled "unknown" (e.g. "dont know you tell me"
        // scored zero), so these lists are intentionally long. Words that occur in BOTH languages
        // ("in", "was", "man", "an", "am", "so") appear in both lists so they cancel out rather than
        // biasing the result.
        private static readonly HashSet<string> GermanStopwords = new(StringComparer.Ordinal)
        {
            "der", "die", "das", "ich", "nicht", "und", "ist", "weil", "mit", "habe",
            "wenn", "aber", "auch", "dass", "mich", "man", "für", "wir", "sind", "wird",
            "es", "zu", "im", "den", "dem", "ein", "eine", "einen", "auf", "als",
            "nur", "noch", "schon", "kann", "muss", "du", "er", "sie", "ihr", "uns",
            "hat", "hatte", "beim", "vom", "zum", "zur", "über", "unter", "vor", "nach",
            "bei", "aus", "wie", "was", "wer", "wo", "mein", "meine", "sehr", "immer",
            "oft", "dann", "doch", "mal", "in", "an", "am", "so",
        };

        private static readonly HashSet<string> EnglishStopwords = new(StringComparer.Ordinal)
        {
            "the", "i", "is", "and", "not", "because", "with", "have", "when", "but",
            "this", "that", "it", "my", "we", "are", "was", "for", "of", "to",
            "you", "me", "your", "will", "would", "can", "could", "do", "did", "does",
            "has", "had", "its", "these", "those", "there", "their", "they", "us", "our",
            "he", "she", "him", "her", "them", "were", "be", "been", "being", "at",
            "on", "by", "from", "as", "than", "then", "or", "if", "while", "about",
            "just", "very", "also", "too", "more", "most", "some", "any", "all", "no",
            "up", "out", "get", "got", "make", "made", "think", "want", "try", "in",
            "an", "am", "man", "so",
            // Added after inspecting real short answers, which were landing on "unknown":
            // "dont know you tell me", "nothing".
            "dont", "don't", "know", "nothing", "really", "much", "well", "even", "how",
            "what", "why", "which", "who", "like", "sure",
        };

        // ── Public API ───────────────────────────────────────────────────────────

        /// <summary>
        /// Extracts features from <paramref name="text"/>. Never throws.
        /// </summary>
        /// <param name="text">Raw student text. Null/blank yields an all-default result.</param>
        /// <param name="languageHint">
        /// Optional UI language (e.g. "en", "de-DE"). Used only as a tie-breaker: script evidence in
        /// the text itself always wins.
        /// </param>
        public static NlpFeatures Extract(string? text, string? languageHint = null)
        {
            var normalized = Normalize(text);
            if (normalized.Length == 0) return new NlpFeatures();

            var lower = normalized.ToLowerInvariant();

            // Letter-runs used for lexicon matching. Kept separate from `tokens` below, which for
            // Japanese is per-character and therefore unsuitable for word-level fuzzy matching.
            var words = LetterRunRegex.Matches(lower).Select(m => m.Value).ToList();

            var language = ResolveLanguage(languageHint, normalized, words);

            // Japanese has no word boundaries, so a "word" token would be the whole sentence.
            // Tokenise per character instead, and record that choice in TokenUnit so downstream
            // analysis can never silently pool it with English/German word counts.
            var isJapanese = language == "ja";
            var tokens = isJapanese
                ? JapaneseRegex.Matches(normalized).Select(m => m.Value).ToList()
                : words;

            var uniqueTokenCount = tokens.Distinct(StringComparer.Ordinal).Count();

            var methods = MethodLexicon
                .Where(entry => entry.Value.Any(form => ContainsTerm(lower, words, form)))
                .Select(entry => entry.Key)
                .OrderBy(name => name, StringComparer.Ordinal)
                .ToList();

            var reasoning = FindMarkers(lower, words, ReasoningMarkers);
            var uncertainty = FindMarkers(lower, words, UncertaintyMarkers);
            var affect = FindMarkers(lower, words, AffectMarkers);

            var domainTermCount = methods.Count + MathLexicon.Count(term => ContainsTerm(lower, words, term));

            return new NlpFeatures
            {
                Language = language,
                CharacterCount = normalized.Length,
                TokenCount = tokens.Count,
                UniqueTokenCount = uniqueTokenCount,
                TokenUnit = isJapanese ? "character" : "word",
                VocabularyVariety = tokens.Count > 0
                    ? Math.Round((double)uniqueTokenCount / tokens.Count, 3)
                    : 0,
                MethodsMentioned = methods,
                ReasoningMarkers = reasoning,
                UncertaintyMarkers = uncertainty,
                AffectMarkers = affect,
                DomainTermCount = domainTermCount,
                GivesReason = reasoning.Count > 0,
                MentionsMethod = methods.Count > 0,
                HasDomainTerm = domainTermCount > 0,
            };
        }

        // ── Internals ────────────────────────────────────────────────────────────

        private static List<string> FindMarkers(string lowerText, List<string> words, string[] markers) =>
            markers.Where(marker => ContainsTerm(lowerText, words, marker)).ToList();

        /// <summary>
        /// True when <paramref name="term"/> occurs in the text.
        ///
        /// Exact whole-term matching is tried first, so "einsetzen" cannot match inside another word;
        /// Japanese is matched as a substring because CJK has no word boundaries. If that fails, a
        /// conservative typo-tolerant match is attempted for Latin terms.
        ///
        /// Typo tolerance matters a great deal here: real reflections contain heavy misspelling
        /// ("substituion", "challanging", "excerise", "sutaiblity"). Exact matching silently lost
        /// those signals — e.g. "i chose substituion it was right call" produced no method at all.
        /// </summary>
        private static bool ContainsTerm(string lowerText, List<string> words, string term)
        {
            if (JapaneseRegex.IsMatch(term))
                return lowerText.Contains(term, StringComparison.Ordinal);

            var pattern = $@"(?<!\p{{L}}){Regex.Escape(term)}(?!\p{{L}})";
            if (Regex.IsMatch(lowerText, pattern)) return true;

            return MatchesWithTypo(words, term);
        }

        /// <summary>
        /// Minimum term length before typo tolerance applies. Short words are excluded because an
        /// edit distance of 1 on a 4-letter word matches far too much unrelated vocabulary.
        /// </summary>
        private const int MinFuzzyTermLength = 6;

        /// <summary>
        /// Allows one typo for terms of 6-8 characters and two for longer terms, which covers the
        /// observed errors ("substituion" → "substitution", "challanging" → "challenging") while
        /// keeping false positives low. Multi-word phrases are always matched exactly.
        /// </summary>
        private static bool MatchesWithTypo(List<string> words, string term)
        {
            if (term.Length < MinFuzzyTermLength || term.Contains(' ')) return false;

            var maxDistance = term.Length >= 9 ? 2 : 1;

            foreach (var word in words)
            {
                if (Math.Abs(word.Length - term.Length) > maxDistance) continue;
                if (LevenshteinDistance(word, term) <= maxDistance) return true;
            }

            return false;
        }

        /// <summary>Standard Levenshtein edit distance, iterative with two rolling rows.</summary>
        private static int LevenshteinDistance(string a, string b)
        {
            if (a.Length == 0) return b.Length;
            if (b.Length == 0) return a.Length;

            var previous = new int[b.Length + 1];
            var current = new int[b.Length + 1];

            for (var j = 0; j <= b.Length; j++) previous[j] = j;

            for (var i = 1; i <= a.Length; i++)
            {
                current[0] = i;
                for (var j = 1; j <= b.Length; j++)
                {
                    var cost = a[i - 1] == b[j - 1] ? 0 : 1;
                    current[j] = Math.Min(
                        Math.Min(current[j - 1] + 1, previous[j] + 1),
                        previous[j - 1] + cost);
                }

                (previous, current) = (current, previous);
            }

            return previous[b.Length];
        }

        /// <summary>
        /// NFKC folding so markers match regardless of input method: full-width Latin/digits
        /// become half-width, and half-width katakana becomes full-width.
        /// </summary>
        private static string Normalize(string? text)
        {
            if (string.IsNullOrWhiteSpace(text)) return string.Empty;
            return text.Normalize(NormalizationForm.FormKC).Trim();
        }

        /// <summary>
        /// Script evidence always wins over the UI language hint. A student may write English while
        /// the interface is German, and Japanese text is unambiguous. The hint is only consulted as
        /// a tie-breaker when the text itself carries no signal (e.g. a one-word answer), and very
        /// short answers may still end up "unknown" — which is honest rather than guessing.
        /// </summary>
        private static string ResolveLanguage(string? languageHint, string normalized, List<string> words)
        {
            if (JapaneseRegex.IsMatch(normalized)) return "ja";
            if (GermanCharRegex.IsMatch(normalized)) return "de";

            var germanScore = words.Count(GermanStopwords.Contains);
            var englishScore = words.Count(EnglishStopwords.Contains);

            if (germanScore > englishScore) return "de";
            if (englishScore > germanScore) return "en";

            var hint = languageHint?.Trim().ToLowerInvariant();
            if (!string.IsNullOrEmpty(hint))
            {
                if (hint.StartsWith("de", StringComparison.Ordinal)) return "de";
                if (hint.StartsWith("ja", StringComparison.Ordinal)) return "ja";
                if (hint.StartsWith("en", StringComparison.Ordinal)) return "en";
            }

            return "unknown";
        }
    }
}
