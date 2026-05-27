namespace webapi.Models.Flexibility
{
    public class ExtendedSelfExplanation
    {
        public Method Method { get; set; }

        public bool IsSingleChoice { get; set; }

        public required List<ExtendedOption> Options { get; set; }

        public ExtendedSelfExplanation() { }
    }

    public class ExtendedOption
    {
        public required string TextDE { get; set; }

        public required string TextEN { get; set; }

        public bool IsSolution { get; set; }

        public string? ReasonDE { get; set; }

        public string? ReasonEN { get; set; }

        public ExtendedOption() { }
    }
}
