using webapi.Models.Math;

namespace webapi.Models.Flexibility
{
    public class ExtendedTipExercise : IFlexibilityExercise
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

        public string QuestionDE { get; set; }

        public string QuestionEN { get; set; }

        public string AgentMessageForTaskDE { get; set; }

        public string AgentMessageForTaskEN { get; set; }

        public required string AgentMessageForFirstSolutionDE { get; set; }

        public required string AgentMessageForFirstSolutionEN { get; set; }

        public required string AgentMessageForSecondSolutionDE { get; set; }

        public required string AgentMessageForSecondSolutionEN { get; set; }

        public ExtendedTipExercise() { }
    }
}
