using System.Text.Json;
using webapi.Models.Math;
using webapi.Models.User;

namespace webapi.Models.Flexibility
{
    public class SerializedExtendedPlainExercise
    {
        public long? Id { get; set; }

        public int? Ordering { get; set; }

        public string FirstEquation { get; set; }

        public string SecondEquation { get; set; }

        public IsolatedIn FirstEquationIsIsolatedIn { get; set; }

        public IsolatedIn SecondEquationIsIsolatedIn { get; set; }

        public string FirstVariable { get; set; }

        public string SecondVariable { get; set; }

        public string AgentMessageForFirstSolutionDE { get; set; }

        public string AgentMessageForFirstSolutionEN { get; set; }

        public string AgentMessageForSecondSolutionDE { get; set; }

        public string AgentMessageForSecondSolutionEN { get; set; }

        public SerializedExtendedPlainExercise(long Id, long? Ordering, string FirstEquation, string SecondEquation, string FirstEquationIsIsolatedIn, string SecondEquationIsIsolatedIn, string FirstVariable, string SecondVariable,
        string AgentMessageForFirstSolutionDE, string AgentMessageForFirstSolutionEN, string AgentMessageForSecondSolutionDE, string AgentMessageForSecondSolutionEN)
        {
            this.Id = Id;
            this.Ordering = Ordering != null ? (int)Ordering : null;
            this.FirstEquation = FirstEquation;
            this.SecondEquation = SecondEquation;
            this.FirstVariable = FirstVariable;
            this.SecondVariable = SecondVariable;
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

        public SerializedExtendedPlainExercise(ExtendedPlainExercise exercise)
        {
            Ordering = exercise.Ordering;
            FirstEquation = JsonSerializer.Serialize(exercise.FirstEquation);
            SecondEquation = JsonSerializer.Serialize(exercise.SecondEquation);
            FirstEquationIsIsolatedIn = exercise.FirstEquationIsIsolatedIn;
            SecondEquationIsIsolatedIn = exercise.SecondEquationIsIsolatedIn;
            FirstVariable = JsonSerializer.Serialize(exercise.FirstVariable);
            SecondVariable = JsonSerializer.Serialize(exercise.SecondVariable);
            AgentMessageForFirstSolutionDE = exercise.AgentMessageForFirstSolutionDE;
            AgentMessageForFirstSolutionEN = exercise.AgentMessageForFirstSolutionEN;
            AgentMessageForSecondSolutionDE = exercise.AgentMessageForSecondSolutionDE;
            AgentMessageForSecondSolutionEN = exercise.AgentMessageForSecondSolutionEN;
        }

        public PlainExercise Deserialize(Language language)
        {
            return new PlainExercise
            {
                Id = Id,
                Ordering = Ordering,
                FirstEquation = JsonSerializer.Deserialize<LinearEquation>(FirstEquation) ?? throw new ArgumentException(),
                SecondEquation = JsonSerializer.Deserialize<LinearEquation>(SecondEquation) ?? throw new ArgumentException(),
                FirstEquationIsIsolatedIn = FirstEquationIsIsolatedIn,
                SecondEquationIsIsolatedIn = SecondEquationIsIsolatedIn,
                FirstVariable = JsonSerializer.Deserialize<Variable>(FirstVariable) ?? throw new ArgumentException(),
                SecondVariable = JsonSerializer.Deserialize<Variable>(SecondVariable) ?? throw new ArgumentException(),            
                AgentMessageForFirstSolution = language == Language.de ? AgentMessageForFirstSolutionDE : AgentMessageForFirstSolutionEN,
                AgentMessageForSecondSolution = language == Language.de ? AgentMessageForSecondSolutionDE : AgentMessageForSecondSolutionEN
            };
        }
    }

    public static class PlainExerciseDBSettings
    {
        public const string TableName = "PlainExercises";

        public const string TableScheme = "Id INTEGER PRIMARY KEY AUTOINCREMENT, Ordering INTEGER, FirstEquation TEXT, SecondEquation TEXT, FirstEquationIsIsolatedIn TEXT, SecondEquationIsIsolatedIn TEXT, FirstVariable TEXT, SecondVariable TEXT, "
        + "AgentMessageForFirstSolutionDE TEXT, AgentMessageForFirstSolutionEN TEXT, AgentMessageForSecondSolutionDE TEXT, AgentMessageForSecondSolutionEN TEXT";

        public const string TableColumns = "(Id, Ordering, FirstEquation, SecondEquation, FirstEquationIsIsolatedIn, SecondEquationIsIsolatedIn, FirstVariable, SecondVariable, "
        + "AgentMessageForFirstSolutionDE, AgentMessageForFirstSolutionEN, AgentMessageForSecondSolutionDE, AgentMessageForSecondSolutionEN)";

        public const string TableValues = "(@Id, @Ordering, @FirstEquation, @SecondEquation, @FirstEquationIsIsolatedIn, @SecondEquationIsIsolatedIn, @FirstVariable, @SecondVariable, "
        + "@AgentMessageForFirstSolutionDE, @AgentMessageForFirstSolutionEN, @AgentMessageForSecondSolutionDE, @AgentMessageForSecondSolutionEN)";
    }
}
