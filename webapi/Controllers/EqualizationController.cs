using Microsoft.AspNetCore.Mvc;
using webapi.Models.Equalization;
using webapi.Models.Database;
using webapi.Services;
using webapi.Models.ConceptualKnowledge;
using webapi.AuthHelpers;
using webapi.Data.Examples;

namespace webapi.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class EqualizationController(ICKExerciseService exerciseService) : Controller
    {
        private readonly ICKExerciseService _exerciseService = exerciseService;

        [HttpPost(template: "conceptual-knowledge/exercises/setExercises")]
        private IActionResult SetEqualizationExercises()
        {
           try
           {
               _exerciseService.SetEqualizationExercises(EqualizationExamples.GetExamples());
               return Ok();
           }
           catch (Exception exception)
           {
               return BadRequest(exception.Message);
           }
        }

        [HttpGet(template: "conceptual-knowledge/exercises/getExercises")]
        public ActionResult<List<ExerciseResponse>> GetEqualizationExercises()
        {
            try
            {
                return _exerciseService.GetExercises(CKExerciseType.Equalization);
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }

        [HttpGet(template: "conceptual-knowledge/exercises/getExercise/{id}")]
        public ActionResult<EqualizationExercise> GetEqualizationExercise(long id)
        {
            return GetEqualizationExerciseById(id);
        }

        [Authorize]
        [HttpGet(template: "conceptual-knowledge/exercises/getExerciseForStudy/{id}")]
        public ActionResult<EqualizationExercise> GetEqualizationExerciseForStudy(long id)
        {
            return GetEqualizationExerciseById(id);
        }

        private ActionResult<EqualizationExercise> GetEqualizationExerciseById(long id)
        {
            try
            {
                var exercise = _exerciseService.GetEqualizationExerciseById(id);
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
