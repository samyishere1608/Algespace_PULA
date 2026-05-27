using System.Data.SQLite;

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

        public static SQLiteConnection GetSQLiteConnectionForExercisesDB()
        {
            return new SQLiteConnection("Data Source=" + GetDBLocation(AlgeSpaceDB));
        }

        public static SQLiteConnection GetSQLiteConnectionForStudiesDB()
        {
            return new SQLiteConnection("Data Source=" + GetDBLocation(StudiesDB));
        }

        public static SQLiteConnection GetSQLiteConnectionForStudentsDB()
        {
            return new SQLiteConnection("Data Source=" + GetDBLocation(StudentsDB));
        }
    }
}
