using webapi.Models.ConceptualKnowledge;

namespace webapi.Models.Studies.ConceptualKnowledge
{
    public class TrackActionRequest
    {
        public CKExerciseType ExerciseType { get; set; }

        public long Id { get; set; }

        public required string Action { get; set; }

        public EqualizationPhase? EqualizationPhase { get; set; }

        public SubstitutionPhase? SubstitutionPhase { get; set; }
    }
}
