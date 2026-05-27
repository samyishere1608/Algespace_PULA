namespace webapi.Models.Studies.ConceptualKnowledge
{
    public interface ICKStudyData
    {
        public long? Id { get; set; }

        public long UserId { get; set; }

        public long StudyId { get; set; }

        public long ExerciseId { get; set; }

        public float TotalTime { get; set; }

        public int RequestedHints { get; set; }
    }
}
