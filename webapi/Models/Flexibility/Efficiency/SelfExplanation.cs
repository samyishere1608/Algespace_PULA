using webapi.Models.User;

namespace webapi.Models.Flexibility
{
    public class SelfExplanation
    {
        public Method Method { get; set; }

        public bool IsSingleChoice { get; set; }

        public List<Option> Options { get; set; }

        public SelfExplanation() { }

        public SelfExplanation(ExtendedSelfExplanation explanation, Language language)
        {
            Method = explanation.Method;
            IsSingleChoice = explanation.IsSingleChoice;
            Options = explanation.Options.Select(option => new Option(option, language)).ToList();
        }
    }

    public class Option
    {
        public string Text { get; set; }

        public bool IsSolution { get; set; }

        public string? Reason { get; set; }

        public Option() { }

        public Option(ExtendedOption extendedOption, Language language)
        {
            Text = language == Language.de ? extendedOption.TextDE : extendedOption.TextEN;
            IsSolution = extendedOption.IsSolution;
            Reason = language == Language.de ? extendedOption.ReasonDE : extendedOption.ReasonEN;
        }
    }
}
