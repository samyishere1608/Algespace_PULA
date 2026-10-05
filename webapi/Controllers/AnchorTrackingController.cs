using Microsoft.AspNetCore.Mvc;
using webapi.Models.Anchors;
using webapi.Models.Studies.Flexibility;
using webapi.Services;

namespace webapi.Controllers
{
    /// <summary>
    /// Capture and read-back for the adaptive anchors, into our own store.
    ///
    /// The routes and request bodies deliberately MIRROR the study module's endpoints, so the
    /// existing tracker hook can be pointed here by changing only its base path. Reusing the hook
    /// rather than copying it matters: the per-phase lifecycle and the decision engines that read
    /// this history are the valuable part, and a fork would drift.
    ///
    /// Two consequences worth stating:
    /// - The read routes keep the study's `{userId}/{username}/{studyId}` shape. We key on userId
    ///   (the student id) and ignore the rest, purely so the hook needs no path surgery.
    /// - These endpoints are NOT [Authorize]d, matching how the rest of the student data endpoints
    ///   work (student-progress, chat). Student data is addressed by student id and gated in
    ///   production by ApiKeyMiddleware. Adding JWT auth here would risk 401s for students whose
    ///   tokens do not carry the claims the study middleware expects.
    /// </summary>
    [ApiController]
    [Route("anchor-tracking")]
    public class AnchorTrackingController(IAnchorTrackingService anchors) : ControllerBase
    {
        private readonly IAnchorTrackingService _anchors = anchors;

        // ── Writes ───────────────────────────────────────────────────────────

        /// <summary>Opens an attempt and returns its id, which every later call references.</summary>
        [HttpPut("createEntry")]
        public ActionResult<long> CreateEntry([FromBody] CreateFlexibilityEntryRequest data)
        {
            try
            {
                if (data.UserId <= 0)
                    return BadRequest("Missing student id.");

                var attemptId = _anchors.StartAttempt(
                    data.UserId,
                    data.ExerciseType.ToString(),
                    data.ExerciseId,
                    data.AgentCondition.ToString(),
                    isStudy: data.IsStudy);

                return Ok(attemptId);
            }
            catch (Exception exception)
            {
                Console.WriteLine($"[Anchors] createEntry failed — {exception.Message}");
                return BadRequest(exception.Message);
            }
        }

        [HttpPost("addActionToEntry")]
        public IActionResult AddActionToEntry([FromBody] TrackFlexibilityActionRequest data)
        {
            try
            {
                _anchors.AddAction(data.UserId, data.Id, data.Phase.ToString(), data.Action);
                return Ok();
            }
            catch (Exception exception)
            {
                Console.WriteLine($"[Anchors] addActionToEntry failed — {exception.Message}");
                return BadRequest(exception.Message);
            }
        }

        [HttpPost("trackChoice")]
        public IActionResult TrackChoice([FromBody] TrackFlexibilityChoiceRequest data)
        {
            try
            {
                _anchors.TrackChoice(data.UserId, data.Id, data.Phase.ToString(), data.Choice);
                return Ok();
            }
            catch (Exception exception)
            {
                Console.WriteLine($"[Anchors] trackChoice failed — {exception.Message}");
                return BadRequest(exception.Message);
            }
        }

        [HttpPost("trackType")]
        public IActionResult TrackType([FromBody] TrackFlexibilityTypeRequest data)
        {
            try
            {
                _anchors.TrackType(data.UserId, data.Id, data.Phase.ToString(), data.Type);
                return Ok();
            }
            catch (Exception exception)
            {
                Console.WriteLine($"[Anchors] trackType failed — {exception.Message}");
                return BadRequest(exception.Message);
            }
        }

        [HttpPost("completePhaseTracking")]
        public IActionResult CompletePhaseTracking([FromBody] CompleteFlexibilityTrackingRequest data)
        {
            try
            {
                if (data.Phase is null)
                    return BadRequest("Property Phase is null.");

                var phase = ((FlexibilityExercisePhase)data.Phase).ToString();
                _anchors.CompletePhase(data.UserId, data.Id, phase, data.Time, data.Errors, data.Hints, data.Choice);

                return Ok();
            }
            catch (Exception exception)
            {
                Console.WriteLine($"[Anchors] completePhaseTracking failed — {exception.Message}");
                return BadRequest(exception.Message);
            }
        }

        [HttpPost("completeTracking")]
        public IActionResult CompleteTracking([FromBody] CompleteFlexibilityTrackingRequest data)
        {
            try
            {
                _anchors.CompleteAttempt(data.UserId, data.Id, data.Time, data.Errors, data.Hints);
                return Ok();
            }
            catch (Exception exception)
            {
                Console.WriteLine($"[Anchors] completeTracking failed — {exception.Message}");
                return BadRequest(exception.Message);
            }
        }

        // ── Reads ────────────────────────────────────────────────────────────
        //
        // `optional` + `op_int` come straight from the study service's vocabulary: when optional is
        // set, history is restricted to attempts where the student chose YES at the decision point
        // identified by op_int (0 self-explanation, 1 comparison, 2 resolving, 3 first, 4 second).

        [HttpGet("getLastErrors/{userId}/{username}/{studyId}")]
        public ActionResult<int> GetLastErrors(
            long userId, string username, long studyId,
            // "exercice", not "exercise": the shared tracker hook sends the study module's spelling,
            // and these routes mirror it on purpose. Renaming this would 400 every call.
            [FromQuery] bool total, [FromQuery] string exercice, [FromQuery] int limit,
            [FromQuery] bool optional, [FromQuery] int op_int, [FromQuery] string? method = null)
        {
            try
            {
                return Ok(_anchors.GetRecentErrors(userId, exercice, limit, YesAnchor(optional, op_int), total, method));
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }

        [HttpGet("getLastHints/{userId}/{username}/{studyId}")]
        public ActionResult<int> GetLastHints(
            long userId, string username, long studyId,
            [FromQuery] bool total, [FromQuery] string exercice, [FromQuery] int limit,
            [FromQuery] bool optional, [FromQuery] int op_int, [FromQuery] string? method = null)
        {
            try
            {
                return Ok(_anchors.GetRecentHints(userId, exercice, limit, YesAnchor(optional, op_int), total, method));
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }

        [HttpGet("getLastTimes/{userId}/{username}/{studyId}")]
        public ActionResult<double> GetLastTimes(
            long userId, string username, long studyId,
            [FromQuery] bool total, [FromQuery] string exercice, [FromQuery] int limit,
            [FromQuery] bool optional, [FromQuery] int op_int, [FromQuery] string? method = null)
        {
            try
            {
                return Ok(_anchors.GetRecentTime(userId, exercice, limit, YesAnchor(optional, op_int), total, method));
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }

        [HttpGet("getEngagement/{userId}/{username}/{studyId}")]
        public ActionResult<bool> GetEngagement(
            long userId, string username, long studyId,
            [FromQuery] string exercice, [FromQuery] bool optional, [FromQuery] int op_int)
        {
            try
            {
                return Ok(_anchors.HasEngaged(userId, exercice, YesAnchor(optional, op_int)));
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }

        [HttpGet("getProgress/{userId}/{username}/{studyId}")]
        public ActionResult<int> GetProgress(long userId, string username, long studyId)
        {
            try
            {
                return Ok(_anchors.GetAttemptCount(userId));
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }

        [HttpGet("getMethodeUse/{userId}/{username}/{studyId}")]
        public ActionResult<bool> GetMethodeUse(
            long userId, string username, long studyId,
            [FromQuery] bool compare, [FromQuery] int methode1, [FromQuery] int methode2)
        {
            try
            {
                return Ok(_anchors.IsMethodImbalanced(userId, compare, methode1, methode2));
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }

        // ── Ours ─────────────────────────────────────────────────────────────

        /// <summary>
        /// Writes a record whose name the caller chooses, for the things we track that are not one of
        /// the study's phases — a nudge outcome, for example. See <see cref="NudgeRecord"/>.
        /// </summary>
        [HttpPost("trackRecord")]
        public IActionResult TrackRecord([FromBody] TrackAnchorRecordRequest data)
        {
            try
            {
                if (data.UserId <= 0 || data.Id <= 0 || string.IsNullOrWhiteSpace(data.Name))
                    return BadRequest("Missing student, attempt or record name.");

                _anchors.TrackChoice(data.UserId, data.Id, data.Name, data.Choice);
                return Ok();
            }
            catch (Exception exception)
            {
                Console.WriteLine($"[Anchors] trackRecord failed — {exception.Message}");
                return BadRequest(exception.Message);
            }
        }

        /// <summary>
        /// The student's avoidance profile: how often they engage with each tracked dimension, and
        /// which of those count as sustained avoidance.
        /// </summary>
        [HttpGet("profile/{studentId}")]
        public ActionResult<AvoidanceProfile> GetProfile(long studentId)
        {
            try
            {
                return Ok(_anchors.GetProfile(studentId));
            }
            catch (Exception exception)
            {
                Console.WriteLine($"[Anchors] profile failed — {exception.Message}");
                return BadRequest(exception.Message);
            }
        }

        /// <summary>
        /// The student's completed exercises, flattened into the six dimensions a goal can be about.
        /// The client owns the goal definitions, so it is given facts rather than verdicts.
        /// </summary>
        [HttpGet("goal-events/{studentId}")]
        public ActionResult<IReadOnlyList<GoalEvent>> GetGoalEvents(long studentId, [FromQuery] string? since = null)
        {
            try
            {
                return Ok(_anchors.GetGoalEvents(studentId, since));
            }
            catch (Exception exception)
            {
                Console.WriteLine($"[Anchors] goal-events failed — {exception.Message}");
                return BadRequest(exception.Message);
            }
        }

        /// <summary>
        /// Translates the study service's (optional, op_int) pair into our single anchor selector.
        /// Returns −1 when no restriction applies.
        /// </summary>
        private static int YesAnchor(bool optional, int opInt) => optional ? opInt : -1;
    }
}
