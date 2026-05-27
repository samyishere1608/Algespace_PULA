using System.Security.Cryptography;
using System.Text;
using webapi.Models.Flexibility;

namespace webapi.Models.User
{
    public class SerializedUser
    {
        public long? Id { get; set; }

        public string Username { get; set; }

        public string Salt { get; set; }

        public string Password { get; set; }

        public StudyType StudyType { get; set; }

        public int StudyId { get; set; }

        public AgentCondition? AgentCondition { get; set; }

        public string? ExpirationDate { get; set; }

        public SerializedUser(long Id, string Username, string Salt, string Password, string StudyType, long StudyId, string? AgentCondition, string? ExpirationDate)
        {
            this.Id = Id;
            this.Username = Username;
            this.Salt = Salt;
            this.Password = Password;

            if (Enum.TryParse(StudyType, out StudyType type))
            {
                this.StudyType = type;
            }

            this.StudyId = (int)StudyId;

            if (AgentCondition != null)
            {
                if (Enum.TryParse(AgentCondition, out AgentCondition condition))
                {
                    this.AgentCondition = condition;
                }
            }

            this.ExpirationDate = ExpirationDate;
        }

        public SerializedUser(string username, string password, StudyType studyType, int studyId, AgentCondition? agentCondition, string? expirationDate)
        {
            Username = username;
            Salt = GenerateSalt();
            Password = GeneratePasswordHash(password, Salt);
            StudyType = studyType;
            StudyId = studyId;
            AgentCondition = agentCondition;
            ExpirationDate = expirationDate;
        }

        public User Deserialize()
        {
            return new User
            {
                Id = Id,
                Username = Username,
                Salt = Salt,
                Password = Password,
                StudyType = StudyType,
                StudyId = StudyId,
                AgentCondition=AgentCondition,
                ExpirationDate = ExpirationDate
            };
        }

        private static string GenerateSalt()
        {
            using var rng = RandomNumberGenerator.Create();
            byte[] salt = new byte[10];
            rng.GetNonZeroBytes(salt);
            return Convert.ToBase64String(salt);
        }

        public static string GeneratePasswordHash(string password, string salt)
        {
            string saltedPassword = string.Concat(password, salt);
            using var sha256 = SHA256.Create();
            byte[] hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(saltedPassword));
            return Convert.ToBase64String(hashBytes);
        }
    }

    public static class UserDBSettings
    {
        public const string TableName = "Users";

        public const string TableScheme = "Id INTEGER PRIMARY KEY AUTOINCREMENT, Username TEXT UNIQUE, Salt TEXT, Password TEXT, StudyType TEXT, StudyId INTEGER, AgentCondition TEXT, ExpirationDate TEXT";

        public const string TableColumns = "(Id, Username, Salt, Password, StudyType, StudyId, AgentCondition, ExpirationDate)";

        public const string TableValues = "(@Id, @Username, @Salt, @Password, @StudyType, @StudyId, @AgentCondition, @ExpirationDate)";
    }
}
