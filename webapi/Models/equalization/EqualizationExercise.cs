using webapi.Models.ConceptualKnowledge;

namespace webapi.Models.Equalization
{
    public class EqualizationExercise : ICKExercise
    {
        public long? Id { get; set; }

        public int? Ordering { get; set; }

        public int? Level { get; set; }

        public required EqualizationEquation FirstEquation { get; set; }

        public required EqualizationEquation SecondEquation { get; set; }

        public required EqualizationVariable IsolatedVariable { get; set; }

        public required EqualizationVariable SecondVariable { get; set; }

        public required Scale EqualizedScale { get; set; }

        public required Scale SimplifiedScale { get; set; }

        public Dictionary<Weight, int>? AdditionalWeights { get; set; }

        public ScaleAllocation ScaleAllocation { get; set; }

        public int? MaximumCapacity { get; set; }
    }

    public enum ScaleAllocation
    {
        None,
        LeftFirst,
        LeftSecond,
        RightFirst,
        RightSecond
    }
}
