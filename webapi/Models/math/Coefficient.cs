namespace webapi.Models.Math
{
    public class Coefficient
    {
        public dynamic Value { get; set; }

        public NumberType Type { get; set; }

        public Coefficient() { }

        public Coefficient(int value)
        {
            Value = value;
            Type = NumberType.Number;
        }

        public Coefficient(double value)
        {
            Value = value;
            Type = NumberType.Number;
        }

        public Coefficient(string value)
        {
            Value = value;
            Type = NumberType.Fraction;
        }
    }

    public enum NumberType
    {
        Number,
        Fraction
    }
}
