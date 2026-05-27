using System.Text.Json;
using webapi.Models.Math;
using webapi.Models.User;

namespace webapi.Models.Flexibility
{
    public class SerializedExtendedMatchingExercise
    {
        public long? Id { get; set; }

        public int? Ordering { get; set; }

        public string FirstEquation { get; set; }

        public string SecondEquation { get; set; }

        public IsolatedIn FirstEquationIsIsolatedIn { get; set; }

        public IsolatedIn SecondEquationIsIsolatedIn { get; set; }

        public string FirstVariable { get; set; }

        public string SecondVariable { get; set; }

        public Method Method { get; set; }

        public string AlternativeSystems { get; set; }

        public string SelfExplanationTask { get; set; }

        public string QuestionDE { get; set; }

        public string QuestionEN { get; set; }

        public string AgentMessageForSelfExplanationDE { get; set; }

        public string AgentMessageForSelfExplanationEN { get; set; }

        public string AgentMessageForFirstSolutionDE { get; set; }

        public string AgentMessageForFirstSolutionEN { get; set; }

        public string AgentMessageForSecondSolutionDE { get; set; }

        public string AgentMessageForSecondSolutionEN { get; set; }

        public SerializedExtendedMatchingExercise(long Id, long? Ordering, string FirstEquation, string SecondEquation, string FirstEquationIsIsolatedIn, string SecondEquationIsIsolatedIn, string FirstVariable, string SecondVariable,
        string Method, string AlternativeSystems, string SelfExplanationTask, string QuestionDE, string QuestionEN, string AgentMessageForSelfExplanationDE, string AgentMessageForSelfExplanationEN, string AgentMessageForFirstSolutionDE, string AgentMessageForFirstSolutionEN, string AgentMessageForSecondSolutionDE, string AgentMessageForSecondSolutionEN)
        {
            this.Id = Id;
            this.Ordering = Ordering != null ? (int)Ordering : null;
            this.FirstEquation = FirstEquation;
            this.SecondEquation = SecondEquation;
            this.FirstVariable = FirstVariable;
            this.SecondVariable = SecondVariable;
            this.AlternativeSystems = AlternativeSystems;
            this.SelfExplanationTask = SelfExplanationTask;
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

            if (Enum.TryParse(Method, out Method method))
            {
                this.Method = method;
            }
        }

        public SerializedExtendedMatchingExercise(ExtendedMatchingExercise exercise)
        {
            Ordering = exercise.Ordering;
            FirstEquation = JsonSerializer.Serialize(exercise.FirstEquation);
            SecondEquation = JsonSerializer.Serialize(exercise.SecondEquation);
            FirstEquationIsIsolatedIn = exercise.FirstEquationIsIsolatedIn;
            SecondEquationIsIsolatedIn = exercise.SecondEquationIsIsolatedIn;
            FirstVariable = JsonSerializer.Serialize(exercise.FirstVariable);
            SecondVariable = JsonSerializer.Serialize(exercise.SecondVariable);
            Method = exercise.Method;
            AlternativeSystems = JsonSerializer.Serialize(exercise.AlternativeSystems);
            SelfExplanationTask = JsonSerializer.Serialize(exercise.SelfExplanationTask);
            QuestionDE = exercise.QuestionDE;
            QuestionEN = exercise.QuestionEN;
            AgentMessageForSelfExplanationDE = exercise.AgentMessageForSelfExplanationDE;
            AgentMessageForSelfExplanationEN = exercise.AgentMessageForSelfExplanationEN;
            AgentMessageForFirstSolutionDE = exercise.AgentMessageForFirstSolutionDE;
            AgentMessageForFirstSolutionEN = exercise.AgentMessageForFirstSolutionEN;
            AgentMessageForSecondSolutionDE = exercise.AgentMessageForSecondSolutionDE;
            AgentMessageForSecondSolutionEN = exercise.AgentMessageForSecondSolutionEN;
        }

        public MatchingExercise Deserialize(Language language)
        {
            ExtendedSelfExplanation extendedSelfExplanationTask = JsonSerializer.Deserialize<ExtendedSelfExplanation>(SelfExplanationTask) ?? throw new ArgumentException();
            return new MatchingExercise
            {
                Id = Id,
                Ordering = Ordering,
                FirstEquation = JsonSerializer.Deserialize<LinearEquation>(FirstEquation) ?? throw new ArgumentException(),
                SecondEquation = JsonSerializer.Deserialize<LinearEquation>(SecondEquation) ?? throw new ArgumentException(),
                FirstEquationIsIsolatedIn = FirstEquationIsIsolatedIn,
                SecondEquationIsIsolatedIn = SecondEquationIsIsolatedIn,
                FirstVariable = JsonSerializer.Deserialize<Variable>(FirstVariable) ?? throw new ArgumentException(),
                SecondVariable = JsonSerializer.Deserialize<Variable>(SecondVariable) ?? throw new ArgumentException(),
                Method = Method,
                AlternativeSystems = JsonSerializer.Deserialize<List<MatchableSystem>>(AlternativeSystems) ?? throw new ArgumentException(),
                SelfExplanationTask = new SelfExplanation(extendedSelfExplanationTask, language),
                Question = language == Language.de ? QuestionDE : QuestionEN,
                AgentMessageForSelfExplanation = language == Language.de ? AgentMessageForSelfExplanationDE : AgentMessageForSelfExplanationEN,
                AgentMessageForFirstSolution = language == Language.de ? AgentMessageForFirstSolutionDE : AgentMessageForFirstSolutionEN,
                AgentMessageForSecondSolution = language == Language.de ? AgentMessageForSecondSolutionDE : AgentMessageForSecondSolutionEN
            };
        }
    }

    public static class MatchingDBSettings
    {
        public const string TableName = "MatchingExercises";

        public const string TableScheme = "Id INTEGER PRIMARY KEY AUTOINCREMENT, Ordering INTEGER, FirstEquation TEXT, SecondEquation TEXT, FirstEquationIsIsolatedIn TEXT, SecondEquationIsIsolatedIn TEXT, FirstVariable TEXT, SecondVariable TEXT, "
        + "Method TEXT, AlternativeSystems TEXT, SelfExplanationTask TEXT, QuestionDE TEXT, QuestionEN TEXT, AgentMessageForSelfExplanationDE TEXT, AgentMessageForSelfExplanationEN TEXT, "
        + "AgentMessageForFirstSolutionDE TEXT, AgentMessageForFirstSolutionEN TEXT, AgentMessageForSecondSolutionDE TEXT, AgentMessageForSecondSolutionEN TEXT";

        public const string TableColumns = "(Id, Ordering, FirstEquation, SecondEquation, FirstEquationIsIsolatedIn, SecondEquationIsIsolatedIn, FirstVariable, SecondVariable, Method, AlternativeSystems, SelfExplanationTask, "
        + "QuestionDE, QuestionEN, AgentMessageForSelfExplanationDE, AgentMessageForSelfExplanationEN, AgentMessageForFirstSolutionDE, AgentMessageForFirstSolutionEN, AgentMessageForSecondSolutionDE, AgentMessageForSecondSolutionEN)";

        public const string TableValues = "(@Id, @Ordering, @FirstEquation, @SecondEquation, @FirstEquationIsIsolatedIn, @SecondEquationIsIsolatedIn, @FirstVariable, @SecondVariable, @Method, @AlternativeSystems, @SelfExplanationTask, "
        + "@QuestionDE, @QuestionEN, @AgentMessageForSelfExplanationDE, @AgentMessageForSelfExplanationEN, @AgentMessageForFirstSolutionDE, @AgentMessageForFirstSolutionEN, @AgentMessageForSecondSolutionDE, @AgentMessageForSecondSolutionEN)";
    }
}
