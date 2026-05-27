using System.Text.Json;

namespace webapi.Models.Substitution.ConceptualKnowledge
{
    public class SerializedSubstitutionExercise
    {
        public long? Id { get; set; }

        public int? Ordering { get; set; }

        public int? Level { get; set; }

        public string FirstEquation { get; set; }

        public string SecondEquation { get; set; }

        public string IsolatedVariable { get; set; }

        public string SecondVariable { get; set; }

        public SerializedSubstitutionExercise(long Id, long? Ordering, long? Level, string FirstEquation, string SecondEquation, string IsolatedVariable, string SecondVariable)
        {
            this.Id = Id;
            this.Ordering = Ordering != null ? (int)Ordering : null;
            this.Level = Level != null ? (int)Level : null;
            this.FirstEquation = FirstEquation;
            this.SecondEquation = SecondEquation;
            this.IsolatedVariable = IsolatedVariable;
            this.SecondVariable = SecondVariable;
        }

        public SerializedSubstitutionExercise(SubstitutionExercise exercise)
        {
            Ordering = exercise.Ordering;
            Level = exercise.Level;
            FirstEquation = JsonSerializer.Serialize(exercise.FirstEquation);
            SecondEquation = JsonSerializer.Serialize(exercise.SecondEquation);
            IsolatedVariable = JsonSerializer.Serialize(exercise.IsolatedVariable);
            SecondVariable = JsonSerializer.Serialize(exercise.SecondVariable);
        }

        public SubstitutionExercise Deserialize()
        {
            return new SubstitutionExercise
            {
                Id = Id,
                Ordering = Ordering,
                Level = Level,
                FirstEquation = JsonSerializer.Deserialize<SubstitutionEquation>(FirstEquation) ?? throw new ArgumentException(),
                SecondEquation = JsonSerializer.Deserialize<SubstitutionEquation>(SecondEquation) ?? throw new ArgumentException(),
                IsolatedVariable = JsonSerializer.Deserialize<SubstitutionVariable>(IsolatedVariable) ?? throw new ArgumentException(),
                SecondVariable = JsonSerializer.Deserialize<SubstitutionVariable>(SecondVariable) ?? throw new ArgumentException()
            };
        }
    }

    public static class SubstitutionDBSettings
    {
        public const string TableName = "SubstitutionExercises";

        public const string TableScheme = "Id INTEGER PRIMARY KEY AUTOINCREMENT, Ordering INTEGER, Level INTEGER, FirstEquation TEXT, SecondEquation TEXT, IsolatedVariable TEXT, SecondVariable TEXT";

        public const string TableColumns = "(Id, Ordering, Level, FirstEquation, SecondEquation, IsolatedVariable, SecondVariable)";

        public const string TableValues = "(@Id, @Ordering, @Level, @FirstEquation, @SecondEquation, @IsolatedVariable, @SecondVariable)";
    }
}
