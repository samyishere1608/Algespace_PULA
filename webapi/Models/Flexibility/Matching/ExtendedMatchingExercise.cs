using webapi.Models.Math;

namespace webapi.Models.Flexibility
{
    public class ExtendedMatchingExercise : IFlexibilityExercise
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

        public required ExtendedSelfExplanation SelfExplanationTask { get; set; }

        public string? QuestionDE { get; set; }

        public string? QuestionEN { get; set; }

        public required string AgentMessageForSelfExplanationDE { get; set; }

        public required string AgentMessageForSelfExplanationEN { get; set; }

        public required string AgentMessageForFirstSolutionDE { get; set; }

        public required string AgentMessageForFirstSolutionEN { get; set; }

        public required string AgentMessageForSecondSolutionDE { get; set; }

        public required string AgentMessageForSecondSolutionEN { get; set; }

        public ExtendedMatchingExercise() { }
    }
}
