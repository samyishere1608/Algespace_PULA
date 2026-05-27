using webapi.Models.ConceptualKnowledge;
using webapi.Models.Math;

namespace webapi.Models.Elimination
{
    public class EliminationExercise : ICKExercise
    {
        public long? Id { get; set; }

        public int? Ordering { get; set; }

        public int? Level { get; set; }

        public required LinearEquation FirstEquation { get; set; }

        public required LinearEquation SecondEquation { get; set; }

        public required EliminationVariable FirstVariable { get; set; }

        public required EliminationVariable SecondVariable { get; set; }
    }
}
