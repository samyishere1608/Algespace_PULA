using webapi.Models.Math;

namespace webapi.Models.Flexibility
{
    public interface IFlexibilityExercise
    {
        public long? Id { get; set; }

        public int? Ordering { get; set; }

        public FlexibilityExerciseType Type { get; }

        public LinearEquation FirstEquation { get; set; }

        public LinearEquation SecondEquation { get; set; }

        public IsolatedIn FirstEquationIsIsolatedIn { get; set; }

        public IsolatedIn SecondEquationIsIsolatedIn { get; set; }

        public Variable FirstVariable { get; set; }

        public Variable SecondVariable { get; set; }
    }

    public enum FlexibilityExerciseType
    {
        WorkedExamples,
        Efficiency,
        Suitability,
        Matching,
        TipExercise,
        PlainExercise
    }

    public enum Method
    {
        Equalization,
        Substitution,
        Elimination
    }

    public enum IsolatedIn
    {
        First,
        Second,
        None,
        FirstMultiple,
        SecondMultiple
    }
}
