using Microsoft.AspNetCore.Mvc;
using webapi.Models.Student;
using webapi.Services;

namespace webapi.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class StudentController(IStudentService studentService) : ControllerBase
    {
        private readonly IStudentService _studentService = studentService;

        [HttpPost("register")]
        public IActionResult Register([FromBody] StudentRegisterRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            bool success = _studentService.Register(request);

            if (!success)
            {
                return Conflict("Username is already taken.");
            }

            return Ok();
        }

        [HttpPost("authenticate")]
        public IActionResult Authenticate([FromBody] StudentAuthRequest request)
        {
            var response = _studentService.Authenticate(request);

            if (response == null)
            {
                return BadRequest("Username or password is incorrect.");
            }

            return Ok(response);
        }
    }
}
