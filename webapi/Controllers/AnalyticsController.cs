using Microsoft.AspNetCore.Mvc;
using webapi.Models.Analytics;
using webapi.Services;

namespace webapi.Controllers
{
    /// <summary>
    /// Research analytics endpoints.
    ///
    /// Everything here is offline analysis. The endpoints read existing study data and write only
    /// to derived analysis tables, so they can be run at any point — including while a study is
    /// live — without altering what participants experience.
    /// </summary>
    [ApiController]
    [Route("analytics")]
    public class AnalyticsController(INlpAnalysisService nlpAnalysisService) : ControllerBase
    {
        private readonly INlpAnalysisService _nlpAnalysisService = nlpAnalysisService;

        /// <summary>
        /// Runs the deterministic NLP pipeline over stored student reflections.
        /// Idempotent: re-running analyses only what is new for the current pipeline version.
        /// </summary>
        /// <param name="studentId">Optional — restrict the run to one student.</param>
        [HttpPost("nlp/run")]
        public ActionResult<NlpRunResult> RunNlp([FromQuery] long? studentId = null)
        {
            return Ok(_nlpAnalysisService.Run(studentId));
        }
    }
}
