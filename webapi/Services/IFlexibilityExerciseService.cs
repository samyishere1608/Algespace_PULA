using Dapper;
using webapi.Models.Database;
using webapi.Models.Flexibility;
using webapi.Models.User;
using static webapi.Models.Flexibility.SerializedExtendedTipExercise;

namespace webapi.Services
{
    public interface IFlexibilityExerciseService
    {
        void SetSuitabilityExercises(List<ExtendedSuitabilityExercise> exercises);

        SuitabilityExercise? GetSuitabilityExerciseById(long id, Language language);

        void SetEfficiencyExercises(List<ExtendedEfficiencyExercise> exercises);

        EfficiencyExercise? GetEfficiencyExerciseById(long id, Language language);

        void SetMatchingExercises(List<ExtendedMatchingExercise> exercises);

        MatchingExercise? GetMatchingExerciseById(long id, Language language);

        void SetTipExercises(List<ExtendedTipExercise> exercises);

        TipExercise? GetTipExerciseById(long id, Language language);

        void SetPlainExercises(List<ExtendedPlainExercise> exercises);

        PlainExercise? GetPlainExerciseById(long id, Language language);

        void SetFlexibilityExercises(List<FlexibilityExerciseEntry> exercises);

        List<FlexibilityExerciseEntry> GetFlexibilityExercises();
    }

    public class FlexibilityExerciseService : IFlexibilityExerciseService
    {
        public void SetSuitabilityExercises(List<ExtendedSuitabilityExercise> exercises)
        {
            using var connection = DBSettings.GetSQLiteConnectionForExercisesDB();
            connection.Open();
            DBUtils.CreateOrClearTable(connection, SuitabilityDBSettings.TableName, SuitabilityDBSettings.TableScheme);
            string insertQuery = $"INSERT INTO {SuitabilityDBSettings.TableName} {SuitabilityDBSettings.TableColumns} VALUES {SuitabilityDBSettings.TableValues}";
            foreach (ExtendedSuitabilityExercise exercise in exercises)
            {
                connection.Execute(insertQuery, new SerializedExtendedSuitabilityExercise(exercise));
            }
        }

        public SuitabilityExercise? GetSuitabilityExerciseById(long id, Language language)
        {
            using var connection = DBSettings.GetSQLiteConnectionForExercisesDB();
            connection.Open();
            var serializedExercise = connection.QueryFirstOrDefault<SerializedExtendedSuitabilityExercise>(DBUtils.GetObjectByIdQuery(SuitabilityDBSettings.TableName), new { Id = id });
            return serializedExercise?.Deserialize(language);
        }

        public void SetEfficiencyExercises(List<ExtendedEfficiencyExercise> exercises)
        {
            using var connection = DBSettings.GetSQLiteConnectionForExercisesDB();
            connection.Open();
            DBUtils.CreateOrClearTable(connection, EfficiencyDBSettings.TableName, EfficiencyDBSettings.TableScheme);
            string insertQuery = $"INSERT INTO {EfficiencyDBSettings.TableName} {EfficiencyDBSettings.TableColumns} VALUES {EfficiencyDBSettings.TableValues}";
            foreach (ExtendedEfficiencyExercise exercise in exercises)
            {
                connection.Execute(insertQuery, new SerializedExtendedEfficiencyExercise(exercise));
            }
        }

        public EfficiencyExercise? GetEfficiencyExerciseById(long id, Language language)
        {
            using var connection = DBSettings.GetSQLiteConnectionForExercisesDB();
            connection.Open();
            var serializedExercise = connection.QueryFirstOrDefault<SerializedExtendedEfficiencyExercise>(DBUtils.GetObjectByIdQuery(EfficiencyDBSettings.TableName), new { Id = id });
            return serializedExercise?.Deserialize(language);
        }

        public void SetMatchingExercises(List<ExtendedMatchingExercise> exercises)
        {
            using var connection = DBSettings.GetSQLiteConnectionForExercisesDB();
            connection.Open();
            DBUtils.CreateOrClearTable(connection, MatchingDBSettings.TableName, MatchingDBSettings.TableScheme);
            string insertQuery = $"INSERT INTO {MatchingDBSettings.TableName} {MatchingDBSettings.TableColumns} VALUES {MatchingDBSettings.TableValues}";
            foreach (ExtendedMatchingExercise exercise in exercises)
            {
                connection.Execute(insertQuery, new SerializedExtendedMatchingExercise(exercise));
            }
        }

        public MatchingExercise? GetMatchingExerciseById(long id, Language language)
        {
            using var connection = DBSettings.GetSQLiteConnectionForExercisesDB();
            connection.Open();
            var serializedExercise = connection.QueryFirstOrDefault<SerializedExtendedMatchingExercise>(DBUtils.GetObjectByIdQuery(MatchingDBSettings.TableName), new { Id = id });
            return serializedExercise?.Deserialize(language);
        }

        public void SetTipExercises(List<ExtendedTipExercise> exercises)
        {
            using var connection = DBSettings.GetSQLiteConnectionForExercisesDB();
            connection.Open();
            DBUtils.CreateOrClearTable(connection, TipExerciseDBSettings.TableName, TipExerciseDBSettings.TableScheme);
            string insertQuery = $"INSERT INTO {TipExerciseDBSettings.TableName} {TipExerciseDBSettings.TableColumns} VALUES {TipExerciseDBSettings.TableValues}";
            foreach (ExtendedTipExercise exercise in exercises)
            {
                connection.Execute(insertQuery, new SerializedExtendedTipExercise(exercise));
            }
        }

        public TipExercise? GetTipExerciseById(long id, Language language)
        {
            using var connection = DBSettings.GetSQLiteConnectionForExercisesDB();
            connection.Open();
            var serializedExercise = connection.QueryFirstOrDefault<SerializedExtendedTipExercise>(DBUtils.GetObjectByIdQuery(TipExerciseDBSettings.TableName), new { Id = id });
            return serializedExercise?.Deserialize(language);
        }

        public void SetPlainExercises(List<ExtendedPlainExercise> exercises)
        {
            using var connection = DBSettings.GetSQLiteConnectionForExercisesDB();
            connection.Open();
            DBUtils.CreateOrClearTable(connection, PlainExerciseDBSettings.TableName, PlainExerciseDBSettings.TableScheme);
            string insertQuery = $"INSERT INTO {PlainExerciseDBSettings.TableName} {PlainExerciseDBSettings.TableColumns} VALUES {PlainExerciseDBSettings.TableValues}";
            foreach (ExtendedPlainExercise exercise in exercises)
            {
                connection.Execute(insertQuery, new SerializedExtendedPlainExercise(exercise));
            }
        }

        public PlainExercise? GetPlainExerciseById(long id, Language language)
        {
            using var connection = DBSettings.GetSQLiteConnectionForExercisesDB();
            connection.Open();
            var serializedExercise = connection.QueryFirstOrDefault<SerializedExtendedPlainExercise>(DBUtils.GetObjectByIdQuery(PlainExerciseDBSettings.TableName), new { Id = id });
            return serializedExercise?.Deserialize(language);
        }

        public void SetFlexibilityExercises(List<FlexibilityExerciseEntry> exercises)
        {
            using var connection = DBSettings.GetSQLiteConnectionForExercisesDB();
            connection.Open();
            DBUtils.CreateOrClearTable(connection, FlexibilityExerciseDBSettings.TableName, FlexibilityExerciseDBSettings.TableScheme);
            string inserQuery = $"INSERT INTO {FlexibilityExerciseDBSettings.TableName} {FlexibilityExerciseDBSettings.TableColumns} VALUES {FlexibilityExerciseDBSettings.TableValues}";
            foreach (FlexibilityExerciseEntry exercise in exercises)
            {
                connection.Execute(inserQuery, exercise);
            }
        }

        public List<FlexibilityExerciseEntry> GetFlexibilityExercises()
        {
            using var connection = DBSettings.GetSQLiteConnectionForExercisesDB();
            connection.Open();
            string query = $"SELECT * FROM {FlexibilityExerciseDBSettings.TableName}";
            var result = connection.Query<FlexibilityExerciseEntry>(query);
            return result.ToList();
        }
    }
}
