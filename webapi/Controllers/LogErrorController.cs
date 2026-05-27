using Microsoft.AspNetCore.Mvc;
using System.Globalization;

namespace webapi.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class LogErrorController : Controller
    {
        private readonly string logFilePath;

        public LogErrorController()
        {
            // Datei wird im gleichen Verzeichnis wie das Backend erstellt
            logFilePath = Path.Combine(AppContext.BaseDirectory, "error.log");
        }

        // POST /logerror
        [HttpPost]
        public IActionResult Post([FromBody] ErrorLog error)
        {
            try
            {
                string logEntry = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} | {error.Message}";

                if (!string.IsNullOrEmpty(error.Filename))
                    logEntry += $" | File: {error.Filename}";

                if (error.Lineno.HasValue || error.Colno.HasValue)
                    logEntry += $" | Line: {error.Lineno ?? 0}, Col: {error.Colno ?? 0}";

                if (!string.IsNullOrEmpty(error.Stack))
                    logEntry += $" | Stack: {error.Stack}";

                logEntry += "\n";

                System.IO.File.AppendAllText(logFilePath, logEntry);

                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest($"Fehler beim Schreiben des Logs: {ex.Message}");
            }
        }
    }

    // DTO für die empfangenen Fehler
    public class ErrorLog
    {
        public string Message { get; set; } = string.Empty;
        public string? Filename { get; set; }
        public int? Lineno { get; set; }
        public int? Colno { get; set; }
        public string? Stack { get; set; }
    }
}
