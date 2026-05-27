using System.Text.Json;
using webapi.Models.Math;

namespace webapi.Models.Elimination
{
    public class SerializedEliminationExercise
    {
        public long? Id { get; set; }

        public int? Ordering { get; set; }

        public int? Level { get; set; }

        public string FirstEquation { get; set; }

        public string SecondEquation { get; set; }

        public string FirstVariable { get; set; }

        public string SecondVariable { get; set; }

        public SerializedEliminationExercise(long Id, long? Ordering, long? Level, string FirstEquation, string SecondEquation, string FirstVariable, string SecondVariable)
        {
            this.Id = Id;
            this.Ordering = Ordering != null ? (int)Ordering : null;
            this.Level = Level != null ? (int)Level : null;
            this.FirstEquation = FirstEquation;
            this.SecondEquation = SecondEquation;
            this.FirstVariable = FirstVariable;
            this.SecondVariable = SecondVariable;
        }

        public SerializedEliminationExercise(EliminationExercise exercise)
        {
            this.Ordering = exercise.Ordering;
            this.Level = exercise.Level;
            this.FirstEquation = JsonSerializer.Serialize(exercise.FirstEquation);
            this.SecondEquation = JsonSerializer.Serialize(exercise.SecondEquation);
            this.FirstVariable = JsonSerializer.Serialize(exercise.FirstVariable);
            this.SecondVariable = JsonSerializer.Serialize(exercise.SecondVariable);
        }

        public EliminationExercise Deserialize()
        {
            return new EliminationExercise
            {
                Id = this.Id,
                Ordering = this.Ordering,
                Level = this.Level,
                FirstEquation = JsonSerializer.Deserialize<LinearEquation>(this.FirstEquation) ?? throw new ArgumentException(),
                SecondEquation = JsonSerializer.Deserialize<LinearEquation>(this.SecondEquation) ?? throw new ArgumentException(),
                FirstVariable = JsonSerializer.Deserialize<EliminationVariable>(this.FirstVariable) ?? throw new ArgumentException(),
                SecondVariable = JsonSerializer.Deserialize<EliminationVariable>(this.SecondVariable) ?? throw new ArgumentException()
            };
        }
    }

    public static class EliminationDBSettings
    {
        public const string TableName = "EliminationExercise";

        public const string TableScheme = "Id INTEGER PRIMARY KEY AUTOINCREMENT, Ordering INTEGER, Level INTEGER, FirstEquation TEXT, SecondEquation TEXT, FirstVariable TEXT, SecondVariable TEXT";

        public const string TableColumns = "(Id, Ordering, Level, FirstEquation, SecondEquation, FirstVariable, SecondVariable)";

        public const string TableValues = "(@Id, @Ordering, @Level, @FirstEquation, @SecondEquation, @FirstVariable, @SecondVariable)";
    }
}
