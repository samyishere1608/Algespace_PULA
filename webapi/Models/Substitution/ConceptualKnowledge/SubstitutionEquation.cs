using webapi.Models.Math;

namespace webapi.Models.Substitution.ConceptualKnowledge
{
    public class SubstitutionEquation
    {
        public required LinearEquation Equation { get; set; }

        public bool IsIsolated { get; set; }

        public SubstitutionEquation() { }
    }
}
