namespace webapi.Models.Studies.Flexibility
{
    public class TrackFlexibilityActionRequest
    {
        public required long UserId { get; set; }

        public required string Username { get; set; }

        public required long StudyId { get; set; }

        public required long Id { get; set; }

        public required FlexibilityExerciseActionPhase Phase { get; set; }

        public required string Action { get; set; }
    }
}
