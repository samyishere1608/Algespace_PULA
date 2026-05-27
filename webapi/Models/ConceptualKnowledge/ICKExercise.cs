namespace webapi.Models.ConceptualKnowledge
{
    public interface ICKExercise
    {
        public long? Id { get; set; }

        public int? Ordering { get; set; }

        public int? Level { get; set; }
    }
}
