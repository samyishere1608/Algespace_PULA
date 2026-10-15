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

        /// <summary>
        /// The catalogue value for a method named any of the ways this app names one: the value itself
        /// ("Elimination") as the anchor store and the goal picker write it, or the reflection's label
        /// key ("flexibility:elimination-method"). Empty when neither names a method.
        ///
        /// The reflection carries the label key because the client needs a word to put on a chip, and
        /// the two forms arrive at different call sites. Normalising here rather than at each of them
        /// is what keeps a suggestion narrowed to one method from silently degrading: the client drops
        /// a focus it cannot find in its own catalogue, so the wrong form does not fail loudly — the
        /// student is simply shown a goal about methods in general.
        /// </summary>
        public static string MethodFrom(string methodOrLabelKey) =>
            Methods.FirstOrDefault(method => methodOrLabelKey.Contains(method, StringComparison.OrdinalIgnoreCase)) ?? "";

        /// <summary>
        /// The goal from the catalogue that would carry out one of the commitments a reflection offers,
        /// or null when there is no honest match.
        ///
        /// The point is that a promise becomes something the app can actually help them do: the student
        /// says "I'll explain my reasoning next time" and the reply names the goal that measures exactly
        /// that. Null is a real answer — "try a different method" names no method, and "fewer mistakes
        /// than my average" is a limit the goal picker cannot represent, so there is no goal that would
        /// carry either of them out and inventing one would be worse than saying nothing.
        ///
        /// THE QUESTION IS PART OF THE KEY, because a chip id on its own is ambiguous. `pick-substitution`
        /// is "the method I will compare next" under one question and "the method I will work out myself
        /// next" under another, so the same id has to propose a different goal depending on which
        /// question offered it. Reading the id alone would propose the wrong goal about half the time.
        ///
        /// The three-exercise target is the smallest the picker offers and the one that fits a
        /// commitment made about the next exercise rather than a resolution about the month.
        /// </summary>
        public static SuggestedGoal? ForPromise(string questionKey, string chipId, string currentMethodFocus)
        {
            // The three goal questions that ask WHICH method or type, where the chip is a name rather
            // than a commitment. What the student promised is set by the question, not by the chip.
            if (questionKey == "reflection-goal-q3-compare-method")
                return chipId.StartsWith("pick-", StringComparison.Ordinal)
                    ? new SuggestedGoal { Category = MethodComparison }
                    : null;

            if (questionKey == "reflection-goal-q3-solve-method")
                return chipId.StartsWith("pick-", StringComparison.Ordinal)
                    ? new SuggestedGoal { Category = SolveOnOwn }
                    : null;

            if (questionKey == "reflection-goal-q3-explain-type")
                return chipId.StartsWith("pick-", StringComparison.Ordinal)
                    ? new SuggestedGoal { Category = SelfExplanation }
                    : null;

            // The method exercise's own menu, where the chips are about the method rather than about a
            // dimension.
            if (questionKey == "reflection-q3-method")
            {
                var method = MethodFrom(currentMethodFocus);

                return chipId switch
                {
                    // Staying with it, which is what a narrowed method goal measures.
                    "act-method-same" when method.Length > 0 =>
                        new SuggestedGoal { Category = Method, Focus = method },
                    // "Pick whichever fits the system" is the Suitability exercise's own question, so the
                    // goal that measures it is the exercise type rather than a method.
                    "act-method-fit" =>
                        new SuggestedGoal { Category = ExerciseType, Focus = "Suitability" },
                    // "Try a different method" names no method, so nothing in the catalogue carries it.
                    _ => null,
                };
            }

            return chipId switch
            {
                // Explaining their reasoning, on whichever question offered it.
                "act-explain-myself" or "act-explain-hint" or "act-explain-shown" or "act-explain" =>
                    new SuggestedGoal { Category = SelfExplanation },

                // Comparing two methods, which only a Suitability exercise invites.
                "act-compare-myself" or "act-compare-hint" or "act-compare-shown" or "act-compare" =>
                    new SuggestedGoal { Category = MethodComparison },

                // Working the solution out before being shown it, which every exercise type offers.
                "act-solo-myself" or "act-solo-hint" or "act-solo-shown" or "act-solve-alone" =>
                    new SuggestedGoal { Category = SolveOnOwn },

                // A hint limit, where the two chips that name a number map exactly onto a limit the
                // picker offers. "The same as last time" does not: it depends on a limit from a previous
                // goal that this call has no way to know.
                "act-no-hints" or "act-target-none" =>
                    new SuggestedGoal { Category = HintsAndErrors, Quality = "hints", MaxPerExercise = 0 },
                "act-target-one" =>
                    new SuggestedGoal { Category = HintsAndErrors, Quality = "hints", MaxPerExercise = 1 },

                // A mistake limit, and only where the chip names one. "Fewer than my average" is a
                // relative promise the picker cannot express — its limits are 0, 1 and 2 — so it gets no
                // suggestion rather than a fixed number that may be harder or easier than they meant.
                "act-no-errors" =>
                    new SuggestedGoal { Category = HintsAndErrors, Quality = "errors", MaxPerExercise = 0 },

                // Picking a method that fits, which is what the two choice-paying exercise types are about.
                "act-suitable-choice" =>
                    new SuggestedGoal { Category = ExerciseType, Focus = "Suitability" },
                "act-best-choice" =>
                    new SuggestedGoal { Category = ExerciseType, Focus = "Efficiency" },

                _ => null,
            };
        }
    }

    /// <summary>
    /// A goal the student could set, as the reflection proposes it.
    ///
    /// Deliberately the same shape as the client's own `StudyGoal`, so the client can hand it straight
    /// to the catalogue's own wording function instead of the server composing a sentence. The server
    /// knows which goal fits a promise; every word the student reads, and every legal target, belongs to
    /// the client.
    /// </summary>
    public class SuggestedGoal
    {
        /// <summary>One of <see cref="GoalCatalogue.Categories"/>.</summary>
        public string Category { get; set; } = "";

        public string Metric { get; set; } = GoalCatalogue.ExercisesMetric;
        public int Target { get; set; } = 3;

        /// <summary>The method or exercise type it is narrowed to, or empty for "any".</summary>
        public string Focus { get; set; } = "";

        /// <summary>hintsAndErrors only: "hints" | "errors".</summary>
        public string Quality { get; set; } = "";

        /// <summary>hintsAndErrors only: the per-exercise limit.</summary>
        public int MaxPerExercise { get; set; }
    }
}
