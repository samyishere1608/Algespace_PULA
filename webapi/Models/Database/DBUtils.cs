using Dapper;
using System.Data.SQLite;

namespace webapi.Models.Database
{
    public static class DBUtils
    {
        public static void CreateOrClearTable(SQLiteConnection connection, string tableName, string tableScheme, bool clearTable = true)
        {
            string checkTableExistsQuery = "SELECT name FROM sqlite_master WHERE type='table' AND name=@TableName;";
            var result = connection.Query<string>(checkTableExistsQuery, new { TableName = tableName });

            if (result != null && result.Any())
            {
                if (clearTable)
                {
                    // If the table exists, clear it and reset the AUTOINCREMENT counter
                    string clearTableQuery = $"DELETE FROM {tableName};";
                    connection.Execute(clearTableQuery);
                    // Reset sqlite_sequence so IDs start at 1 again after re-seeding
                    connection.Execute("DELETE FROM sqlite_sequence WHERE name=@TableName;", new { TableName = tableName });
                }
            }
            else
            {
                // If the table doesn't exist, create it
                string createTableQuery = $@"
                CREATE TABLE {tableName}
                (
                    {tableScheme}
                );";
                connection.Execute(createTableQuery);
            }
        }

        public static List<ExerciseResponse> GetExerciseIdsFromTable(string dbName, string tableName)
        {
            List<ExerciseResponse> ids;
            using (var connection = new SQLiteConnection("Data Source=" + DBSettings.GetDBLocation(dbName)))
            {
                connection.Open();
                string selectQuery = $"SELECT Id, Level FROM {tableName} ORDER BY Ordering ASC NULLS LAST";
                var result = connection.Query<ExerciseResponse>(selectQuery);
                ids = result.ToList();
            }
            return ids;
        }

        public static string GetObjectByIdQuery(string tableName)
        {
            return $"SELECT * FROM {tableName} WHERE Id = @Id"; // Use parameterized queries to prevent injection attacks
        }
    }
}
