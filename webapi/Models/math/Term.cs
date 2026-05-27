namespace webapi.Models.Math
{
    public class Term
    {
        public Operator? Operator { get; set; }

        public Coefficient? Coefficient { get; set; }

        public string? Variable { get; set; }

        public bool? IsUnion { get; set; }

        public Term() { }
    }

    public enum Operator
    {
        Plus,
        Minus
    }
}
