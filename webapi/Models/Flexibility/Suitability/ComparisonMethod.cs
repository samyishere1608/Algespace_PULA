using webapi.Models.Math;
using webapi.Models.User;

namespace webapi.Models.Flexibility
{
    public class ComparisonMethod
    {
        public Method Method { get; set; }

        public List<SolutionStep> Steps { get; set; }

        public ComparisonMethod() { }

        public ComparisonMethod(ExtendedComparisonMethod extendedComparison, Language language)
        {
            Method = extendedComparison.Method;
            Steps = extendedComparison.Steps.Select(step => new SolutionStep(step, language)).ToList();
        }
    }

    public class SolutionStep
    {
        public string? Description { get; set; }

        public List<ParenthesisEquation>? Equations { get; set; }

        public SolutionStep() { }

        public SolutionStep(ExtendedSolutionStep extendedStep, Language language)
        {
            Description = language == Language.de ? extendedStep.DescriptionDE : extendedStep.DescriptionEN;
            Equations = extendedStep.Equations;
        }
    }
}