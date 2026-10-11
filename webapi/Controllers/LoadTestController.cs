using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using webapi.Authorization;

namespace webapi.Controllers
{
    /// <summary>
    /// The load test page, served by the API instead of by a second process on its own port.
    ///
    /// Why it lives here rather than in the React app: the suite's second half is data verification,
    /// and that is done with SQL against the SQLite files. A browser cannot read them, so a page
    /// inside the app could drive traffic but never answer the question the suite exists to answer —
    /// did every write land. Putting the page on the API means it sits beside both the database and
    /// the thing under test, in every environment, and the same URL shape works locally and online.
    ///
    /// The harness itself is not in this process. It stays the one Node implementation the CLI uses,
    /// so the page cannot quietly disagree with the terminal. This controller starts it as a child
    /// process, forwards the JSON it emits as Server-Sent Events, and enforces the rules the process
    /// boundary cannot: who may run it, and one run at a time.
    ///
    /// OFF BY DEFAULT, and it registers nothing at all unless `LoadTest:Enabled` is true, so a
    /// deployment that does not want it cannot expose it by accident.
    /// </summary>
    [ApiController]
    public class LoadTestController(IConfiguration configuration, IWebHostEnvironment environment, ILogger<LoadTestController> logger) : ControllerBase
    {
        private readonly IConfiguration _configuration = configuration;
        private readonly IWebHostEnvironment _environment = environment;
        private readonly ILogger<LoadTestController> _logger = logger;

        /// <summary>
        /// One run at a time.
        ///
        /// Two simulations would contend for the same database and the same CPU, and both reports
        /// would be worthless — the same reason the standalone host keeps a `running` flag. The gate
        /// is static because the controllers are created per request and the rule is about the
        /// process, not about a request.
        /// </summary>
        private static readonly SemaphoreSlim Gate = new(1, 1);

        /// <summary>
        /// Whether the route exists at all. Defaults to false, deliberately: this registers student
        /// accounts and writes real rows, so enabling it has to be a decision rather than a default.
        /// </summary>
        private bool Enabled => _configuration.GetValue<bool>("LoadTest:Enabled");

        /// <summary>
        /// The key this route demands.
        ///
        /// Its own if one is configured, otherwise the API key the whole app already uses, otherwise
        /// no key at all — which is the local case, where the production gate is not in the pipeline.
        /// Production's <c>ApiKeyMiddleware</c> is branched around this path (see Program.cs) because
        /// a browser navigating to the page cannot send a header, so the check has to happen here,
        /// against a value that can travel in the URL.
        /// </summary>
        private string? RequiredKey =>
            _configuration.GetValue<string>("LoadTest:Key") is { Length: > 0 } own ? own :
            _configuration.GetValue<string>(Settings.ApiKeyName) is { Length: > 0 } shared ? shared :
            null;

        private bool Authorized()
        {
            var required = RequiredKey;
            if (required is null) return true;

            var supplied = Request.Query["key"].ToString();
            if (string.IsNullOrEmpty(supplied)) return false;

            // Constant time: this is a shared secret checked by a route that also writes rows.
            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(supplied), Encoding.UTF8.GetBytes(required));
        }

        /// <summary>
        /// The API's own key, handed to the harness so its requests are accepted.
        ///
        /// In production every request needs <c>X-API-Key</c>. Without this the run would get a clean
        /// 400 to every call and the report would blame the server for a gate that was doing its job.
        /// It is passed as an ENVIRONMENT VARIABLE rather than an argument because a command line is
        /// readable by every process in the container, and this is a live credential.
        /// </summary>
        private string? ApiKey => _configuration.GetValue<string>(Settings.ApiKeyName);

        /// <summary>
        /// Where the harness lives. Cached, because it cannot move while the app is running.
        ///
        /// Two candidates, because the same code runs in two layouts: the image copies `loadtest/`
        /// beside the published output, and a local `dotnet run` has it one directory up from
        /// `webapi/`. A configured path wins over both.
        /// </summary>
        private string? _harnessRoot;
        private string? HarnessRoot
        {
            get
            {
                if (_harnessRoot is not null) return _harnessRoot.Length == 0 ? null : _harnessRoot;

                string?[] candidates =
                [
                    _configuration.GetValue<string>("LoadTest:Root"),
                    Path.Combine(_environment.ContentRootPath, "loadtest"),
                    Path.GetFullPath(Path.Combine(_environment.ContentRootPath, "..", "loadtest")),
                ];

                _harnessRoot = candidates.FirstOrDefault(dir =>
                    !string.IsNullOrWhiteSpace(dir)
                    && System.IO.File.Exists(Path.Combine(dir, "stream.mjs"))
                    && System.IO.File.Exists(Path.Combine(dir, "ui", "index.html"))) ?? string.Empty;

                return _harnessRoot.Length == 0 ? null : _harnessRoot;
            }
        }

        /// <summary>
        /// What the page should offer as the target.
        ///
        /// `localhost:7273` is right on a laptop and wrong inside a container, where the API listens
        /// on PORT. The server knows which it is, so it answers instead of the page guessing.
        /// </summary>
        private string DefaultBase =>
            _configuration.GetValue<string>("LoadTest:DefaultBase") is { Length: > 0 } configured
                ? configured
                : $"http://localhost:{Environment.GetEnvironmentVariable("PORT") ?? "7273"}";

        private IActionResult Unavailable() => StatusCode(503, new
        {
            error = "The load test harness is not present on this server.",
            lookedIn = new[]
            {
                _configuration.GetValue<string>("LoadTest:Root") ?? "(LoadTest:Root not set)",
                Path.Combine(_environment.ContentRootPath, "loadtest"),
                Path.GetFullPath(Path.Combine(_environment.ContentRootPath, "..", "loadtest")),
            },
        });

        // ── The page ──────────────────────────────────────────────────────────

        /// <summary>
        /// Serves the page, and redirects the slashless path to the one with a slash.
        ///
        /// The trailing slash is load bearing: the page's own URLs are relative (`./run`), so from
        /// `/loadtest` the browser would resolve them against `/` and ask for `/run`. One address,
        /// one canonical form, no duplicate routes to keep in step.
        /// </summary>
        [HttpGet("/loadtest")]
        public async Task<IActionResult> Page()
        {
            if (!Enabled) return NotFound();
            if (!Authorized()) return Unauthorized(new { error = "A valid ?key= is required." });

            if (Request.Path.Value?.EndsWith('/') != true)
                return Redirect($"{Request.PathBase}{Request.Path.Value}/{Request.QueryString}");

            var root = HarnessRoot;
            if (root is null) return Unavailable();

            var html = await System.IO.File.ReadAllTextAsync(
                Path.Combine(root, "ui", "index.html"), HttpContext.RequestAborted);

            return Content(html, "text/html", Encoding.UTF8);
        }

        /// <summary>Which backend the page should point at by default.</summary>
        [HttpGet("/loadtest/info")]
        public IActionResult Info()
        {
            if (!Enabled) return NotFound();
            if (!Authorized()) return Unauthorized(new { error = "A valid ?key= is required." });

            return Ok(new { defaultBase = DefaultBase, oneAtATime = true });
        }

        /// <summary>
        /// Is the target reachable, so the page can say so before a three-minute run is started.
        ///
        /// Done in-process rather than by asking the harness, because it is one request and the
        /// harness should not have to be started to answer it.
        /// </summary>
        [HttpGet("/loadtest/target")]
        public async Task<IActionResult> Target([FromQuery] string? @base)
        {
            if (!Enabled) return NotFound();
            if (!Authorized()) return Unauthorized(new { error = "A valid ?key= is required." });

            var target = string.IsNullOrWhiteSpace(@base) ? DefaultBase : @base;
            if (!Uri.TryCreate(target, UriKind.Absolute, out var parsed) ||
                (parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps))
            {
                return Ok(new { endpoint = target, reachable = false, detail = "not an absolute http(s) URL" });
            }

            try
            {
                using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(4) };
                if (!string.IsNullOrWhiteSpace(ApiKey)) http.DefaultRequestHeaders.Add(Settings.ApiKeyHeaderName, ApiKey);

                using var probe = await http.GetAsync($"{parsed}".TrimEnd('/') + "/flexibility-training/getFlexibilityExercises", HttpContext.RequestAborted);
                return Ok(new { endpoint = target, reachable = probe.IsSuccessStatusCode, detail = $"HTTP {(int)probe.StatusCode}" });
            }
            catch (Exception error)
            {
                return Ok(new { endpoint = target, reachable = false, detail = error.Message });
            }
        }

        // ── A run ─────────────────────────────────────────────────────────────

        /// <summary>
        /// Starts a run and streams its progress.
        ///
        /// The events are forwarded verbatim: the harness emits exactly the objects the standalone
        /// host streams, so the page cannot tell which host it is talking to. A line the harness did
        /// not write as JSON is skipped rather than fatal, so a stray warning on stdout cannot take
        /// the progress display down with it.
        /// </summary>
        [HttpGet("/loadtest/run")]
        public async Task<IActionResult> Run()
        {
            if (!Enabled) return NotFound();
            if (!Authorized()) return Unauthorized(new { error = "A valid ?key= is required." });

            var root = HarnessRoot;
            if (root is null) return Unavailable();

            // ── Validate before spawning anything ────────────────────────────
            var arguments = new List<string>();
            var problems = new List<string>();

            var target = Request.Query["base"].ToString();
            if (Uri.TryCreate(target, UriKind.Absolute, out var parsed) &&
                (parsed.Scheme == Uri.UriSchemeHttp || parsed.Scheme == Uri.UriSchemeHttps))
            {
                arguments.Add("--base");
                // Without the trailing slash. `Uri.ToString()` adds one for a bare authority, and the
                // harness joins paths onto this by concatenation, so `http://host:7273/` becomes
                // `http://host:7273//student/…` — a URL no route matches, which then reads as the
                // backend being unreachable rather than as a malformed target.
                arguments.Add($"{parsed.GetLeftPart(UriPartial.Path)}".TrimEnd('/'));
            }
            else
            {
                problems.Add("base must be an absolute http(s) URL.");
            }

            // Bounds are the page's own input limits. They exist so a mistyped field cannot ask the
            // harness for 50,000 students, which would look exactly like the server falling over.
            void Number(string name, double min, double max)
            {
                var raw = Request.Query[name].ToString();
                if (!double.TryParse(raw, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var value))
                {
                    problems.Add($"{name} must be a number.");
                    return;
                }
                if (value < min || value > max)
                {
                    problems.Add($"{name} must be between {min} and {max}.");
                    return;
                }
                arguments.Add($"--{name}");
                arguments.Add(value.ToString(System.Globalization.CultureInfo.InvariantCulture));
            }

            Number("students", 1, 500);
            Number("durationSeconds", 20, 1800);

            // A whitelist rather than a range: the page offers exactly these three, and each is a
            // deliberate choice about how hard to push, not a free number.
            var scale = Request.Query["timeScale"].ToString();
            if (scale is "1" or "0.5" or "0.25")
            {
                arguments.Add("--timeScale");
                arguments.Add(scale);
            }
            else
            {
                problems.Add("timeScale must be 1, 0.5 or 0.25.");
            }

            void Flag(string name)
            {
                if (Request.Query[name].ToString() == "1") arguments.Add($"--{name}");
            }

            foreach (var name in new[] { "includeAi", "keep", "allowRemote" }) Flag(name);

            if (problems.Count > 0) return BadRequest(new { error = string.Join(" ", problems) });

            // ── One at a time ────────────────────────────────────────────────
            if (!await Gate.WaitAsync(0, HttpContext.RequestAborted))
                return Conflict(new { error = "A run is already in progress. Wait for it to finish." });

            Process? process = null;
            try
            {
                var start = new ProcessStartInfo
                {
                    // A configured path exists for setups where `node` is not on PATH. Everything
                    // else — the AI key, the database location — reaches the child through the
                    // environment it inherits, so nothing has to be copied across by hand.
                    FileName = _configuration.GetValue<string>("LoadTest:NodePath") is { Length: > 0 } node ? node : "node",
                    WorkingDirectory = root,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                };

                start.ArgumentList.Add(Path.Combine(root, "stream.mjs"));
                foreach (var argument in arguments) start.ArgumentList.Add(argument);

                if (!string.IsNullOrWhiteSpace(ApiKey)) start.Environment["LOADTEST_API_KEY"] = ApiKey;

                try
                {
                    process = Process.Start(start);
                }
                catch (Exception error)
                {
                    _logger.LogError(error, "Load test harness could not be started");
                    return StatusCode(500, new { error = $"Could not start the harness: {error.Message}" });
                }

                if (process is null) return StatusCode(500, new { error = "Could not start the harness." });

                // The child says where it is looking for the databases, so this is a fact worth
                // putting in the log rather than a number to guess at when a run reports nothing.
                _logger.LogInformation(
                    "Load test run started: {Arguments} (databases {Databases})",
                    string.Join(' ', arguments),
                    start.Environment.TryGetValue("LOADTEST_DATABASES_DIR", out var databases) ? databases : "(derived)");

                // ── Stream ───────────────────────────────────────────────────
                Response.Headers["Cache-Control"] = "no-cache";
                // Without this a proxy in front of the API may buffer the whole stream and the point
                // of live progress is lost.
                Response.Headers["X-Accel-Buffering"] = "no";
                Response.ContentType = "text/event-stream";

                var diagnostics = process.StandardError.ReadToEndAsync(HttpContext.RequestAborted);
                var sawVerdict = false;

                while (await process.StandardOutput.ReadLineAsync(HttpContext.RequestAborted) is { } line)
                {
                    if (line.Length == 0 || line[0] != '{') continue;

                    // Either verdict counts. The harness reports its own failures as an `error` event
                    // with a specific message (which account could not be created, which target was
                    // refused), and replacing that with a generic one would hide the only clue.
                    if (line.Contains("\"type\":\"result\"") || line.Contains("\"type\":\"error\"")) sawVerdict = true;

                    await Response.WriteAsync($"data: {line}\n\n", HttpContext.RequestAborted);
                    await Response.Body.FlushAsync(HttpContext.RequestAborted);
                }

                await process.WaitForExitAsync(HttpContext.RequestAborted);

                // A child that died before saying anything otherwise leaves the page saying
                // "running" forever with nothing to explain it.
                if (!sawVerdict)
                {
                    var detail = (await diagnostics).Trim();
                    if (detail.Length > 4000) detail = detail[^4000..];
                    var message = detail.Length > 0
                        ? detail
                        : $"The harness exited with code {process.ExitCode} without producing a result.";

                    _logger.LogWarning("Load test run produced no result: {Detail}", detail);
                    await Response.WriteAsync($"data: {System.Text.Json.JsonSerializer.Serialize(new { type = "error", message })}\n\n", HttpContext.RequestAborted);
                    await Response.Body.FlushAsync(HttpContext.RequestAborted);
                }

                return new EmptyResult();
            }
            finally
            {
                if (process is { HasExited: false })
                {
                    // The client is gone, so nobody is waiting for an answer — stopping the run is
                    // the only useful thing left to do. Kill the tree because the harness is a
                    // generator: leaving it running would keep loading the server with no report.
                    try { process.Kill(entireProcessTree: true); } catch { /* already gone */ }
                }

                process?.Dispose();
                Gate.Release();
            }
        }
    }
}
