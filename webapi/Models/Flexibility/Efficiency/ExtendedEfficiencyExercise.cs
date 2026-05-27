using webapi.Models.Math;

namespace webapi.Models.Flexibility
{
    public class ExtendedEfficiencyExercise : IFlexibilityExercise
    {
        public long? Id { get; set; }

        public int? Ordering { get; set; }

        public FlexibilityExerciseType Type { get; } = FlexibilityExerciseType.Efficiency;

        public bool TransformationRequired { get; set; }

        public bool UseWithTip { get; set; }

        public required LinearEquation FirstEquation { get; set; }

        public required LinearEquation SecondEquation { get; set; }

        public IsolatedIn FirstEquationIsIsolatedIn { get; set; }

        public IsolatedIn SecondEquationIsIsolatedIn { get; set; }

        public required Variable FirstVariable { get; set; }

        public required Variable SecondVariable { get; set; }

        public required List<Method> EfficientMethods { get; set; }

        public required List<ExtendedSelfExplanation> SelfExplanationTasks { get; set; }

        public string? QuestionDE { get; set; }

        public string? QuestionEN { get; set; }

        public required string AgentMessageForSelfExplanationDE { get; set; }

        public required string AgentMessageForSelfExplanationEN { get; set; }

        public required string AgentMessageForFirstSolutionDE { get; set; }

        public required string AgentMessageForFirstSolutionEN { get; set; }

        public required string AgentMessageForSecondSolutionDE { get; set; }

        public required string AgentMessageForSecondSolutionEN { get; set; }

        public ExtendedEfficiencyExercise() { }
    }
}
