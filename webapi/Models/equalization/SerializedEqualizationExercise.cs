using System.Text.Json;

namespace webapi.Models.Equalization
{
    public class SerializedEqualizationExercise
    {
        public long? Id { get; set; }

        public int? Ordering { get; set; }

        public int? Level { get; set; }

        public string FirstEquation { get; set; }

        public string SecondEquation { get; set; }

        public string IsolatedVariable { get; set; }

        public string SecondVariable { get; set; }

        public string EqualizedScale { get; set; }

        public string SimplifiedScale { get; set; }

        public string? AdditionalWeights { get; set; }

        public ScaleAllocation ScaleAllocation { get; set; }

        public int? MaximumCapacity { get; set; }

        public SerializedEqualizationExercise(long Id, long? Ordering, long? Level, string FirstEquation, string SecondEquation, string IsolatedVariable, string SecondVariable, string EqualizedScale, string SimplifiedScale, string? AdditionalWeights, string ScaleAllocation, long? MaximumCapacity)
        {
            this.Id = Id;
            this.Ordering = Ordering != null ? (int)Ordering : null;
            this.Level = Level != null ? (int)Level : null;
            this.FirstEquation = FirstEquation;
            this.SecondEquation = SecondEquation;
            this.IsolatedVariable = IsolatedVariable;
            this.SecondVariable = SecondVariable;
            this.EqualizedScale = EqualizedScale;
            this.SimplifiedScale = SimplifiedScale;
            this.AdditionalWeights = AdditionalWeights;

            if (Enum.TryParse(ScaleAllocation, out ScaleAllocation allocation))
            {
                this.ScaleAllocation = allocation;
            }

            if (MaximumCapacity != null)
            {
                this.MaximumCapacity = (int)MaximumCapacity;
            }
        }

        public SerializedEqualizationExercise(EqualizationExercise exercise)
        {
            this.Ordering = exercise.Ordering;
            this.Level = exercise.Level;
            this.FirstEquation = JsonSerializer.Serialize(exercise.FirstEquation);
            this.SecondEquation = JsonSerializer.Serialize(exercise.SecondEquation);
            this.IsolatedVariable = JsonSerializer.Serialize(exercise.IsolatedVariable);
            this.SecondVariable = JsonSerializer.Serialize(exercise.SecondVariable);
            this.EqualizedScale = JsonSerializer.Serialize(exercise.EqualizedScale);
            this.SimplifiedScale = JsonSerializer.Serialize(exercise.SimplifiedScale);
            this.AdditionalWeights = JsonSerializer.Serialize(exercise.AdditionalWeights);
            this.ScaleAllocation = exercise.ScaleAllocation;
            this.MaximumCapacity = exercise.MaximumCapacity;
        }

        public EqualizationExercise Deserialize()
        {
            return new EqualizationExercise
            {
                Id = this.Id,
                Ordering = this.Ordering,
                Level = this.Level,
                FirstEquation = JsonSerializer.Deserialize<EqualizationEquation>(this.FirstEquation) ?? throw new ArgumentException(),
                SecondEquation = JsonSerializer.Deserialize<EqualizationEquation>(this.SecondEquation) ?? throw new ArgumentException(),
                IsolatedVariable = JsonSerializer.Deserialize<EqualizationVariable>(this.IsolatedVariable) ?? throw new ArgumentException(),
                SecondVariable = JsonSerializer.Deserialize<EqualizationVariable>(this.SecondVariable) ?? throw new ArgumentException(),
                EqualizedScale = JsonSerializer.Deserialize<Scale>(this.EqualizedScale) ?? throw new ArgumentException(),
                SimplifiedScale = JsonSerializer.Deserialize<Scale>(this.SimplifiedScale) ?? throw new ArgumentException(),
                AdditionalWeights = this.AdditionalWeights != null ? (JsonSerializer.Deserialize<Dictionary<Weight, int>?>(this.AdditionalWeights) ?? throw new ArgumentException()) : null,
                ScaleAllocation = this.ScaleAllocation,
                MaximumCapacity = this.MaximumCapacity
            };
        }
    }

    public static class EqualizationDBSettings
    {
        public const string TableName = "EqualizationExercises";

        public const string TableScheme = "Id INTEGER PRIMARY KEY AUTOINCREMENT, Ordering INTEGER, Level INTEGER, FirstEquation TEXT, SecondEquation TEXT, IsolatedVariable TEXT, SecondVariable TEXT, EqualizedScale TEXT, SimplifiedScale TEXT, AdditionalWeights TEXT, ScaleAllocation TEXT, MaximumCapacity INTEGER";

        public const string TableColumns = "(Id, Ordering, Level, FirstEquation, SecondEquation, IsolatedVariable, SecondVariable, EqualizedScale, SimplifiedScale, AdditionalWeights, ScaleAllocation, MaximumCapacity)";

        public const string TableValues = "(@Id, @Ordering, @Level, @FirstEquation, @SecondEquation, @IsolatedVariable, @SecondVariable, @EqualizedScale, @SimplifiedScale, @AdditionalWeights, @ScaleAllocation, @MaximumCapacity)";
    }
}
