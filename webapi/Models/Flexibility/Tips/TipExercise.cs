using webapi.Models.Math;

namespace webapi.Models.Flexibility
{
    public class TipExercise : IFlexibilityExercise
    {
        public long? Id { get; set; }

        public int? Ordering { get; set; }

        public FlexibilityExerciseType Type { get; } = FlexibilityExerciseType.TipExercise;

        public Method Method { get; set; }

        public LinearEquation FirstEquation { get; set; }

        public LinearEquation SecondEquation { get; set; }

        public IsolatedIn FirstEquationIsIsolatedIn { get; set; }

        public IsolatedIn SecondEquationIsIsolatedIn { get; set; }

        public Variable FirstVariable { get; set; }

        public Variable SecondVariable { get; set; }

        public string Question { get; set; }

        public string AgentMessageForTask { get; set; }

        public string AgentMessageForFirstSolution { get; set; }

        public string AgentMessageForSecondSolution { get; set; }

        public TipExercise() { }
    }
}
