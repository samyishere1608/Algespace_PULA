using webapi.Models.ConceptualKnowledge;

namespace webapi.Models.Studies.ConceptualKnowledge
{
    public class CKStudyExercise
    {
        public long? Id { get; set; }

        public CKExerciseType ExerciseType { get; set; }

        public long ExerciseId { get; set; }

        public CKStudyExercise() { }

        public CKStudyExercise(long Id, string ExerciseType, long ExerciseId) {
            this.Id = Id;
            if (Enum.TryParse(ExerciseType, out CKExerciseType type))
            {
                this.ExerciseType = type;
            }
            this.ExerciseId = ExerciseId;
        }
    }

    public class CKStudyExerciseDBSettings
    {
        public const string TableScheme = "Id INTEGER PRIMARY KEY AUTOINCREMENT, ExerciseType TEXT, ExerciseId INTEGER";

        public const string TableColumns = "(Id, ExerciseType, ExerciseId)";

        public const string TableValues = "(@Id, @ExerciseType, @ExerciseId)";
    }
}
