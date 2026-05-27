using System.Text.Json;
using webapi.Models.Math;
using webapi.Models.User;

namespace webapi.Models.Flexibility
{
    public class SerializedExtendedEfficiencyExercise
    {
        public long? Id { get; set; }

        public int? Ordering { get; set; }

        public bool TransformationRequired { get; set; }

        public bool UseWithTip { get; set; }

        public string FirstEquation { get; set; }

        public string SecondEquation { get; set; }

        public IsolatedIn FirstEquationIsIsolatedIn { get; set; }

        public IsolatedIn SecondEquationIsIsolatedIn { get; set; }

        public string FirstVariable { get; set; }

        public string SecondVariable { get; set; }

        public string EfficientMethods { get; set; }

        public string SelfExplanationTasks { get; set; }

        public string QuestionDE { get; set; }

        public string QuestionEN { get; set; }

        public string AgentMessageForSelfExplanationDE { get; set; }

        public string AgentMessageForSelfExplanationEN { get; set; }

        public string AgentMessageForFirstSolutionDE { get; set; }

        public string AgentMessageForFirstSolutionEN { get; set; }

        public string AgentMessageForSecondSolutionDE { get; set; }

        public string AgentMessageForSecondSolutionEN { get; set; }

        public SerializedExtendedEfficiencyExercise(long Id, long? Ordering, long TransformationRequired, long UseWithTip, string FirstEquation, string SecondEquation, string FirstEquationIsIsolatedIn, string SecondEquationIsIsolatedIn, string FirstVariable, string SecondVariable,
        string EfficientMethods, string SelfExplanationTasks, string QuestionDE, string QuestionEN, string AgentMessageForSelfExplanationDE, string AgentMessageForSelfExplanationEN, string AgentMessageForFirstSolutionDE, string AgentMessageForFirstSolutionEN, string AgentMessageForSecondSolutionDE, string AgentMessageForSecondSolutionEN)
        {
            this.Id = Id;
            this.Ordering = Ordering != null ? (int)Ordering : null;
            this.TransformationRequired = TransformationRequired != 0;
            this.UseWithTip = UseWithTip != 0;
            this.FirstEquation = FirstEquation;
            this.SecondEquation = SecondEquation;
            this.FirstVariable = FirstVariable;
            this.SecondVariable = SecondVariable;
            this.EfficientMethods = EfficientMethods;
            this.SelfExplanationTasks = SelfExplanationTasks;
            this.QuestionDE = QuestionDE;
            this.QuestionEN = QuestionEN;
            this.AgentMessageForSelfExplanationDE = AgentMessageForSelfExplanationDE;
            this.AgentMessageForSelfExplanationEN = AgentMessageForSelfExplanationEN;
            this.AgentMessageForFirstSolutionDE = AgentMessageForFirstSolutionDE;
            this.AgentMessageForFirstSolutionEN = AgentMessageForFirstSolutionEN;
            this.AgentMessageForSecondSolutionDE = AgentMessageForSecondSolutionDE;
            this.AgentMessageForSecondSolutionEN = AgentMessageForSecondSolutionEN;

            if (Enum.TryParse(FirstEquationIsIsolatedIn, out IsolatedIn firstIsolatedIn))
            {
                this.FirstEquationIsIsolatedIn = firstIsolatedIn;
            }

            if (Enum.TryParse(SecondEquationIsIsolatedIn, out IsolatedIn secondIsolatedIn))
            {
                this.SecondEquationIsIsolatedIn = secondIsolatedIn;
            }
        }

        public SerializedExtendedEfficiencyExercise(ExtendedEfficiencyExercise exercise)
        {
            Ordering = exercise.Ordering;
            TransformationRequired = exercise.TransformationRequired;
            UseWithTip = exercise.UseWithTip;
            FirstEquation = JsonSerializer.Serialize(exercise.FirstEquation);
            SecondEquation = JsonSerializer.Serialize(exercise.SecondEquation);
            FirstEquationIsIsolatedIn = exercise.FirstEquationIsIsolatedIn;
            SecondEquationIsIsolatedIn = exercise.SecondEquationIsIsolatedIn;
            FirstVariable = JsonSerializer.Serialize(exercise.FirstVariable);
            SecondVariable = JsonSerializer.Serialize(exercise.SecondVariable);
            EfficientMethods = JsonSerializer.Serialize(exercise.EfficientMethods);
            SelfExplanationTasks = JsonSerializer.Serialize(exercise.SelfExplanationTasks);
            QuestionDE = exercise.QuestionDE;
            QuestionEN = exercise.QuestionEN;
            AgentMessageForSelfExplanationDE = exercise.AgentMessageForSelfExplanationDE;
            AgentMessageForSelfExplanationEN = exercise.AgentMessageForSelfExplanationEN;
            AgentMessageForFirstSolutionDE = exercise.AgentMessageForFirstSolutionDE;
            AgentMessageForFirstSolutionEN = exercise.AgentMessageForFirstSolutionEN;
            AgentMessageForSecondSolutionDE = exercise.AgentMessageForSecondSolutionDE;
            AgentMessageForSecondSolutionEN = exercise.AgentMessageForSecondSolutionEN;
        }

        public EfficiencyExercise Deserialize(Language language)
        {
            List<ExtendedSelfExplanation> extendedSelfExplanationTasks = JsonSerializer.Deserialize<List<ExtendedSelfExplanation>>(SelfExplanationTasks) ?? throw new ArgumentException();
            return new EfficiencyExercise
            {
                Id = Id,
                Ordering = Ordering,
                TransformationRequired = TransformationRequired,
                UseWithTip = UseWithTip,
                FirstEquation = JsonSerializer.Deserialize<LinearEquation>(FirstEquation) ?? throw new ArgumentException(),
                SecondEquation = JsonSerializer.Deserialize<LinearEquation>(SecondEquation) ?? throw new ArgumentException(),
                FirstEquationIsIsolatedIn = FirstEquationIsIsolatedIn,
                SecondEquationIsIsolatedIn = SecondEquationIsIsolatedIn,
                FirstVariable = JsonSerializer.Deserialize<Variable>(FirstVariable) ?? throw new ArgumentException(),
                SecondVariable = JsonSerializer.Deserialize<Variable>(SecondVariable) ?? throw new ArgumentException(),
                EfficientMethods = JsonSerializer.Deserialize<List<Method>>(EfficientMethods) ?? throw new ArgumentException(),
                SelfExplanationTasks = extendedSelfExplanationTasks.Select(task => new SelfExplanation(task, language)).ToList(),
                Question = language == Language.de ? QuestionDE : QuestionEN,
                AgentMessageForSelfExplanation = language == Language.de ? AgentMessageForSelfExplanationDE : AgentMessageForSelfExplanationEN,
                AgentMessageForFirstSolution = language == Language.de ? AgentMessageForFirstSolutionDE : AgentMessageForFirstSolutionEN,
                AgentMessageForSecondSolution = language == Language.de ? AgentMessageForSecondSolutionDE : AgentMessageForSecondSolutionEN
            };
        }
    }

    public static class EfficiencyDBSettings
    {
        public const string TableName = "EfficiencyExercises";

        public const string TableScheme = "Id INTEGER PRIMARY KEY AUTOINCREMENT, Ordering INTEGER, TransformationRequired INTEGER, UseWithTip INTEGER, FirstEquation TEXT, SecondEquation TEXT, FirstEquationIsIsolatedIn TEXT, SecondEquationIsIsolatedIn TEXT, FirstVariable TEXT, SecondVariable TEXT, "
        + "EfficientMethods TEXT, SelfExplanationTasks TEXT, QuestionDE TEXT, QuestionEN TEXT, AgentMessageForSelfExplanationDE TEXT, AgentMessageForSelfExplanationEN TEXT, "
        + "AgentMessageForFirstSolutionDE TEXT, AgentMessageForFirstSolutionEN TEXT, AgentMessageForSecondSolutionDE TEXT, AgentMessageForSecondSolutionEN TEXT";

        public const string TableColumns = "(Id, Ordering, TransformationRequired, UseWithTip, FirstEquation, SecondEquation, FirstEquationIsIsolatedIn, SecondEquationIsIsolatedIn, FirstVariable, SecondVariable, EfficientMethods, SelfExplanationTasks, "
        + "QuestionDE, QuestionEN, AgentMessageForSelfExplanationDE, AgentMessageForSelfExplanationEN, AgentMessageForFirstSolutionDE, AgentMessageForFirstSolutionEN, AgentMessageForSecondSolutionDE, AgentMessageForSecondSolutionEN)";

        public const string TableValues = "(@Id, @Ordering, @TransformationRequired, @UseWithTip, @FirstEquation, @SecondEquation, @FirstEquationIsIsolatedIn, @SecondEquationIsIsolatedIn, @FirstVariable, @SecondVariable, @EfficientMethods, @SelfExplanationTasks, "
        + "@QuestionDE, @QuestionEN, @AgentMessageForSelfExplanationDE, @AgentMessageForSelfExplanationEN, @AgentMessageForFirstSolutionDE, @AgentMessageForFirstSolutionEN, @AgentMessageForSecondSolutionDE, @AgentMessageForSecondSolutionEN)";
    }
}
