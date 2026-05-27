using System.Text.Json;
using webapi.Models.Math;
using webapi.Models.User;

namespace webapi.Models.Flexibility
{
    public class SerializedExtendedSuitabilityExercise
    {
        public long? Id { get; set; }

        public int? Ordering { get; set; }

        public string FirstEquation { get; set; }

        public string SecondEquation { get; set; }

        public IsolatedIn FirstEquationIsIsolatedIn { get; set; }

        public IsolatedIn SecondEquationIsIsolatedIn { get; set; }

        public string FirstVariable { get; set; }

        public string SecondVariable { get; set; }

        public string SuitableMethods { get; set; }

        public string ComparisonMethods { get; set; }

        public string AgentMessageForFirstSolutionDE { get; set; }

        public string AgentMessageForFirstSolutionEN { get; set; }

        public string AgentMessageForSecondSolutionDE { get; set; }

        public string AgentMessageForSecondSolutionEN { get; set; }

        public string AgentMessageForComparisonDE { get; set; }

        public string AgentMessageForComparisonEN { get; set; }

        public string AgentMessageForResolvingDE { get; set; }

        public string AgentMessageForResolvingEN { get; set; }

        public SerializedExtendedSuitabilityExercise(long Id, long? Ordering, string FirstEquation, string SecondEquation, string FirstEquationIsIsolatedIn, string SecondEquationIsIsolatedIn, string FirstVariable, string SecondVariable,
        string SuitableMethods, string ComparisonMethods, string AgentMessageForFirstSolutionDE, string AgentMessageForFirstSolutionEN, string AgentMessageForSecondSolutionDE, string AgentMessageForSecondSolutionEN,
        string AgentMessageForComparisonDE, string AgentMessageForComparisonEN, string AgentMessageForResolvingDE, string AgentMessageForResolvingEN)
        {
            this.Id = Id;
            this.Ordering = Ordering != null ? (int)Ordering : null;
            this.FirstEquation = FirstEquation;
            this.SecondEquation = SecondEquation;
            this.FirstVariable = FirstVariable;
            this.SecondVariable = SecondVariable;
            this.SuitableMethods = SuitableMethods;
            this.ComparisonMethods = ComparisonMethods;
            this.AgentMessageForFirstSolutionDE = AgentMessageForFirstSolutionDE;
            this.AgentMessageForFirstSolutionEN = AgentMessageForFirstSolutionEN;
            this.AgentMessageForSecondSolutionDE = AgentMessageForSecondSolutionDE;
            this.AgentMessageForSecondSolutionEN = AgentMessageForSecondSolutionEN;
            this.AgentMessageForComparisonDE = AgentMessageForComparisonDE;
            this.AgentMessageForComparisonEN = AgentMessageForComparisonEN;
            this.AgentMessageForResolvingDE = AgentMessageForResolvingDE;
            this.AgentMessageForResolvingEN = AgentMessageForResolvingEN;

            if (Enum.TryParse(FirstEquationIsIsolatedIn, out IsolatedIn firstIsolatedIn))
            {
                this.FirstEquationIsIsolatedIn = firstIsolatedIn;
            }

            if (Enum.TryParse(SecondEquationIsIsolatedIn, out IsolatedIn secondIsolatedIn))
            {
                this.SecondEquationIsIsolatedIn = secondIsolatedIn;
            }
        }

        public SerializedExtendedSuitabilityExercise(ExtendedSuitabilityExercise exercise)
        {
            Ordering = exercise.Ordering;
            FirstEquation = JsonSerializer.Serialize(exercise.FirstEquation);
            SecondEquation = JsonSerializer.Serialize(exercise.SecondEquation);
            FirstEquationIsIsolatedIn = exercise.FirstEquationIsIsolatedIn;
            SecondEquationIsIsolatedIn = exercise.SecondEquationIsIsolatedIn;
            FirstVariable = JsonSerializer.Serialize(exercise.FirstVariable);
            SecondVariable = JsonSerializer.Serialize(exercise.SecondVariable);
            SuitableMethods = JsonSerializer.Serialize(exercise.SuitableMethods);
            ComparisonMethods = JsonSerializer.Serialize(exercise.ComparisonMethods);
            AgentMessageForFirstSolutionDE = exercise.AgentMessageForFirstSolutionDE;
            AgentMessageForFirstSolutionEN = exercise.AgentMessageForFirstSolutionEN;
            AgentMessageForSecondSolutionDE = exercise.AgentMessageForSecondSolutionDE;
            AgentMessageForSecondSolutionEN = exercise.AgentMessageForSecondSolutionEN;
            AgentMessageForComparisonDE = exercise.AgentMessageForComparisonDE;
            AgentMessageForComparisonEN = exercise.AgentMessageForComparisonEN;
            AgentMessageForResolvingDE = exercise.AgentMessageForResolvingDE;
            AgentMessageForResolvingEN = exercise.AgentMessageForResolvingEN;
        }

        public SuitabilityExercise Deserialize(Language language)
        {
            List<ExtendedComparisonMethod> extendedComparisonMethods = JsonSerializer.Deserialize<List<ExtendedComparisonMethod>>(ComparisonMethods) ?? throw new ArgumentException();
            return new SuitabilityExercise
            {
                Id = Id,
                Ordering = Ordering,
                FirstEquation = JsonSerializer.Deserialize<LinearEquation>(FirstEquation) ?? throw new ArgumentException(),
                SecondEquation = JsonSerializer.Deserialize<LinearEquation>(SecondEquation) ?? throw new ArgumentException(),
                FirstEquationIsIsolatedIn = FirstEquationIsIsolatedIn,
                SecondEquationIsIsolatedIn = SecondEquationIsIsolatedIn,
                FirstVariable = JsonSerializer.Deserialize<Variable>(FirstVariable) ?? throw new ArgumentException(),
                SecondVariable = JsonSerializer.Deserialize<Variable>(SecondVariable) ?? throw new ArgumentException(),
                SuitableMethods = JsonSerializer.Deserialize<List<Method>>(SuitableMethods) ?? throw new ArgumentException(),
                ComparisonMethods = extendedComparisonMethods.Select(method => new ComparisonMethod(method, language)).ToList(),
                AgentMessageForFirstSolution = language == Language.de ? AgentMessageForFirstSolutionDE : AgentMessageForFirstSolutionEN,
                AgentMessageForSecondSolution = language == Language.de ? AgentMessageForSecondSolutionDE : AgentMessageForSecondSolutionEN,
                AgentMessageForResolving = language == Language.de ? AgentMessageForComparisonDE : AgentMessageForComparisonEN,
                AgentMessageForComparison = language == Language.de ? AgentMessageForResolvingDE : AgentMessageForResolvingEN
            };
        }
    }

    public static class SuitabilityDBSettings
    {
        public const string TableName = "SuitabilityExercises";

        public const string TableScheme = "Id INTEGER PRIMARY KEY AUTOINCREMENT, Ordering INTEGER, FirstEquation TEXT, SecondEquation TEXT, FirstEquationIsIsolatedIn TEXT, SecondEquationIsIsolatedIn TEXT, FirstVariable TEXT, SecondVariable TEXT, "
        + "SuitableMethods TEXT, ComparisonMethods TEXT, AgentMessageForFirstSolutionDE TEXT, AgentMessageForFirstSolutionEN TEXT, AgentMessageForSecondSolutionDE TEXT, AgentMessageForSecondSolutionEN TEXT, "
        + "AgentMessageForComparisonDE TEXT, AgentMessageForComparisonEN TEXT, AgentMessageForResolvingDE TEXT, AgentMessageForResolvingEN TEXT";

        public const string TableColumns = "(Id, Ordering, FirstEquation, SecondEquation, FirstEquationIsIsolatedIn, SecondEquationIsIsolatedIn, FirstVariable, SecondVariable, SuitableMethods, ComparisonMethods, "
        + "AgentMessageForFirstSolutionDE, AgentMessageForFirstSolutionEN, AgentMessageForSecondSolutionDE, AgentMessageForSecondSolutionEN, AgentMessageForComparisonDE, AgentMessageForComparisonEN, AgentMessageForResolvingDE, AgentMessageForResolvingEN)";

        public const string TableValues = "(@Id, @Ordering, @FirstEquation, @SecondEquation, @FirstEquationIsIsolatedIn, @SecondEquationIsIsolatedIn, @FirstVariable, @SecondVariable, @SuitableMethods, @ComparisonMethods, "
        + "@AgentMessageForFirstSolutionDE, @AgentMessageForFirstSolutionEN, @AgentMessageForSecondSolutionDE, @AgentMessageForSecondSolutionEN, @AgentMessageForComparisonDE, @AgentMessageForComparisonEN, @AgentMessageForResolvingDE, @AgentMessageForResolvingEN)";
    }
}
