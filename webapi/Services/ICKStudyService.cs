using Dapper;
using System.Text.Json;
using webapi.Models.Database;
using webapi.Models.Studies.ConceptualKnowledge;

namespace webapi.Services
{
    public interface ICKStudyService
    {
        void AddStudy(long studyId, List<CKStudyExercise> exercises);

        List<CKStudyExercise>? GetExercises(long studyId);

        int InitializeEntry(ICKStudyData data, string tableName, string tableScheme, string tableColumns, string tableValues);

        void AddActionToEntry(long id, string action, string tableName);

        void AddActionToEqualizationOrSubstitutionEntry(long id, string phase, string action, string tableName);

        void TrackChoiceForEliminationEntry(long id, EliminationChoice choice);

        void CompleteTrackingForEntry(long id, float time, int hints, int errors, string tableName);

        void CompletePhaseTrackingForEqualizationEntry(long id, EqualizationPhase phase, float time, int hints, int errors);

        void CompletePhaseTrackingForSubstitutionEntry(long id, SubstitutionPhase phase, float time, int hints, int errors);
    }

    public class CKStudyService : ICKStudyService
    {
        public void AddStudy(long studyId, List<CKStudyExercise> exercises)
        {
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();

            CKStudy study = new(studyId);

            DBUtils.CreateOrClearTable(connection, CKStudyDBSettings.TableName, CKStudyDBSettings.TableScheme, false);
            string inserQuery = $"INSERT INTO {CKStudyDBSettings.TableName} {CKStudyDBSettings.TableColumns} VALUES {CKStudyDBSettings.TableValues}";
            connection.Execute(inserQuery, study);

            DBUtils.CreateOrClearTable(connection, study.TableName, CKStudyExerciseDBSettings.TableScheme, true);
            inserQuery = $"INSERT INTO {study.TableName} {CKStudyExerciseDBSettings.TableColumns} VALUES {CKStudyExerciseDBSettings.TableValues}";
            foreach (CKStudyExercise exercise in exercises)
            {
                connection.Execute(inserQuery, exercise);
            }
        }

        public List<CKStudyExercise>? GetExercises(long studyId)
        {
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();
            string query = $"SELECT TableName FROM {CKStudyDBSettings.TableName} WHERE StudyId = @Id";
            string? tableName = connection.ExecuteScalar<string>(query, new { Id = studyId });

            if(tableName == null)
            {
                return null;
            }

            query = $"SELECT * FROM {tableName}";
            var result = connection.Query<CKStudyExercise>(query);
            return result.ToList();
        }

        public int InitializeEntry(ICKStudyData data, string tableName, string tableScheme, string tableColumns, string tableValues)
        {
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();
            DBUtils.CreateOrClearTable(connection, tableName, tableScheme, false);
            string inserQuery = $"INSERT INTO {tableName} {tableColumns} VALUES {tableValues}; SELECT last_insert_rowid()";
            int id = connection.ExecuteScalar<int>(inserQuery, data);
            return id;
        }

        public void AddActionToEntry(long id, string action, string tableName)
        {
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();
            string query = $"SELECT Actions FROM {tableName} WHERE Id = @Id";
            string? previousActions = connection.ExecuteScalar<string>(query, new { Id = id });
            query = $"UPDATE {tableName} SET Actions = @Actions WHERE Id = @Id";
            if (!string.IsNullOrEmpty(previousActions))
            {
                connection.Execute(query, new { Actions = previousActions + ",\n" + action, Id = id });
            }
            else
            {
                connection.Execute(query, new { Actions = action, Id = id });
            }
        }

        public void AddActionToEqualizationOrSubstitutionEntry(long id, string phase, string action, string tableName)
        {
            string columnName = "Actions" + phase;
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();
            string query = $"SELECT {columnName} FROM {tableName} WHERE Id = @Id";
            string? previousActions = connection.ExecuteScalar<string>(query, new { Id = id });
            query = $"UPDATE {tableName} SET {columnName} = @Actions WHERE Id = @Id";
            if (!string.IsNullOrEmpty(previousActions))
            {
                connection.Execute(query, new { Actions = previousActions + ",\n" + action, Id = id });
            }
            else
            {
                connection.Execute(query, new { Actions = action, Id = id });
            }
        }

        public void TrackChoiceForEliminationEntry(long id, EliminationChoice choice)
        {
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();
            string query = $"UPDATE {EliminationStudyDBSettings.TableName} SET Choice = @Choice WHERE Id = @Id";
            connection.Execute(query, new { Choice = choice.ToString(), Id = id });
        }

        public void CompleteTrackingForEntry(long id, float time, int hints, int errors, string tableName)
        {
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();
            string query = $"UPDATE {tableName} SET TotalTime = @Time, RequestedHints = @Hints, TotalErrors = @Errors WHERE Id = @Id";
            connection.Execute(query, new { Time = time, Hints = hints, Errors = errors, Id = id });
        }

        public void CompletePhaseTrackingForEqualizationEntry(long id, EqualizationPhase phase, float time, int hints, int errors)
        {
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();
            string query = $"UPDATE {EqualizationStudyDBSettings.TableName} SET {phase} = @Column WHERE Id = @Id";
            string columnData = JsonSerializer.Serialize(new EqualizationPhaseData { Time = time, Hints = hints, Errors = errors });
            connection.Execute(query, new { Column = columnData, Id = id });
        }

        public void CompletePhaseTrackingForSubstitutionEntry(long id, SubstitutionPhase phase, float time, int hints, int errors)
        {
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();
            string query = $"UPDATE {SubstitutionStudyDBSettings.TableName} SET {phase} = @Column WHERE Id = @Id";
            string columnData = JsonSerializer.Serialize(new SubstitutionPhaseData { Time = time, Hints = hints, Errors = errors });
            connection.Execute(query, new { Column = columnData, Id = id });
        }
    }
}