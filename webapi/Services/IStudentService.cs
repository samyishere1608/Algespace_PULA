using Dapper;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using webapi.AuthHelpers;
using webapi.Models.Database;
using webapi.Models.Student;

namespace webapi.Services
{
    public interface IStudentService
    {
        /// <summary>Returns false if the username is already taken.</summary>
        bool Register(StudentRegisterRequest request);

        /// <summary>Returns null if credentials are invalid.</summary>
        StudentAuthResponse? Authenticate(StudentAuthRequest request);
    }

    public class StudentService : IStudentService
    {
        private readonly AuthSettings _authSettings;

        public StudentService(IOptions<AuthSettings> authSettings)
        {
            _authSettings = authSettings.Value;
        }

        public bool Register(StudentRegisterRequest request)
        {
            using var connection = DBSettings.GetSQLiteConnectionForStudentsDB();
            connection.Open();

            // Ensure Students table exists
            DBUtils.CreateOrClearTable(connection, StudentDBSettings.TableName, StudentDBSettings.TableScheme, clearTable: false);

            // Check username uniqueness
            //
            // COLLATE NOCASE, because the column's own UNIQUE is case-sensitive: without it "Pula-01"
            // and "pula-01" would be two accounts that a student cannot tell apart, and one of them
            // would answer "username is already taken" the next time they tried to register it.
            string checkQuery = $"SELECT COUNT(1) FROM {StudentDBSettings.TableName} WHERE Username = @Username COLLATE NOCASE";
            int count = connection.ExecuteScalar<int>(checkQuery, new { request.Username });
            if (count > 0)
            {
                return false;
            }

            var serialized = new SerializedStudent(request.Username.Trim(), request.Password);
            string insertQuery = $"INSERT INTO {StudentDBSettings.TableName} {StudentDBSettings.TableColumns} VALUES {StudentDBSettings.TableValues}";
            connection.Execute(insertQuery, serialized);
            return true;
        }

        public StudentAuthResponse? Authenticate(StudentAuthRequest request)
        {
            using var connection = DBSettings.GetSQLiteConnectionForStudentsDB();
            connection.Open();

            // Case-insensitive, and trimmed: a tablet keyboard capitalises the first letter of a
            // username as readily as of a sentence, and a student typing "Jp-test-student-001" means the
            // account that exists. Trimming covers the trailing space a paste or an autocorrect adds.
            string query = $"SELECT * FROM {StudentDBSettings.TableName} WHERE Username = @Username COLLATE NOCASE";
            var serialized = connection.QueryFirstOrDefault<SerializedStudent>(query, new { Username = request.Username.Trim() });

            if (serialized == null)
            {
                return null;
            }

            var hash = SerializedStudent.GeneratePasswordHash(request.Password, serialized.Salt);
            if (!hash.Equals(serialized.Password))
            {
                return null;
            }

            var student = serialized.Deserialize();
            var token = GenerateJwtToken(student);
            return new StudentAuthResponse(student, token);
        }

        private string GenerateJwtToken(Student student)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_authSettings.Secret);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim("id", student.Id.ToString()),
                    new Claim("type", "student")
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}
