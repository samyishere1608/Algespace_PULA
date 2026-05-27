using webapi.Models.ConceptualKnowledge;
using webapi.Models.Studies.ConceptualKnowledge;

namespace webapi.Data.Examples
{
    public static class CKStudyExamples
    {
        public static List<CKStudyExercise> GetFirstStudy()
        {
            return new List<CKStudyExercise>()
            {
                new()
                {
                    ExerciseType = CKExerciseType.Equalization,
                    ExerciseId = 1
                },
                new()
                {
                    ExerciseType = CKExerciseType.Equalization,
                    ExerciseId = 3
                },
                new()
                {
                    ExerciseType = CKExerciseType.Equalization,
                    ExerciseId = 4
                },
                new()
                {
                    ExerciseType = CKExerciseType.Equalization,
                    ExerciseId = 6
                },
                new()
                {
                    ExerciseType = CKExerciseType.Equalization,
                    ExerciseId = 8
                },
                new()
                {
                    ExerciseType = CKExerciseType.Bartering,
                    ExerciseId = 1
                },
                new()
                {
                    ExerciseType = CKExerciseType.Bartering,
                    ExerciseId = 4
                },
                new()
                {
                    ExerciseType = CKExerciseType.Substitution,
                    ExerciseId = 1
                },
                new()
                {
                    ExerciseType = CKExerciseType.Substitution,
                    ExerciseId = 4
                },
                new()
                {
                    ExerciseType = CKExerciseType.Substitution,
                    ExerciseId = 5
                },
                new()
                {
                    ExerciseType = CKExerciseType.Substitution,
                    ExerciseId = 8
                },
                new()
                {
                    ExerciseType = CKExerciseType.Substitution,
                    ExerciseId = 9
                },
                new()
                {
                    ExerciseType = CKExerciseType.Elimination,
                    ExerciseId = 1
                },
                new()
                {
                    ExerciseType = CKExerciseType.Elimination,
                    ExerciseId = 3
                },
                new()
                {
                    ExerciseType = CKExerciseType.Elimination,
                    ExerciseId = 5
                },
                new()
                {
                    ExerciseType = CKExerciseType.Elimination,
                    ExerciseId = 8
                },
                new()
                {
                    ExerciseType = CKExerciseType.Elimination,
                    ExerciseId = 9
                }
            };
        }
    }
}
