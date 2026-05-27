using webapi.Models.ConceptualKnowledge;
using webapi.Models.Math;

namespace webapi.Models.Substitution.Bartering
{
    public class BarteringExercise : ICKExercise
    {
        public long? Id { get; set; }

        public int? Ordering { get; set; }

        public int? Level { get; set; }

        public required LinearEquation LinearEquation { get; set; }

        public required Merchant FirstMerchant { get; set; }

        public required Merchant SecondMerchant { get; set; }

        public required Merchant ThirdMerchant { get; set; }
    }
}
