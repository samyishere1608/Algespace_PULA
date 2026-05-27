namespace webapi.Models.Studies.Flexibility
{
    public class CompleteFlexibilityTrackingRequest
    {
        public required long UserId { get; set; }

        public required string Username { get; set; }

        public required long StudyId { get; set; }

        public required long Id { get; set; }

        public required float Time { get; set; }

        public required int Errors { get; set; }

        public required int Hints { get; set; }

        public FlexibilityExercisePhase? Phase { get; set; }

        public string? Choice { get; set; }
    }
}
