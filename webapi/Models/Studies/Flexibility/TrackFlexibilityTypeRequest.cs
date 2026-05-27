namespace webapi.Models.Studies.Flexibility
{
    public class TrackFlexibilityTypeRequest
    {
        public required long UserId { get; set; }

        public required string Username { get; set; }

        public required long StudyId { get; set; }

        public required long Id { get; set; }

        public required FlexibilityExerciseChoicePhase Phase { get; set; }

        public required int Type { get; set; }
    }
}
