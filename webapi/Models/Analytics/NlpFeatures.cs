namespace webapi.Models.Analytics
{
    /// <summary>
    /// Deterministic, LLM-free features extracted from a single piece of student free text
    /// (a reflection answer or a message to the AI tutor).
    ///
    /// Produced by <see cref="webapi.Services.NlpFeatureExtractor.Extract"/>.
    /// This is a signal extractor, not a parser: every field is reproducible, and the matched
    /// terms are recorded so that results can be audited rather than taken on trust.
    /// </summary>
    public sealed record NlpFeatures
    {
        /// <summary>"en", "de", "ja", or "unknown".</summary>
        public string Language { get; init; } = "unknown";

        /// <summary>
        /// Number of characters after Unicode (NFKC) normalisation. Language-neutral, so this is
        /// the only length measure that is safe to compare across English, German and Japanese.
        /// </summary>
        public int CharacterCount { get; init; }

        /// <summary>
        /// Number of tokens in <see cref="TokenUnit"/>: words for space-delimited languages,
        /// individual characters for Japanese (which has no word boundaries).
        /// </summary>
        public int TokenCount { get; init; }

        public int UniqueTokenCount { get; init; }

        /// <summary>
        /// What a "token" is for this record: "word", "character", or "none" for empty input.
        ///
        /// Japanese cannot be word-segmented without a morphological analyser, so its records use
        /// "character". Any measure derived from tokens must therefore be compared WITHIN a single
        /// unit only — never pool "word" and "character" records in the same analysis.
        /// </summary>
        public string TokenUnit { get; init; } = "none";

        /// <summary>
        /// Unique tokens / total tokens, rounded to 3 decimals. Diversity proxy, meaningful only
        /// within a single <see cref="TokenUnit"/>: for Japanese this is character diversity and is
        /// NOT equivalent to word-level variety in English or German.
        /// </summary>
        public double VocabularyVariety { get; init; }

        /// <summary>Canonical method names mentioned, e.g. ["Elimination", "Substitution"].</summary>
        public IReadOnlyList<string> MethodsMentioned { get; init; } = [];

        /// <summary>Matched causal/reasoning connectives (e.g. "because", "weil", "ので").</summary>
        public IReadOnlyList<string> ReasoningMarkers { get; init; } = [];

        /// <summary>Matched hedging / low-confidence markers (e.g. "maybe", "vielleicht").</summary>
        public IReadOnlyList<string> UncertaintyMarkers { get; init; } = [];

        /// <summary>Matched affect markers (e.g. "hard", "schwer", "苦手").</summary>
        public IReadOnlyList<string> AffectMarkers { get; init; } = [];

        /// <summary>Number of distinct domain terms matched (methods + math vocabulary).</summary>
        public int DomainTermCount { get; init; }

        /// <summary>True when at least one reasoning marker was matched.</summary>
        public bool GivesReason { get; init; }

        /// <summary>True when at least one solving method was named.</summary>
        public bool MentionsMethod { get; init; }

        /// <summary>
        /// True when at least one domain term was matched. Absence is NOT proof the text is
        /// off-topic (a short legitimate answer may contain no domain vocabulary), so treat
        /// this as one weak signal among several rather than a verdict.
        /// </summary>
        public bool HasDomainTerm { get; init; }
    }
}
