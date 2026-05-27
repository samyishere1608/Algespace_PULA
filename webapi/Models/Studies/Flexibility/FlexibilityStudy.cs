namespace webapi.Models.Studies.Flexibility
{
    public class FlexibilityStudy
    {
        public long? Id { get; set; }

        public long StudyId { get; set; }

        public string TableName { get; set; }

        public FlexibilityStudy() { }

        public FlexibilityStudy(long studyId)
        {
            this.StudyId = studyId;
            this.TableName = $"FlexibilityStudy_{studyId}";
        }
    }

    public static class FlexibilityStudyDBSettings
    {
        public const string TableName = "FlexibilityStudies";

        public const string TableScheme = "Id INTEGER PRIMARY KEY AUTOINCREMENT, StudyId INTEGER UNIQUE, TableName TEXT";

        public const string TableColumns = "(Id, StudyId, TableName)";

        public const string TableValues = "(@Id, @StudyId, @TableName)";
    }
}
