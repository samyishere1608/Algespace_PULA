namespace webapi.Models.Anchors
{
    /// <summary>
    /// The dimensions the adaptive system tracks as AVOIDANCE: things a student is offered and can
    /// turn down. Five of them, and the goal categories for those five are built from this same
    /// list, so a student's gap and their goals speak the same language.
    ///
    /// Hints and errors is deliberately NOT here. It is a measurement rather than a choice: nobody
    /// decides to make mistakes, and a hint is a button the student presses rather than an offer
    /// they decline, so the opportunity/engagement ratio this list exists to feed does not apply to
    /// it. It survives as a goal category in its own right and as the profile's `AverageHints` and
    /// `AverageErrors`, both counts rather than rates. Listing it here would not make it measurable,
    /// only mislabelled.
    /// </summary>
    public static class AnchorElement
    {
        /// <summary>Which solving method the student reaches for: Elimination / Substitution / Equalization.</summary>
        public const string Method = "Method";

        /// <summary>Which exercise type they choose: Suitability / Matching / Efficiency.</summary>
        public const string ExerciseType = "ExerciseType";

        /// <summary>Whether they engage with the self-explanation step.</summary>
        public const string SelfExplanation = "SelfExplanation";

        /// <summary>Whether they accept the method-comparison step.</summary>
        public const string MethodComparison = "MethodComparison";

        /// <summary>Whether they work a solution out themselves instead of asking to be shown.</summary>
        public const string SolveOnOwn = "SolveOnOwn";
    }

    /// <summary>
    /// How each of the five avoidance dimensions is actually read out of the anchor records.
    ///
    /// This lives in one place on purpose. The avoidance profile asks "how often does this student
    /// engage with X" and a goal asks "how many times has this student done X" — the same question
    /// asked for two purposes. If the two ever derived their answers separately they would drift,
    /// and the promise that a gap and a goal "speak the same language" would quietly stop holding.
    /// </summary>
    public static class AnchorDimension
    {
        /// <summary>The three solving methods, and the values recorded in SelectedMethod.</summary>
        public static readonly string[] Methods = ["Elimination", "Substitution", "Equalization"];

        /// <summary>The three exercise types, and the values recorded in ExerciseType.</summary>
        public static readonly string[] ExerciseTypes = ["Suitability", "Efficiency", "Matching"];

        /// <summary>
        /// A choice at either solution point counts as working the solution out yourself. Both are
        /// accepted because the second solution is the same decision made a second time, and a
        /// student who did it on the second pass has still done it.
        /// </summary>
        public static readonly string[] SolveOnOwn = ["FirstSolutionChoice", "SecondSolutionChoice"];

        public static readonly string[] SelfExplanation = ["SelfExplanationChoice"];

        /// <summary>
        /// Comparison is offered through two different interventions depending on where the student
        /// is in the exercise, so both count.
        /// </summary>
        public static readonly string[] MethodComparison = ["ComparisonChoice", "ResolvingChoice"];

        /// <summary>True when any of the named decisions was answered "Yes" or "Yes to X".</summary>
        public static bool AnyYes(IEnumerable<string> choices) =>
            choices.Any(c => c.StartsWith("Yes", StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// How a student answered a nudge about a gap.
    ///
    /// Stored separately from the plain decision it follows, on purpose. "Declined, was asked, and
    /// declined again" is a different event from "declined and was never asked", and collapsing them
    /// into one column would make it impossible to say whether the nudge changed anything — which is
    /// the only reason to build one.
    ///
    /// Recorded under a name of the form "NudgeOutcome:SelfExplanation", so one attempt can carry an
    /// outcome for each element without them overwriting each other.
    /// </summary>
    public static class NudgeRecord
    {
        public const string NamePrefix = "NudgeOutcome:";

        /// <summary>The student took the offer up.</summary>
        public const string Accepted = "Accepted";

        /// <summary>The student turned it down. The element is never raised with them again.</summary>
        public const string Declined = "Declined";

        public static string NameFor(string element) => NamePrefix + element;
    }

    /// <summary>
    /// One completed exercise, flattened into the six things a goal can be about.
    ///
    /// Returned as a list rather than as pre-aggregated totals so the goal logic can live in one
    /// place on the client. A goal like "5 exercises with at most 2 hints" needs the raw per-exercise
    /// numbers, and aggregating here would mean inventing thresholds server-side that the goal
    /// catalogue would then have to agree with.
    /// </summary>
    public sealed record GoalEvent
    {
        public long Id { get; init; }

        /// <summary>When the attempt was completed, "yyyy-MM-ddTHH:mm:ss" (UTC).</summary>
        public string At { get; init; } = "";

        public string ExerciseType { get; init; } = "";

        /// <summary>The solving method the student chose. Empty when none was recorded.</summary>
        public string Method { get; init; } = "";

        public bool SelfExplanation { get; init; }

        public bool MethodComparison { get; init; }

        public bool SolveOnOwn { get; init; }

        public int Errors { get; init; }

        public int Hints { get; init; }

        /// <summary>
        /// Whole-exercise time in SECONDS. The client converts to minutes and caps each exercise's
        /// contribution, so a single very long exercise cannot complete a time goal on its own.
        /// </summary>
        public double Seconds { get; init; }
    }

    /// <summary>
    /// How often a student engaged with one tracked value, and whether that counts as a gap.
    /// </summary>
    public sealed record ElementStat
    {
        /// <summary>One of the <see cref="AnchorElement"/> values.</summary>
        public string Element { get; init; } = "";

        /// <summary>
        /// The specific value — "Elimination", "Matching" — or empty for the yes/no dimensions
        /// where the value *is* the element.
        /// </summary>
        public string Value { get; init; } = "";

        /// <summary>How many times the student was in a position to engage with this.</summary>
        public int Opportunities { get; init; }

        /// <summary>How many of those they took.</summary>
        public int Engaged { get; init; }

        /// <summary>Engaged / opportunities, 0 when never offered. Rounded to 2 decimals.</summary>
        public double EngagementRate { get; init; }

        /// <summary>True when this is something the student has consistently avoided.</summary>
        public bool IsGap { get; init; }

        /// <summary>Human-readable name, used verbatim in the nudge and in goal suggestions.</summary>
        public string Label { get; init; } = "";
    }

    /// <summary>
    /// A student's measured behaviour across the avoidance dimensions.
    ///
    /// Computed on demand from <see cref="AnchorStoreSettings"/> rather than stored, so a threshold
    /// change is reflected immediately and there is no stale copy to reconcile. Cheap enough to
    /// recompute: it is two grouped queries over one student's rows.
    /// </summary>
    public sealed record AvoidanceProfile
    {
        public long StudentId { get; init; }

        public string ComputedAt { get; init; } = "";

        /// <summary>Completed attempts this profile is based on. Zero means "we do not know you yet".</summary>
        public int Attempts { get; init; }

        /// <summary>Every tracked value with enough observations to report.</summary>
        public IReadOnlyList<ElementStat> Elements { get; init; } = [];

        /// <summary>
        /// The subset that counts as a gap — consistently avoided. Ordered most-avoided first, so
        /// the caller can take the top one without re-sorting.
        /// </summary>
        public IReadOnlyList<ElementStat> Gaps { get; init; } = [];

        /// <summary>Average hints per attempt, for goal suggestion. Null when there is no history.</summary>
        public double? AverageHints { get; init; }

        /// <summary>Average errors per attempt, for goal suggestion. Null when there is no history.</summary>
        public double? AverageErrors { get; init; }

        /// <summary>
        /// True while there is not yet enough history to say anything. The UI can say "still getting
        /// to know you" instead of showing an empty profile as though it were a finding.
        /// </summary>
        public bool IsColdStart => Attempts == 0;
    }

    /// <summary>
    /// Thresholds for calling something a gap.
    ///
    /// Deliberately generous. Declining twice is often a deliberate, reasonable decision — the
    /// student may simply prefer another method, not be avoiding anything. Only sustained avoidance
    /// counts, because both the nudge and the insight award depend on this being right: a false gap
    /// nags a student who does not need nagging, and awards insight for something they were never
    /// avoiding.
    /// </summary>
    public static class GapThresholds
    {
        /// <summary>At least this many opportunities before avoidance can be judged.</summary>
        public const int MinOpportunities = 5;

        /// <summary>Engagement at or below this counts as avoidance. 0.2 means at most 1 in 5.</summary>
        public const double MaxEngagementRate = 0.20;
    }
}
