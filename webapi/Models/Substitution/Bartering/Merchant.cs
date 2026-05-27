using webapi.Models.Math;

namespace webapi.Models.Substitution.Bartering
{
    public class Merchant
    {
        public ProductType ProductType { get; set; }

        public required LinearEquation LinearEquation { get; set; }

        public Merchant() { }
    }

    public enum ProductType
    {
        Fruits,
        Goods,
        Spices
    }
}
