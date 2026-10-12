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
        public static List<ReflectionQuestion> Build(ReflectionEvidence evidence) =>
        [
            BuildObservation(evidence),
            BuildJudgement(evidence),
            BuildNextAction(evidence),
        ];

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
                var asksWhatWentWell = clean.Count > 0;

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
                    // "sure" variant every clean step is accepted. On the "fight" variant the answer is the
                    // one that actually cost them, and a step within a whisker of it counts too: two steps
                    // costing the same is not a student misremembering.
                    AlignedChipIds = asksWhatWentWell
                        ? clean.Select(step => $"step-{step}").ToList()
                        : Costliest(steps, evidence),
                    Expectation = asksWhatWentWell
                        ? "they name the part they felt most sure about, which was a part they got right without help"
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
                TextKey = improved ? "reflection-q1-better-than-last" : "reflection-q1-held-together",
                Chips =
                [
                    new ReflectionChip { Id = "band-yes", TextKey = "reflection-chip-band-yes" },
                    new ReflectionChip { Id = "band-same", TextKey = "reflection-chip-band-same" },
                    new ReflectionChip { Id = "band-no", TextKey = "reflection-chip-band-no" },
                ],
                AlignedChipIds = evidence.HasHistory
                    ? [improved ? "band-yes" : worsened ? "band-no" : "band-same"]
                    : [],
                // Only when there is no previous attempt either. Then the row holds nothing that could
                // confirm or deny the claim, and the partial amount is the honest ceiling: a question
                // whose answer we cannot check should not pay full marks, but a student who answers it
                // honestly should not be paid nothing either.
                PartialChipIds = evidence.HasHistory ? [] : ["band-yes", "band-same", "band-no"],
                Expectation = evidence.HasHistory
                    ? $"they say how this run went against the one before it, which had {evidence.PreviousErrors} mistake(s)"
                    : "they give a specific reason about the exercise rather than a general verdict",
            };

            if (evidence.HasHistory)
            {
                fallback.Values = new Dictionary<string, string>
                {
                    ["before"] = evidence.PreviousErrors.ToString(),
                    ["now"] = evidence.Errors.ToString(),
                };
            }

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
                // we hold, not a feeling.
                return new ReflectionQuestion
                {
                    Id = "q2-compared",
                    Kind = Judgement,
                    ItemType = itemType,
                    TextKey = "reflection-q2-compared",
                    Chips =
                    [
                        new ReflectionChip { Id = "yn-yes", TextKey = "reflection-chip-yn-yes" },
                        new ReflectionChip { Id = "yn-partly", TextKey = "reflection-chip-yn-partly" },
                        new ReflectionChip { Id = "yn-shown", TextKey = "reflection-chip-yn-shown" },
                    ],
                    AlignedChipIds = [evidence.DidCompare ? "yn-yes" : "yn-shown"],
                    // The record is a yes or a no, so "I did some of it" is never the accurate
                    // description of it. The chip stays because it is a fair thing to want to say; it
                    // simply does not pay, and a wrong answer that pays is how guessing becomes rational.
                    PartialChipIds = [],
                    Expectation = evidence.DidCompare
                        ? "they say they worked the comparison out, because they did"
                        : "they say they asked to be shown, because that is what they did",
                };
            }

            if (!evidence.IsGoal && evidence.DecisionDimension == "explain")
            {
                // Efficiency and Matching both ask the student to put their reasoning into words first.
                // They may take a hint and still be doing it themselves, which is why the middle chip
                // exists and why it counts as doing it.
                return new ReflectionQuestion
                {
                    Id = "q2-explained",
                    Kind = Judgement,
                    ItemType = itemType,
                    TextKey = "reflection-q2-explained",
                    Chips =
                    [
                        new ReflectionChip { Id = "yn-yes", TextKey = "reflection-chip-yn-yes" },
                        new ReflectionChip { Id = "yn-partly", TextKey = "reflection-chip-yn-partly" },
                        new ReflectionChip { Id = "yn-shown", TextKey = "reflection-chip-yn-shown" },
                    ],
                    AlignedChipIds = [evidence.DidExplain ? "yn-yes" : "yn-shown"],
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
            var (runs, textKey) = evidence.Focus switch
            {
                "selfExplanation" => (evidence.ExplainedSelfRuns, "reflection-q2-count-explained"),
                "methodComparison" => (evidence.ComparedRuns, "reflection-q2-count-compared"),
                "solveOnOwn" => (evidence.SolvedOnOwnRuns, "reflection-q2-count-solo"),
                "hintsAndErrors" => (evidence.HintFreeRuns, "reflection-q2-count-hintfree"),
                "method" => (evidence.UsedFocusRuns, "reflection-q2-count-focus"),
                _ => (evidence.CleanRuns, "reflection-q2-count-clean"),
            };

            var band = BandFor(runs, evidence.InSet);

            return new ReflectionQuestion
            {
                Id = "q2-count",
                Kind = Judgement,
                ItemType = itemType,
                TextKey = textKey,
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
                Expectation = $"they are honest about how often it happened: {runs} of {evidence.InSet} runs",
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
            // look for.
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
                question.TextKey = "reflection-q3-explain";
                question.Chips = tryMyself("explain");
                return question;
            }

            // A goal narrowed to one method, which is the only case where the promise can name it.
            if (evidence.FocusLabelKey.Length > 0)
            {
                question.TextKey = "reflection-q3-method";
                question.Slots = new Dictionary<string, string> { ["focus"] = evidence.FocusLabelKey };
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
