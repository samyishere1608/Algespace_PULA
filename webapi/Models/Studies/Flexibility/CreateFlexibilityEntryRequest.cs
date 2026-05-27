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
    }
}
