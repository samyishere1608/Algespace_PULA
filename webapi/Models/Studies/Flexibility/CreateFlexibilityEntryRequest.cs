using webapi.Models.Flexibility;

namespace webapi.Models.Studies.Flexibility
{
    public class CreateFlexibilityEntryRequest
    {
        public required long UserId { get; set; }

        public required string Username { get; set; }

        public required long StudyId { get; set; }

        public required long FlexibilityId { get; set; }

        public required long ExerciseId { get; set; }

        public required FlexibilityExerciseType ExerciseType { get; set; }

        public required AgentCondition AgentCondition { get; set; }

        public AgentType? AgentType { get; set; }

        /// <summary>
        /// True when this attempt belongs to a study run.
        ///
        /// Only our own store reads this, and it is the only way to tell a study attempt from a
        /// practice one once both are in the same table. The study controller ignores it — the shape
        /// of this request is shared so the tracker can post the same body to both destinations,
        /// and adding a field here is what keeps that possible.
        /// </summary>
        public bool IsStudy { get; set; }
    }
}
