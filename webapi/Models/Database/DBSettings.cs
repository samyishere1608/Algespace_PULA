using Microsoft.Data.Sqlite;

namespace webapi.Models.Database
{
    public static class DBSettings
    {
        public const string AlgeSpaceDB = "algespace.db";
        public const string StudiesDB = "studies.db";
        public const string StudentsDB = "students.db";

        public static string GetDBLocation(string dbName)
        {
            return Environment.CurrentDirectory + "/Data/databases/" + dbName;
        }

        public static SqliteConnection GetSQLiteConnectionForExercisesDB()
        {
            return new SqliteConnection("Data Source=" + GetDBLocation(AlgeSpaceDB));
        }

        public static SqliteConnection GetSQLiteConnectionForStudiesDB()
        {
            return new SqliteConnection("Data Source=" + GetDBLocation(StudiesDB));
        }

        public static SqliteConnection GetSQLiteConnectionForStudentsDB()
        {
            return new SqliteConnection("Data Source=" + GetDBLocation(StudentsDB));
        }
    }
}
