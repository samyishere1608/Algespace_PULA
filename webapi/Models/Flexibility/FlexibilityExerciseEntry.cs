
namespace webapi.Models.Flexibility
{
    public class FlexibilityExerciseEntry
    {
        public long? Id { get; set; }

        public FlexibilityExerciseType ExerciseType { get; set; }

        public long ExerciseId { get; set; }

        /// <summary>
        /// The solving method this exercise is about, or null for the kinds that do not carry one.
        ///
        /// ONLY Matching fills this in, and only because Matching shows the student the method before
        /// they start: it gives them a method and asks for the system, so the list may say which
        /// method without telling them anything they are about to be graded on.
        ///
        /// Efficiency is deliberately left null even though every efficiency exercise also has a
        /// method baked into it. There the student's whole decision IS "which method is quickest
        /// here", so shipping that method to the client would hand over the answer through the
        /// exercise list. Suitability is null because the student chooses the method themselves and
        /// there is nothing fixed to name.
        /// </summary>
        public string? Method { get; set; }

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

        public const string TableScheme = "Id INTEGER PRIMARY KEY AUTOINCREMENT, ExerciseType TEXT, ExerciseId INTEGER, Method TEXT";

        public const string TableColumns = "(Id, ExerciseType, ExerciseId, Method)";

        public const string TableValues = "(@Id, @ExerciseType, @ExerciseId, @Method)";
    }
}
