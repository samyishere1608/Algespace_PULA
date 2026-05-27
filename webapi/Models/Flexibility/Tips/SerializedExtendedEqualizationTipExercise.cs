using System.Text.Json;
using webapi.Models.Math;
using webapi.Models.User;

namespace webapi.Models.Flexibility
{
    public class SerializedExtendedTipExercise
    {
        public long? Id { get; set; }

        public int? Ordering { get; set; }

        public string FirstEquation { get; set; }

        public string SecondEquation { get; set; }

        public IsolatedIn FirstEquationIsIsolatedIn { get; set; }

        public IsolatedIn SecondEquationIsIsolatedIn { get; set; }

        public Method Method { get; set; }

        public string FirstVariable { get; set; }

        public string SecondVariable { get; set; }

        public string QuestionDE { get; set; }

        public string QuestionEN { get; set; }

        public string AgentMessageForTaskDE { get; set; }

        public string AgentMessageForTaskEN { get; set; }

        public string AgentMessageForFirstSolutionDE { get; set; }

        public string AgentMessageForFirstSolutionEN { get; set; }

        public string AgentMessageForSecondSolutionDE { get; set; }

        public string AgentMessageForSecondSolutionEN { get; set; }

        public SerializedExtendedTipExercise(long Id, long? Ordering, string Method, string FirstEquation, string SecondEquation, string FirstEquationIsIsolatedIn, string SecondEquationIsIsolatedIn, string FirstVariable, string SecondVariable,
        string QuestionDE, string QuestionEN, string AgentMessageForTaskDE, string AgentMessageForTaskEN, string AgentMessageForFirstSolutionDE, string AgentMessageForFirstSolutionEN, string AgentMessageForSecondSolutionDE, string AgentMessageForSecondSolutionEN)
        {
            this.Id = Id;
            this.Ordering = Ordering != null ? (int)Ordering : null;
            this.FirstEquation = FirstEquation;
            this.SecondEquation = SecondEquation;
            this.FirstVariable = FirstVariable;
            this.SecondVariable = SecondVariable;
            this.QuestionDE = QuestionDE;
            this.QuestionEN = QuestionEN;
            this.AgentMessageForTaskDE = AgentMessageForTaskDE;
            this.AgentMessageForTaskEN = AgentMessageForTaskEN;
            this.AgentMessageForFirstSolutionDE = AgentMessageForFirstSolutionDE;
            this.AgentMessageForFirstSolutionEN = AgentMessageForFirstSolutionEN;
            this.AgentMessageForSecondSolutionDE = AgentMessageForSecondSolutionDE;
            this.AgentMessageForSecondSolutionEN = AgentMessageForSecondSolutionEN;

            if (Enum.TryParse(Method, out Method method))
            {
                this.Method = method;
            }

            if (Enum.TryParse(FirstEquationIsIsolatedIn, out IsolatedIn firstIsolatedIn))
            {
                this.FirstEquationIsIsolatedIn = firstIsolatedIn;
            }

            if (Enum.TryParse(SecondEquationIsIsolatedIn, out IsolatedIn secondIsolatedIn))
            {
                this.SecondEquationIsIsolatedIn = secondIsolatedIn;
            }
        }

        public SerializedExtendedTipExercise(ExtendedTipExercise exercise)
        {
            Ordering = exercise.Ordering;
            Method = exercise.Method;
            FirstEquation = JsonSerializer.Serialize(exercise.FirstEquation);
            SecondEquation = JsonSerializer.Serialize(exercise.SecondEquation);
            FirstEquationIsIsolatedIn = exercise.FirstEquationIsIsolatedIn;
            SecondEquationIsIsolatedIn = exercise.SecondEquationIsIsolatedIn;
            FirstVariable = JsonSerializer.Serialize(exercise.FirstVariable);
            SecondVariable = JsonSerializer.Serialize(exercise.SecondVariable);
            QuestionDE = exercise.QuestionDE;
            QuestionEN = exercise.QuestionEN;
            AgentMessageForTaskDE = exercise.AgentMessageForTaskDE;
            AgentMessageForTaskEN = exercise.AgentMessageForTaskEN;
            AgentMessageForFirstSolutionDE = exercise.AgentMessageForFirstSolutionDE;
            AgentMessageForFirstSolutionEN = exercise.AgentMessageForFirstSolutionEN;
            AgentMessageForSecondSolutionDE = exercise.AgentMessageForSecondSolutionDE;
            AgentMessageForSecondSolutionEN = exercise.AgentMessageForSecondSolutionEN;
        }

        public TipExercise Deserialize(Language language)
        {
            return new TipExercise
            {
                Id = Id,
                Ordering = Ordering,
                Method = Method,
                FirstEquation = JsonSerializer.Deserialize<LinearEquation>(FirstEquation) ?? throw new ArgumentException(),
                SecondEquation = JsonSerializer.Deserialize<LinearEquation>(SecondEquation) ?? throw new ArgumentException(),
                FirstEquationIsIsolatedIn = FirstEquationIsIsolatedIn,
                SecondEquationIsIsolatedIn = SecondEquationIsIsolatedIn,
                FirstVariable = JsonSerializer.Deserialize<Variable>(FirstVariable) ?? throw new ArgumentException(),
                SecondVariable = JsonSerializer.Deserialize<Variable>(SecondVariable) ?? throw new ArgumentException(),
                Question = language == Language.de ? QuestionDE : QuestionEN,
                AgentMessageForTask = language == Language.de ? AgentMessageForTaskDE : AgentMessageForTaskEN,
                AgentMessageForFirstSolution = language == Language.de ? AgentMessageForFirstSolutionDE : AgentMessageForFirstSolutionEN,
                AgentMessageForSecondSolution = language == Language.de ? AgentMessageForSecondSolutionDE : AgentMessageForSecondSolutionEN
            };
        }

        public static class TipExerciseDBSettings
        {
            public const string TableName = "TipExercises";

            public const string TableScheme = "Id INTEGER PRIMARY KEY AUTOINCREMENT, Ordering INTEGER, Method TEXT, FirstEquation TEXT, SecondEquation TEXT, FirstEquationIsIsolatedIn TEXT, SecondEquationIsIsolatedIn TEXT, FirstVariable TEXT, SecondVariable TEXT, "
            + "QuestionDE TEXT, QuestionEN TEXT, AgentMessageForTaskDE TEXT, AgentMessageForTaskEN TEXT, AgentMessageForFirstSolutionDE TEXT, AgentMessageForFirstSolutionEN TEXT, AgentMessageForSecondSolutionDE TEXT, AgentMessageForSecondSolutionEN TEXT";

            public const string TableColumns = "(Id, Ordering, Method, FirstEquation, SecondEquation, FirstEquationIsIsolatedIn, SecondEquationIsIsolatedIn, FirstVariable, SecondVariable, "
            + "QuestionDE, QuestionEN, AgentMessageForTaskDE, AgentMessageForTaskEN, AgentMessageForFirstSolutionDE, AgentMessageForFirstSolutionEN, AgentMessageForSecondSolutionDE, AgentMessageForSecondSolutionEN)";

            public const string TableValues = "(@Id, @Ordering, @Method, @FirstEquation, @SecondEquation, @FirstEquationIsIsolatedIn, @SecondEquationIsIsolatedIn, @FirstVariable, @SecondVariable, "
            + "@QuestionDE, @QuestionEN, @AgentMessageForTaskDE, @AgentMessageForTaskEN, @AgentMessageForFirstSolutionDE, @AgentMessageForFirstSolutionEN, @AgentMessageForSecondSolutionDE, @AgentMessageForSecondSolutionEN)";
        }
    }
}
