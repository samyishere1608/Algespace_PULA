using webapi.Models.Math;

namespace webapi.Models.Flexibility
{
    public class Variable
    {
        public required string Name { get; set; }

        public required Coefficient Value { get; set; }

        public Variable() { }
    }

    public static class Identifier
    {
        public const string X = "x";

        public const string Y = "y";
    }
}
