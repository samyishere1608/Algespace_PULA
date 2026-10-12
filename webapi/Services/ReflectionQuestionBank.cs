using webapi.Models.Student;

namespace webapi.Services
{
    /// <summary>
    /// The reflection question bank.
    ///
    /// WHY THE SERVER OWNS THIS. The question a student reads and the rule that grades it have to be
    /// the same object. If the client chose the wording and the server guessed at the verdict, the two
    /// could drift and nothing would notice. So the bank decides which questions an item gets, which
    /// chips each one offers, and which of those chips are a correct answer; the client renders what it
    /// is given and sends the chosen chip back.
    ///
    /// WHAT MAKES A QUESTION WORTH ASKING. Every question here asks for something we already hold the
    /// answer to, or for a judgement the record can confirm. That is the whole difference from "how do
    /// you think that went?", which a tired student can answer with "it was fine" and be rewarded for
    /// it. Each question therefore carries the chips that would be correct, worked out from the
    /// student's own record before they are asked.
    ///
    /// POSITIVE BY DEFAULT. The observation question asks what went well, not what went wrong. The same
    /// per-step numbers support both readings; this bank reads them for the good one, because a
    /// reflection that opens by pointing at a mistake teaches a student to write what sounds right
    /// rather than to look at their own work.
    ///
    /// CHIPS ARE A SHORTCUT, NOT THE ANSWER. They are offered as a quick claim, never advertised, and
    /// the free text stays the main way to reply. A student who writes instead of tapping is judged on
    /// what they wrote, against the same expectation.
    /// </summary>
    public static class ReflectionQuestionBank
    {
        public const string Observation = "observation";
        public const string Judgement = "judgement";
        public const string NextAction = "next-action";

        /// <summary>Insight for an answer that matches the record. Same ceiling the old grader used.</summary>
        private const int AlignedXp = 3;

        /// <summary>
        /// Insight for the ONE case where the record cannot settle the answer.
        ///
        /// Partial used to cover "the right area but no reason" and "hedging against a clear trend"
        /// as well, and that made the award far too easy to collect: with three or four chips and two
        /// of them paying something, a guess was paid nearly every time. Insight now means one thing,
        /// and the audit in the harness checks that a wrong chip never pays.
        /// </summary>
        private const int PartialXp = 1;

        // ── The step vocabulary ───────────────────────────────────────────────
        //
        // Four names, not the fifteen phase names the exercises use. A student does not distinguish
        // "Elimination" from "Substitution" as steps; both are "setting it up". Four labels keep the
        // copy readable and translatable, and folding several phases onto one step also sums their
        // numbers, which is what makes a step question work on a short exercise.

        private const string StepChoose = "choose";
        private const string StepSetup = "setup";
        private const string StepSolve = "solve";
        private const string StepExplain = "explain";

        /// <summary>The order a question offers the steps in: the order the exercise happened in.</summary>
        private static readonly string[] StepOrder = [StepChoose, StepSetup, StepSolve, StepExplain];

        /// <summary>
        /// Which step a recorded name belongs to, or empty when it is not a step at all.
        ///
        /// The names come from the two phase enums the exercises already use. Anything ending in
        /// "Choice" is a decision point rather than a step, and anything starting with "StudentType" is
        /// the classifier output; neither is something the student did, so neither becomes a step.
        /// Action-phase names carry no numbers of their own, which is why including them changes no
        /// total.
        /// </summary>
        public static string StepIdFor(string recordName)
        {
            if (string.IsNullOrEmpty(recordName)) return "";
            if (recordName.EndsWith("Choice", StringComparison.Ordinal)) return "";
            if (recordName.StartsWith("StudentType", StringComparison.Ordinal)) return "";

            return recordName switch
            {
                "EfficiencySelection" or "SystemSelection" or "SelectedMethod"
                    or "SystemMatchingActions" or "EfficiencySelectionActions" => StepChoose,

                "EquationSelection" or "Transformation" or "TransformationResolve" or "TransformationActions"
                    or "Elimination" or "EliminationResolve" or "EliminationActions"
                    or "Equalization" or "EqualizationResolve" or "EqualizationActions"
                    or "Substitution" or "SubstitutionResolve" or "SubstitutionActions" => StepSetup,

                "FirstSolution" or "FirstSolutionActions"
                    or "SecondSolution" or "SecondSolutionActions" => StepSolve,

                "SelfExplanation" or "SelfExplanationActions" => StepExplain,

                // Not steps: the comparison verdict and the resolving track's conclusion.
                _ => ""
            };
        }

        public static string StepLabelKey(string stepId) => $"reflection-step-{stepId}";

        // ── The three questions ───────────────────────────────────────────────

        /// <summary>
        /// Q1 observes, Q2 judges, Q3 looks forward. Not every item has the evidence for every question,
        /// and where it does not the item gets a weaker question rather than no question: a reflection
        /// that skips a step is worse than one that asks something simpler.
        /// </summary>
        public static List<ReflectionQuestion> Build(ReflectionEvidence evidence) => evidence.IsGoal
            ? evidence.GoalExercises.Count > 0
                // A goal with a readable window is asked its own questions.
                ? [BuildGoalObservation(evidence), BuildGoalJudgement(evidence), BuildGoalNextAction(evidence)]
                // A goal completed before the window was recorded, or one whose window was empty. The
                // plain questions are all that can be asked of it, and they still ask something real.
                : [BuildObservation(evidence), BuildJudgement(evidence), BuildNextAction(evidence)]
            : [BuildObservation(evidence), BuildJudgement(evidence), BuildNextAction(evidence)];

        /// <summary>
        /// Q1: which part went well, read from the per-step numbers.
        ///
        /// Which variant appears is not a style choice. If a step came through with no errors and no
        /// hints, that is a clean piece of work and the question asks about it. If nothing was clean, the
        /// exercise was still finished, so the honest positive question is which part took the most
        /// fight, and the answer is checkable because the costliest step is known.
        /// </summary>
        private static ReflectionQuestion BuildObservation(ReflectionEvidence evidence)
        {
            var itemType = evidence.IsGoal ? "goal" : "exercise";
            var steps = StepOrder.Where(step => evidence.Steps.Any(stat => stat.Id == step)).ToList();

            if (steps.Count >= 2)
            {
                var clean = evidence.CleanStepIds.Where(steps.Contains).ToList();

                // A part with NO MISTAKES in it is one the student can honestly say they felt sure
                // about, even if they opened a hint there. Hints are often caution rather than confusion,
                // and requiring a hint-free step meant a student who understood every part but took one
                // hint was told the only part worth naming was the one that cost them the most, which is
                // the opposite of what Q1 asks. A step WITH mistakes in it is still not an honest answer.
                var sure = clean.Count > 0
                    ? clean
                    : steps.Where(step => evidence.Steps.First(stat => stat.Id == step).Errors == 0).ToList();

                var asksWhatWentWell = sure.Count > 0;

                var question = new ReflectionQuestion
                {
                    Id = asksWhatWentWell ? "q1-step-sure" : "q1-step-fight",
                    Kind = Observation,
                    ItemType = itemType,
                    TextKey = asksWhatWentWell ? "reflection-q1-step-sure" : "reflection-q1-step-fight",
                    Chips = steps.Select(step => new ReflectionChip
                    {
                        Id = $"step-{step}",
                        TextKey = StepLabelKey(step),
                    }).ToList(),
                    // More than one step being easy is not a student getting the question wrong, so on the
                    // "sure" variant every part they got right is accepted. On the "fight" variant the
                    // answer is the one that actually cost them, and a step within a whisker of it counts
                    // too: two steps costing the same is not a student misremembering.
                    AlignedChipIds = asksWhatWentWell
                        ? sure.Select(step => $"step-{step}").ToList()
                        : Costliest(steps, evidence),
                    Expectation = asksWhatWentWell
                        ? "they name the part they felt most sure about, which is a part they got through without a mistake"
                        : "they name the part that cost them the most, which was the part that did",
                };

                // No partial: naming a step that was neither clean nor costly is simply wrong, and paying
                // something for it is what made a guess profitable.
                question.PartialChipIds = [];

                return question;
            }

            // No usable step breakdown, so the question falls back to the plainest fact on the row: how
            // this run compared with the one before it.
            var improved = evidence.HasHistory && evidence.Errors < evidence.PreviousErrors;
            var worsened = evidence.HasHistory && evidence.Errors > evidence.PreviousErrors;

            var fallback = new ReflectionQuestion
            {
                Id = "q1-progress",
                Kind = Observation,
                ItemType = itemType,
            };

            if (evidence.HasHistory)
            {
                // One question, whether the run improved or not. The question is about the comparison and
                // the chips answer it directly: "Yes" / "About the same" / "Not really". An earlier
                // version asked "what went better?" and offered those same three chips, which is a
                // question a yes/no chip cannot answer.
                fallback.TextKey = "reflection-q1-better-than-last";
                fallback.Chips =
                [
                    new ReflectionChip { Id = "band-yes", TextKey = "reflection-chip-band-yes" },
                    new ReflectionChip { Id = "band-same", TextKey = "reflection-chip-band-same" },
                    new ReflectionChip { Id = "band-no", TextKey = "reflection-chip-band-no" },
                ];
                fallback.AlignedChipIds = [improved ? "band-yes" : worsened ? "band-no" : "band-same"];
                fallback.Expectation =
                    $"they say whether this run went better than the previous one, and it {(improved ? "did" : worsened ? "did not" : "went about the same")}";

                return fallback;
            }

            // No previous attempt to compare with either. This is the one question in the bank whose
            // answer the record cannot check, so it asks about the student's own expectation rather than
            // pretending to know: the chips are a real answer to it, and every one of them pays the
            // partial amount, because refusing to pay anything for an honest reflection is worse than
            // paying a little for one we cannot verify.
            fallback.TextKey = "reflection-q1-expectation";
            fallback.Chips =
            [
                new ReflectionChip { Id = "expect-better", TextKey = "reflection-chip-expect-better" },
                new ReflectionChip { Id = "expect-same", TextKey = "reflection-chip-expect-same" },
                new ReflectionChip { Id = "expect-worse", TextKey = "reflection-chip-expect-worse" },
            ];
            fallback.PartialChipIds = ["expect-better", "expect-same", "expect-worse"];
            fallback.Expectation = "they say whether it went better or worse than they expected";

            return fallback;
        }

        /// <summary>
        /// Q2: the question that is actually about this goal, or this kind of exercise.
        ///
        /// This is where the category matters. A goal about explaining your reasoning is asked whether
        /// they explained it, a goal about hints is asked how many runs were hint-free, and an exercise
        /// is asked about the one decision its own type actually puts in front of the student.
        /// </summary>
        private static ReflectionQuestion BuildJudgement(ReflectionEvidence evidence)
        {
            var itemType = evidence.IsGoal ? "goal" : "exercise";

            if (!evidence.IsGoal && evidence.DecisionDimension == "compare")
            {
                // Suitability is the only type that offers a comparison, and it is the decision that
                // teaches the thing the exercise exists to teach. Asking whether they compared is a fact
                // we hold, not a feeling. The chips name the DIMENSION ("yn-compare-…") because "I did it
                // myself" is an answer to no question in particular; "I compared them myself" is an answer
                // to this one.
                return new ReflectionQuestion
                {
                    Id = "q2-compared",
                    Kind = Judgement,
                    ItemType = itemType,
                    TextKey = "reflection-q2-compared",
                    Chips =
                    [
                        new ReflectionChip { Id = "yn-compare-yes", TextKey = "reflection-chip-yn-compare-yes" },
                        new ReflectionChip { Id = "yn-compare-partly", TextKey = "reflection-chip-yn-compare-partly" },
                        new ReflectionChip { Id = "yn-compare-shown", TextKey = "reflection-chip-yn-compare-shown" },
                    ],
                    AlignedChipIds = [evidence.DidCompare ? "yn-compare-yes" : "yn-compare-shown"],
                    // The record is a yes or a no, so "I compared part of it" is never the accurate
                    // description of it. The chip stays because it is a fair thing to want to say; it
                    // simply does not pay, and a wrong answer that pays is how guessing becomes rational.
                    PartialChipIds = [],
                    Expectation = evidence.DidCompare
                        ? "they say they compared it themselves, because they did"
                        : "they say they asked to be shown, because that is what they did",
                };
            }

            if (!evidence.IsGoal && evidence.DecisionDimension == "explain")
            {
                // Efficiency and Matching both ask the student to explain themselves first, but they ask
                // about DIFFERENT things and the app words them differently: Efficiency asks why the
                // chosen method suits the system, Matching asks why the system is the right one. Naming
                // the moment the student actually saw is the difference between a question and a guess at
                // one, so the wording follows the exercise type.
                var matching = evidence.Focus == "Matching";

                return new ReflectionQuestion
                {
                    Id = "q2-explained",
                    Kind = Judgement,
                    ItemType = itemType,
                    TextKey = matching ? "reflection-q2-explained-matching" : "reflection-q2-explained-efficiency",
                    Chips =
                    [
                        new ReflectionChip { Id = "yn-explain-yes", TextKey = "reflection-chip-yn-explain-yes" },
                        new ReflectionChip { Id = "yn-explain-partly", TextKey = "reflection-chip-yn-explain-partly" },
                        new ReflectionChip { Id = "yn-explain-shown", TextKey = "reflection-chip-yn-explain-shown" },
                    ],
                    AlignedChipIds = [evidence.DidExplain ? "yn-explain-yes" : "yn-explain-shown"],
                    PartialChipIds = [],
                    Expectation = evidence.DidExplain
                        ? "they say they explained it themselves, because they did"
                        : "they say they asked to be shown, because that is what they did",
                };
            }

            // A goal, or an exercise with no such decision. Both are asked how often they actually did
            // the thing, which is the one fact we can count across a set of exercises, and it is the
            // honest question about a goal, because a goal is a promise about a pattern rather than
            // about one run.
            // A COMPLETED GOAL HAS ALREADY PROVED ITS OWN CRITERION. "Practise the elimination method
            // three times" cannot complete without three exercises solved with elimination, so asking
            // how many of them used elimination is asking the student to confirm what the celebration
            // just told them, and the answer is always "all of them". The same holds for every other
            // category: a goal to explain your reasoning cannot complete without explaining it.
            //
            // So the question asks about something the goal does NOT prove. Working it out unaided is
            // unproven for every goal that is not about it, and the goal that IS about it — solve on
            // own, which means reaching the solution yourself rather than being shown it, NOT avoiding
            // hints — asks about accuracy instead, which nothing about that goal settles.
            var (runs, textKey) = evidence.Focus == "solveOnOwn"
                ? (evidence.CleanRuns, "reflection-q2-count-clean")
                : (evidence.SolvedOnOwnRuns, "reflection-q2-count-solo");

            var band = BandFor(runs, evidence.InSet);

            return new ReflectionQuestion
            {
                Id = "q2-count",
                Kind = Judgement,
                ItemType = itemType,
                TextKey = textKey,
                // The set the count is over, so the question can say WHICH exercises it means instead of
                // the bare "of those".
                Values = new Dictionary<string, string> { ["total"] = evidence.InSet.ToString() },
                Chips =
                [
                    new ReflectionChip { Id = "band-all", TextKey = "reflection-chip-band-all" },
                    new ReflectionChip { Id = "band-most", TextKey = "reflection-chip-band-most" },
                    new ReflectionChip { Id = "band-some", TextKey = "reflection-chip-band-some" },
                    new ReflectionChip { Id = "band-none", TextKey = "reflection-chip-band-none" },
                ],
                AlignedChipIds = [band],
                // The exact band only. The record is a count, so being one band out is not a hedge,
                // it is a wrong answer, and the bands are coarse enough to hit after one honest look.
                PartialChipIds = [],
                Expectation = $"they are honest about how often it happened: {runs} of {evidence.InSet} exercises",
            };
        }

        /// <summary>
        /// Q3: one thing to do differently next time.
        ///
        /// Every option is a commitment the NEXT exercise can be checked against, so it is worth
        /// something later rather than now. It pays no Insight, because Insight is for seeing your own
        /// work clearly and this is a promise about future work; following through is what Resolve is
        /// for.
        /// </summary>
        private static ReflectionQuestion BuildNextAction(ReflectionEvidence evidence)
        {
            var question = new ReflectionQuestion
            {
                Id = "q3-next-action",
                Kind = NextAction,
                ItemType = evidence.IsGoal ? "goal" : "exercise",
            };

            // The middle chip exists because taking a hint is not giving up, and a two-option question
            // would tell a student who needs one that their only honest answer is the giving-up one.
            //
            // The ids carry the dimension they promise about, so the next exercise can be checked
            // against them without storing anything extra: "act-solo-myself" says by itself what to
            // look for. The three labels are the same shape in every set and read as a sentence under
            // their own question ("Explain it myself / …and take a hint if I need one / Ask to see the
            // explanation"), so a chip always answers the question it sits under.
            List<ReflectionChip> tryMyself(string dimension) =>
            [
                new ReflectionChip { Id = $"act-{dimension}-myself", TextKey = $"reflection-chip-act-{dimension}-myself" },
                new ReflectionChip { Id = $"act-{dimension}-hint", TextKey = $"reflection-chip-act-{dimension}-hint" },
                new ReflectionChip { Id = $"act-{dimension}-shown", TextKey = $"reflection-chip-act-{dimension}-shown" },
            ];

            if (evidence.Focus == "hintsAndErrors")
            {
                question.TextKey = "reflection-q3-target";
                question.Chips =
                [
                    new ReflectionChip { Id = "act-target-none", TextKey = "reflection-chip-act-target-none" },
                    new ReflectionChip { Id = "act-target-one", TextKey = "reflection-chip-act-target-one" },
                    new ReflectionChip { Id = "act-target-same", TextKey = "reflection-chip-act-target-same" },
                ];
                return question;
            }
            // Q3 offers the same dimension Q2 asked about, wherever that dimension is something the
            // student does. Naming a step the exercise does not contain would be asking for a promise
            // that cannot be kept: Suitability has no self-explanation state, so telling a student who
            // just compared two methods to "explain it myself next time" is advice about a different
            // exercise.
            var compare = evidence.DecisionDimension == "compare" || evidence.Focus == "methodComparison";
            var explain = evidence.DecisionDimension == "explain" || evidence.Focus == "selfExplanation";

            if (compare)
            {
                question.TextKey = "reflection-q3-compare";
                question.Chips = tryMyself("compare");
                return question;
            }

            if (explain)
            {
                // The exercise types word their explanation differently, and so does the goal (which is
                // about explaining in general rather than about one type's version of it).
                question.TextKey = evidence.IsGoal
                    ? "reflection-q3-explain"
                    : evidence.Focus == "Matching"
                        ? "reflection-q3-explain-matching"
                        : "reflection-q3-explain-efficiency";
                question.Chips = tryMyself("explain");
                return question;
            }

            // A goal narrowed to one method, which is the only case where the promise can name it.
            if (evidence.FocusLabelKey.Length > 0)
            {
                question.TextKey = "reflection-q3-method";
                question.Chips =
                [
                    new ReflectionChip { Id = "act-method-same", TextKey = "reflection-chip-act-method-same" },
                    new ReflectionChip { Id = "act-method-other", TextKey = "reflection-chip-act-method-other" },
                    new ReflectionChip { Id = "act-method-fit", TextKey = "reflection-chip-act-method-fit" },
                ];
                return question;
            }

            // Everything left: working it out on your own is the one thing every exercise type offers
            // and the one promise the server can always check.
            question.TextKey = "reflection-q3-solo";
            question.Chips = tryMyself("solo");
            return question;
        }

        // ── The goal questions ────────────────────────────────────────────────
        //
        // A goal is a different kind of item from an exercise, and it is asked different things.
        //
        // Q1 is a MENU OF THINGS THAT MIGHT HAVE GONE WELL, and the record decides which of them
        // actually did. The student is not told what we know; they pick the one they believe, and they
        // are right when it matches. If nothing went well the menu is still offered and any answer pays
        // the partial amount, because a reflection the student answered honestly should not be paid
        // nothing — but if SOMETHING did go well, claiming one of the others is simply wrong.
        //
        // Q2 is about the goal's own pattern: which method was the weak one, how this method compared
        // with the others, whether explaining helped.
        //
        // Q3 names a commitment out of the things the next exercise can actually check.
        //
        // Every rule reads the goal's window: the exercises it covered, in order.

        /// <summary>Q1 for a goal: what actually went well, as a menu the student chooses from.</summary>
        private static ReflectionQuestion BuildGoalObservation(ReflectionEvidence evidence)
        {
            var window = evidence.GoalExercises;
            var question = new ReflectionQuestion
            {
                Id = "goal-q1-went-well",
                Kind = Observation,
                ItemType = "goal",
                Expectation = "they name something that genuinely went well in this goal, and it did",
            };

            var options = new List<(string Id, string TextKey, bool True)>();

            void Offer(string id, string textKey, bool isTrue) => options.Add((id, textKey, isTrue));

            switch (evidence.Focus)
            {
                case "method":
                    question.TextKey = "reflection-goal-q1-method";
                    question.Slots = new Dictionary<string, string> { ["focus"] = evidence.FocusLabelKey };
                    Offer("went-errors-down", "reflection-chip-went-errors-down", Last(window, e => e.Errors) < First(window, e => e.Errors));
                    Offer("went-no-errors", "reflection-chip-went-no-errors", window.Any(e => e.Errors == 0));
                    Offer("went-no-hints", "reflection-chip-went-no-hints", window.Any(e => e.Hints == 0));
                    Offer("went-faster", "reflection-chip-went-faster", Last(window, e => e.Time) < First(window, e => e.Time));
                    Offer("went-solved-alone", "reflection-chip-went-solved-alone", window.Any(e => e.Own));
                    break;

                case "exerciseType" when GoalExerciseType(evidence) == SuitabilityType:
                    question.TextKey = "reflection-goal-q1-suitability";
                    Offer("went-better-choices", "reflection-chip-went-better-choices", LaterAverage(window, e => e.Correct) > EarlierAverage(window, e => e.Correct));
                    Offer("went-always-correct", "reflection-chip-went-always-correct", window.Count > 0 && window.All(e => e.Correct));
                    Offer("went-no-errors", "reflection-chip-went-no-errors", window.Any(e => e.Errors == 0));
                    Offer("went-fewer-hints", "reflection-chip-went-fewer-hints", LaterMean(window, e => e.Hints) < EarlierMean(window, e => e.Hints));
                    break;

                case "exerciseType" when GoalExerciseType(evidence) == EfficiencyType:
                    question.TextKey = "reflection-goal-q1-efficiency";
                    Offer("went-better-choices", "reflection-chip-went-best-choices", LaterAverage(window, e => e.Correct) > EarlierAverage(window, e => e.Correct));
                    Offer("went-always-correct", "reflection-chip-went-always-best", window.Count > 0 && window.All(e => e.Correct));
                    Offer("went-no-errors", "reflection-chip-went-no-errors", window.Any(e => e.Errors == 0));
                    Offer("went-faster", "reflection-chip-went-faster", Last(window, e => e.Time) < First(window, e => e.Time));
                    break;

                case "exerciseType":
                    question.TextKey = "reflection-goal-q1-matching";
                    Offer("went-no-errors", "reflection-chip-went-no-errors", window.Any(e => e.Errors == 0));
                    Offer("went-fewer-errors", "reflection-chip-went-fewer-errors", LaterMean(window, e => e.Errors) < EarlierMean(window, e => e.Errors));
                    Offer("went-no-hints", "reflection-chip-went-no-hints", window.Any(e => e.Hints == 0));
                    Offer("went-faster", "reflection-chip-went-faster", Last(window, e => e.Time) < First(window, e => e.Time));
                    Offer("went-explained", "reflection-chip-went-explained", window.Any(e => e.Explained));
                    break;

                case "selfExplanation":
                {
                    question.TextKey = "reflection-goal-q1-self-explanation";

                    // Every rule here compares the exercises they explained against the ones they did
                    // not, so with only one kind present there is nothing to compare against — and
                    // without this guard the absent side averages to zero, which would mark "fewer
                    // mistakes when I explained" as true for a student who never explained at all.
                    var explained = window.Where(e => e.Explained).ToList();
                    var skipped = window.Where(e => !e.Explained).ToList();
                    var comparable = explained.Count > 0 && skipped.Count > 0;

                    if (comparable)
                        Offer("went-explain-helped", "reflection-chip-went-explain-helped", Mean(explained, e => e.Errors) < Mean(skipped, e => e.Errors));

                    Offer("went-explain-clean", "reflection-chip-went-explain-clean", explained.Any(e => e.Errors == 0));

                    if (comparable)
                        Offer("went-explain-hints", "reflection-chip-went-explain-hints", Mean(explained, e => e.Hints) < Mean(skipped, e => e.Hints));

                    Offer("went-explain-new", "reflection-chip-went-explain-new", explained.Any(e => evidence.PriorSkippedExplanation.Contains(e.Method)));
                    break;
                }

                case "methodComparison":
                {
                    question.TextKey = "reflection-goal-q1-comparison";

                    // Same guard, same reason as self-explanation above.
                    var compared = window.Where(e => e.Compared).ToList();
                    var skipped = window.Where(e => !e.Compared).ToList();
                    var comparable = compared.Count > 0 && skipped.Count > 0;

                    if (comparable)
                        Offer("went-compare-helped", "reflection-chip-went-compare-helped", Mean(compared, e => e.Errors) < Mean(skipped, e => e.Errors));

                    Offer("went-compare-clean", "reflection-chip-went-compare-clean", compared.Any(e => e.Errors == 0));

                    if (comparable)
                        Offer("went-compare-hints", "reflection-chip-went-compare-hints", Mean(compared, e => e.Hints) < Mean(skipped, e => e.Hints));

                    Offer("went-compare-new", "reflection-chip-went-compare-new", compared.Any(e => evidence.PriorSkippedComparison.Contains(e.Method)));
                    break;
                }

                case "solveOnOwn":
                    question.TextKey = "reflection-goal-q1-solve-on-own";
                    Offer("went-alone-clean", "reflection-chip-went-alone-clean", window.Any(e => e.Own && e.Errors == 0));
                    Offer("went-alone-hints", "reflection-chip-went-alone-hints", window.Any(e => e.Own && e.Hints == 0));
                    Offer("went-alone-new", "reflection-chip-went-alone-new", window.Any(e => e.Own && evidence.PriorSystem.Contains(e.Method)));
                    // Offered only when there is something to compare against. A student who always solves
                    // it themselves has no other kind of exercise, so the option has no meaning for them.
                    if (window.Any(e => !e.Own) && window.Any(e => e.Own))
                        Offer("went-alone-fewer", "reflection-chip-went-alone-fewer", Mean(window.Where(e => e.Own), e => e.Errors) < Mean(window.Where(e => !e.Own), e => e.Errors));
                    break;

                default:
                    question.TextKey = "reflection-goal-q1-hints-errors";
                    Offer("went-no-hints", "reflection-chip-went-no-hints", window.Any(e => e.Hints == 0));
                    Offer("went-no-errors", "reflection-chip-went-no-errors", window.Any(e => e.Errors == 0));
                    Offer("went-errors-down", "reflection-chip-went-errors-down", Last(window, e => e.Errors) < First(window, e => e.Errors));
                    Offer("went-hints-down", "reflection-chip-went-hints-down", Last(window, e => e.Hints) < First(window, e => e.Hints));
                    // Only for a goal that set a limit. Without one there is nothing to stay inside.
                    if (evidence.GoalLimit > 0 || !string.IsNullOrWhiteSpace(evidence.GoalQuality))
                        Offer("went-within-limit", "reflection-chip-went-within-limit",
                            window.Count > 0 && window.All(e => WithinLimit(e, evidence)));
                    break;
            }

            question.Chips = [.. options.Select(option => new ReflectionChip { Id = option.Id, TextKey = option.TextKey })];
            question.AlignedChipIds = [.. options.Where(option => option.True).Select(option => option.Id)];

            // Nothing went well, so there is no wrong answer here: whichever one they pick, they answered
            // honestly about a session that simply did not go their way, and paying nothing for that
            // teaches them the reflection is not worth answering.
            if (question.AlignedChipIds.Count == 0)
                question.PartialChipIds = [.. question.Chips.Select(chip => chip.Id)];

            return question;
        }

        /// <summary>Q2 for a goal: the pattern behind the goal, which is the thing a goal is <em>about</em>.</summary>
        private static ReflectionQuestion BuildGoalJudgement(ReflectionEvidence evidence)
        {
            var window = evidence.GoalExercises;
            var question = new ReflectionQuestion { Id = "goal-q2-pattern", Kind = Judgement, ItemType = "goal" };

            // The three methods, in the order the app lists them.
            var methods = new (int Value, string Id)[]
            {
                (MethodEqualization, "equalization"),
                (MethodSubstitution, "substitution"),
                (MethodElimination, "elimination"),
            };

            List<ReflectionChip> MethodChips() =>
            [
                .. methods.Select(m => new ReflectionChip
                {
                    Id = $"pick-{m.Id}",
                    // The method names live in the exercise module, which is the app's one spelling of
                    // them. Reused rather than copied so the two can never drift.
                    TextKey = $"flexibility:{m.Id}-method",
                }),
            ];

            switch (evidence.Focus)
            {
                case "method":
                {
                    // This method against the student's other ones, which is the comparison the goal is
                    // implicitly about. With nothing to compare against there is no question, so it falls
                    // through to the accuracy question instead of disappearing.
                    var other = OtherMethodErrors(evidence);
                    if (other is null) return BuildGoalAccuracyQuestion(evidence);

                    var mine = Mean(window, e => e.Errors);
                    var fewer = mine < other.Value - ComparisonTolerance;
                    var more = mine > other.Value + ComparisonTolerance;

                    question.TextKey = "reflection-goal-q2-method-compare";
                    question.Slots = new Dictionary<string, string> { ["focus"] = evidence.FocusLabelKey };
                    question.Chips =
                    [
                        new ReflectionChip { Id = "cmp-fewer", TextKey = "reflection-chip-cmp-fewer" },
                        new ReflectionChip { Id = "cmp-same", TextKey = "reflection-chip-cmp-same" },
                        new ReflectionChip { Id = "cmp-more", TextKey = "reflection-chip-cmp-more" },
                    ];
                    question.AlignedChipIds = [fewer ? "cmp-fewer" : more ? "cmp-more" : "cmp-same"];
                    question.Expectation = $"they say how this method compared with their others: {Fmt(mine)} against {Fmt(other.Value)} mistakes per exercise";
                    return question;
                }

                case "exerciseType" when GoalExerciseType(evidence) == SuitabilityType:
                    return BuildGoalPickMethodQuestion(
                        question, MethodChips(), window.Where(e => !e.Correct),
                        "reflection-goal-q2-pick-unsuitable",
                        "they name the method they most often chose when it was not a suitable one",
                        evidence);

                case "exerciseType" when GoalExerciseType(evidence) == EfficiencyType:
                    return BuildGoalPickMethodQuestion(
                        question, MethodChips(), window.Where(e => !e.Correct),
                        "reflection-goal-q2-pick-inefficient",
                        "they name the method they most often chose when it was not the best one",
                        evidence);

                case "exerciseType":
                    return BuildGoalPickMethodQuestion(
                        question, MethodChips(), window,
                        "reflection-goal-q2-most-errors-type",
                        "they name the method they made the most mistakes with",
                        evidence, byErrors: true);

                case "selfExplanation":
                    return BuildGoalGroupComparisonQuestion(
                        question, window, e => e.Explained,
                        "reflection-chip-cmp-explained", "reflection-chip-cmp-skipped",
                        "they say whether they made fewer mistakes in the exercises they explained",
                        evidence);

                case "methodComparison":
                    return BuildGoalGroupComparisonQuestion(
                        question, window, e => e.Compared,
                        "reflection-chip-cmp-compared", "reflection-chip-cmp-skipped",
                        "they say whether they made fewer mistakes in the exercises they compared",
                        evidence);

                case "solveOnOwn":
                {
                    var system = window.Where(e => !e.Own).ToList();

                    // Nothing was handed to the system, so there is no method to name. Falls back to the
                    // accuracy question rather than asking about something that never happened.
                    if (system.Count == 0) return BuildGoalAccuracyQuestion(evidence);

                    question.TextKey = "reflection-goal-q2-system-method";
                    question.Chips = MethodChips();
                    var weakest = MostCommonMethod(system);
                    question.AlignedChipIds = weakest is null ? [] : [$"pick-{weakest}"];
                    if (question.AlignedChipIds.Count == 0) question.PartialChipIds = [.. question.Chips.Select(c => c.Id)];
                    question.Expectation = weakest is null
                        ? "they name a method, because the record cannot single one out"
                        : $"they name the method they most often handed over: {weakest}";
                    return question;
                }

                default:
                {
                    var mostHints = evidence.GoalQuality == "hints";
                    return BuildGoalPickMethodQuestion(
                        question, MethodChips(), window,
                        mostHints ? "reflection-goal-q2-most-hints" : "reflection-goal-q2-most-errors",
                        mostHints
                            ? "they name the method they took the most hints with"
                            : "they name the method they made the most mistakes with",
                        evidence, byErrors: !mostHints);
                }
            }
        }

        /// <summary>The goal question used when the pattern question has nothing to go on.</summary>
        private static ReflectionQuestion BuildGoalAccuracyQuestion(ReflectionEvidence evidence)
        {
            var window = evidence.GoalExercises;
            var clean = window.Count(e => e.Errors == 0 && e.Hints == 0);

            return new ReflectionQuestion
            {
                Id = "q2-count",
                Kind = Judgement,
                ItemType = "goal",
                TextKey = "reflection-q2-count-clean",
                Values = new Dictionary<string, string> { ["total"] = window.Count.ToString() },
                Chips =
                [
                    new ReflectionChip { Id = "band-all", TextKey = "reflection-chip-band-all" },
                    new ReflectionChip { Id = "band-most", TextKey = "reflection-chip-band-most" },
                    new ReflectionChip { Id = "band-some", TextKey = "reflection-chip-band-some" },
                    new ReflectionChip { Id = "band-none", TextKey = "reflection-chip-band-none" },
                ],
                AlignedChipIds = [BandFor(clean, window.Count)],
                Expectation = $"they are honest about how often it happened: {clean} of {window.Count} exercises",
            };
        }

        /// <summary>Q2 asking which method a subset of the exercises went worst in.</summary>
        private static ReflectionQuestion BuildGoalPickMethodQuestion(
            ReflectionQuestion question,
            List<ReflectionChip> chips,
            IEnumerable<ReflectionGoalExercise> subset,
            string textKey,
            string expectation,
            ReflectionEvidence evidence,
            bool byErrors = false)
        {
            question.TextKey = textKey;
            question.Chips = chips;

            var rows = subset.ToList();
            var weakest = MostCommonMethod(rows);
            if (byErrors || weakest is null) weakest = MethodWithMost(rows, byErrors);

            question.AlignedChipIds = weakest is null ? [] : [$"pick-{weakest}"];
            if (question.AlignedChipIds.Count == 0)
                question.PartialChipIds = [.. chips.Select(chip => chip.Id)];

            question.Expectation = weakest is null ? $"{expectation}, which the record cannot single out" : expectation;
            return question;
        }

        /// <summary>Q2 comparing two groups inside the same goal, on mistakes.</summary>
        private static ReflectionQuestion BuildGoalGroupComparisonQuestion(
            ReflectionQuestion question,
            List<ReflectionGoalExercise> window,
            Func<ReflectionGoalExercise, bool> inGroup,
            string inGroupChip,
            string outOfGroupChip,
            string expectation,
            ReflectionEvidence evidence)
        {
            var inside = window.Where(inGroup).ToList();
            var outside = window.Where(e => !inGroup(e)).ToList();

            // Needs at least one of each, or there is nothing to compare and the question would have a
            // right answer the student could not possibly know.
            if (inside.Count == 0 || outside.Count == 0) return BuildGoalAccuracyQuestion(evidence);

            var with = Mean(inside, e => e.Errors);
            var without = Mean(outside, e => e.Errors);
            var fewer = with < without - ComparisonTolerance;
            var more = with > without + ComparisonTolerance;

            question.TextKey = "reflection-goal-q2-group-compare";
            question.Chips =
            [
                new ReflectionChip { Id = "cmp-in-group", TextKey = inGroupChip },
                new ReflectionChip { Id = "cmp-same", TextKey = "reflection-chip-cmp-same" },
                new ReflectionChip { Id = "cmp-out-group", TextKey = outOfGroupChip },
            ];
            question.AlignedChipIds = [fewer ? "cmp-in-group" : more ? "cmp-out-group" : "cmp-same"];
            question.Expectation = $"{expectation}: {Fmt(with)} against {Fmt(without)} mistakes per exercise";
            return question;
        }

        /// <summary>Q3 for a goal: a promise the next exercise can be checked against.</summary>
        private static ReflectionQuestion BuildGoalNextAction(ReflectionEvidence evidence)
        {
            var question = new ReflectionQuestion { Id = "q3-next-action", Kind = NextAction, ItemType = "goal" };

            var methods = new (string Id, string TextKey)[]
            {
                ("equalization", "flexibility:equalization-method"),
                ("substitution", "flexibility:substitution-method"),
                ("elimination", "flexibility:elimination-method"),
            };

            List<ReflectionChip> CommitmentChips(params (string Id, string TextKey)[] chips) =>
                [.. chips.Select(chip => new ReflectionChip { Id = chip.Id, TextKey = chip.TextKey })];

            List<ReflectionChip> MethodChips() =>
                [.. methods.Select(m => new ReflectionChip { Id = $"pick-{m.Id}", TextKey = m.TextKey })];

            // Every commitment names the field it will be checked against in its own id, so the next
            // exercise can be judged against it without storing anything extra.
            var noHints = ("act-no-hints", "reflection-chip-act-no-hints");
            var solveAlone = ("act-solve-alone", "reflection-chip-act-solve-alone");
            var explain = ("act-explain", "reflection-chip-act-explain");
            var compare = ("act-compare", "reflection-chip-act-compare");
            var beatAverage = ("act-beat-average", "reflection-chip-act-beat-average");
            var noErrors = ("act-no-errors", "reflection-chip-act-no-errors");

            switch (evidence.Focus)
            {
                case "method":
                    question.TextKey = "reflection-goal-q3-method";
                    question.Slots = new Dictionary<string, string> { ["focus"] = evidence.FocusLabelKey };
                    // A method is practised through whichever exercise types the goal happens to cover, so
                    // these two are offered only when one of those types asks the question at all. A
                    // student cannot promise to explain their choice in a type that never invites it.
                    question.Chips = CommitmentChips([
                        .. new[] { noHints, solveAlone },
                        .. OffersExplanation(evidence) ? [explain] : Array.Empty<(string, string)>(),
                        .. OffersComparison(evidence) ? [compare] : Array.Empty<(string, string)>(),
                        beatAverage,
                    ]);
                    return question;

                case "exerciseType" when GoalExerciseType(evidence) == SuitabilityType:
                    question.TextKey = "reflection-goal-q3-suitability";
                    question.Chips = CommitmentChips(
                        ("act-suitable-choice", "reflection-chip-act-suitable-choice"),
                        noHints, solveAlone, explain, compare);
                    return question;

                case "exerciseType" when GoalExerciseType(evidence) == EfficiencyType:
                    question.TextKey = "reflection-goal-q3-efficiency";
                    question.Chips = CommitmentChips(
                        ("act-best-choice", "reflection-chip-act-best-choice"),
                        noHints, solveAlone, noErrors);
                    return question;

                case "exerciseType":
                    question.TextKey = "reflection-goal-q3-matching";
                    question.Chips = CommitmentChips(noErrors, noHints, explain, solveAlone);
                    return question;

                case "selfExplanation":
                    question.TextKey = "reflection-goal-q3-explain-type";
                    question.Chips = CommitmentChips(
                        ("pick-efficiency", "reflection-chip-type-efficiency"),
                        ("pick-matching", "reflection-chip-type-matching"));
                    return question;

                case "methodComparison":
                    question.TextKey = "reflection-goal-q3-compare-method";
                    question.Chips = MethodChips();
                    return question;

                case "solveOnOwn":
                    question.TextKey = "reflection-goal-q3-solve-method";
                    question.Chips = MethodChips();
                    return question;

                default:
                    question.TextKey = "reflection-goal-q3-hints-errors";
                    question.Chips = CommitmentChips([
                        .. new[] { noHints, beatAverage, solveAlone },
                        .. OffersExplanation(evidence) ? [explain] : Array.Empty<(string, string)>(),
                        .. OffersComparison(evidence) ? [compare] : Array.Empty<(string, string)>(),
                    ]);
                    if (!string.IsNullOrWhiteSpace(evidence.FocusLabelKey))
                        question.Slots = new Dictionary<string, string> { ["focus"] = evidence.FocusLabelKey };
                    return question;
            }
        }

        // ── Goal arithmetic ───────────────────────────────────────────────────
        //
        // Small and deliberately literal: every rule above is meant to be readable straight off the
        // definition the questions were specified from, so the numbers behind an option are obvious
        // rather than clever.

        private const int SuitabilityType = 2;
        private const int EfficiencyType = 1;

        // The Method enum's values. Repeated here as plain numbers rather than imported, because the bank
        // is the questions and nothing else: importing the exercise model to name three methods would
        // pull a chain of types into a file that has no other use for them, and it is what lets the audit
        // harness compile this file on its own.
        private const int MethodEqualization = 0;
        private const int MethodSubstitution = 1;
        private const int MethodElimination = 2;

        /// <summary>How far apart two averages must be before one counts as more than the other.</summary>
        private const double ComparisonTolerance = 0.5;

        private static int TypeOf(string name) => name switch
        {
            "Suitability" => SuitabilityType,
            "Efficiency" => EfficiencyType,
            _ => 3,
        };

        /// <summary>
        /// Which exercise type an exercise-type goal is about.
        ///
        /// Read from the goal's narrowed focus, not from <see cref="ReflectionEvidence.Focus"/>: for a
        /// goal that one holds the CATEGORY, and every exercise-type goal has the same category whichever
        /// type it is about.
        /// </summary>
        private static int GoalExerciseType(ReflectionEvidence evidence) => TypeOf(evidence.GoalFocus);

        private static bool WithinLimit(ReflectionGoalExercise exercise, ReflectionEvidence evidence) =>
            evidence.GoalQuality == "errors"
                ? exercise.Errors <= evidence.GoalLimit
                : exercise.Hints <= evidence.GoalLimit;

        /// <summary>
        /// Whether the goal's own window covers an exercise type that invites the student to explain their
        /// reasoning. Efficiency and Matching do; Suitability offers a method comparison instead.
        ///
        /// Read from the window rather than assumed from the category, because a method goal is practised
        /// through whichever types that method appears in, and a promise to explain has to be one the next
        /// exercise can actually keep.
        /// </summary>
        private static bool OffersExplanation(ReflectionEvidence evidence) =>
            evidence.GoalExercises.Any(e => e.ExerciseType is EfficiencyType or 3);

        /// <summary>Whether the goal's own window covers a type that offers the method comparison.</summary>
        private static bool OffersComparison(ReflectionEvidence evidence) =>
            evidence.GoalExercises.Any(e => e.ExerciseType == SuitabilityType);

        private static double First(List<ReflectionGoalExercise> window, Func<ReflectionGoalExercise, double> value) =>
            window.Count == 0 ? 0 : value(window[0]);

        private static double Last(List<ReflectionGoalExercise> window, Func<ReflectionGoalExercise, double> value) =>
            window.Count == 0 ? 0 : value(window[^1]);

        private static double Mean(IEnumerable<ReflectionGoalExercise> window, Func<ReflectionGoalExercise, double> value)
        {
            var rows = window.ToList();
            return rows.Count == 0 ? 0 : rows.Average(value);
        }

        private static double EarlierMean(List<ReflectionGoalExercise> window, Func<ReflectionGoalExercise, double> value) =>
            Mean(EarlierHalf(window), value);

        private static double LaterMean(List<ReflectionGoalExercise> window, Func<ReflectionGoalExercise, double> value) =>
            Mean(LaterHalf(window), value);

        private static double EarlierAverage(List<ReflectionGoalExercise> window, Func<ReflectionGoalExercise, bool> flag) =>
            Mean(EarlierHalf(window), e => flag(e) ? 1 : 0);

        private static double LaterAverage(List<ReflectionGoalExercise> window, Func<ReflectionGoalExercise, bool> flag) =>
            Mean(LaterHalf(window), e => flag(e) ? 1 : 0);

        /// <summary>The earlier half of the window, the later half of it, or both when it cannot be split.</summary>
        private static List<ReflectionGoalExercise> Half(List<ReflectionGoalExercise> window, bool later)
        {
            if (window.Count < 2) return window;
            var half = window.Count / 2;
            return later ? window.Skip(window.Count - half).ToList() : window.Take(half).ToList();
        }

        private static List<ReflectionGoalExercise> EarlierHalf(List<ReflectionGoalExercise> window) => Half(window, later: false);
        private static List<ReflectionGoalExercise> LaterHalf(List<ReflectionGoalExercise> window) => Half(window, later: true);

        /// <summary>The method used most often in a group, or null when the group is empty or tied.</summary>
        private static string? MostCommonMethod(List<ReflectionGoalExercise> group)
        {
            if (group.Count == 0) return null;

            var ranked = group.GroupBy(e => e.Method)
                .Select(g => new { Method = g.Key, Count = g.Count() })
                .OrderByDescending(g => g.Count)
                .ToList();

            // A tie is not a question with one answer, so it is reported as no answer rather than picking
            // one at random and marking the other wrong.
            if (ranked.Count > 1 && ranked[0].Count == ranked[1].Count) return null;

            return MethodKey(ranked[0].Method);
        }

        /// <summary>The method a group went worst in, by total mistakes or total hints.</summary>
        private static string? MethodWithMost(List<ReflectionGoalExercise> group, bool byErrors)
        {
            if (group.Count == 0) return null;

            var ranked = group.GroupBy(e => e.Method)
                .Select(g => new { Method = g.Key, Total = byErrors ? g.Sum(e => e.Errors) : g.Sum(e => e.Hints) })
                .OrderByDescending(g => g.Total)
                .ToList();

            // Nothing went wrong anywhere, so there is no worst method to name.
            if (ranked[0].Total == 0) return null;
            if (ranked.Count > 1 && ranked[0].Total == ranked[1].Total) return null;

            return MethodKey(ranked[0].Method);
        }

        private static string MethodKey(int method) => method switch
        {
            MethodSubstitution => "substitution",
            MethodElimination => "elimination",
            _ => "equalization",
        };

        /// <summary>
        /// The average mistakes per exercise in the student's other methods, or null when this goal covers
        /// every method they have used — there is then nothing to compare against, and a comparison
        /// question with one side missing has no answer the student could know.
        /// </summary>
        private static double? OtherMethodErrors(ReflectionEvidence evidence)
        {
            var focus = evidence.FocusLabelKey.Length > 0
                ? MethodKey(MethodFromKey(evidence.FocusLabelKey))
                : "";

            var others = evidence.OtherMethodExercises.Where(e => MethodKey(e.Method) != focus).ToList();
            return others.Count == 0 ? null : Mean(others, e => e.Errors);
        }

        private static int MethodFromKey(string labelKey) => labelKey switch
        {
            var k when k.Contains("substitution", StringComparison.OrdinalIgnoreCase) => MethodSubstitution,
            var k when k.Contains("elimination", StringComparison.OrdinalIgnoreCase) => MethodElimination,
            _ => MethodEqualization,
        };

        private static string Fmt(double value) => value.ToString("0.#", System.Globalization.CultureInfo.InvariantCulture);

        /// <summary>
        /// The steps that count as "took the most fight": the costliest one, plus any within a tenth of
        /// it. Two steps costing about the same is not a student misremembering, so accepting only one
        /// of them would mark a right answer wrong.
        /// </summary>
        private static List<string> Costliest(List<string> steps, ReflectionEvidence evidence)
        {
            var ranked = steps
                .Select(id => evidence.Steps.First(stat => stat.Id == id))
                .OrderByDescending(stat => stat.Errors * 1000 + stat.Hints * 100 + stat.Time)
                .ToList();

            if (ranked.Count == 0) return [];

            double Cost(ReflectionStepStat stat) => stat.Errors * 1000 + stat.Hints * 100 + stat.Time;

            var top = Cost(ranked[0]);
            if (top <= 0) return [];

            return ranked
                .Where(stat => Cost(stat) >= top * 0.9)
                .Select(stat => $"step-{stat.Id}")
                .ToList();
        }

        /// <summary>Which band a run count falls in, as a chip id.</summary>
        private static string BandFor(int runs, int total)
        {
            if (total <= 0) return "band-none";
            if (runs >= total) return "band-all";

            var share = (double)runs / total;
            if (share >= 0.5) return "band-most";
            return runs > 0 ? "band-some" : "band-none";
        }

        /// <summary>
        /// The bands a student could reasonably have meant. Every one of them is a different answer.
        ///
        /// Nothing to do with the bands is worth Insight any more: the counts are exact, so a student
        /// one band out is not hedging, they are wrong. Kept as a comment rather than a method because
        /// the reasoning is the thing worth keeping.
        /// </summary>

        // ── Grading ───────────────────────────────────────────────────────────

        /// <summary>
        /// The verdict for a chosen chip.
        ///
        /// A lookup, deliberately. All the thinking happened in <see cref="Build"/>, where the record was
        /// in front of it, so grading cannot become a second, disagreeing copy of the same rule.
        /// </summary>
        public static ReflectionVerdict Grade(ReflectionQuestion question, string chipId)
        {
            if (question.Kind == NextAction)
                return new ReflectionVerdict { Status = "no-award", InsightXp = 0, FromRecord = true };

            if (chipId.Length > 0 && question.AlignedChipIds.Contains(chipId))
                return new ReflectionVerdict { Status = "aligned", InsightXp = AlignedXp, FromRecord = true };

            if (chipId.Length > 0 && question.PartialChipIds.Contains(chipId))
                return new ReflectionVerdict { Status = "partial", InsightXp = PartialXp, FromRecord = true };

            if (chipId.Length > 0)
                return new ReflectionVerdict { Status = "not-aligned", InsightXp = 0, FromRecord = true };

            // No chip chosen, so the free text is the answer and only the model can read it.
            return new ReflectionVerdict { Status = "unjudged", InsightXp = 0, FromRecord = false };
        }

        /// <summary>
        /// What the record says the student actually did, in plain sentences, for the model to check a
        /// claim against.
        ///
        /// This exists because the prompt's instruction to "say what actually happened" is useless
        /// without it: given only the student's own claim, the model agrees with it and then repeats it
        /// as fact. A student who tapped "I worked it out myself" on an attempt where they asked to be
        /// shown was congratulated for self-reliance in the same reply that said "since you chose to
        /// solve it yourself".
        ///
        /// The QUESTION is passed in because a count question needs the count it is asking about. Without
        /// it the model had no number for that dimension and invented one — a goal covering three
        /// exercises produced a reply about four, because the only figure in the prompt was the sum of
        /// the mistakes.
        ///
        /// Only things we actually hold are stated. An absence is reported as an absence rather than as
        /// a negative, because "they did not explain it" and "we never saw them at the explanation
        /// step" are different facts and only one of them is ours to assert.
        /// </summary>
        public static string DescribeRecord(ReflectionEvidence evidence, ReflectionQuestion? question = null)
        {
            var parts = new List<string>();

            if (evidence.IsGoal)
            {
                parts.Add($"This is a goal they completed, covering {evidence.InSet} exercise(s).");
                // Said outright, because the number in the row is a TOTAL and reads like a count of
                // something. "4 errors" over a three-exercise goal became "4 exercises" in a reply.
                parts.Add("The mistake and hint numbers below are TOTALS across all of those, not one " +
                          "exercise's numbers.");
            }

            if (evidence.HasDecisions)
            {
                parts.Add(evidence.DidExplain
                    ? "They chose to explain their own reasoning."
                    : evidence.WasShownExplanation
                        ? "They asked to be shown the explanation instead of explaining it themselves."
                        : "Nothing was recorded about whether they explained their reasoning.");

                if (evidence.DidCompare || evidence.WasShownComparison)
                    parts.Add(evidence.DidCompare
                        ? "They compared the two methods themselves."
                        : "They asked to be shown the comparison instead of working it out themselves.");

                parts.Add(evidence.DidSolveOnOwn
                    ? "They chose to work the solution out themselves rather than being shown it."
                    : evidence.WasShownAnswer
                        ? "They asked to be shown the solution. A low error count is therefore NOT evidence that this was easy: they did not solve it unaided."
                        : "Nothing was recorded about whether they worked the solution out themselves.");
            }
            else
            {
                parts.Add("No decision point was recorded for this item, so nothing is known about what they chose.");
            }

            parts.Add($"{evidence.Errors} mistake(s) and {evidence.Hints} hint(s) were counted.");

            // The goal's exercises one by one, because its questions ask about their ORDER: did the
            // mistakes go down, was the later one faster, was any run clean, did they work one out
            // alone. Totals cannot answer any of that, so without this the model would be judging a
            // free-text answer like "I got faster" against no evidence at all and would be as likely to
            // contradict it as to confirm it.
            //
            // Stated as facts, never as a verdict: which of these add up to "something went well" is
            // still the reading the student is being asked to make.
            if (evidence.IsGoal && evidence.GoalExercises.Count > 0)
            {
                var runs = evidence.GoalExercises.Select((exercise, index) =>
                    $"#{index + 1}: {exercise.Errors} mistake(s), {exercise.Hints} hint(s), {Fmt(exercise.Time)}s" +
                    (exercise.Own ? ", worked out alone" : exercise.WasShown ? ", asked to be shown" : "") +
                    (exercise.Explained ? ", explained their reasoning" : "") +
                    (exercise.Compared ? ", compared the methods" : "") +
                    (exercise.Correct ? ", chose a method the exercise allowed" : ""));

                parts.Add($"The goal's exercises, oldest first — {string.Join("; ", runs)}.");
            }

            // The figure the question is actually about. For a count question this IS the answer, and
            // the model is meant to check the student's claim against it.
            switch (question?.TextKey)
            {
                case "reflection-q2-count-solo":
                    parts.Add($"Of those {evidence.InSet} exercises, they worked {evidence.SolvedOnOwnRuns} out before seeing the answer.");
                    break;
                case "reflection-q2-count-hintfree":
                    parts.Add($"Of those {evidence.InSet} exercises, {evidence.HintFreeRuns} were got through with no hints at all.");
                    break;
                case "reflection-q2-count-clean":
                    parts.Add($"Of those {evidence.InSet} exercises, {evidence.CleanRuns} went by without a single mistake.");
                    break;
            }

            return string.Join(" ", parts);
        }

        /// <summary>
        /// What the model should be told about the question before it reads a free-text answer.
        ///
        /// Narrow on purpose. The old prompt asked whether an answer was "aligned" against a set of
        /// keywords, which is how "it was good" earned points. This asks whether the answer refers to one
        /// specific thing the record has already settled, and says so in the student's own language.
        /// </summary>
        public static string DescribeForPrompt(ReflectionQuestion question, IEnumerable<string> subjectTerms)
        {
            if (question.Kind == NextAction)
                return "This is a next-step question. It never earns Insight XP, whatever the student writes.";

            var terms = subjectTerms.Where(term => !string.IsNullOrWhiteSpace(term)).ToList();
            var clue = terms.Count > 0
                ? $" A correct answer refers to one of these, in the student's own language: {string.Join(", ", terms)}."
                : "";

            return $"Expected of a correct answer: {question.Expectation}.{clue}";
        }
    }
}
