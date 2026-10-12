using webapi.Models.Student;
using webapi.Services;

// ─────────────────────────────────────────────────────────────────────────────
// The Insight generosity audit.
//
// The question this answers, for every question the bank can produce: if a student who
// knows nothing taps a chip at random, how often are they paid?
//
// It builds synthetic evidence for every goal category and every exercise type, then for
// each question checks that the chips the record says are right pay, that the chips it
// says are wrong pay nothing, and reports the guess-payment rate.
//
// Run it after any change to the bank. It is the only thing standing between "the
// reasoning sounds right" and "the numbers are right".
// ─────────────────────────────────────────────────────────────────────────────

var failures = new List<string>();
var routing = new Dictionary<string, (string? Q1, string? Q2, string? Q3)>();

void Expect(string name, string? q1 = null, string? q2 = null, string? q3 = null)
    => routing[name] = (q1, q2, q3);

void Fail(string scenario, string what) => failures.Add($"{scenario}: {what}");

// ── Fixtures ─────────────────────────────────────────────────────────────────

static List<ReflectionStepStat> Steps(params (string Id, int Errors, int Hints, double Time)[] stats)
{
    var list = new List<ReflectionStepStat>();
    foreach (var stat in stats)
    {
        list.Add(new ReflectionStepStat
        {
            Id = stat.Id,
            LabelKey = ReflectionQuestionBank.StepLabelKey(stat.Id),
            Errors = stat.Errors,
            Hints = stat.Hints,
            Time = stat.Time,
        });
    }
    return list;
}

var stepy = Steps(("choose", 0, 0, 8), ("setup", 2, 1, 40), ("solve", 0, 0, 12), ("explain", 1, 0, 9));
var stepyNoClean = Steps(("choose", 1, 0, 8), ("setup", 3, 2, 40), ("solve", 1, 1, 12), ("explain", 2, 0, 9));
var stepyOne = Steps(("choose", 0, 0, 8));
// Two steps costing the same, and NO step free of mistakes, so the question has to be the "which
// part was hardest" one and both tied steps must be accepted.
var stepyTie = Steps(("choose", 1, 0, 8), ("setup", 4, 0, 20), ("solve", 4, 0, 21), ("explain", 1, 0, 9));

var scenarios = new List<(string Name, ReflectionEvidence Evidence)>();

// ── The six goal categories ──────────────────────────────────────────────────

foreach (var (category, q2) in new[]
{
    // A completed goal is never asked about the criterion it just proved: "practise the elimination
    // method three times" cannot complete without three exercises solved with elimination, so the
    // question would always have the same answer. Every category except solveOnOwn therefore asks
    // about working it out unaided, and solveOnOwn asks about hints.
    ("method", "reflection-q2-count-solo"),
    ("exerciseType", "reflection-q2-count-solo"),
    ("selfExplanation", "reflection-q2-count-solo"),
    ("methodComparison", "reflection-q2-count-solo"),
    ("solveOnOwn", "reflection-q2-count-hintfree"),
    ("hintsAndErrors", "reflection-q2-count-solo"),
})
{
    var evidence = new ReflectionEvidence
    {
        IsGoal = true,
        Focus = category,
        InSet = 5,
        Errors = 6,
        Hints = 2,
        CleanRuns = 3,
        HintFreeRuns = 4,
        SolvedOnOwnRuns = 2,
        ExplainedSelfRuns = 5,
        ComparedRuns = 1,
        UsedFocusRuns = 4,
        Steps = stepy,
        CleanStepIds = ["choose", "solve"],
        CostliestStepId = "setup",
        HasHistory = true,
        PreviousErrors = 9,
    };

    var name = $"goal/{category}";
    scenarios.Add((name, evidence));
    Expect(name, q2: q2, q3: category switch
    {
        "hintsAndErrors" => "reflection-q3-target",
        "selfExplanation" => "reflection-q3-explain",
        "methodComparison" => "reflection-q3-compare",
        // "Method" and "exercise type" goals name something the student picks rather than something
        // they do, so the next action is the one promise every exercise can be checked against.
        _ => "reflection-q3-solo",
    });

    // The same goal narrowed to one method is the only case that offers the method chips.
    if (category == "method")
    {
        var narrowed = Clone(evidence);
        narrowed.FocusLabelKey = "flexibility:elimination-method";
        scenarios.Add(("goal/method+narrowed", narrowed));
        Expect("goal/method+narrowed", q2: "reflection-q2-count-solo", q3: "reflection-q3-method");
    }
}

// ── The three exercise types, each with its own one decision ─────────────────

foreach (var (type, dimension) in new[] { ("Suitability", "compare"), ("Efficiency", "explain"), ("Matching", "explain") })
{
    foreach (var (label, didIt) in new[] { ("worked-it-out", true), ("asked-to-be-shown", false) })
    {
        var evidence = new ReflectionEvidence
        {
            IsGoal = false,
            Focus = type,
            DecisionDimension = dimension,
            InSet = 1,
            Errors = 3,
            Hints = 1,
            Steps = stepy,
            CleanStepIds = ["choose", "solve"],
            CostliestStepId = "setup",
            HasDecisions = true,
            DidCompare = dimension == "compare" && didIt,
            WasShownComparison = dimension == "compare" && !didIt,
            DidExplain = dimension != "compare" && didIt,
            WasShownExplanation = dimension != "compare" && !didIt,
            DidSolveOnOwn = didIt,
            WasShownAnswer = !didIt,
            HasHistory = true,
            PreviousErrors = 5,
        };

        var name = $"exercise/{type}-{label}";
        scenarios.Add((name, evidence));
        Expect(name,
            q2: dimension == "compare"
                ? "reflection-q2-compared"
                : type == "Matching" ? "reflection-q2-explained-matching" : "reflection-q2-explained-efficiency",
            q3: dimension == "compare"
                ? "reflection-q3-compare"
                : type == "Matching" ? "reflection-q3-explain-matching" : "reflection-q3-explain-efficiency");
    }
}

// ── The awkward cases ────────────────────────────────────────────────────────

// No step detail and no history: the weakest well-formed exercise item.
scenarios.Add(("exercise/no-steps-no-history", new ReflectionEvidence
{
    IsGoal = false,
    Focus = "Efficiency",
    DecisionDimension = "explain",
    InSet = 1,
    Errors = 4,
}));
Expect("exercise/no-steps-no-history", q1: "reflection-q1-expectation", q2: "reflection-q2-explained-efficiency", q3: "reflection-q3-explain-efficiency");

// No step detail, but a previous attempt: the fallback question becomes checkable.
scenarios.Add(("exercise/no-steps-with-history", new ReflectionEvidence
{
    IsGoal = false,
    Focus = "Efficiency",
    DecisionDimension = "explain",
    InSet = 1,
    Errors = 2,
    PreviousErrors = 6,
    HasHistory = true,
}));
Expect("exercise/no-steps-with-history", q1: "reflection-q1-better-than-last");

// No step detail, and the run was level with the last one.
scenarios.Add(("exercise/no-steps-level", new ReflectionEvidence
{
    IsGoal = false,
    Focus = "Matching",
    DecisionDimension = "explain",
    InSet = 1,
    Errors = 4,
    PreviousErrors = 4,
    HasHistory = true,
}));
Expect("exercise/no-steps-level", q1: "reflection-q1-better-than-last");

// No step detail, and this run went worse than the last.
scenarios.Add(("exercise/no-steps-worse", new ReflectionEvidence
{
    IsGoal = false,
    Focus = "Efficiency",
    DecisionDimension = "explain",
    InSet = 1,
    Errors = 9,
    PreviousErrors = 4,
    HasHistory = true,
}));
Expect("exercise/no-steps-worse", q1: "reflection-q1-better-than-last");

// Nothing clean: Q1 has to ask what took the most fight instead of what went well.
scenarios.Add(("exercise/nothing-clean", new ReflectionEvidence
{
    IsGoal = false,
    Focus = "Matching",
    InSet = 1,
    Errors = 7,
    Hints = 3,
    Steps = stepyNoClean,
    CostliestStepId = "setup",
    HasHistory = true,
    PreviousErrors = 11,
}));
Expect("exercise/nothing-clean", q1: "reflection-q1-step-fight");

// One step: not enough to ask a step question at all.
scenarios.Add(("exercise/one-step", new ReflectionEvidence
{
    IsGoal = false,
    Focus = "Efficiency",
    InSet = 1,
    Errors = 2,
    Steps = stepyOne,
    CleanStepIds = ["choose"],
}));
Expect("exercise/one-step", q1: "reflection-q1-expectation");

// Two steps costing the same: either one is a right answer to "which took the most fight".
scenarios.Add(("exercise/tied-steps", new ReflectionEvidence
{
    IsGoal = false,
    Focus = "Efficiency",
    InSet = 1,
    Errors = 8,
    Steps = stepyTie,
    CostliestStepId = "setup",
}));
Expect("exercise/tied-steps", q1: "reflection-q1-step-fight");

// A goal whose window holds nothing yet.
scenarios.Add(("goal/empty", new ReflectionEvidence { IsGoal = true, Focus = "solveOnOwn", InSet = 0 }));
Expect("goal/empty", q1: "reflection-q1-expectation", q2: "reflection-q2-count-hintfree", q3: "reflection-q3-solo");

// ── The audit ────────────────────────────────────────────────────────────────

var byQuestion = new Dictionary<string, List<(int Paid, int Total)>>();
var uncheckable = new Dictionary<string, int>();
var textKeys = new HashSet<string>();
var chipKeys = new HashSet<string>();

foreach (var (name, evidence) in scenarios)
{
    List<ReflectionQuestion> questions;
    try
    {
        questions = ReflectionQuestionBank.Build(evidence);
    }
    catch (Exception ex)
    {
        Fail(name, $"Build threw {ex.GetType().Name}: {ex.Message}");
        continue;
    }

    if (questions.Count != 3) { Fail(name, $"expected 3 questions, got {questions.Count}"); continue; }

    if (routing.TryGetValue(name, out var want))
    {
        if (want.Q1 is not null && questions[0].TextKey != want.Q1) Fail(name, $"Q1 textKey was {questions[0].TextKey}, expected {want.Q1}");
        if (want.Q2 is not null && questions[1].TextKey != want.Q2) Fail(name, $"Q2 textKey was {questions[1].TextKey}, expected {want.Q2}");
        if (want.Q3 is not null && questions[2].TextKey != want.Q3) Fail(name, $"Q3 textKey was {questions[2].TextKey}, expected {want.Q3}");
    }

    if (questions[0].Kind != ReflectionQuestionBank.Observation
        || questions[1].Kind != ReflectionQuestionBank.Judgement
        || questions[2].Kind != ReflectionQuestionBank.NextAction)
        Fail(name, "the three questions are not observation / judgement / next-action in order");

    foreach (var question in questions)
    {
        var label = $"{name}/{question.Id}";
        textKeys.Add(question.TextKey);

        if (question.Chips.Count < 2) Fail(label, $"only {question.Chips.Count} chip(s)");
        if (question.Chips.Select(c => c.Id).Distinct().Count() != question.Chips.Count)
            Fail(label, "duplicate chip ids");
        if (question.Chips.Any(c => c.TextKey.Length == 0)) Fail(label, "a chip has no text key");
        if (question.TextKey.Length == 0) Fail(label, "no question text key");
        if (question.Kind != ReflectionQuestionBank.NextAction && question.Expectation.Length == 0)
            Fail(label, "no expectation, so a free-text answer could not be judged");
        if (question.PartialChipIds.Count > 0 && question.Id != "q1-progress")
            Fail(label, "a partial award on a question whose record can settle the answer");
        if (question.PartialChipIds.Count > 0 && evidence.HasHistory)
            Fail(label, "a partial award even though there was a previous attempt to compare with");

        // A question that interpolates a slot must be given one, or the student reads a raw
        // placeholder. This is the one failure mode a missing translation key cannot catch, because
        // the key exists and resolves fine, it just resolves to "{{focus}}".
        foreach (var slot in new[] { "total", "focus" })
            if (question.TextKey.Contains($"-{slot}") || question.TextKey.EndsWith($"-{slot}", StringComparison.Ordinal))
                if (!question.Values.ContainsKey(slot) && !question.Slots.ContainsKey(slot))
                    Fail(label, $"the question text needs a {slot} value and was given none");

        foreach (var chip in question.Chips) chipKeys.Add(chip.TextKey);

        // Every chip the answer key names must be one of the chips actually offered, or the
        // question offers a right answer and then marks it wrong.
        foreach (var id in question.AlignedChipIds.Concat(question.PartialChipIds))
            if (!question.Chips.Any(c => c.Id == id))
                Fail(label, $"answer key names \"{id}\", which is not offered");

        var paid = 0;
        foreach (var chip in question.Chips)
        {
            var verdict = ReflectionQuestionBank.Grade(question, chip.Id);

            if (verdict.InsightXp > 0) paid++;
            if (verdict.InsightXp is not (0 or 1 or 3))
                Fail(label, $"chip \"{chip.Id}\" paid {verdict.InsightXp}, which is not a defined award");
            if (!verdict.FromRecord)
                Fail(label, $"chip \"{chip.Id}\" was not decided from the record");

            if (question.Kind == ReflectionQuestionBank.NextAction && verdict.InsightXp != 0)
                Fail(label, $"next-action chip \"{chip.Id}\" paid Insight");

            // THE GENEROSITY CHECK. A chip the record does not name pays nothing.
            var isNamed = question.AlignedChipIds.Contains(chip.Id) || question.PartialChipIds.Contains(chip.Id);
            if (!isNamed && verdict.InsightXp != 0)
                Fail(label, $"wrong chip \"{chip.Id}\" paid {verdict.InsightXp}");
        }

        if (!byQuestion.TryGetValue(question.Id, out var list)) byQuestion[question.Id] = list = [];
        list.Add((paid, question.Chips.Count));

        // A question whose answer the record cannot settle pays a chip for answering honestly rather
        // than for being right, so it is counted separately in the report instead of being averaged in.
        if (question.PartialChipIds.Count > 0)
            uncheckable[question.Id] = uncheckable.GetValueOrDefault(question.Id) + 1;

        if (question.Kind == ReflectionQuestionBank.NextAction)
        {
            if (question.AlignedChipIds.Count > 0 || question.PartialChipIds.Count > 0)
                Fail(label, "a next-action question has an answer key");
            if (question.Expectation.Length > 0)
                Fail(label, "a next-action question carries an expectation it would never use");

            // No Insight either way, so "decided from the record" is true for the empty chip too.
            continue;
        }

        if (question.AlignedChipIds.Count == 0 && question.PartialChipIds.Count == 0)
            Fail(label, "nothing can ever earn Insight here");

        foreach (var id in question.AlignedChipIds)
        {
            var verdict = ReflectionQuestionBank.Grade(question, id);
            if (verdict.InsightXp != 3)
                Fail(label, $"the correct chip \"{id}\" paid {verdict.InsightXp}, expected 3");
        }

        var blank = ReflectionQuestionBank.Grade(question, "");
        if (blank.FromRecord) Fail(label, "an empty chip was decided from the record");
    }
}

// ── Cross-question checks on the promises ────────────────────────────────────

// Every chip id has to identify the promise it makes, so the follow-through check can read
// it off the stored choice without a second store, and two dimensions must never share an
// id or a promise about explaining would be settled by an exercise about solving.
foreach (var question in scenarios.SelectMany(s => ReflectionQuestionBank.Build(s.Evidence))
                                  .Where(q => q.Kind == ReflectionQuestionBank.NextAction))
{
    var expected = question.TextKey switch
    {
        "reflection-q3-target" => "target",
        "reflection-q3-method" => "method",
        "reflection-q3-explain" => "explain",
        "reflection-q3-explain-efficiency" => "explain",
        "reflection-q3-explain-matching" => "explain",
        "reflection-q3-compare" => "compare",
        "reflection-q3-solo" => "solo",
        _ => "?",
    };

    var seen = new HashSet<string>();

    foreach (var chip in question.Chips)
    {
        if (!chip.Id.StartsWith("act-", StringComparison.Ordinal))
            Fail($"q3/{question.TextKey}", $"chip id does not start with act-: {chip.Id}");

        if (!seen.Add(chip.Id))
            Fail($"q3/{question.TextKey}", $"chip \"{chip.Id}\" appears twice");

        var dimension = chip.Id switch
        {
            var s when s.StartsWith("act-target-", StringComparison.Ordinal) => "target",
            var s when s.StartsWith("act-method-", StringComparison.Ordinal) => "method",
            var s when s.StartsWith("act-explain-", StringComparison.Ordinal) => "explain",
            var s when s.StartsWith("act-compare-", StringComparison.Ordinal) => "compare",
            var s when s.StartsWith("act-solo-", StringComparison.Ordinal) => "solo",
            _ => "unknown",
        };

        if (dimension != expected)
            Fail($"q3/{question.TextKey}", $"chip \"{chip.Id}\" is about {dimension}, but the question is about {expected}");
    }
}

// ── The relevance gate ───────────────────────────────────────────────────────
//
// The gate runs before the model and discards an answer outright, so a false positive loses real
// work and tells the student their reflection was irrelevant. It used to be a missing-signal test,
// which threw away "I wrote out why I moved the x term first" because a bare "x" was not a maths
// signal and none of its words were on the list.
//
// The cases below are the ones that matter, not an exhaustive sample: every answer a student
// plausibly writes must pass, and obvious junk must not.

var gateCases = new (string Answer, bool ShouldReject, string Why)[]
{
    // MUST PASS. Real answers, including the one the old gate threw away.
    ("I wrote out why I moved the x term first", false, "a sentence about the algebra"),
    ("it was fine, not too hard", false, "short but a real answer"),
    ("I solved for y and then substituted", false, "names a variable and the work"),
    ("I found it hard", false, "a feeling word"),
    ("I got stuck on the first step", false, "describes where they got stuck"),
    ("it took me a while but I got there", false, "a sentence with no domain word at all"),
    ("I asked to be shown", false, "the truth about a chip-only turn"),
    ("ok cool", false, "lazy, but a real answer: the gate rejects non-answers, the model grades quality"),
    ("x", false, "a lone variable letter is a maths signal"),
    ("7", false, "a bare number is a maths signal even at one character"),
    ("9", false, "ditto"),
    ("2x + 3 = 7", false, "an expression"),
    ("Ich habe zuerst die Gleichung umgestellt", false, "German sentence"),
    ("es war schwer", false, "German, three words and no domain word: was rejected before"),
    ("erst war ich verwirrt", false, "German, no domain word"),
    ("schwer", false, "the most common German word for hard, which was simply missing"),
    ("むずかしかった", false, "Japanese past tense in HIRAGANA, which the kanji entries miss"),
    ("やり方がわからなかった", false, "Japanese sentence"),
    ("最初は意味が分からなかった", false, "Japanese, longer than the character threshold"),

    // MUST NOT PASS. This is the whole reason the gate exists.
    ("burger", true, "the original report"),
    ("asdf", true, "keyboard mashing"),
    ("hello", true, "a greeting"),
    ("blah blah", true, "noise"),
    ("k", true, "one character and nothing else"),
};

foreach (var (answer, shouldReject, why) in gateCases)
{
    foreach (var language in new[] { "en", "de", "ja" })
    {
        // The real call site passes extracted features, so both paths are exercised: the text-only
        // path is what the gate degrades to when the NLP flag is off.
        var features = NlpFeatureExtractor.Extract(answer, language);
        var withFeatures = OffTopicDetector.IsOffTopic(answer, features);
        var textOnly = OffTopicDetector.IsOffTopic(answer, null);

        if (withFeatures != shouldReject)
            Fail($"gate/{language}", $"\"{answer}\" ({why}) was {(withFeatures ? "REJECTED" : "accepted")}, expected {(shouldReject ? "rejection" : "acceptance")}");

        // The text-only path is deliberately weaker but must never be STRICTER than the full path:
        // a gate that rejects more when it knows less is the wrong way round.
        if (textOnly && !withFeatures)
            Fail($"gate/{language}", $"\"{answer}\" was rejected without features but accepted with them");
    }
}

// Free text is never graded from the record alone, and an empty answer is never the gate's business:
// a chip-only turn has no text to be off-topic about, which is handled by the caller.
if (!OffTopicDetector.IsOffTopic("", null)) Fail("gate", "an empty answer was accepted");
if (!OffTopicDetector.IsOffTopic("   ", null)) Fail("gate", "whitespace was accepted");

Console.WriteLine();
Console.WriteLine($"relevance gate: {gateCases.Length * 3} answer/language pairs checked, " +
                  $"{gateCases.Count(c => c.ShouldReject)} of them junk");

// ── The report ───────────────────────────────────────────────────────────────

Console.WriteLine();
Console.WriteLine("GUESS-PAYMENT RATE BY QUESTION");
Console.WriteLine("what a student who taps a chip at random gets, averaged over every case above");
Console.WriteLine();
Console.WriteLine($"{"question",-26}{"cases",7}{"paid/case",11}{"rate",8}");
Console.WriteLine(new string('-', 60));

foreach (var (id, list) in byQuestion.OrderBy(kv => kv.Key))
{
    var paid = list.Sum(x => x.Paid);
    var total = list.Sum(x => x.Total);
    Console.WriteLine($"{id,-26}{list.Count,7}{paid / (double)list.Count,11:F2}{(total == 0 ? 0 : (double)paid / total),7:P0}");
}

var allPaid = byQuestion.Values.Sum(v => v.Sum(x => x.Paid));
var allTotal = byQuestion.Values.Sum(v => v.Sum(x => x.Total));
var insightPaid = byQuestion.Where(kv => kv.Key != "q3-next-action").SelectMany(kv => kv.Value).Sum(x => x.Paid);
var insightTotal = byQuestion.Where(kv => kv.Key != "q3-next-action").SelectMany(kv => kv.Value).Sum(x => x.Total);
var checkablePaid = byQuestion.Where(kv => kv.Key is not ("q3-next-action" or "q1-progress")).SelectMany(kv => kv.Value).Sum(x => x.Paid);
var checkableTotal = byQuestion.Where(kv => kv.Key is not ("q3-next-action" or "q1-progress")).SelectMany(kv => kv.Value).Sum(x => x.Total);

static string Pct(int paid, int total) => total == 0 ? "n/a" : ((double)paid / total).ToString("P0");

Console.WriteLine();
Console.WriteLine($"every chip         {allPaid,4} of {allTotal,4} = {Pct(allPaid, allTotal),-7} includes the promises, which pay nothing");
Console.WriteLine($"Insight questions  {insightPaid,4} of {insightTotal,4} = {Pct(insightPaid, insightTotal),-7}");
Console.WriteLine($"checkable answers  {checkablePaid,4} of {checkableTotal,4} = {Pct(checkablePaid, checkableTotal),-7} <- the number that matters");

Console.WriteLine();
Console.WriteLine($"question text keys used: {textKeys.Count}");
foreach (var key in textKeys.OrderBy(k => k)) Console.WriteLine($"  q     {key}");
Console.WriteLine($"chip text keys used:     {chipKeys.Count}");
foreach (var key in chipKeys.OrderBy(k => k)) Console.WriteLine($"  chip  {key}");

Console.WriteLine();
if (uncheckable.Count > 0)
{
    Console.WriteLine("at least one question could not be settled from the record. Those cases pay every chip, and");
    Console.WriteLine("are the only place a guess is paid:");
    foreach (var (id, count) in uncheckable.OrderBy(kv => kv.Key))
        Console.WriteLine($"  {id}: {count} case(s) out of {byQuestion[id].Count}");
}

Console.WriteLine();
if (failures.Count == 0)
{
    Console.WriteLine("All checks passed.");
    return 0;
}

Console.WriteLine($"{failures.Count} FAILURE(S):");
foreach (var failure in failures) Console.WriteLine($"  - {failure}");
return 1;

// ── Helpers ──────────────────────────────────────────────────────────────────

static ReflectionEvidence Clone(ReflectionEvidence source)
{
    var copy = new ReflectionEvidence
    {
        IsGoal = source.IsGoal,
        Focus = source.Focus,
        FocusLabelKey = source.FocusLabelKey,
        Errors = source.Errors,
        Hints = source.Hints,
        InSet = source.InSet,
        CleanRuns = source.CleanRuns,
        HintFreeRuns = source.HintFreeRuns,
        SolvedOnOwnRuns = source.SolvedOnOwnRuns,
        ExplainedSelfRuns = source.ExplainedSelfRuns,
        ComparedRuns = source.ComparedRuns,
        UsedFocusRuns = source.UsedFocusRuns,
        HasDecisions = source.HasDecisions,
        DidSolveOnOwn = source.DidSolveOnOwn,
        WasShownAnswer = source.WasShownAnswer,
        DidExplain = source.DidExplain,
        WasShownExplanation = source.WasShownExplanation,
        DidCompare = source.DidCompare,
        WasShownComparison = source.WasShownComparison,
        DecisionDimension = source.DecisionDimension,
        Steps = source.Steps,
        CleanStepIds = source.CleanStepIds,
        CostliestStepId = source.CostliestStepId,
        PreviousErrors = source.PreviousErrors,
        HasHistory = source.HasHistory,
    };

    return copy;
}
