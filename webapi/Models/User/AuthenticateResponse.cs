using webapi.Models.Flexibility;

namespace webapi.Models.User
{
    public class AuthenticateResponse(User user, string token)
    {
        public long? Id { get; set; } = user.Id;

        public string Username { get; set; } = user.Username;

        public StudyType StudyType { get; set; } = user.StudyType;

        public int StudyId { get; set; } = user.StudyId;

        public AgentCondition? AgentCondition { get; set; } = user.AgentCondition;

        public string? ExpirationDate { get; set; } = user.ExpirationDate;

        public string Token { get; set; } = token;
    }
}
