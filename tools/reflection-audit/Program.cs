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
    ("solveOnOwn", "reflection-q2-count-clean"),
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
Expect("exercise/no-steps-no-history", q1: "reflection-q1-went-well-efficiency", q2: "reflection-q2-explained-efficiency", q3: "reflection-q3-explain-efficiency");

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
Expect("exercise/no-steps-with-history", q1: "reflection-q1-went-well-efficiency");

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
Expect("exercise/no-steps-level", q1: "reflection-q1-went-well-matching");

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
Expect("exercise/no-steps-worse", q1: "reflection-q1-went-well-efficiency");

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
Expect("exercise/one-step", q1: "reflection-q1-went-well-efficiency");

// The what-went-well menu an exercise now gets, with its criteria asserted exactly. Everything went
// well here: the method was one the exercise allowed, nothing went wrong and no hint was needed.
var exerciseAllWell = new ReflectionEvidence
{
    IsGoal = false,
    Focus = "Suitability",
    DecisionDimension = "compare",
    InSet = 1,
    HasAllowedMethods = true,
    ChoseAllowedMethod = true,
};
scenarios.Add(("exercise/went-well-all", exerciseAllWell));
Expect("exercise/went-well-all", q1: "reflection-q1-went-well-suitability");

{
    var question = ReflectionQuestionBank.Build(exerciseAllWell)[0];
    var wanted = new[] { "went-suitable-choice", "went-clean", "went-nohints" };

    if (!question.Chips.Select(c => c.Id).SequenceEqual(wanted))
        Fail("exercise/went-well-all", $"offered [{string.Join(", ", question.Chips.Select(c => c.Id))}], expected [{string.Join(", ", wanted)}]");
    if (!question.AlignedChipIds.OrderBy(id => id).SequenceEqual(wanted.OrderBy(id => id)))
        Fail("exercise/went-well-all", $"accepted [{string.Join(", ", question.AlignedChipIds)}], expected all three");
}

// Nothing went well: a method the exercise did not allow, mistakes AND hints. The menu is still offered
// and every option pays the partial amount, because the student answered honestly about a run that did
// not go their way, and refusing to pay anything for that is worse than paying a little.
var exerciseNothingWell = new ReflectionEvidence
{
    IsGoal = false,
    Focus = "Suitability",
    DecisionDimension = "compare",
    InSet = 1,
    Errors = 5,
    Hints = 2,
    HasAllowedMethods = true,
    ChoseAllowedMethod = false,
};
scenarios.Add(("exercise/went-well-nothing", exerciseNothingWell));
Expect("exercise/went-well-nothing", q1: "reflection-q1-went-well-suitability");

{
    var question = ReflectionQuestionBank.Build(exerciseNothingWell)[0];

    if (question.AlignedChipIds.Count != 0)
        Fail("exercise/went-well-nothing", $"accepted [{string.Join(", ", question.AlignedChipIds)}] on a run where nothing went well");
    if (!question.PartialChipIds.SequenceEqual(question.Chips.Select(c => c.Id)))
        Fail("exercise/went-well-nothing", "not every option pays the partial amount when nothing went well");
}

// An exercise whose own row cannot be found has no list of allowed methods, so the suitable-method
// option is left off rather than put to a coin toss. No hints here, so there IS something to accept.
var exerciseUnknown = new ReflectionEvidence
{
    IsGoal = false,
    Focus = "Suitability",
    DecisionDimension = "compare",
    InSet = 1,
    Errors = 1,
};
scenarios.Add(("exercise/went-well-unknown", exerciseUnknown));
Expect("exercise/went-well-unknown", q1: "reflection-q1-went-well-suitability");

{
    var question = ReflectionQuestionBank.Build(exerciseUnknown)[0];

    if (question.Chips.Any(c => c.Id == "went-suitable-choice"))
        Fail("exercise/went-well-unknown", "the suitable-method option was offered with no method list to check it against");
    if (!question.AlignedChipIds.SequenceEqual(["went-nohints"]))
        Fail("exercise/went-well-unknown", $"accepted [{string.Join(", ", question.AlignedChipIds)}], expected only went-nohints");
}

// A Matching exercise has no right method to have picked, so its menu is about the decision instead.
var exerciseMatchingClean = new ReflectionEvidence
{
    IsGoal = false,
    Focus = "Matching",
    DecisionDimension = "explain",
    InSet = 1,
    DidExplain = true,
    HasAllowedMethods = false,
};
scenarios.Add(("exercise/went-well-matching", exerciseMatchingClean));
Expect("exercise/went-well-matching", q1: "reflection-q1-went-well-matching");

{
    var question = ReflectionQuestionBank.Build(exerciseMatchingClean)[0];
    var wanted = new[] { "went-clean", "went-nohints", "went-explained" };

    if (!question.Chips.Select(c => c.Id).SequenceEqual(wanted))
        Fail("exercise/went-well-matching", $"offered [{string.Join(", ", question.Chips.Select(c => c.Id))}], expected [{string.Join(", ", wanted)}]");
    if (!question.AlignedChipIds.OrderBy(id => id).SequenceEqual(wanted.OrderBy(id => id)))
        Fail("exercise/went-well-matching", $"accepted [{string.Join(", ", question.AlignedChipIds)}], expected all three");
}

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
Expect("goal/empty", q1: "reflection-q1-expectation", q2: "reflection-q2-count-clean", q3: "reflection-q3-solo");

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

        // Exactly two questions may pay every chip, and they are the two whose case really is that
        // nothing checkable went well: the what-went-well menus, and the question a goal with no
        // readable window is left with. Anywhere else a partial is what makes guessing profitable.
        var paysEveryChip = question.Id is "q1-progress" or "q1-exercise-went-well";

        if (question.PartialChipIds.Count > 0 && !paysEveryChip)
            Fail(label, "a partial award on a question whose record can settle the answer");
        if (question.PartialChipIds.Count > 0 && evidence.HasHistory && !paysEveryChip)
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

// ── The goal questions, with a real window ───────────────────────────────────
//
// The goal scenarios above carry no window, so they exercise the fallback used for a goal completed
// before the window was recorded. These carry one, and are what actually tests the rules: each option
// has a definition, so the set of accepted chips is asserted exactly rather than loosely.

static ReflectionGoalExercise Goal(int method, int errors, int hints, double time,
    bool own = false, bool explained = false, bool compared = false, bool correct = false, int type = 0) =>
    new() { Method = method, Errors = errors, Hints = hints, Time = time, Own = own, Explained = explained, Compared = compared, Correct = correct, ExerciseType = type };

// Method values as the bank names them.
const int Equalization = 0;
const int Substitution = 1;
const int Elimination = 2;
const int Suitability = 2;
const int Efficiency = 1;
const int Matching = 3;

void CheckGoal(string name, ReflectionEvidence evidence, string q1Key, string q2Key, string q3Key,
    string[]? q1Aligned = null, string[]? q1Offered = null, string[]? q2Aligned = null, string[]? q3Chips = null)
{
    List<ReflectionQuestion> questions;
    try
    {
        questions = ReflectionQuestionBank.Build(evidence);
    }
    catch (Exception ex)
    {
        Fail(name, $"Build threw {ex.GetType().Name}: {ex.Message}");
        return;
    }

    var (q1, q2, q3) = (questions[0], questions[1], questions[2]);

    if (q1.TextKey != q1Key) Fail(name, $"Q1 was {q1.TextKey}, expected {q1Key}");
    if (q2.TextKey != q2Key) Fail(name, $"Q2 was {q2.TextKey}, expected {q2Key}");
    if (q3.TextKey != q3Key) Fail(name, $"Q3 was {q3.TextKey}, expected {q3Key}");

    if (q3.Chips.Count == 0) Fail(name, "Q3 offers no commitment at all");

    if (q3Chips is not null)
    {
        var offered = q3.Chips.Select(c => c.Id).ToList();
        if (!offered.SequenceEqual(q3Chips))
            Fail(name, $"Q3 chips were [{string.Join(", ", offered)}], expected [{string.Join(", ", q3Chips)}]");
    }

    if (q1Offered is not null)
    {
        var offered = q1.Chips.Select(c => c.Id).ToList();
        if (!offered.SequenceEqual(q1Offered))
            Fail(name, $"Q1 offered [{string.Join(", ", offered)}], expected [{string.Join(", ", q1Offered)}]");
    }

    if (q1Aligned is not null)
    {
        var aligned = q1.AlignedChipIds.OrderBy(id => id).ToList();
        var wanted = q1Aligned.OrderBy(id => id).ToList();
        if (!aligned.SequenceEqual(wanted))
            Fail(name, $"Q1 accepted [{string.Join(", ", aligned)}], expected [{string.Join(", ", wanted)}]");
    }

    if (q2Aligned is not null)
    {
        var aligned = q2.AlignedChipIds.OrderBy(id => id).ToList();
        var wanted = q2Aligned.OrderBy(id => id).ToList();
        if (!aligned.SequenceEqual(wanted))
            Fail(name, $"Q2 accepted [{string.Join(", ", aligned)}], expected [{string.Join(", ", wanted)}]");
    }

    // A goal question must never be a promise graded as if it were an answer.
    if (q3.Kind != ReflectionQuestionBank.NextAction || q3.AlignedChipIds.Count > 0)
        Fail(name, "Q3 is not an unjudged next-action question");

    // Every option the menu offers must be one the student could have named, and every accepted one
    // must be on the menu.
    foreach (var id in q1.AlignedChipIds.Concat(q1.PartialChipIds))
        if (!q1.Chips.Any(c => c.Id == id)) Fail(name, $"Q1 key names {id}, which is not offered");
}

// A method goal: mistakes went UP, nothing was clean, no hint-free run, slower, never solved alone.
var methodWorse = new ReflectionEvidence
{
    IsGoal = true, Focus = "method", FocusLabelKey = "flexibility:elimination-method",
    GoalExercises = [Goal(Elimination, 2, 0, 50, type: Efficiency), Goal(Elimination, 3, 1, 60, type: Efficiency)],
};

CheckGoal("goal-window/method-some-went-well", methodWorse,
    "reflection-goal-q1-method", "reflection-q2-count-clean", "reflection-goal-q3-method",
    q1Aligned: ["went-no-hints"],
    q1Offered: ["went-errors-down", "went-no-errors", "went-no-hints", "went-faster", "went-solved-alone"],
    // No other methods in the history, so there is nothing to compare against: the accuracy question
    // stands in rather than the comparison having an answer the student could not know.
    // Efficiency invites an explanation and never a comparison, so only the first is on the menu.
    q3Chips: ["act-no-hints", "act-solve-alone", "act-explain", "act-beat-average"]);

// The same method goal, but its exercises were Suitability ones. A commitment has to be one the next
// exercise can actually keep, so the explanation drops out and the comparison takes its place.
var methodSuitabilityOnly = new ReflectionEvidence
{
    IsGoal = true, Focus = "method", FocusLabelKey = "flexibility:elimination-method",
    GoalExercises = [Goal(Elimination, 2, 0, 50, correct: true, type: Suitability), Goal(Elimination, 1, 0, 40, correct: true, type: Suitability)],
    OtherMethodExercises = [Goal(Equalization, 8, 0, 50, type: Suitability)],
};

CheckGoal("goal-window/method-only-suitability", methodSuitabilityOnly,
    "reflection-goal-q1-method", "reflection-goal-q2-method-compare", "reflection-goal-q3-method",
    q3Chips: ["act-no-hints", "act-solve-alone", "act-compare", "act-beat-average"]);

// A method goal where NOTHING went well: every option is offered and every one pays the partial
// amount, because a student who answered honestly about a bad session should not be paid nothing.
var methodNothing = new ReflectionEvidence
{
    IsGoal = true, Focus = "method", FocusLabelKey = "flexibility:elimination-method",
    GoalExercises = [Goal(Elimination, 1, 1, 50), Goal(Elimination, 2, 2, 60)],
};

CheckGoal("goal-window/method-nothing-went-well", methodNothing,
    "reflection-goal-q1-method", "reflection-q2-count-clean", "reflection-goal-q3-method",
    q1Aligned: [],
    q2Aligned: ["band-none"]);
{
    var questions = ReflectionQuestionBank.Build(methodNothing);
    if (questions[0].PartialChipIds.Count != questions[0].Chips.Count)
        Fail("goal-window/method-nothing-went-well", "not every option pays the partial amount when nothing went well");
}

// A method goal with other methods in the history, so the comparison question is real: this method
// averaged 2 mistakes, the others 8.
var methodWithOthers = new ReflectionEvidence
{
    IsGoal = true, Focus = "method", FocusLabelKey = "flexibility:elimination-method",
    GoalExercises = [Goal(Elimination, 2, 0, 50), Goal(Elimination, 2, 0, 50)],
    OtherMethodExercises = [Goal(Equalization, 8, 0, 50), Goal(Substitution, 8, 0, 50)],
};

CheckGoal("goal-window/method-compares-with-others", methodWithOthers,
    "reflection-goal-q1-method", "reflection-goal-q2-method-compare", "reflection-goal-q3-method",
    q2Aligned: ["cmp-fewer"]);

// The record line handed to the model has to name the window's individual exercises. The goal
// questions ask about their ORDER — mistakes down, faster by the end — so a model given only the
// totals cannot check a free-text "I got faster" in either direction.
{
    var record = ReflectionQuestionBank.DescribeRecord(methodWithOthers);
    if (!record.Contains("#1:") || !record.Contains("#2:") || !record.Contains("oldest first"))
        Fail("goal-window/record-line", $"the goal record line does not describe the window: {record}");
}

// A Suitability goal where the choices got better: wrong, wrong, right, right.
var suitability = new ReflectionEvidence
{
    IsGoal = true, Focus = "exerciseType", GoalFocus = "Suitability",
    GoalExercises =
    [
        Goal(Substitution, 2, 1, 50, correct: false, type: Suitability),
        Goal(Substitution, 3, 1, 50, correct: false, type: Suitability),
        Goal(Elimination, 0, 0, 40, correct: true, type: Suitability),
        Goal(Elimination, 0, 0, 40, correct: true, type: Suitability),
    ],
};

CheckGoal("goal-window/suitability-worked", suitability,
    "reflection-goal-q1-suitability", "reflection-goal-q2-pick-unsuitable", "reflection-goal-q3-suitability",
    // Hints also fell: 1,1 before against 0,0 after.
    q1Aligned: ["went-better-choices", "went-no-errors", "went-fewer-hints"],
    q2Aligned: ["pick-substitution"],
    q3Chips: ["act-suitable-choice", "act-no-hints", "act-solve-alone", "act-explain", "act-compare"]);

// An Efficiency goal: the best method was picked every time, one run was clean, and they sped up.
var efficiency = new ReflectionEvidence
{
    IsGoal = true, Focus = "exerciseType", GoalFocus = "Efficiency",
    GoalExercises =
    [
        Goal(Equalization, 1, 0, 90, correct: true, type: Efficiency),
        Goal(Equalization, 0, 0, 30, correct: true, type: Efficiency),
    ],
};

CheckGoal("goal-window/efficiency-worked", efficiency,
    "reflection-goal-q1-efficiency", "reflection-goal-q2-pick-inefficient", "reflection-goal-q3-efficiency",
    q1Aligned: ["went-always-correct", "went-no-errors", "went-faster"],
    q3Chips: ["act-best-choice", "act-no-hints", "act-solve-alone", "act-no-errors"]);

// A Matching goal: the method is given, so there is no right choice, and the question is which method
// went worst. There is a clean run, so "no mistakes" is true as well as "fewer mistakes later".
var matching = new ReflectionEvidence
{
    IsGoal = true, Focus = "exerciseType", GoalFocus = "Matching",
    GoalExercises =
    [
        Goal(Elimination, 4, 2, 50, explained: true, type: Matching),
        Goal(Equalization, 0, 0, 40, type: Matching),
    ],
};

CheckGoal("goal-window/matching-worked", matching,
    "reflection-goal-q1-matching", "reflection-goal-q2-most-errors-type", "reflection-goal-q3-matching",
    q1Aligned: ["went-no-errors", "went-fewer-errors", "went-no-hints", "went-faster", "went-explained"],
    q2Aligned: ["pick-elimination"],
    q3Chips: ["act-no-errors", "act-no-hints", "act-explain", "act-solve-alone"]);

// A self-explanation goal: explaining went with fewer mistakes and fewer hints.
var explained = new ReflectionEvidence
{
    IsGoal = true, Focus = "selfExplanation",
    GoalExercises =
    [
        Goal(Elimination, 0, 0, 50, explained: true),
        Goal(Elimination, 3, 2, 50, explained: false),
    ],
    PriorSkippedExplanation = [Elimination],
};

CheckGoal("goal-window/self-explanation-worked", explained,
    "reflection-goal-q1-self-explanation", "reflection-goal-q2-group-compare", "reflection-goal-q3-explain-type",
    q1Aligned: ["went-explain-helped", "went-explain-clean", "went-explain-hints", "went-explain-new"],
    q2Aligned: ["cmp-in-group"],
    q3Chips: ["pick-efficiency", "pick-matching"]);

// A self-explanation goal where they explained EVERY time. The two options that compare explaining
// against skipping are not offered, because there is no skipped half to compare against — and offering
// them would be worse than useless: the absent side averages to zero, so "fewer mistakes when I
// explained" would come out TRUE for a student who never skipped anything.
var alwaysExplained = new ReflectionEvidence
{
    IsGoal = true, Focus = "selfExplanation",
    GoalExercises =
    [
        Goal(Elimination, 0, 0, 50, explained: true),
        Goal(Elimination, 1, 0, 40, explained: true),
    ],
};

CheckGoal("goal-window/self-explanation-always-explained", alwaysExplained,
    "reflection-goal-q1-self-explanation", "reflection-goal-q2-explain-method", "reflection-goal-q3-explain-type",
    q1Offered: ["went-explain-clean", "went-explain-new"]);

// The same guard on the comparison goal, which is built from the same rule.
var alwaysCompared = new ReflectionEvidence
{
    IsGoal = true, Focus = "methodComparison",
    GoalExercises =
    [
        Goal(Elimination, 0, 0, 50, compared: true),
        Goal(Elimination, 1, 0, 40, compared: true),
    ],
};

CheckGoal("goal-window/comparison-always-compared", alwaysCompared,
    "reflection-goal-q1-comparison", "reflection-goal-q2-compare-method", "reflection-goal-q3-compare-method",
    q1Offered: ["went-compare-clean", "went-compare-new"]);

// A solve-on-own goal: they worked one out that they used to hand over, and the system was handed
// equalization.
var solvedAlone = new ReflectionEvidence
{
    IsGoal = true, Focus = "solveOnOwn",
    GoalExercises =
    [
        Goal(Equalization, 2, 1, 50, own: false),
        Goal(Equalization, 1, 1, 50, own: false),
        Goal(Elimination, 0, 0, 40, own: true),
    ],
    PriorSystem = [Elimination],
};

CheckGoal("goal-window/solve-on-own-worked", solvedAlone,
    "reflection-goal-q1-solve-on-own", "reflection-goal-q2-system-method", "reflection-goal-q3-solve-method",
    // "Fewer mistakes when I did it myself" is true here too: nothing went wrong on the one they did
    // themselves, against 2 and 1 on the two they handed over.
    q1Aligned: ["went-alone-clean", "went-alone-hints", "went-alone-new", "went-alone-fewer"],
    q2Aligned: ["pick-equalization"],
    q3Chips: ["pick-equalization", "pick-substitution", "pick-elimination"]);

// The solve-on-own option comparing alone against the system is hidden when they ALWAYS solve alone,
// because there is no second group for it to be true of.
var alwaysAlone = new ReflectionEvidence
{
    IsGoal = true, Focus = "solveOnOwn",
    GoalExercises = [Goal(Elimination, 0, 0, 40, own: true), Goal(Elimination, 1, 0, 40, own: true)],
};

CheckGoal("goal-window/solve-on-own-always-alone", alwaysAlone,
    "reflection-goal-q1-solve-on-own", "reflection-q2-count-clean", "reflection-goal-q3-solve-method",
    q1Offered: ["went-alone-clean", "went-alone-hints", "went-alone-new"]);

// A hints-and-errors goal with a limit, where every exercise stayed inside it.
var hintsErrors = new ReflectionEvidence
{
    IsGoal = true, Focus = "hintsAndErrors", GoalQuality = "hints", GoalLimit = 1,
    GoalExercises = [Goal(Elimination, 1, 1, 50, type: Efficiency), Goal(Elimination, 0, 0, 40, type: Efficiency)],
};

CheckGoal("goal-window/hints-errors-worked", hintsErrors,
    "reflection-goal-q1-hints-errors", "reflection-goal-q2-most-hints", "reflection-goal-q3-hints-errors",
    q1Aligned: ["went-no-hints", "went-no-errors", "went-errors-down", "went-hints-down", "went-within-limit"],
    q1Offered: ["went-no-hints", "went-no-errors", "went-errors-down", "went-hints-down", "went-within-limit"],
    // This category is measured over whatever they did, so which commitments are menu-worthy depends
    // on the exercise types inside the goal — the same gate as a method goal.
    q3Chips: ["act-no-hints", "act-beat-average", "act-solve-alone", "act-explain"]);

// The same goal with the limit on HINTS asks about hints, not mistakes.
var hintsOnly = new ReflectionEvidence
{
    IsGoal = true, Focus = "hintsAndErrors", GoalQuality = "hints", GoalLimit = 1,
    GoalExercises = [Goal(Elimination, 0, 3, 50), Goal(Equalization, 0, 1, 50)],
};

CheckGoal("goal-window/hints-errors-asks-about-hints", hintsOnly,
    "reflection-goal-q1-hints-errors", "reflection-goal-q2-most-hints", "reflection-goal-q3-hints-errors",
    q2Aligned: ["pick-elimination"]);

// A goal whose window could not be read back falls back to the plain questions rather than breaking.
scenarios.Add(("goal/no-window", new ReflectionEvidence { IsGoal = true, Focus = "method", InSet = 3 }));
Expect("goal/no-window", q1: "reflection-q1-better-than-last");

// ── The end-of-session reflection ────────────────────────────────────────────
//
// The one item whose questions are NOT graded. Two questions, not three, and nothing anywhere in
// either of them may pay Insight: there is no record of "what went well today" that could settle a
// claim, and the second question is a commitment about tomorrow rather than an answer about today.
//
// Checked apart from the loop above, because every assertion in that loop is written for a question
// set whose answers the record can settle — "nothing can ever earn Insight here" is a failure for an
// exercise and the whole point of these.
void CheckSession(string name, ReflectionEvidence evidence)
{
    List<ReflectionQuestion> questions;
    try
    {
        questions = ReflectionQuestionBank.Build(evidence);
    }
    catch (Exception ex)
    {
        Fail(name, $"Build threw {ex.GetType().Name}: {ex.Message}");
        return;
    }

    if (questions.Count != 2) { Fail(name, $"expected 2 questions, got {questions.Count}"); return; }

    var (q1, q2) = (questions[0], questions[1]);

    if (q1.Kind != ReflectionQuestionBank.Session) Fail(name, $"Q1 kind was {q1.Kind}, expected session");
    if (q2.Kind != ReflectionQuestionBank.NextAction) Fail(name, $"Q2 kind was {q2.Kind}, expected next-action");
    if (q1.TextKey != "reflection-session-q1") Fail(name, $"Q1 was {q1.TextKey}");
    if (q2.TextKey != "reflection-session-q2") Fail(name, $"Q2 was {q2.TextKey}");
    if (q1.ItemType != "session" || q2.ItemType != "session") Fail(name, "an item type is not session");

    foreach (var question in questions)
    {
        var label = $"{name}/{question.Id}";

        textKeys.Add(question.TextKey);
        foreach (var chip in question.Chips) chipKeys.Add(chip.TextKey);

        if (question.Chips.Count < 2) Fail(label, $"only {question.Chips.Count} chip(s)");
        if (question.Chips.Select(c => c.Id).Distinct().Count() != question.Chips.Count)
            Fail(label, "duplicate chip ids");
        if (question.Chips.Any(c => c.TextKey.Length == 0)) Fail(label, "a chip has no text key");

        // NEITHER QUESTION IS GRADED. Not one chip, and not the blank the free text arrives as.
        if (question.AlignedChipIds.Count > 0 || question.PartialChipIds.Count > 0)
            Fail(label, "a session question carries an answer key");

        foreach (var chip in question.Chips)
            if (ReflectionQuestionBank.Grade(question, chip.Id).InsightXp != 0)
                Fail(label, $"chip \"{chip.Id}\" paid Insight on an ungraded question");

        if (ReflectionQuestionBank.Grade(question, "").InsightXp != 0)
            Fail(label, "a blank answer paid Insight on an ungraded question");
    }
}

// A session with a bit of everything on the day.
CheckSession("session/full-day", new ReflectionEvidence
{
    IsSession = true, InSet = 3, Errors = 2, Hints = 1,
    GoalExercises =
    [
        Goal(Elimination, 2, 1, 60, own: true, type: Suitability),
        Goal(Equalization, 0, 0, 45, explained: true, type: Efficiency),
        Goal(Substitution, 0, 0, 30, compared: true, type: Matching),
    ],
});

// A session whose only exercise was mistake-free but hint-heavy, so the menu has fewer options.
CheckSession("session/one-clean-run", new ReflectionEvidence
{
    IsSession = true, InSet = 1, Errors = 0, Hints = 2,
    GoalExercises = [Goal(Substitution, 0, 2, 70, type: Efficiency)],
});

// The hard day: every exercise cost both a mistake and a hint, so not one of the specific wins is
// available and the menu is down to its floor. It still has to be a menu.
CheckSession("session/nothing-specific-went-well", new ReflectionEvidence
{
    IsSession = true, InSet = 2, Errors = 3, Hints = 2,
    GoalExercises = [Goal(Equalization, 2, 1, 80, type: Efficiency), Goal(Elimination, 1, 1, 90, type: Suitability)],
});

// A session with nothing finished in it. The menu is about making the time, because that is all that
// happened — and it still needs two chips to be a menu rather than a single button.
CheckSession("session/no-exercises", new ReflectionEvidence { IsSession = true, InSet = 0 });

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
// The two questions that pay every chip by design are left out of the headline: the what-went-well
// menus when nothing went well, and the question a goal with no readable window is left with. Neither
// is a question the record could have settled, and counting them would hide a real regression behind
// two known ones.
var exemptFromGuessRate = new[] { "q1-progress", "q1-exercise-went-well" };

var checkablePaid = byQuestion.Where(kv => kv.Key != "q3-next-action" && !exemptFromGuessRate.Contains(kv.Key)).SelectMany(kv => kv.Value).Sum(x => x.Paid);
var checkableTotal = byQuestion.Where(kv => kv.Key != "q3-next-action" && !exemptFromGuessRate.Contains(kv.Key)).SelectMany(kv => kv.Value).Sum(x => x.Total);

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
        IsSession = source.IsSession,
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
