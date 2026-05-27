using webapi.Models.Math;

namespace webapi.Models.Equalization
{
    public class EqualizationEquation
    {
        public required LinearEquation Equation { get; set; }

        public Dictionary<Weight, int>? WeightsLeft { get; set; }

        public Dictionary<Weight, int>? WeightsRight { get; set; }

        public EqualizationEquation() { }
    }
}
