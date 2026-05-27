using Microsoft.AspNetCore.Mvc;
using webapi.AuthHelpers;
using webapi.Data.Examples;
using webapi.Models.ConceptualKnowledge;
using webapi.Models.Database;
using webapi.Models.Substitution.Bartering;
using webapi.Models.Substitution.ConceptualKnowledge;
using webapi.Services;

namespace webapi.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class SubstitutionController(ICKExerciseService exerciseService) : Controller
    {
        private readonly ICKExerciseService _exerciseService = exerciseService;

        [HttpPut(template: "bartering/exercises/setExercises")]
        private IActionResult SetBarteringExercises()
        {
           try
           {
               _exerciseService.SetBarteringExercises(BarteringExamples.GetExamples());
               return Ok();
           }
           catch (Exception exception)
           {
               return BadRequest(exception.Message);
           }
        }

        [HttpGet(template: "bartering/exercises/getExercises")]
        public ActionResult<List<ExerciseResponse>> GetBarteringExercises()
        {
            try
            {
                return _exerciseService.GetExercises(CKExerciseType.Bartering);
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }

        [HttpGet(template: "bartering/exercises/getExercise/{id}")]
        public ActionResult<BarteringExercise> GetBarteringExercise(long id)
        {
            return GetBarteringExerciseById(id);
        }

        [Authorize]
        [HttpGet(template: "bartering/exercises/getExerciseForStudy/{id}")]
        public ActionResult<BarteringExercise> GetBarteringExerciseForStudy(long id)
        {
            return GetBarteringExerciseById(id);
        }

        private ActionResult<BarteringExercise> GetBarteringExerciseById(long id)
        {
            try
            {
                var exercise = _exerciseService.GetBarteringExerciseById(id);
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

        [HttpPost(template: "conceptual-knowledge/exercises/setExercises")]
        private IActionResult SetSubstitutionExercises()
        {
           try
           {
               _exerciseService.SetSubstitutionExercises(SubstitutionExamples.GetExamples());
               return Ok();
           }
           catch (Exception exception)
           {
               return BadRequest(exception.Message);
           }
        }

        [HttpGet(template: "conceptual-knowledge/exercises/getExercises")]
        public ActionResult<List<ExerciseResponse>> GetSubstitutionExercises()
        {
            try
            {
                return _exerciseService.GetExercises(CKExerciseType.Substitution);
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }

        [HttpGet(template: "conceptual-knowledge/exercises/getExercise/{id}")]
        public ActionResult<SubstitutionExercise> GetSubstitutionExercise(long id)
        {
            return GetSubstitutionExerciseById(id);

        }

        [Authorize]
        [HttpGet(template: "conceptual-knowledge/exercises/getExerciseForStudy/{id}")]
        public ActionResult<SubstitutionExercise> GetSubstitutionExerciseForStudy(long id)
        {
            return GetSubstitutionExerciseById(id);
        }

        private ActionResult<SubstitutionExercise> GetSubstitutionExerciseById(long id)
        {
            try
            {
                var exercise = _exerciseService.GetSubstitutionExerciseById(id);
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
