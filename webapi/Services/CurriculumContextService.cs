using webapi.Models.User;

namespace webapi.Services
{
    /// <summary>
    /// Retrieves the authored curriculum content for the student's CURRENT exercise phase.
    ///
    /// Retrieval is BY KEY (exercise type + id), not similarity search: the corpus is roughly 45
    /// exercises, all structured and addressable by (type, id), so a direct lookup is simpler and
    /// more reliable than an embedding or full-text index.
    ///
    /// PHASE DISCIPLINE — the important part. Only the hint belonging to the phase the student is
    /// actually in is ever supplied. The first version passed every phase's hint at once, which meant
    /// a student still choosing a method was handed the first- and second-solution hints: the tutor
    /// started revealing answers instead of supporting.
    ///
    /// Two consequences of that:
    /// - When the phase is unknown, empty, or has no authored hint, this returns NOTHING. Supplying
    ///   no grounding is always safer than leaking the next step.
    /// - The curriculum's "preferred answer" text and its reason are deliberately NOT included, since
    ///   they state outright which method is correct.
    ///
    /// "SystemSolution" is deliberately ungrounded. In a Suitability exercise that state is the
    /// comparison-OR-resolving intervention, and which of the two it is depends on whether the
    /// student's chosen method suits the system — information the phase name alone does not carry.
    /// Guessing would feed the tutor material about the wrong step, which is the exact failure this
    /// class exists to prevent, so no grounding is supplied there.
    ///
    /// Every lookup is wrapped: any failure returns an empty block rather than disturbing the chat.
    /// </summary>
    public class CurriculumContextService(IFlexibilityExerciseService exerciseService)
        : ICurriculumContextService
    {
        private readonly IFlexibilityExerciseService _exerciseService = exerciseService;

        // Phases in which the student is still working out the FIRST solution. The first-solution
        // hint is the only appropriate support here.
        //
        // NOTE: this used to also list "SystemTransformationOnResolve" and three
        // "*InSystemTransformation" names. The latter do not exist in any frontend state enum, and
        // the former belongs to the resolving track below — see ResolvingPhases.
        private static readonly HashSet<string> FirstSolutionPhases = new(StringComparer.OrdinalIgnoreCase)
        {
            "SystemTransformation", "EqualizationMethod", "SubstitutionMethod", "EliminationMethod",
            "FirstSolution",
        };

        // Phases in which the student has moved on to the SECOND solution.
        private static readonly HashSet<string> SecondSolutionPhases = new(StringComparer.OrdinalIgnoreCase)
        {
            "EquationSelection", "SecondSolution",
        };

        private static readonly HashSet<string> SelfExplanationPhases = new(StringComparer.OrdinalIgnoreCase)
        {
            "SelfExplanation",
        };

        // The method-comparison track. A Suitability exercise only enters it when the student chose
        // a method that genuinely SUITS the system.
        private static readonly HashSet<string> ComparisonPhases = new(StringComparer.OrdinalIgnoreCase)
        {
            "Comparison",
        };

        // The RESOLVING track: entered when the student picked a method that does NOT suit the system,
        // and the exercise then walks them through a better one. Every phase on it needs the resolving
        // message.
        //
        // This is where the phase detection was wrong. These phases were scattered across the other
        // three sets, so during a resolve the tutor was fed material about the first solution, then
        // the second solution, then the comparison — always the wrong step. AgentMessageForResolving
        // was left reachable only as a fallback behind comparison, which is essentially never empty,
        // so the resolving hint was dead content that never reached a student.
        private static readonly HashSet<string> ResolvingPhases = new(StringComparer.OrdinalIgnoreCase)
        {
            "SystemTransformationOnResolve",
            "ResolveWithEqualizationMethod", "ResolveWithSubstitutionMethod", "ResolveWithEliminationMethod",
            "ResolveConclusion",
        };

        public string GetGroundingBlock(string? exerciseType, long? exerciseId, string? exercisePhase, Language language)
        {
            if (string.IsNullOrWhiteSpace(exerciseType) || exerciseId is null || exerciseId <= 0)
                return string.Empty;

            // No phase means we cannot tell where the student is, so we supply nothing at all.
            if (string.IsNullOrWhiteSpace(exercisePhase))
                return string.Empty;

            try
            {
                var phase = exercisePhase.Trim();

                var block = exerciseType.Trim().ToLowerInvariant() switch
                {
                    "suitability" => BuildSuitability(exerciseId.Value, phase, language),
                    "efficiency" => BuildEfficiency(exerciseId.Value, phase, language),
                    "matching" => BuildMatching(exerciseId.Value, phase, language),
                    // Plain and Tip exercises render no chat widget, so they need no grounding.
                    _ => string.Empty,
                };

                return string.IsNullOrWhiteSpace(block) ? string.Empty : block;
            }
            catch
            {
                return string.Empty;
            }
        }

        // ── Per-type builders ────────────────────────────────────────────────

        private string BuildSuitability(long id, string phase, Language language)
        {
            var exercise = _exerciseService.GetSuitabilityExerciseById(id, language);
            if (exercise is null) return string.Empty;

            var line = HintForPhase(phase,
                firstSolution: exercise.AgentMessageForFirstSolution,
                secondSolution: exercise.AgentMessageForSecondSolution,
                comparison: exercise.AgentMessageForComparison,
                resolving: exercise.AgentMessageForResolving);

            return Wrap("Suitability", line);
        }

        private string BuildEfficiency(long id, string phase, Language language)
        {
            var exercise = _exerciseService.GetEfficiencyExerciseById(id, language);
            if (exercise is null) return string.Empty;

            var line = HintForPhase(phase,
                firstSolution: exercise.AgentMessageForFirstSolution,
                secondSolution: exercise.AgentMessageForSecondSolution,
                selfExplanation: exercise.AgentMessageForSelfExplanation);

            return Wrap("Efficiency", line);
        }

        private string BuildMatching(long id, string phase, Language language)
        {
            var exercise = _exerciseService.GetMatchingExerciseById(id, language);
            if (exercise is null) return string.Empty;

            var line = HintForPhase(phase,
                firstSolution: exercise.AgentMessageForFirstSolution,
                secondSolution: exercise.AgentMessageForSecondSolution,
                selfExplanation: exercise.AgentMessageForSelfExplanation);

            return Wrap("Matching", line);
        }

        // ── Phase routing ────────────────────────────────────────────────────

        /// <summary>
        /// Returns the single hint that belongs to <paramref name="phase"/>, or null when no hint is
        /// appropriate. Anything not recognised yields null, so unknown phases stay ungrounded.
        /// </summary>
        private static string? HintForPhase(
            string phase,
            string? firstSolution = null,
            string? secondSolution = null,
            string? selfExplanation = null,
            string? comparison = null,
            string? resolving = null)
        {
            // Method-selection phases intentionally fall through to null: the student is deciding
            // which method fits, and any solution hint would answer that for them.
            if (SelfExplanationPhases.Contains(phase)) return OrNull(selfExplanation);
            if (FirstSolutionPhases.Contains(phase)) return OrNull(firstSolution);
            if (SecondSolutionPhases.Contains(phase)) return OrNull(secondSolution);
            if (ComparisonPhases.Contains(phase)) return OrNull(comparison) ?? OrNull(resolving);
            if (ResolvingPhases.Contains(phase)) return OrNull(resolving) ?? OrNull(comparison);

            return null;
        }

        private static string? OrNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value;

        // ── Output ───────────────────────────────────────────────────────────

        private static string Wrap(string exerciseType, string? hint)
        {
            if (hint is null) return string.Empty;

            return $@"[AUTHORED LESSON CONTENT — {exerciseType}, current step only]
This is the material the student is being taught for the step they are on RIGHT NOW.
{exerciseType} lesson hint for this step: {hint}

Rules for using this: keep your wording and terminology consistent with the lesson, but NEVER quote it verbatim and never present it as the answer — turn it into one short hint of your own. This content covers ONLY the student's current step; never describe, hint at, or mention later steps or the final solution.
";
        }
    }
}
