using webapi.Models.Math;

namespace webapi.Models.Flexibility
{
    public class ExtendedPlainExercise : IFlexibilityExercise
    {
        public long? Id { get; set; }

        public int? Ordering { get; set; }

        public FlexibilityExerciseType Type { get; } = FlexibilityExerciseType.PlainExercise;

        public required LinearEquation FirstEquation { get; set; }

        public required LinearEquation SecondEquation { get; set; }

        public IsolatedIn FirstEquationIsIsolatedIn { get; set; }

        public IsolatedIn SecondEquationIsIsolatedIn { get; set; }

        public required Variable FirstVariable { get; set; }

        public required Variable SecondVariable { get; set; }

        public required string AgentMessageForFirstSolutionDE { get; set; }

        public required string AgentMessageForFirstSolutionEN { get; set; }

        public required string AgentMessageForSecondSolutionDE { get; set; }

        public required string AgentMessageForSecondSolutionEN { get; set; }

        public ExtendedPlainExercise() { }
    }
}
