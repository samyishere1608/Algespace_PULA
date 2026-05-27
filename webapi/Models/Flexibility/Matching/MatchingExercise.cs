using webapi.Models.Math;

namespace webapi.Models.Flexibility
{
    public class MatchingExercise : IFlexibilityExercise
    {
        public long? Id { get; set; }

        public int? Ordering { get; set; }

        public FlexibilityExerciseType Type { get; } = FlexibilityExerciseType.Matching;

        public required LinearEquation FirstEquation { get; set; }

        public required LinearEquation SecondEquation { get; set; }

        public IsolatedIn FirstEquationIsIsolatedIn { get; set; }

        public IsolatedIn SecondEquationIsIsolatedIn { get; set; }

        public required Variable FirstVariable { get; set; }

        public required Variable SecondVariable { get; set; }

        public required Method Method { get; set; }

        public required List<MatchableSystem> AlternativeSystems { get; set; }

        public required SelfExplanation SelfExplanationTask { get; set; }

        public string? Question { get; set; }

        public required string AgentMessageForSelfExplanation { get; set; }

        public required string AgentMessageForFirstSolution { get; set; }

        public required string AgentMessageForSecondSolution { get; set; }

        public MatchingExercise() { }
    }

    public class MatchableSystem
    {
        public required LinearEquation FirstEquation { get; set; }

        public required LinearEquation SecondEquation { get; set; }

        public MatchableSystem() { }
    }
}
