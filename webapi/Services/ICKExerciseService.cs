using Dapper;
using webapi.Models.ConceptualKnowledge;
using webapi.Models.Database;
using webapi.Models.Elimination;
using webapi.Models.Equalization;
using webapi.Models.Substitution.Bartering;
using webapi.Models.Substitution.ConceptualKnowledge;

namespace webapi.Services
{
    public interface ICKExerciseService
    {
        void SetEqualizationExercises(List<EqualizationExercise> exercises);

        void SetBarteringExercises(List<BarteringExercise> exercises);

        void SetSubstitutionExercises(List<SubstitutionExercise> exercises);

        void SetEliminationExercises(List<EliminationExercise> exercises);

        List<ExerciseResponse> GetExercises(CKExerciseType exerciseType);

        EqualizationExercise? GetEqualizationExerciseById(long id);

        BarteringExercise? GetBarteringExerciseById(long id);

        SubstitutionExercise? GetSubstitutionExerciseById(long id);

        EliminationExercise? GetEliminationExerciseById(long id);
    }

    public class CKExerciseService : ICKExerciseService
    {
        public void SetEqualizationExercises(List<EqualizationExercise> exercises)
        {
            using var connection = DBSettings.GetSQLiteConnectionForExercisesDB();
            connection.Open();
            DBUtils.CreateOrClearTable(connection, EqualizationDBSettings.TableName, EqualizationDBSettings.TableScheme);
            string insertQuery = $"INSERT INTO {EqualizationDBSettings.TableName} {EqualizationDBSettings.TableColumns} VALUES {EqualizationDBSettings.TableValues}";
            foreach (EqualizationExercise exercise in exercises)
            {
                connection.Execute(insertQuery, new SerializedEqualizationExercise(exercise));
            }
        }

        public void SetBarteringExercises(List<BarteringExercise> exercises)
        {
            using var connection = DBSettings.GetSQLiteConnectionForExercisesDB();
            connection.Open();
            DBUtils.CreateOrClearTable(connection, BarteringDBSettings.TableName, BarteringDBSettings.TableScheme);
            string insertQuery = $"INSERT INTO {BarteringDBSettings.TableName} {BarteringDBSettings.TableColumns} VALUES {BarteringDBSettings.TableValues}";
            foreach (BarteringExercise exercise in exercises)
            {
                connection.Execute(insertQuery, new SerializedBarteringExercise(exercise));
            }
        }

        public void SetSubstitutionExercises(List<SubstitutionExercise> exercises)
        {
            using var connection = DBSettings.GetSQLiteConnectionForExercisesDB();
            connection.Open();
            DBUtils.CreateOrClearTable(connection, SubstitutionDBSettings.TableName, SubstitutionDBSettings.TableScheme);
            string insertQuery = $"INSERT INTO {SubstitutionDBSettings.TableName} {SubstitutionDBSettings.TableColumns} VALUES {SubstitutionDBSettings.TableValues}";
            foreach (SubstitutionExercise exercise in exercises)
            {
                connection.Execute(insertQuery, new SerializedSubstitutionExercise(exercise));
            }
        }

        public void SetEliminationExercises(List<EliminationExercise> exercises)
        {
            using var connection = DBSettings.GetSQLiteConnectionForExercisesDB();
            connection.Open();
            DBUtils.CreateOrClearTable(connection, EliminationDBSettings.TableName, EliminationDBSettings.TableScheme);
            string insertQuery = $"INSERT INTO {EliminationDBSettings.TableName} {EliminationDBSettings.TableColumns} VALUES {EliminationDBSettings.TableValues}";
            foreach (EliminationExercise exercise in exercises)
            {
                connection.Execute(insertQuery, new SerializedEliminationExercise(exercise));
            }
        }

        public List<ExerciseResponse> GetExercises(CKExerciseType exerciseType)
        {
            switch (exerciseType)
            {
                case CKExerciseType.Equalization:
                    {
                        return DBUtils.GetExerciseIdsFromTable(DBSettings.AlgeSpaceDB, EqualizationDBSettings.TableName);
                    }

                case CKExerciseType.Bartering:
                    {
                        return DBUtils.GetExerciseIdsFromTable(DBSettings.AlgeSpaceDB, BarteringDBSettings.TableName);
                    }

                case CKExerciseType.Substitution:
                    {
                        return DBUtils.GetExerciseIdsFromTable(DBSettings.AlgeSpaceDB, SubstitutionDBSettings.TableName);
                    }

                default:
                    {
                        return DBUtils.GetExerciseIdsFromTable(DBSettings.AlgeSpaceDB, EliminationDBSettings.TableName);
                    }
            }
        }

        public EqualizationExercise? GetEqualizationExerciseById(long id)
        {
            using var connection = DBSettings.GetSQLiteConnectionForExercisesDB();
            connection.Open();
            var serializedExercise = connection.QueryFirstOrDefault<SerializedEqualizationExercise>(DBUtils.GetObjectByIdQuery(EqualizationDBSettings.TableName), new { Id = id });
            return serializedExercise?.Deserialize();
        }

        public BarteringExercise? GetBarteringExerciseById(long id)
        {
            using var connection = DBSettings.GetSQLiteConnectionForExercisesDB();
            connection.Open();
            var serializedExercise = connection.QueryFirstOrDefault<SerializedBarteringExercise>(DBUtils.GetObjectByIdQuery(BarteringDBSettings.TableName), new { Id = id });
            return serializedExercise?.Deserialize();
        }

        public SubstitutionExercise? GetSubstitutionExerciseById(long id)
        {
            using var connection = DBSettings.GetSQLiteConnectionForExercisesDB();
            connection.Open();
            var serializedExercise = connection.QueryFirstOrDefault<SerializedSubstitutionExercise>(DBUtils.GetObjectByIdQuery(SubstitutionDBSettings.TableName), new { Id = id });
            return serializedExercise?.Deserialize();
        }

        public EliminationExercise? GetEliminationExerciseById(long id)
        {
            using var connection = DBSettings.GetSQLiteConnectionForExercisesDB();
            connection.Open();
            var serializedExercise = connection.QueryFirstOrDefault<SerializedEliminationExercise>(DBUtils.GetObjectByIdQuery(EliminationDBSettings.TableName), new { Id = id });
            return serializedExercise?.Deserialize();
        }

    }
}
