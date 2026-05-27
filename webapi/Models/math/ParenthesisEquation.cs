namespace webapi.Models.Math
{
    public class ParenthesisEquation
    {
        public required List<ParenthesisTerm> LeftTerms { get; set; }

        public required List<ParenthesisTerm> RightTerms { get; set; }

        public ParenthesisEquation() { }
    }
}