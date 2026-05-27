using System.Text.Json;
using Dapper;
using webapi.Models.Database;
using webapi.Models.Studies.Flexibility;

namespace webapi.Services
{
    public interface IFlexibilityStudyService
    {
        void AddStudy(long studyId, List<FlexibilityStudyExercise> exercises);

        List<FlexibilityStudyExercise>? GetExercises(long studyId);

        int InitializeEntry(FlexibilityStudyData data, string username);

        void AddActionToEntry(long userId, string username, long studyId, long rowId, string columnName, string action);

        void TrackChoice(long userId, string username, long studyId, long rowId, string columnName, string choice);

        void TrackType(long userId, string username, long studyId, long rowId, string columnName, int type);

        void CompleteTrackingForEntry(long userId, string username, long studyId, long rowId, float time, int errors, int hints);

       void CompletePhaseTrackingForEntry(long userId, string username, long studyId, long rowId, string columnName, float time, int errors, int hints);

        void CompletePhaseTrackingForComparisonOrResolveEntry(long userId, string username, long studyId, long rowId, string columnName, float time, int errors, int hints, string choice);

        int GetProgress(long userId, string username, long studyId);

        int GetLastErrors(long userId, string username, long studyId, bool total, string exercise, int limit, bool optional, int op_int, string? method);

        int GetLastHints(long userId, string username, long studyId, bool total, string exercise, int limit, bool optional, int op_int, string? method);

        float GetLastTimes(long userId, string username, long studyId, bool total, string exercise, int limit, bool optional, int op_int, string? method);

        bool GetEngagement(long userId, string username, long studyId, string exercise, bool optional, int op_int);

        public bool GetMethodeUse(long userId, string username, long studyId, bool compare, int methode1, int methode2);


    }

    public class FlexibilityStudyService : IFlexibilityStudyService
    {
        public void AddStudy(long studyId, List<FlexibilityStudyExercise> exercises)
        {
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();

            FlexibilityStudy study = new(studyId);

            DBUtils.CreateOrClearTable(connection, FlexibilityStudyDBSettings.TableName, FlexibilityStudyDBSettings.TableScheme, false);
            string inserQuery = $"INSERT INTO {FlexibilityStudyDBSettings.TableName} {FlexibilityStudyDBSettings.TableColumns} VALUES {FlexibilityStudyDBSettings.TableValues}";
            connection.Execute(inserQuery, study);

            DBUtils.CreateOrClearTable(connection, study.TableName, FlexibilityStudyExerciseDBSettings.TableScheme, true);
            inserQuery = $"INSERT INTO {study.TableName} {FlexibilityStudyExerciseDBSettings.TableColumns} VALUES {FlexibilityStudyExerciseDBSettings.TableValues}";
            foreach (FlexibilityStudyExercise exercise in exercises)
            {
                connection.Execute(inserQuery, exercise);
            }
        }

        public List<FlexibilityStudyExercise>? GetExercises(long studyId)
        {
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();
            string query = $"SELECT TableName FROM {FlexibilityStudyDBSettings.TableName} WHERE StudyId = @Id";
            string? tableName = connection.ExecuteScalar<string>(query, new { Id = studyId });

            if (tableName == null)
            {
                return null;
            }

            query = $"SELECT * FROM {tableName}";
            var result = connection.Query<FlexibilityStudyExercise>(query);
            return result.ToList();
        }

        public int InitializeEntry(FlexibilityStudyData data, string username)
        {
            string tableName = FlexibilityStudyDataDBSettings.GetTableName(data.StudyId, data.UserId, username);
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();
            DBUtils.CreateOrClearTable(connection, tableName, FlexibilityStudyDataDBSettings.TableScheme, false);
            string inserQuery = $"INSERT INTO {tableName} {FlexibilityStudyDataDBSettings.TableColumns} VALUES {FlexibilityStudyDataDBSettings.TableValues}; SELECT last_insert_rowid()";
            int id = connection.ExecuteScalar<int>(inserQuery, data);
            return id;
        }

        public void AddActionToEntry(long userId, string username, long studyId, long rowId, string columnName, string action)
        {
            string tableName = FlexibilityStudyDataDBSettings.GetTableName(studyId, userId, username);
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();
            string query = $"SELECT {columnName} FROM {tableName} WHERE Id = @Id";
            string? previousActions = connection.ExecuteScalar<string>(query, new { Id = rowId });
            query = $"UPDATE {tableName} SET {columnName} = @Actions WHERE Id = @Id";
            if (!string.IsNullOrEmpty(previousActions))
            {
                connection.Execute(query, new { Actions = previousActions + ",\n" + action, Id = rowId });
            }
            else
            {
                connection.Execute(query, new { Actions = action, Id = rowId });
            }
        }

        public void TrackChoice(long userId, string username, long studyId, long rowId, string columnName, string choice)
        {
            string tableName = FlexibilityStudyDataDBSettings.GetTableName(studyId, userId, username);
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();
            string query = $"UPDATE {tableName} SET {columnName} = @Column WHERE Id = @Id";
            connection.Execute(query, new { Column = choice, Id = rowId });
        }

        public void TrackType(long userId, string username, long studyId, long rowId, string columnName, int type)
                {
                    string tableName = FlexibilityStudyDataDBSettings.GetTableName(studyId, userId, username);
                    using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
                    connection.Open();
                    string query = $"UPDATE {tableName} SET {columnName} = @Column WHERE Id = @Id";
                    connection.Execute(query, new { Column = type, Id = rowId });
                }


        public void CompleteTrackingForEntry(long userId, string username, long studyId, long rowId, float time, int errors, int hints)
        {
            string tableName = FlexibilityStudyDataDBSettings.GetTableName(studyId, userId, username);
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();
            string query = $"UPDATE {tableName} SET TotalTime = @Time, TotalErrors = @Errors, TotalHints = @Hints WHERE Id = @Id";
            connection.Execute(query, new { Time = time, Errors = errors, Hints = hints, Id = rowId });
        }

        public void CompletePhaseTrackingForEntry(long userId, string username, long studyId, long rowId, string columnName, float time, int errors, int hints)
        {
            string tableName = FlexibilityStudyDataDBSettings.GetTableName(studyId, userId, username);
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();
            string query = $"UPDATE {tableName} SET {columnName} = @Column WHERE Id = @Id";
            string columnData = JsonSerializer.Serialize(new FlexibilityExercisePhaseData { Time = time, Errors = errors, Hints = hints});
            connection.Execute(query, new { Column = columnData, Id = rowId });
        }

        public void CompletePhaseTrackingForComparisonOrResolveEntry(long userId, string username, long studyId, long rowId, string columnName, float time, int errors, int hints, string choice)
        {
            string tableName = FlexibilityStudyDataDBSettings.GetTableName(studyId, userId, username);
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();
            string query = $"UPDATE {tableName} SET {columnName} = @Column WHERE Id = @Id";
            string columnData = JsonSerializer.Serialize(new FlexibilityComparisonOrResolveData { Time = time, Errors = errors, Hints= hints, Choice = choice });
            connection.Execute(query, new { Column = columnData, Id = rowId });
        }

        public int GetProgress(long userId, string username, long studyId)
        {
            string tableName = FlexibilityStudyDataDBSettings.GetTableName(studyId, userId, username);
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();

            string query = $@"
                           SELECT Count(Id) FROM {tableName}
                           ORDER BY Id DESC;
                           ";

            int count = connection.ExecuteScalar<int>(query);
             return count;
        }

        public class PhaseData
        {
            public float Time { get; set; }
            public int Errors { get; set; }
            public int Hints { get; set; }
        }

        public int GetLastErrors(long userId, string username, long studyId, bool total, string exercise, int limit, bool optional, int op_int, string? method)
        {
            string tableName = FlexibilityStudyDataDBSettings.GetTableName(studyId, userId, username);
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();

            if (total)
            {
                string query = $@"
                    SELECT TotalErrors FROM {tableName}
                    WHERE TotalErrors != ''
                    ORDER BY Id DESC
                    LIMIT @Number;
                ";

                var errors = connection.Query<int>(query, new { Number = limit }).ToList();
                return errors.Sum();
            }
            else if (optional)
            {
                    var allowedColumns = new[] { "FirstSolution", "SecondSolution", "Comparison", "ComparisonResolve", "SelfExplanation"};
                                    if (!allowedColumns.Contains(exercise))
                                        throw new ArgumentException("Invalid exercise/column name for optional.");

                                    string whereClause = BuildWhereClause(op_int);


                                    string query = $@"
                                        SELECT {exercise} FROM {tableName}
                                        WHERE ({exercise} != '' AND {whereClause})
                                        ORDER BY Id DESC
                                        LIMIT @Number;
                                    ";

                var errorJsons = connection.Query<string>(query, new { Number = limit }).ToList();

                int errorSum = SumPhaseDataProperty(errorJsons, data => data.Errors);


                return errorSum;
            }
            else
            {
                var allowedColumns = new[]
                {
                    "Elimination", "EliminationResolve", "Substitution", "SubstitutionResolve",
                    "Equalization", "EqualizationResolve", "Transformation", "TransformationResolve",
                    "SystemSelection", "EfficiencySelection"
                };

                if (!allowedColumns.Contains(exercise))
                    throw new ArgumentException("Invalid exercise/column name.");

                  string query;

                  if(string.IsNullOrEmpty(method)){
                        query = $@"
                             SELECT {exercise} FROM {tableName}
                             WHERE {exercise} != ''
                             ORDER BY Id DESC
                             LIMIT @Number;
                             ";
                  }
                  else{
                        query = $@"
                              SELECT {exercise} FROM {tableName}
                               WHERE {exercise} != '' AND {method} != ''
                               ORDER BY Id DESC
                               LIMIT @Number;
                               ";

                  }

                var errorJsons = connection.Query<string>(query, new { Number = limit}).ToList();
                int errorSum = SumPhaseDataProperty(errorJsons, data => data.Errors);

                return errorSum;
            }
        }




        public int GetLastHints(long userId, string username, long studyId, bool total, string exercise, int limit, bool optional, int op_int, string? method)
                {
                    string tableName = FlexibilityStudyDataDBSettings.GetTableName(studyId, userId, username);
                    using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
                    connection.Open();

                    if (total)
                    {
                        string query = $@"
                            SELECT TotalHints FROM {tableName}
                            WHERE TotalHints != ''
                            ORDER BY Id DESC
                            LIMIT @Number;
                        ";

                        var hints = connection.Query<int>(query, new { Number = limit }).ToList();
                        return hints.Sum();
                    }
                    else if (optional)
                    {
                            var allowedColumns = new[] { "FirstSolution", "SecondSolution", "Comparison", "ComparisonResolve", "SelfExplanation"};
                                            if (!allowedColumns.Contains(exercise))
                                                throw new ArgumentException("Invalid exercise/column name for optional.");

                                            string whereClause = BuildWhereClause(op_int);


                                            string query = $@"
                                                SELECT {exercise} FROM {tableName}
                                                WHERE ({exercise}  != '' AND {whereClause})
                                                ORDER BY Id DESC
                                                LIMIT @Number;
                                            ";

                        var hintsJsons = connection.Query<string>(query, new { Number = limit }).ToList();
                        int hintsSum = SumPhaseDataProperty(hintsJsons, data => data.Hints);
                        return hintsSum;


                    }
                    else
                    {
                        var allowedColumns = new[]
                        {
                            "Elimination", "EliminationResolve", "Substitution", "SubstitutionResolve",
                            "Equalization", "EqualizationResolve", "Transformation", "TransformationResolve",
                            "SystemSelection", "EfficiencySelection"
                        };

                        if (!allowedColumns.Contains(exercise))
                            throw new ArgumentException("Invalid exercise/column name.");

                        string query;

                        if(string.IsNullOrEmpty(method)){
                            query = $@"
                               SELECT {exercise} FROM {tableName}
                               WHERE {exercise} != ''
                               ORDER BY Id DESC
                               LIMIT @Number;
                                ";
                        }
                        else{
                        query = $@"
                               SELECT {exercise} FROM {tableName}
                                WHERE {exercise} != '' AND {method} != ''
                                ORDER BY Id DESC
                                LIMIT @Number;
                                ";

                        }


                        var hintsJsons = connection.Query<string>(query, new { Number = limit }).ToList();

                        int hintsSum = SumPhaseDataProperty(hintsJsons, data => data.Hints);


                        return hintsSum;
                    }
                }

        public float GetLastTimes(long userId, string username, long studyId, bool total, string exercise, int limit, bool optional, int op_int, string? method)
        {
            string tableName = FlexibilityStudyDataDBSettings.GetTableName(studyId, userId, username);
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();

            if (total)
            {
                string query = $@"
                    SELECT AVG(TotalTime)
                    FROM (
                        SELECT TotalTime FROM {tableName}
                        WHERE TotalTime != 0
                        ORDER BY Id DESC
                        LIMIT @Number
                    );
                ";

                return connection.ExecuteScalar<float?>(query, new { Number = limit }) ?? 0;
            }
            else if (optional)
            {
                var allowedColumns = new[] { "FirstSolution", "SecondSolution", "Comparison", "ComparisonResolve", "SelfExplanation" };
                if (!allowedColumns.Contains(exercise))
                    throw new ArgumentException("Invalid exercise/column name for optional.");

                string whereClause = BuildWhereClause(op_int);

                string query = $@"
                    SELECT {exercise} FROM {tableName}
                    WHERE ({exercise}  != '' AND {whereClause})
                    ORDER BY Id DESC
                    LIMIT @Number;
                ";

                var timeJsons = connection.Query<string>(query, new { Number = limit }).ToList();
                return AveragePhaseDataProperty(timeJsons, data => data.Time);
            }
            else
            {
                var allowedColumns = new[]
                {
                    "Elimination", "EliminationResolve", "Substitution", "SubstitutionResolve",
                    "Equalization", "EqualizationResolve", "Transformation", "TransformationResolve",
                    "SystemSelection", "EfficiencySelection"
                };

                if (!allowedColumns.Contains(exercise))
                    throw new ArgumentException("Invalid exercise/column name.");

                  string query;

                  if(string.IsNullOrEmpty(method)){
                        query = $@"
                             SELECT {exercise} FROM {tableName}
                             WHERE {exercise} != ''
                             ORDER BY Id DESC
                             LIMIT @Number;
                             ";
                  }
                  else{
                        query = $@"
                              SELECT {exercise} FROM {tableName}
                               WHERE {exercise} != '' AND {method} != ''
                               ORDER BY Id DESC
                               LIMIT @Number;
                               ";

                  }

                var timeJsons = connection.Query<string>(query, new { Number = limit }).ToList();
                return AveragePhaseDataProperty(timeJsons, data => data.Time);
            }
        }

public bool GetEngagement(long userId, string username, long studyId, string exercise, bool optional, int op_int)
        {
            string tableName = FlexibilityStudyDataDBSettings.GetTableName(studyId, userId, username);
            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();


            if (optional)
            {
                    var allowedColumns = new[] { "FirstSolution", "SecondSolution", "Comparison", "ComparisonResolve", "SelfExplanation"};
                                    if (!allowedColumns.Contains(exercise))
                                        throw new ArgumentException("Invalid exercise/column name for optional.");

                                    string whereClause = BuildWhereClause(op_int);


                                    string query = $@"
                                        SELECT Count(Id) FROM {tableName}
                                        WHERE ({exercise} != '' AND {whereClause})
                                        ORDER BY Id DESC;
                                    ";

                                     int count = connection.ExecuteScalar<int>(query);
                                     return count > 0;


            }
            else
            {
                var allowedColumns = new[]
                {
                    "Elimination", "EliminationResolve", "Substitution", "SubstitutionResolve",
                    "Equalization", "EqualizationResolve", "Transformation", "TransformationResolve",
                    "SystemSelection", "EfficiencySelection"
                };

                if (!allowedColumns.Contains(exercise))
                    throw new ArgumentException("Invalid exercise/column name.");

                string query = $@"
                    SELECT Count(Id) FROM {tableName}
                    WHERE {exercise} != ''
                    ORDER BY Id DESC;
                ";

                 int count = connection.ExecuteScalar<int>(query);
                 return count > 0;


            }
        }


        public bool GetMethodeUse(long userId, string username, long studyId, bool compare, int methode1, int methode2)
        {
            string tableName = FlexibilityStudyDataDBSettings.GetTableName(studyId, userId, username);

            using var connection = DBSettings.GetSQLiteConnectionForStudiesDB();
            connection.Open();

            string query = $@"
                SELECT
                    SUM(CASE WHEN Equalization != '' THEN 1 ELSE 0 END) AS EqualizationCount,
                    SUM(CASE WHEN Substitution != '' THEN 1 ELSE 0 END) AS SubstitutionCount,
                    SUM(CASE WHEN Elimination != '' THEN 1 ELSE 0 END) AS EliminationCount
                FROM {tableName};
            ";

            var (equalization, substitution, elimination) = connection.QuerySingle<(int, int, int)>(query);
            int[] counts = { equalization, substitution, elimination };

            if (compare)
            {
                int? GetCount(int method) => method switch
                {
                    0 => equalization,
                    1 => substitution,
                    2 => elimination,
                    _ => null
                };

                int? efficient = GetCount(methode1);
                int? count2 = GetCount(methode2);

                if (!count2.HasValue)
                {
                    count2 = counts.Max();
                }

                if (!efficient.HasValue)
                {
                    throw new ArgumentException("Invalid methode selected");
                }

                return (count2.Value - efficient.Value) > 2 || efficient.Value == 0;
            }
            else
            {
                int min = counts.Min();
                int max = counts.Max();

                bool deviates = (max - min) > 3;
                return deviates;
            }
        }



        private float AveragePhaseDataProperty(IEnumerable<string> jsonList, Func<PhaseData, float> selector)
        {

            var values = new List<float>();

            foreach (var json in jsonList)
            {
                try
                {
                    var data = JsonSerializer.Deserialize<PhaseData>(json);
                    if (data != null)
                    {
                        values.Add(selector(data));
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error deserializing JSON: {ex.Message}");
                }
            }

            return values.Any() ? values.Average() : 0f;
        }



                private int SumPhaseDataProperty(IEnumerable<string> jsonList, Func<PhaseData, int> selector)
                {
                    int sum = 0;

                    foreach (var json in jsonList)
                    {
                        Console.WriteLine($"Returned JSON: {json}");
                        try
                        {
                            var data = JsonSerializer.Deserialize<PhaseData>(json);
                            if (data != null)
                            {
                                sum += selector(data);
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"Error deserializing JSON: {ex.Message}");

                        }
                    }

                    return sum;
                }

                private string BuildWhereClause(int op_int)
                {
                    return op_int switch
                    {
                        0 => "(SelfExplanationInterventionChoice = 'Yes' OR (SelfExplanationChoice = 'Yes' AND SelfExplanationInterventionChoice IS NOT 'No'))",
                        1 => "(ComparisonInterventionChoice LIKE 'Yes to %' OR (ComparisonChoice LIKE 'Yes to %' AND ComparisonInterventionChoice NOT LIKE 'No to %'))",
                        2 => "(ResolvingInterventionChoice LIKE 'Yes to %' OR ( ResolvingChoice = LIKE 'Yes to %' AND ResolvingInterventionChoice NOT LIKE 'No to %'))",
                        3 => "(FirstSolutionInterventionChoice = 'Yes' OR (FirstSolutionChoice = 'Yes' AND FirstSolutionInterventionChoice IS NOT 'No'))",
                        4 => "(SecondSolutionInterventionChoice = 'Yes' OR (SecondSolutionChoice = 'Yes' AND SecondSolutionInterventionChoice IS NOT 'No'))",
                        _ => throw new ArgumentException("Invalid op_int value.")
                    };
                }


    }

}
