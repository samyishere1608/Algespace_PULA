using Microsoft.AspNetCore.Mvc;
using webapi.AuthHelpers;
using webapi.Data.Examples;
using webapi.Models.Studies.Flexibility;
using webapi.Services;

namespace webapi.Controllers
{
    [ApiController]
    [Route("flexibility-study")]
    public class FlexibilityStudyController(IFlexibilityStudyService studyService) : Controller
    {
        private IFlexibilityStudyService _studyService = studyService;

        [Authorize]
        [HttpGet(template: "getExercisesForStudy/{id}")]
        public ActionResult<List<FlexibilityStudyExercise>> GetExercisesForStudy(long id)
        {
            try
            {
                var exercises = _studyService.GetExercises(id);
                if (exercises == null)
                {
                    return NotFound();
                }
                return exercises;
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }

        [HttpPut(template: "setFirstStudy")]
        private IActionResult SetFirstStudy()
        {
            try
            {
                _studyService.AddStudy(1, FlexibilityStudyExamples.GetFirstStudy());
                return Ok();
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }

        [Authorize]
        [HttpPut(template: "createEntry")]
        public ActionResult<int> CreateEntryForExercise(CreateFlexibilityEntryRequest data)
        {
            try
            {
                FlexibilityStudyData studyData = new(data.UserId, data.StudyId, data.FlexibilityId, data.ExerciseId, data.ExerciseType, data.AgentCondition, data.AgentType);
                return _studyService.InitializeEntry(studyData, data.Username);
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }

        [Authorize]
        [HttpPost(template: "addActionToEntry")]
        public IActionResult AddActionToEntry(TrackFlexibilityActionRequest data)
        {
            try
            {
                _studyService.AddActionToEntry(data.UserId, data.Username, data.StudyId, data.Id, data.Phase.ToString(), data.Action);
                return new OkResult();
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }

        [Authorize]
        [HttpPost(template: "trackChoice")]
        public IActionResult TrackEliminationChoice(TrackFlexibilityChoiceRequest data)
        {
            try
            {
                _studyService.TrackChoice(data.UserId, data.Username, data.StudyId, data.Id, data.Phase.ToString(), data.Choice);
                return new OkResult();
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }

        [Authorize]
        [HttpPost(template: "trackType")]
        public IActionResult TrackEliminationChoice(TrackFlexibilityTypeRequest data)
        {
            try
            {
                _studyService.TrackType(data.UserId, data.Username, data.StudyId, data.Id, data.Phase.ToString(), data.Type);
                return new OkResult();
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }


        [Authorize]
        [HttpGet("getLastErrors/{userId}/{username}/{studyId}")]
        public ActionResult<int> GetLastErrors(
            long userId,
            string username,
            long studyId,
            [FromQuery] bool total,
            [FromQuery] string exercice,
            [FromQuery] int limit,
            [FromQuery] bool optional,
            [FromQuery] int op_int,
            [FromQuery] string? method)
        {
            try
            {
                var totalErrors = _studyService.GetLastErrors(userId, username, studyId, total, exercice, limit, optional, op_int, method);
                return Ok(totalErrors);

            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }


        [Authorize]
                [HttpGet("getLastHints/{userId}/{username}/{studyId}")]
                public ActionResult<int> GetLastHints(
                    long userId,
                    string username,
                    long studyId,
                    [FromQuery] bool total,
                    [FromQuery] string exercice,
                    [FromQuery] int limit,
                    [FromQuery] bool optional,
                    [FromQuery] int op_int,
                    [FromQuery] string? method)
                {
                    try
                    {
                        var totalHints = _studyService.GetLastHints(userId, username, studyId, total, exercice, limit, optional, op_int, method);
                        return Ok(totalHints);

                    }
                    catch (Exception ex)
                    {
                        return BadRequest(ex.Message);
                    }
                }

        [Authorize]
                [HttpGet("getLastTimes/{userId}/{username}/{studyId}")]
                public ActionResult<float> GetLastTimes(
                    long userId,
                    string username,
                    long studyId,
                    [FromQuery] bool total,
                    [FromQuery] string exercice,
                    [FromQuery] int limit,
                    [FromQuery] bool optional,
                    [FromQuery] int op_int,
                    [FromQuery] string? method)
                {
                    try
                    {
                        var totalTime = _studyService.GetLastTimes(userId, username, studyId, total, exercice, limit, optional, op_int, method);
                        return Ok(totalTime);

                    }
                    catch (Exception ex)
                    {
                        return BadRequest(ex.Message);
                    }
                }

        [Authorize]
                [HttpGet("getEngagement/{userId}/{username}/{studyId}")]
                public ActionResult<float> GetEngagement(
                    long userId,
                    string username,
                    long studyId,
                    [FromQuery] string exercice,
                    [FromQuery] bool optional,
                    [FromQuery] int op_int)
                {
                    try
                    {
                        var engagement = _studyService.GetEngagement(userId, username, studyId, exercice, optional, op_int);
                        return Ok(engagement);

                    }
                    catch (Exception ex)
                    {
                        return BadRequest(ex.Message);
                    }
                }

        [Authorize]
                [HttpGet("getProgress/{userId}/{username}/{studyId}")]
                public ActionResult<float> GetProgress(
                    long userId,
                    string username,
                    long studyId)
                {
                    try
                    {
                        var progress = _studyService.GetProgress(userId, username, studyId);
                        return Ok(progress);

                    }
                    catch (Exception ex)
                    {
                        return BadRequest(ex.Message);
                    }
                }


        [Authorize]
                [HttpGet("getMethodeUse/{userId}/{username}/{studyId}")]
                public ActionResult<float> GetMethodeUse(
                    long userId,
                    string username,
                    long studyId,
                    [FromQuery] bool compare,
                    [FromQuery] int methode1,
                    [FromQuery] int methode2)

                {
                    try
                    {
                        var balanced = _studyService.GetMethodeUse(userId, username, studyId, compare, methode1, methode2);
                        return Ok(balanced);

                    }
                    catch (Exception ex)
                    {
                        return BadRequest(ex.Message);
                    }
                }





        [Authorize]
        [HttpPost(template: "completePhaseTracking")]
        public IActionResult CompletePhaseTracking(CompleteFlexibilityTrackingRequest data)
        {
            try
            {
                if (data.Phase == null)
                {
                    return BadRequest("Property Phase is null.");
                }

                if (data.Phase == FlexibilityExercisePhase.Comparison || data.Phase == FlexibilityExercisePhase.ResolveConclusion)
                {
                    _studyService.CompletePhaseTrackingForComparisonOrResolveEntry(data.UserId, data.Username, data.StudyId, data.Id, ((FlexibilityExercisePhase)data.Phase).ToString(), data.Time, data.Errors, data.Hints, data.Choice ?? "");
                }
                else
                {
                    _studyService.CompletePhaseTrackingForEntry(data.UserId, data.Username, data.StudyId, data.Id, ((FlexibilityExercisePhase)data.Phase).ToString(), data.Time, data.Errors, data.Hints);
                }

                return new OkResult();
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }

        [Authorize]
        [HttpPost(template: "completeTracking")]
        public IActionResult CompleteTracking(CompleteFlexibilityTrackingRequest data)
        {
            try
            {
                _studyService.CompleteTrackingForEntry(data.UserId, data.Username, data.StudyId, data.Id, data.Time, data.Errors, data.Hints);
                return new OkResult();
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }
    }
}
