using webapi.Models.Math;

namespace webapi.Models.Elimination
{
    public class EliminationVariable
    {
        public required string Name { get; set; }

        public required Coefficient Solution { get; set; }

        public required OptimalEquation OptimalEquation { get; set; }

        public EliminationVariable() { }
    }

    public enum OptimalEquation
    {
        First,
        Second,
        Both
    }
}
