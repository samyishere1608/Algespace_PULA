using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using webapi.Models.Flexibility;
using webapi.Models.User;
using webapi.Services;

namespace webapi.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class UserController(IUserService userService) : Controller // Controller is only required for conducting studies, set scope is internal to hide actions
    {
        private readonly IUserService _userService = userService;

        [HttpPost(template: "authenticate")]
        public IActionResult Authenticate(AuthenticateRequest model)
        {
            var response = _userService.Authenticate(model);

            if (response == null)
            {
                return BadRequest("Username or password is incorrect.");
            }

            return Ok(response);
        }

        [HttpPut(template: "setUser")]
        public IActionResult SetUser(string username, string password, StudyType studyType, int studyId, string? expiratonDate, AgentCondition? agentCondition)
        {
            try
            {
                if (expiratonDate != null)
                {
                    DateTime date;
                    if (!DateTime.TryParseExact(expiratonDate, "yyyy-MM-ddTHH:mm:ss", CultureInfo.InvariantCulture, DateTimeStyles.None, out date))
                    {
                        if (DateTime.TryParseExact(expiratonDate, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out date))
                        {
                            expiratonDate += "T23:59:59";
                        }
                        else if (DateTime.TryParseExact(expiratonDate, "yyyy-MM-ddTHH", CultureInfo.InvariantCulture, DateTimeStyles.None, out date))
                        {
                            expiratonDate += ":59:59";
                        }
                        else if (DateTime.TryParseExact(expiratonDate, "yyyy-MM-ddTHH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out date))
                        {
                            expiratonDate += ":59";
                        }
                        else
                        {
                            return BadRequest($"Invalid expiration date: {expiratonDate}");
                        }
                    }
                }
                _userService.SetUser(username, password, studyType, studyId, agentCondition, expiratonDate);
                return Ok();
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }
    }
}
