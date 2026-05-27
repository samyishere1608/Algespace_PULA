using webapi.Models.ConceptualKnowledge;

namespace webapi.Models.Studies.ConceptualKnowledge
{
    public class CreateEntryRequest
    {
        public CKExerciseType ExerciseType { get; set; }

        public long UserId { get; set; }

        public long StudyId { get; set; }

        public long ExerciseId { get; set; }
    }
}
