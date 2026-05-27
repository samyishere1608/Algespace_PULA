using Microsoft.AspNetCore.Mvc;
using webapi.AuthHelpers;
using webapi.Data.Examples;
using webapi.Models.ConceptualKnowledge;
using webapi.Models.Database;
using webapi.Models.Elimination;
using webapi.Services;

namespace webapi.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class EliminationController(ICKExerciseService exerciseService) : Controller
    {
        private readonly ICKExerciseService _exerciseService = exerciseService;

        [HttpPost(template: "conceptual-knowledge/exercises/setExercises")]
        private IActionResult SetEliminationExercises()
        {
           try
           {
               _exerciseService.SetEliminationExercises(EliminationExamples.GetExamples());
               return Ok();
           }
           catch (Exception exception)
           {
               return BadRequest(exception.Message);
           }
        }

        [HttpGet(template: "conceptual-knowledge/exercises/getExercises")]
        public ActionResult<List<ExerciseResponse>> GetEliminationExercises()
        {
            try
            {
                return _exerciseService.GetExercises(CKExerciseType.Elimination);
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }

        [HttpGet(template: "conceptual-knowledge/exercises/getExercise/{id}")]
        public ActionResult<EliminationExercise> GetEliminationExercise(long id)
        {
            return GetEliminationExerciseById(id);
        }

        [Authorize]
        [HttpGet(template: "conceptual-knowledge/exercises/getExerciseForStudy/{id}")]
        public ActionResult<EliminationExercise> GetEliminationExerciseForStudy(long id)
        {
            return GetEliminationExerciseById(id);
        }

        private ActionResult<EliminationExercise> GetEliminationExerciseById(long id)
        {
            try
            {
                var exercise = _exerciseService.GetEliminationExerciseById(id);
                if (exercise == null)
                {
                    return NotFound();
                }
                return exercise;
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }
    }
}
