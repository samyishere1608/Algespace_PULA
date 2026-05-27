using Microsoft.AspNetCore.Mvc;
using webapi.AuthHelpers;
using webapi.Data.Examples;
using webapi.Models.ConceptualKnowledge;
using webapi.Models.Equalization;
using webapi.Models.Studies.ConceptualKnowledge;
using webapi.Services;

namespace webapi.Controllers
{
    [ApiController]
    [Route("ck-study")]
    internal class CKStudyController(ICKStudyService studyService) : Controller // Controller is only required for conducting studies, set scope is internal to hide actions
    {
        private ICKStudyService _studyService = studyService;

        [Authorize]
        [HttpGet(template: "getExercisesForStudy/{id}")]
        public ActionResult<List<CKStudyExercise>> GetExercisesForStudy(long id)
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
               _studyService.AddStudy(1, CKStudyExamples.GetFirstStudy());
               return Ok();
           }
           catch (Exception exception)
           {
               return BadRequest(exception.Message);
           }
        }

        [Authorize]
        [HttpPut(template: "createEntry")]
        public ActionResult<int> CreateEntryForExercise(CreateEntryRequest data)
        {
            try
            {
                switch (data.ExerciseType)
                {
                    case CKExerciseType.Equalization:
                        {
                            EqualizationStudyData equalizationStudyData = new(data.UserId, data.StudyId, data.ExerciseId);
                            return _studyService.InitializeEntry(equalizationStudyData, EqualizationStudyDBSettings.TableName, EqualizationStudyDBSettings.TableScheme, EqualizationStudyDBSettings.TableColumns, EqualizationStudyDBSettings.TableValues);
                        }
                    case CKExerciseType.Bartering:
                        {
                            BarteringStudyData barteringStudyData = new(data.UserId, data.StudyId, data.ExerciseId);
                            return _studyService.InitializeEntry(barteringStudyData, BarteringStudyDBSettings.TableName, BarteringStudyDBSettings.TableScheme, BarteringStudyDBSettings.TableColumns, BarteringStudyDBSettings.TableValues);
                        }
                    case CKExerciseType.Substitution:
                        {
                            SubstitutionStudyData substitutionStudyData = new(data.UserId, data.StudyId, data.ExerciseId);
                            return _studyService.InitializeEntry(substitutionStudyData, SubstitutionStudyDBSettings.TableName, SubstitutionStudyDBSettings.TableScheme, SubstitutionStudyDBSettings.TableColumns, SubstitutionStudyDBSettings.TableValues);
                        }
                    default:
                        {
                            EliminationStudyData eliminationStudyData = new(data.UserId, data.StudyId, data.ExerciseId);
                            return _studyService.InitializeEntry(eliminationStudyData, EliminationStudyDBSettings.TableName, EliminationStudyDBSettings.TableScheme, EliminationStudyDBSettings.TableColumns, EliminationStudyDBSettings.TableValues);
                        }
                }
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }

        [Authorize]
        [HttpPost(template: "addActionToEntry")]
        public IActionResult AddActionToEntry(TrackActionRequest data)
        {
            try
            {
                switch (data.ExerciseType)
                {
                    case CKExerciseType.Equalization:
                        {
                            if (data.EqualizationPhase != null)
                            {
                                _studyService.AddActionToEqualizationOrSubstitutionEntry(data.Id, ((EqualizationPhase)data.EqualizationPhase).ToString(), data.Action, EqualizationDBSettings.TableName);
                                return new OkResult();
                            }
                            return BadRequest("Property EqualizationPhase is null.");
                        }
                    case CKExerciseType.Bartering:
                        {
                            _studyService.AddActionToEntry(data.Id, data.Action, BarteringStudyDBSettings.TableName);
                            return new OkResult();
                        }
                    case CKExerciseType.Substitution:
                        {
                            if (data.SubstitutionPhase != null)
                            {
                                _studyService.AddActionToEqualizationOrSubstitutionEntry(data.Id, ((SubstitutionPhase)data.SubstitutionPhase).ToString(), data.Action, SubstitutionStudyDBSettings.TableName);
                                return new OkResult();
                            }
                            return BadRequest("Property SubstitutionPhase is null.");
                        }
                    default:
                        {
                            _studyService.AddActionToEntry(data.Id, data.Action, EliminationStudyDBSettings.TableName);
                            return new OkResult();
                        }
                }
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }

        [Authorize]
        [HttpPost(template: "trackEliminationChoice")]
        public IActionResult TrackEliminationChoice(TrackChoiceRequest data)
        {
            try
            {
                _studyService.TrackChoiceForEliminationEntry(data.Id, data.Choice);
                return new OkResult();
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }

        [Authorize]
        [HttpPost(template: "completePhaseTracking")]
        public IActionResult CompletePhaseTracking(CompleteTrackingRequest data)
        {
            try
            {
                if (data.ExerciseType == CKExerciseType.Equalization)
                {
                    if (data.EqualizationPhase != null)
                    {
                        _studyService.CompletePhaseTrackingForEqualizationEntry(data.Id, (EqualizationPhase)data.EqualizationPhase, data.Time, data.Hints, data.Errors);
                        return new OkResult();
                    }
                    return BadRequest("Property EqualizationPhase is null.");
                }
                else
                {
                    if (data.SubstitutionPhase != null)
                    {
                        _studyService.CompletePhaseTrackingForSubstitutionEntry(data.Id, (SubstitutionPhase)data.SubstitutionPhase, data.Time, data.Hints, data.Errors);
                        return new OkResult();
                    }
                    return BadRequest("Property SubstitutionPhase is null.");
                }
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }

        [Authorize]
        [HttpPost(template: "completeTracking")]
        public IActionResult CompleteTracking(CompleteTrackingRequest data)
        {
            try
            {
                switch (data.ExerciseType)
                {
                    case CKExerciseType.Equalization:
                        {
                            _studyService.CompleteTrackingForEntry(data.Id, data.Time, data.Hints, data.Errors, EqualizationStudyDBSettings.TableName);
                            return new OkResult();
                        }
                    case CKExerciseType.Bartering:
                        {
                            _studyService.CompleteTrackingForEntry(data.Id, data.Time, data.Hints, data.Errors, BarteringStudyDBSettings.TableName);
                            return new OkResult();
                        }
                    case CKExerciseType.Substitution:
                        {
                            _studyService.CompleteTrackingForEntry(data.Id, data.Time, data.Hints, data.Errors, SubstitutionStudyDBSettings.TableName);
                            return new OkResult();
                        }
                    default:
                        {
                            _studyService.CompleteTrackingForEntry(data.Id, data.Time, data.Hints, data.Errors, EliminationStudyDBSettings.TableName);
                            return new OkResult();
                        }
                }
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }
    }
}
