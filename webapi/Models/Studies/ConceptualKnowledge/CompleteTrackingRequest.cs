using webapi.Models.ConceptualKnowledge;

namespace webapi.Models.Studies.ConceptualKnowledge
{
    public class CompleteTrackingRequest
    {
        public CKExerciseType ExerciseType { get; set; }

        public long Id { get; set; }

        public float Time { get; set; }

        public int Hints { get; set; }

        public int Errors { get; set; }

        public EqualizationPhase? EqualizationPhase { get; set; }

        public SubstitutionPhase? SubstitutionPhase { get; set; }
    }
}
