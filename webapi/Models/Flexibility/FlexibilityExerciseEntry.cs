
namespace webapi.Models.Flexibility
{
    public class FlexibilityExerciseEntry
    {
        public long? Id { get; set; }

        public FlexibilityExerciseType ExerciseType { get; set; }

        public long ExerciseId { get; set; }

        public FlexibilityExerciseEntry() { }

        public FlexibilityExerciseEntry(long Id, string ExerciseType, long ExerciseId) {
            this.Id = Id;
            if (Enum.TryParse(ExerciseType, out FlexibilityExerciseType type))
            {
                this.ExerciseType = type;
            }
            this.ExerciseId = ExerciseId;
        }
    }

    public class FlexibilityExerciseDBSettings
    {
        public const string TableName = "FlexibilityExercises";

        public const string TableScheme = "Id INTEGER PRIMARY KEY AUTOINCREMENT, ExerciseType TEXT, ExerciseId INTEGER";

        public const string TableColumns = "(Id, ExerciseType, ExerciseId)";

        public const string TableValues = "(@Id, @ExerciseType, @ExerciseId)";
    }
}
