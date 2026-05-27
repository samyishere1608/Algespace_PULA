using webapi.Models.Math;

namespace webapi.Models.Flexibility
{
    public class PlainExercise : IFlexibilityExercise
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

        public required string AgentMessageForFirstSolution { get; set; }

        public required string AgentMessageForSecondSolution { get; set; }

        public PlainExercise() { }
    }
}
