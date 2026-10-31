using System.Security.Cryptography;
using System.Text;

namespace webapi.Models.Student
{
    public class SerializedStudent
    {
        public long Id { get; set; }

        public string Username { get; set; }

        public string Salt { get; set; }

        public string Password { get; set; }

        public string CreatedAt { get; set; }

        /// <summary>
        /// "treatment" or "control" — see <see cref="StudentCondition"/>.
        ///
        /// Mapped from the column Dapper reads, and normalised on the way out so a value that predates this
        /// property, or one written by hand with different casing, arrives as the treatment arm.
        /// </summary>
        public string Condition { get; set; } = StudentCondition.Treatment;

        // Parameterless constructor for Dapper property mapping
        public SerializedStudent() { }

        // Constructor used when creating a new student
        public SerializedStudent(string username, string password)
        {
            Username = username;
            Salt = GenerateSalt();
            Password = GeneratePasswordHash(password, Salt);
            CreatedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss");
        }

        public Student Deserialize()
        {
            return new Student
            {
                Id = Id,
                Username = Username,
                CreatedAt = CreatedAt,
                Condition = StudentCondition.Normalize(Condition)
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

    public static class StudentDBSettings
    {
        public const string TableName = "Students";

        public const string TableScheme = "Id INTEGER PRIMARY KEY AUTOINCREMENT, Username TEXT UNIQUE NOT NULL, Salt TEXT NOT NULL, Password TEXT NOT NULL, CreatedAt TEXT NOT NULL, Condition TEXT NOT NULL DEFAULT 'treatment'";

        // Condition is deliberately NOT in the column list: every account this app creates is treatment,
        // and letting the DEFAULT decide is what makes that true without the insert having to know the
        // column exists. The admin route is the only thing that writes it.
        public const string TableColumns = "(Username, Salt, Password, CreatedAt)";

        public const string TableValues = "(@Username, @Salt, @Password, @CreatedAt)";
    }
}
