namespace webapi.Models.Studies.ConceptualKnowledge
{
    public class CKStudy
    {
        public long? Id { get; set; }

        public long StudyId { get; set; }

        public string TableName { get; set; }

        public CKStudy() { }

        public CKStudy(long studyId) {
            this.StudyId = studyId;
            this.TableName = $"CKStudy_{studyId}";
        }
    }

    public static class CKStudyDBSettings
    {
        public const string TableName = "CKStudies";

        public const string TableScheme = "Id INTEGER PRIMARY KEY AUTOINCREMENT, StudyId INTEGER UNIQUE, TableName TEXT";

        public const string TableColumns = "(Id, StudyId, TableName)";

        public const string TableValues = "(@Id, @StudyId, @TableName)";
    }
}
