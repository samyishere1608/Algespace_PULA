namespace webapi.Models.Student
{
    public class Student
    {
        public long Id { get; set; }

        public string Username { get; set; }

        public string CreatedAt { get; set; }

        /// <summary>"treatment" or "control". See <see cref="StudentCondition"/>.</summary>
        public string Condition { get; set; } = StudentCondition.Treatment;
    }
}
