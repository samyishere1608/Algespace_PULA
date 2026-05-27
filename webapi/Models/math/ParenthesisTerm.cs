namespace webapi.Models.Math
{
    public class ParenthesisTerm
    {
        public bool IsMultiplication { get; set; }
        public Parenthesis? Parenthesis { get; set; }

        public Coefficient? Coefficient { get; set; }

        public string? Variable { get; set; }

        public ParenthesisTerm() { }
    }

    public enum Parenthesis
    {
        LeftSmall,
        LeftLarge,
        RightSmall,
        RightLarge
    }
}
