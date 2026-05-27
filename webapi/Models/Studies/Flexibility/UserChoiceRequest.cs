namespace webapi.Models.Studies.Flexibility
{
    public class UserChoiceRequest
    {
        public long UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public long StudyId { get; set; }
        public long RowId { get; set; }
        public string ColumnName { get; set; } = string.Empty;
    }
}
