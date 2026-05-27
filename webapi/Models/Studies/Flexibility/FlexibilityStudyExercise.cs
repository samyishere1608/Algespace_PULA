using webapi.Models.Flexibility;

namespace webapi.Models.Studies.Flexibility
{
    public class FlexibilityStudyExercise
    {
        public long? Id { get; set; }

        public FlexibilityExerciseType ExerciseType { get; set; }

        public long ExerciseId { get; set; }

        public FlexibilityStudyExercise() { }

        public FlexibilityStudyExercise(long Id, string ExerciseType, long ExerciseId)
        {
            this.Id = Id;
            if (Enum.TryParse(ExerciseType, out FlexibilityExerciseType type))
            {
                this.ExerciseType = type;
            }
            this.ExerciseId = ExerciseId;
        }
    }

    public class FlexibilityStudyExerciseDBSettings
    {
        public const string TableScheme = "Id INTEGER PRIMARY KEY AUTOINCREMENT, ExerciseType TEXT, ExerciseId INTEGER";

        public const string TableColumns = "(Id, ExerciseType, ExerciseId)";

        public const string TableValues = "(@Id, @ExerciseType, @ExerciseId)";
    }
}
