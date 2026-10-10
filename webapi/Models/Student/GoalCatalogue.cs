using webapi.Models.Anchors;

namespace webapi.Models.Student
{
    /// <summary>
    /// The goals a student can set, as far as the server needs to know them.
    ///
    /// THIS IS A MIRROR of `reactapp/src/utils/goalCatalog.ts`, which is the source of truth — the
    /// picker renders straight from that file. The duplication exists because the suggestion endpoint
    /// has to describe the menu to the model and then check what comes back against it, and the
    /// alternative (the client posting its own catalogue) would leave the endpoint unusable on its
    /// own. Adding a category, a target or a focus means changing BOTH files.
    ///
    /// Everything here is about shape, not about scoring: what a goal means and how progress is
    /// counted lives in the frontend and in the anchor store. This only answers "is this a goal that
    /// exists, and what are its legal values".
    /// </summary>
    public static class GoalCatalogue
    {
        public const string Method = "method";
        public const string ExerciseType = "exerciseType";
        public const string SelfExplanation = "selfExplanation";
        public const string MethodComparison = "methodComparison";
        public const string SolveOnOwn = "solveOnOwn";
        /// <summary>
        /// A goal category WITHOUT an avoidance dimension behind it.
        ///
        /// Hints and errors measures accuracy rather than a decision, so it is not one of the
        /// <see cref="AnchorElement"/> values and can never be a gap. It is still a goal a student
        /// can set, and the fallback plan proposes it from the average hints and errors rather than
        /// from a gap. See <see cref="CategoryForElement"/>.
        /// </summary>
        public const string HintsAndErrors = "hintsAndErrors";

        public const string ExercisesMetric = "exercises";
        public const string MinutesMetric = "minutes";

        public static readonly string[] Categories =
            [Method, ExerciseType, SelfExplanation, MethodComparison, SolveOnOwn, HintsAndErrors];

        public static readonly string[] Methods = ["Elimination", "Substitution", "Equalization"];
        public static readonly string[] ExerciseTypes = ["Suitability", "Efficiency", "Matching"];

        public static readonly int[] ExerciseTargets = [3, 5, 10];
        public static readonly int[] MinuteTargets = [10, 20, 30];
        public static readonly int[] QualityLimits = [0, 1, 2];

        public static bool IsCategory(string? value) => value is not null && Categories.Contains(value);

        /// <summary>
        /// Only method and exercise type can be counted in minutes, because those are the only two we
        /// can time meaningfully — we know how long an exercise took, not how long the student spent
        /// on the specific act of comparing two methods.
        /// </summary>
        public static bool AllowsMinutes(string category) => category is Method or ExerciseType;

        public static string[] MetricsFor(string category) =>
            AllowsMinutes(category) ? [ExercisesMetric, MinutesMetric] : [ExercisesMetric];

        public static string[] FocusesFor(string category) => category switch
        {
            Method => Methods,
            ExerciseType => ExerciseTypes,
            _ => []
        };

        public static int[] TargetsFor(string metric) =>
            metric == MinutesMetric ? MinuteTargets : ExerciseTargets;

        /// <summary>Snaps a target to the nearest offered size, preferring the smaller on a tie.</summary>
        public static int SnapTarget(string metric, int target)
        {
            var options = TargetsFor(metric);
            // Fully qualified: from inside webapi.Models.Student, a bare `Math` resolves to the sibling
            // webapi.Models.Math namespace rather than System.Math.
            return options.OrderBy(option => System.Math.Abs(option - target)).ThenBy(option => option).First();
        }

        /// <summary>
        /// The goal category that addresses one of the tracked avoidance dimensions.
        ///
        /// Five of the six categories appear here. Hints and errors does not, because it is not an
        /// avoidance dimension — see <see cref="AnchorElement"/>. Both callers already handle a null
        /// for it: one is guarded by a `is null` check, the other only ever passes an element taken
        /// from the profile's own gap list.
        /// </summary>
        public static string? CategoryForElement(string element) => element switch
        {
            AnchorElement.Method => Method,
            AnchorElement.ExerciseType => ExerciseType,
            AnchorElement.SelfExplanation => SelfExplanation,
            AnchorElement.MethodComparison => MethodComparison,
            AnchorElement.SolveOnOwn => SolveOnOwn,
            _ => null
        };

        /// <summary>A short phrase naming the goal category, for the model's prompt and fallback copy.</summary>
        public static string Describe(string category) => category switch
        {
            Method => "practise one solving method (elimination, substitution or equalization)",
            ExerciseType => "focus on one exercise type (suitability, efficiency or matching)",
            SelfExplanation => "explain their own reasoning instead of going straight to the answer",
            MethodComparison => "compare two methods before choosing one",
            SolveOnOwn => "work the solution out themselves instead of being shown it",
            HintsAndErrors => "complete exercises staying under a hint or error limit they choose",
            _ => category
        };
    }
}
