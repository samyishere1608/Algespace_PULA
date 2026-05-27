using webapi.Models.Math;

namespace webapi.Models.Flexibility
{
    public class ExtendedComparisonMethod
    {
        public Method Method { get; set; }

        public required List<ExtendedSolutionStep> Steps { get; set; }

        public ExtendedComparisonMethod() { }
    }

    public class ExtendedSolutionStep
    {
        public string? DescriptionDE { get; set; }

        public string? DescriptionEN { get; set; }

        public List<ParenthesisEquation>? Equations { get; set; }

        public ExtendedSolutionStep() { }
    }
}