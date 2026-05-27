using System.Text.Json.Serialization;
using webapi.Models.Flexibility;

namespace webapi.Models.User
{
    public class User
    {
        public long? Id { get; set; }

        public string Username { get; set; }

        [JsonIgnore]
        public string Salt { get; set; }

        [JsonIgnore]
        public string Password { get; set; }

        public StudyType StudyType { get; set; }

        public int StudyId { get; set; }

        public AgentCondition? AgentCondition { get; set; }

        public string? ExpirationDate { get; set; }
    }

    public enum StudyType
    {
        CKStudy,
        FlexibilityStudy,
        FlexibilityTest
    }

    public enum Language
    {
        de,
        en
    }
}
