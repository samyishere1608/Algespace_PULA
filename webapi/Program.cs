using Microsoft.Net.Http.Headers;
using System.Threading.RateLimiting;
using webapi.AuthHelpers;
using webapi.Authorization;
using webapi.Controllers;
using webapi.Data.Examples;
using webapi.Models.Anchors;
using webapi.Models.Database;
using webapi.Services;

var builder = WebApplication.CreateBuilder(args);

// Railway provides PORT as an environment variable
var port = Environment.GetEnvironmentVariable("PORT") ?? "7273";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ── Which browser origins the deployed API answers ───────────────────────────
//
// The front end and the API live on different hosts, so every request from the app is cross-origin.
//
// EXACT HOST MATCHING, not a prefix. The old check was `StartsWith("https://algespacepula.netlify.app")`,
// which also accepts `https://algespacepula.netlify.app.example.test` — a different site that merely
// begins with the name — and the same for the university domain.
//
// The list below is where this project is served from, and `Cors:AllowedOrigins` (comma separated)
// adds to it, so moving the front end to another domain is an environment variable rather than a code
// change. `www.` is accepted for each, because people type it.
var corsDefaultOrigins = new[]
{
    "https://algespace.com",
    "https://www.algespace.com",
    "https://algespace.sic.saarland",
    "https://www.algespace.sic.saarland",
};

var corsConfiguredOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? "")
    .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries)
    .Select(entry => entry.Trim().TrimEnd('/'))
    .Where(entry => entry.Length > 0);

var corsAllowedOrigins = new HashSet<string>(
    corsDefaultOrigins.Concat(corsConfiguredOrigins), StringComparer.OrdinalIgnoreCase);

bool IsAllowedProductionOrigin(string origin)
{
    if (string.IsNullOrWhiteSpace(origin)) return false;
    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;
    if (uri.Scheme != Uri.UriSchemeHttps) return false;

    // Netlify serves every deploy of a site from <deploy-id>--<site>.netlify.app, so previews are
    // matched by the suffix only this site's deploys end with while the plain host is matched exactly.
    var host = uri.Host.ToLowerInvariant();
    if (host == "algespacepula.netlify.app" || host.EndsWith("--algespacepula.netlify.app")) return true;

    return corsAllowedOrigins.Contains($"{uri.Scheme}://{uri.Host}".ToLowerInvariant());
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("DevelopmentPolicy", builder =>
    {
        builder.WithMethods("GET", "PUT", "POST")
            .WithHeaders(HeaderNames.Accept, HeaderNames.ContentType, HeaderNames.Authorization, "X-API-Key")
            .AllowCredentials()
            .SetIsOriginAllowed(origin =>
            {
                if (string.IsNullOrWhiteSpace(origin)) return false;
                if (origin.ToLower().StartsWith("http://localhost:5173")) return true;
                return false;
            });
    });

    options.AddPolicy("ProductionPolicy", builder =>
    {
        builder.WithMethods("GET", "PUT", "POST")
            .WithHeaders(HeaderNames.Accept, HeaderNames.ContentType, HeaderNames.Authorization, "X-API-Key")
            .AllowCredentials()
            .SetIsOriginAllowed(IsAllowedProductionOrigin);
    });
});

builder.Services.AddRateLimiter(options =>
{
    // 6000 requests a minute — about 100/sec — as ONE budget shared by the whole application.
    //
    // The partition key is the Host header for every student, because these routes are anonymous:
    // students are addressed by id in the URL rather than by a token, so `User.Identity` is empty and
    // the value falls through to the host. This is therefore a total across all users, not a
    // per-student allowance, and the number has to cover the whole cohort at once.
    //
    // Sized for about 120 students working simultaneously. One full exercise cycle — dashboard,
    // exercise load, in-exercise tracking, completion, agency XP, goal, reflection — is roughly 25
    // requests, and 120 students at one exercise every three minutes averages close to 1000 a minute.
    // That was the old value, so the old limit sat exactly on the expected load and any burst was
    // rejected. 6000 leaves roughly six times the average as headroom, which absorbs the case that
    // actually hurts: a class starting together and every dashboard loading in the same few seconds.
    //
    // QueueLimit stays at 0 deliberately. The window is a minute wide, so queueing a request means
    // holding it for up to a minute; a fast rejection the client can retry is better for a student
    // than a request that appears to hang. There is no visible retry UI, so the burst headroom above
    // is what keeps this from being reached in normal use.
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.User.Identity?.Name ?? httpContext.Request.Headers.Host.ToString(),
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 6000,
                QueueLimit = 0,
                Window = TimeSpan.FromMinutes(1)
            }));
});

builder.Services.Configure<AuthSettings>(builder.Configuration.GetSection("AuthSettings"));
builder.Services.AddHttpClient();  // for ChatController + reflection → OpenAI API

builder.Services.AddScoped<ICKExerciseService, CKExerciseService>();
builder.Services.AddScoped<IFlexibilityExerciseService, FlexibilityExerciseService>();
builder.Services.AddScoped<IUserService, UserService>(); // Service is only required for conducting studies
builder.Services.AddScoped<ICKStudyService, CKStudyService>();
builder.Services.AddScoped<IFlexibilityStudyService, FlexibilityStudyService>();
builder.Services.AddScoped<IStudentService, StudentService>();
builder.Services.AddScoped<INlpAnalysisService, NlpAnalysisService>(); // offline research analytics
builder.Services.AddScoped<ICurriculumContextService, CurriculumContextService>(); // lesson-content grounding
builder.Services.AddScoped<IAnswerLeakGuard, AnswerLeakGuard>(); // answer-leak protection
builder.Services.AddScoped<IAnchorTrackingService, AnchorTrackingService>(); // adaptive anchor capture + profile

var app = builder.Build();

app.UseRateLimiter();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors("DevelopmentPolicy");
}
else
{
    app.UseCors("ProductionPolicy");

    // Every request needs X-API-Key, with one exception: the load test page is reached by pointing a
    // browser at it, and a browser cannot put a header on a navigation. That route does the same
    // check itself, against a value that can travel in the URL (LoadTestController.Authorized), so
    // this branches AROUND the gate rather than lifting it. It is also off unless
    // LoadTest:Enabled is set, and then it is one route on a path nothing else uses.
    //
    // /admin is branched for the same shape of reason and with a stronger gate of its own: it demands
    // X-Admin-Key in constant time and refuses to exist at all unless Admin:ResetKey is configured. The
    // shared API key would add nothing there — it ships inside the front end bundle — so the admin key is
    // the only thing standing in front of a route that empties a database.
    app.UseWhen(
        context => !context.Request.Path.StartsWithSegments("/loadtest")
            && !context.Request.Path.StartsWithSegments("/admin"),
        branch => branch.UseMiddleware<ApiKeyMiddleware>());
}

app.UseMiddleware<JwtMiddleware>(); // Middlewares are only required for conducting studies
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Seed exercises from code on every startup so the DB always reflects current data
using (var scope = app.Services.CreateScope())
{
    // WAL first, before anything opens the databases for real work. It is stored in the file, so a
    // database created fresh on a new machine would otherwise start on the default rollback journal,
    // where a writer excludes readers and one commit serialises the whole file. See
    // DBSettings.EnableWriteAheadLogging for the full reasoning.
    Console.WriteLine($"[DB] journal modes: {string.Join(", ", DBSettings.EnableWriteAheadLogging())}");

    // Names the AI provider and model, and whether a key is present — never the key itself. Without
    // this, "AI features do not work in production" is indistinguishable from "the key was never set"
    // or "this provider does not serve that model".
    Console.WriteLine($"[AI] {AiProvider.Describe(app.Configuration)}");

    // Anchor store tables. Created once here rather than on first use: running DDL on the request
    // path takes a write lock on the students database and would serialise every request behind it.
    using (var anchorConnection = DBSettings.GetSQLiteConnectionForStudentsDB())
    {
        anchorConnection.Open();
        AnchorStoreSettings.EnsureTables(anchorConnection);
    }

    // The same reasoning for the student-progress tables, which were the one place still doing their
    // DDL per request. See StudentProgressController.InitializeSchema.
    StudentProgressController.InitializeSchema();

    var flexService = scope.ServiceProvider.GetRequiredService<IFlexibilityExerciseService>();
    flexService.SetSuitabilityExercises(SuitabilityExamples.GetExamples());
    flexService.SetEfficiencyExercises(EfficiencyExamples.GetExamples());
    flexService.SetMatchingExercises(MatchingExamples.GetExamples());
    flexService.SetFlexibilityExercises(FlexibilityExamples.GetFlexibilityExercises());

    var ckService = scope.ServiceProvider.GetRequiredService<ICKExerciseService>();
    ckService.SetEqualizationExercises(EqualizationExamples.GetExamples());
    ckService.SetBarteringExercises(BarteringExamples.GetExamples());
    ckService.SetSubstitutionExercises(SubstitutionExamples.GetExamples());
    ckService.SetEliminationExercises(EliminationExamples.GetExamples());
}

app.Run();
