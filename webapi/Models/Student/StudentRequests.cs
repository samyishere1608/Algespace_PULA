using System.ComponentModel.DataAnnotations;

namespace webapi.Models.Student
{
    public class StudentRegisterRequest
    {
        [Required]
        [MinLength(3)]
        [MaxLength(20)]
        public string Username { get; set; }

        [Required]
        [MinLength(6)]
        [MaxLength(50)]
        public string Password { get; set; }
    }

    public class StudentAuthRequest
    {
        [Required]
        public string Username { get; set; }

        [Required]
        public string Password { get; set; }
    }

    public class StudentAuthResponse
    {
        public long Id { get; set; }

        public string Username { get; set; }

        public string Token { get; set; }

        public StudentAuthResponse(Student student, string token)
        {
            Id = student.Id;
            Username = student.Username;
            Token = token;
        }
    }
}
