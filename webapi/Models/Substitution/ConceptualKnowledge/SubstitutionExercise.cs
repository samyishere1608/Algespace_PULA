using webapi.Models.ConceptualKnowledge;

namespace webapi.Models.Substitution.ConceptualKnowledge
{
    public class SubstitutionExercise : ICKExercise
    {
        public long? Id { get; set; }

        public int? Ordering { get; set; }

        public int? Level { get; set; }

        public required SubstitutionEquation FirstEquation { get; set; }

        public required SubstitutionEquation SecondEquation { get; set; }

        public required SubstitutionVariable IsolatedVariable { get; set; }

        public required SubstitutionVariable SecondVariable { get; set; }
    }
}
