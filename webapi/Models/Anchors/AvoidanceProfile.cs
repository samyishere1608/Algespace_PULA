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

        /// <summary>
        /// The moment the solution was SHOWN at a solution point, instead of the student working it out.
        ///
        /// Opting in is not the same as doing it. The two solution points each ask "would you like to
        /// try to find the solution on your own?", and a student who says yes and then, after typing a
        /// wrong answer, presses "Show solution" has taken the help — but no second CHOICE is recorded
        /// for that, because the button that shows the solution only writes an action. Their yes then
        /// stands alone and reads as unaided work, which is how a solve-on-own goal could complete on an
        /// exercise they were walked through.
        ///
        /// Recorded per solution point, because the two are independent: being shown the first solution
        /// says nothing about whether they found the second one themselves. `Yes` here means "the
        /// solution was shown", which is the opposite of engagement, so read it with
        /// <see cref="SolvedOnOwn"/> rather than with <see cref="Engaged"/>.
        /// </summary>
        public static readonly string[] SolutionShown = ["FirstSolutionShown", "SecondSolutionShown"];

        /// <summary>
        /// The two solution points, as a pair per point: the answer the student gave and the record that
        /// the solution was then shown to them.
        ///
        /// Kept side by side because a reveal only means anything about the point it belongs to. Read
        /// them with <see cref="SolvedOnOwn"/> rather than walking the two arrays in parallel.
        /// </summary>
        public static readonly (string Choice, string Shown)[] SolutionPoints =
        [
            ("FirstSolutionChoice", "FirstSolutionShown"),
            ("SecondSolutionChoice", "SecondSolutionShown"),
        ];

        public static readonly string[] SelfExplanation = ["SelfExplanationChoice"];

        /// <summary>
        /// Comparison is offered through two different interventions depending on where the student
        /// is in the exercise, so both count.
        /// </summary>
        public static readonly string[] MethodComparison = ["ComparisonChoice", "ResolvingChoice"];

        /// <summary>
        /// Whether the answers to a dimension's decisions read as ENGAGEMENT: the offer was taken up and
        /// never handed back.
        ///
        /// A decline anywhere beats a yes anywhere, because two of these dimensions are the same act
        /// offered twice inside one exercise. A student who starts the calculation and then, after
        /// getting it wrong, asks to be shown the answer has taken help on that exercise — and what the
        /// SolveOnOwn goal is about is doing the calculation, not attempting it. Reading "yes then no" as
        /// engagement lets the first moment paper over the help that came after, and it also sets the
        /// goal against the reflection: the client's own summary of the exercise already counts a decline
        /// as winning, so the two would be describing the same exercise in two different ways.
        /// </summary>
        public static bool Engaged(IEnumerable<string> choices)
        {
            var answers = choices.ToList();

            return answers.Any(c => c.StartsWith("Yes", StringComparison.OrdinalIgnoreCase))
                   && !answers.Any(c => c.StartsWith("No", StringComparison.OrdinalIgnoreCase));
        }

        /// <summary>
        /// Whether the student actually worked the solution out themselves.
        ///
        /// Stricter than <see cref="Engaged"/>, and this is the one every reader of SolveOnOwn has to
        /// use. Opting in is not doing it: a student who said yes and then had the solution shown to
        /// them did not work it out, and counting the yes alone is what let a solve-on-own goal complete
        /// on an exercise they were walked through.
        ///
        /// Read POINT BY POINT, because the two solution points are independent. Being shown the first
        /// solution says nothing about the second, so a student who hands the first one over and then
        /// finds the second themselves DID work out a solution, and this returns true for them.
        ///
        /// "Shown" only counts where the student had opted in. A student who declined outright needs no
        /// reveal record — their decline already decides it — so demanding one would fail them twice for
        /// the same act.
        /// </summary>
        public static bool SolvedOnOwn(IEnumerable<(string Name, string Choice)> answers)
        {
            var byName = answers
                .GroupBy(answer => answer.Name, StringComparer.Ordinal)
                .ToDictionary(
                    group => group.Key,
                    group => group.Select(answer => answer.Choice).ToList(),
                    StringComparer.Ordinal);

            foreach (var point in SolutionPoints)
            {
                // Never reached this point, or turned it down: their answer is already the verdict.
                if (!byName.TryGetValue(point.Choice, out var choices)) continue;
                if (!Engaged(choices)) continue;

                var shownAtThisPoint = byName.TryGetValue(point.Shown, out var shown)
                                       && shown.Any(c => c.StartsWith("Yes", StringComparison.OrdinalIgnoreCase));

                if (!shownAtThisPoint) return true;
            }

            return false;
        }
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
    /// Declining once is often a deliberate, reasonable decision — the student may simply prefer
    /// another method, not be avoiding anything. Only sustained avoidance counts, because both the
    /// nudge and the insight award depend on this being right: a false gap nags a student who does
    /// not need nagging, and awards insight for something they were never avoiding.
    ///
    /// The floor was lowered from five opportunities to three on 2026-10-12. It stays ONE floor for
    /// both the nudge and the Insight award, because they are two reactions to a single judgement —
    /// a student must never be nudged about something the award would not recognise, or the reverse.
    ///
    /// GRACE AFTER AN AWARD. Once Insight has been paid for facing a weakness, that weakness is not
    /// counted as a gap for the next <see cref="GraceOpportunities"/> opportunities, however large the
    /// historical deficit still is. Without it a long record of declines keeps the element a gap for
    /// several engagements and every one of them would be paid and nudged about. Because the profile is
    /// what both the nudge and the award read, the grace lives in the profile and they cannot disagree.
    /// </summary>
    public static class GapThresholds
    {
        /// <summary>At least this many opportunities before avoidance can be judged.</summary>
        public const int MinOpportunities = 3;

        /// <summary>After an award, this many opportunities pass before the weakness can be a gap again.</summary>
        public const int GraceOpportunities = 3;

        /// <summary>
        /// Engagement at or below this counts as avoidance. 0.20 is one in five, so at the
        /// three-opportunity floor it means NONE — a single engagement there is already a third.
        /// A gap is therefore "no engagement in three, or at most a fifth of a longer record".
        /// </summary>
        public const double MaxEngagementRate = 0.20;
    }
}
