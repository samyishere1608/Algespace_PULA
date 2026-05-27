using Dapper;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using webapi.AuthHelpers;
using webapi.Models.Database;
using webapi.Models.Flexibility;
using webapi.Models.User;

namespace webapi.Services
{
    public interface IUserService
    {
        AuthenticateResponse? Authenticate(AuthenticateRequest model);

        User GetUserById(int id);

        void SetUser(string username, string password, StudyType studyType, int studyId, AgentCondition? agentCondition, string? expiratonDate);
    }

    public class UserService : IUserService
    {
        private readonly AuthSettings _authSettings;

        public UserService(IOptions<AuthSettings> appSettings)
        {
            _authSettings = appSettings.Value;
        }

        public AuthenticateResponse? Authenticate(AuthenticateRequest model)
        {
            User? user = null;
            using (var connection = DBSettings.GetSQLiteConnectionForStudiesDB())
            {
                connection.Open();
                string query = $"SELECT * FROM {UserDBSettings.TableName} WHERE Username = @Username";
                var serializedUser = connection.QueryFirstOrDefault<SerializedUser>(query, new { model.Username });

                if (serializedUser == null)
                {
                    return null;
                }

                var passwordHash = SerializedUser.GeneratePasswordHash(model.Password, serializedUser.Salt);

                if (passwordHash.Equals(serializedUser.Password))
                {
                    user = serializedUser.Deserialize();
                }
            }

            if (user == null)
            {
                return null;
            }

            var token = GenerateJwtToken(user);
            return new AuthenticateResponse(user, token);
        }

        private string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();

            var key = Encoding.ASCII.GetBytes(_authSettings.Secret);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[] { new Claim("id", user.Id.ToString()) }),
                Expires = DateTime.UtcNow.AddHours(3),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);

            return tokenHandler.WriteToken(token);
        }

        public User GetUserById(int id)
        {
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();
            var serializedUser = connection.QueryFirstOrDefault<SerializedUser>(DBUtils.GetObjectByIdQuery(UserDBSettings.TableName), new { Id = id }) ?? throw new InvalidOperationException();
            return serializedUser.Deserialize();
        }

        public void SetUser(string username, string password, StudyType studyType, int studyId, AgentCondition? agentCondition, string? expiratonDate)
        {
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();
            DBUtils.CreateOrClearTable(connection, UserDBSettings.TableName, UserDBSettings.TableScheme, false);
            string query = $"INSERT INTO {UserDBSettings.TableName} {UserDBSettings.TableColumns} VALUES {UserDBSettings.TableValues}";
            connection.Execute(query, new SerializedUser(username, password, studyType, studyId, agentCondition, expiratonDate));
        }
    }
}
