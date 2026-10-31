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

        /// <summary>
        /// What the client needs to know about the study arm this account is in.
        ///
        /// "treatment" or "control" (see <see cref="StudentCondition"/>). It travels with the sign-in
        /// because every screen that differs does so from the first render after a login, and a second
        /// round trip to ask would leave the dashboard briefly visible to a control student.
        /// </summary>
        public string Condition { get; set; } = StudentCondition.Treatment;

        public StudentAuthResponse(Student student, string token)
        {
            Id = student.Id;
            Username = student.Username;
            Token = token;
            Condition = StudentCondition.Normalize(student.Condition);
        }
    }
}
