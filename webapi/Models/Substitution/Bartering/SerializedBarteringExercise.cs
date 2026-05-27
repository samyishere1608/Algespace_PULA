using System.Text.Json;
using webapi.Models.Math;

namespace webapi.Models.Substitution.Bartering
{
    public class SerializedBarteringExercise
    {
        public long? Id { get; set; }

        public int? Ordering { get; set; }

        public int? Level { get; set; }

        public string LinearEquation { get; set; }

        public string FirstMerchant { get; set; }

        public string SecondMerchant { get; set; }

        public string ThirdMerchant { get; set; }

        public SerializedBarteringExercise(long Id, long? Ordering, long? Level, string LinearEquation, string FirstMerchant, string SecondMerchant, string ThirdMerchant)
        {
            this.Id = Id;
            this.Ordering = Ordering != null ? (int)Ordering : null;
            this.Level = Level != null ? (int)Level : null;
            this.LinearEquation = LinearEquation;
            this.FirstMerchant = FirstMerchant;
            this.SecondMerchant = SecondMerchant;
            this.ThirdMerchant = ThirdMerchant;
        }

        public SerializedBarteringExercise(BarteringExercise exercise)
        {
            Ordering = exercise.Ordering;
            Level = exercise.Level;
            LinearEquation = JsonSerializer.Serialize(exercise.LinearEquation);
            FirstMerchant = JsonSerializer.Serialize(exercise.FirstMerchant);
            SecondMerchant = JsonSerializer.Serialize(exercise.SecondMerchant);
            ThirdMerchant = JsonSerializer.Serialize(exercise.ThirdMerchant);
        }

        public BarteringExercise Deserialize()
        {
            return new BarteringExercise
            {
                Id = Id,
                Ordering = Ordering,
                Level = Level,
                LinearEquation = JsonSerializer.Deserialize<LinearEquation>(LinearEquation) ?? throw new ArgumentException(),
                FirstMerchant = JsonSerializer.Deserialize<Merchant>(FirstMerchant) ?? throw new ArgumentException(),
                SecondMerchant = JsonSerializer.Deserialize<Merchant>(SecondMerchant) ?? throw new ArgumentException(),
                ThirdMerchant = JsonSerializer.Deserialize<Merchant>(ThirdMerchant) ?? throw new ArgumentException()
            };
        }
    }

    public static class BarteringDBSettings
    {
        public const string TableName = "BarteringExercises";

        public const string TableScheme = "Id INTEGER PRIMARY KEY AUTOINCREMENT, Ordering INTEGER, Level INTEGER, LinearEquation TEXT, FirstMerchant TEXT, SecondMerchant TEXT, ThirdMerchant TEXT";

        public const string TableColumns = "(Id, Ordering, Level, LinearEquation, FirstMerchant, SecondMerchant, ThirdMerchant)";

        public const string TableValues = "(@Id, @Ordering, @Level, @LinearEquation, @FirstMerchant, @SecondMerchant, @ThirdMerchant)";
    }
}
