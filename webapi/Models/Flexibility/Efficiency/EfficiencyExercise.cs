using webapi.Models.Math;

namespace webapi.Models.Flexibility
{
    public class EfficiencyExercise : IFlexibilityExercise
    {
        public long? Id { get; set; }

        public int? Ordering { get; set; }

        public FlexibilityExerciseType Type { get; } = FlexibilityExerciseType.Efficiency;

        public bool TransformationRequired { get; set; }

        public bool UseWithTip { get; set; }

        public LinearEquation FirstEquation { get; set; }

        public LinearEquation SecondEquation { get; set; }

        public IsolatedIn FirstEquationIsIsolatedIn { get; set; }

        public IsolatedIn SecondEquationIsIsolatedIn { get; set; }

        public Variable FirstVariable { get; set; }

        public Variable SecondVariable { get; set; }

        public List<Method> EfficientMethods { get; set; }

        public List<SelfExplanation> SelfExplanationTasks { get; set; }

        public string? Question { get; set; }

        public string AgentMessageForSelfExplanation { get; set; }

        public string AgentMessageForFirstSolution { get; set; }

        public string AgentMessageForSecondSolution { get; set; }

        public EfficiencyExercise() { }
    }
}
