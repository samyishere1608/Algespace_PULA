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
    /// CHIPS ARE THE ANSWER. Every question offers at least two, the student picks one, and the record
    /// grades it against the answer key held here on the server. That is what makes a reflection
    /// checkable without a model reading anything: the verdict is settled before the reply is written,
    /// and the model is left to do the one thing it is better at than any rule.
    /// </summary>
    public static class ReflectionQuestionBank
    {
        public const string Observation = "observation";
        public const string Judgement = "judgement";
        public const string NextAction = "next-action";

        /// <summary>
        /// The end-of-session reflection. Neither of its questions is graded.
        ///
        /// Everything else here asks for something the record already holds the answer to. A session
        /// does not: "what went well today" is the student's reading of their own day, and the second
        /// question is a commitment about the next one. So these are the only questions that pay no
        /// Insight, and the model is told that outright rather than left to discover it. Answering them
        /// still pays — the commitment pays Choice, and keeping it pays Resolve tomorrow.
        /// </summary>
        public const string Session = "session";

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

        /// <summary>
        /// What is true behind each goal "what went well" chip, said to the student. Only the chips the
        /// record backs are ever read from here, so a reply names the option they tapped and says what it
        /// stands for, and never something that merely sits elsewhere in the goal's record.
        /// </summary>
        private static readonly Dictionary<string, string> GoalChipFacts = new()
        {
            ["went-better-choices"] = "your choices fitted the exercises better in the later ones than in the earlier ones",
            ["went-always-correct"] = "the method you picked fitted the exercise every single time",
            ["went-no-errors"] = "at least one of the exercises went by with no mistakes",
            ["went-no-hints"] = "at least one of the exercises went by with no hints",
            ["went-fewer-hints"] = "you needed fewer hints in the later exercises than in the earlier ones",
            ["went-hints-down"] = "you needed fewer hints in your last exercise than in your first",
            ["went-errors-down"] = "you made fewer mistakes in your last exercise than in your first",
            ["went-fewer-errors"] = "you made fewer mistakes in the later exercises than in the earlier ones",
            ["went-faster"] = "your last exercise took less time than your first",
            ["went-solved-alone"] = "you worked at least one of them out yourself",
            ["went-explained"] = "you explained your reasoning in at least one of them",
            ["went-explain-helped"] = "you made fewer mistakes in the exercises where you explained your reasoning",
            ["went-explain-clean"] = "an exercise where you explained your reasoning had no mistakes",
            ["went-explain-hints"] = "you needed fewer hints in the exercises where you explained your reasoning",
            ["went-explain-new"] = "you explained your reasoning on a method where you had skipped that before",
            ["went-compare-helped"] = "you made fewer mistakes in the exercises where you compared the methods",
            ["went-compare-clean"] = "an exercise where you compared the methods had no mistakes",
            ["went-compare-hints"] = "you needed fewer hints in the exercises where you compared the methods",
            ["went-compare-new"] = "you compared the methods on a method where you had skipped that before",
            ["went-alone-clean"] = "an exercise you worked out yourself had no mistakes",
            ["went-alone-hints"] = "an exercise you worked out yourself needed no hints",
            ["went-alone-new"] = "you worked one out yourself on a method you had handed over before",
            ["went-alone-fewer"] = "you made fewer mistakes in the exercises you worked out yourself",
            ["went-within-limit"] = "every exercise stayed inside the limit your goal set",
        };

        /// <summary>
        /// The step vocabulary in plain English, for the MODEL only.
        ///
        /// The labels the student reads are translation keys, and the server never renders them. A step
        /// question asks which part went well or cost the most, so the model has to be able to name that
        /// part — and "setup" is not something it can turn into the student's language on its own. This
        /// gloss is what it translates. The app's own copy stays in the locale files, where it belongs.
        /// </summary>
        private static string StepGloss(string stepId) => stepId switch
        {
            StepChoose => "the part where the method is chosen",
            StepSetup => "the part where the method is set up",
            StepSolve => "the part where the solution is found",
            StepExplain => "the part where the reasoning is written out",
            _ => "that part"
        };

        /// <summary>
        /// What a next-step question is about, in plain English, for the MODEL only.
        ///
        /// The question itself reaches the student as a translation key and the chips never leave the
        /// client, so without this the model is looking at "Q3 - one concrete next step" and nothing else.
        /// It then guesses the subject, and a question about comparing two methods comes back with advice
        /// about something else — or, worse, with a description of what the student did earlier, which is
        /// the one thing this question is not about. The gloss is what the model turns into the student's
        /// language; the app's own copy stays in the locale files.
        /// </summary>
        private static string NextActionSubject(string textKey) => textKey switch
        {
            "reflection-q3-solo" or "reflection-goal-q3-solve-method" => "working the solution out themselves",
            "reflection-q3-explain" or "reflection-q3-explain-efficiency" or "reflection-q3-explain-matching"
                or "reflection-goal-q3-explain-type" => "explaining their reasoning",
            "reflection-q3-compare" or "reflection-goal-q3-compare-method" => "comparing the two methods",
            "reflection-q3-method" or "reflection-goal-q3-method" or "reflection-goal-q3-suitability"
                or "reflection-goal-q3-efficiency" or "reflection-goal-q3-matching" => "which method to pick",
            "reflection-q3-target" or "reflection-goal-q3-hints-errors" => "how many hints to take",
            _ => ""
        };

        // ── The three questions ───────────────────────────────────────────────

        /// <summary>
        /// Q1 observes, Q2 judges, Q3 looks forward. Not every item has the evidence for every question,
        /// and where it does not the item gets a weaker question rather than no question: a reflection
        /// that skips a step is worse than one that asks something simpler.
        ///
        /// The end-of-session reflection is the one item that does not follow that shape, and is built by
        /// its own pair of builders below: it has no record to judge and no third thing to ask.
        /// </summary>
        public static List<ReflectionQuestion> Build(ReflectionEvidence evidence)
        {
            var questions = BuildQuestions(evidence);
            foreach (var question in questions) question.Meaning = MeaningFor(question, evidence);
            return questions;
        }

        /// <summary>
        /// One sentence on why the thing a question asks about matters, for the reply to add.
        ///
        /// A reply that confirms the answer and stops there only repeats the student back to themselves
        /// ("you did exactly that"). What it can honestly add, inside the question's own subject, is what
        /// that thing is FOR. It is about the skill, never about the student's numbers, so it cannot pull
        /// anything from outside the question into the reply.
        /// </summary>
        private static string MeaningFor(ReflectionQuestion question, ReflectionEvidence evidence)
        {
            switch (question.Id)
            {
                case "q1-step-sure":
                case "q1-step-fight":
                    return "Knowing which step carries you and which one costs you is what lets you aim your practice at the right place.";
                case "q1-exercise-went-well":
                case "q1-progress":
                    return "Naming what went well is how you find the habits worth repeating.";
                case "q2-compared":
                    return "Putting two methods side by side is how you learn which one fits which kind of problem.";
                case "q2-explained":
                    return "Writing your reasoning out shows you whether you understand a step or only follow it.";
                case "goal-q1-went-well":
                    return evidence.Focus switch
                    {
                        "hintsAndErrors" => "Needing fewer hints and fewer mistakes is the sign that a method is starting to hold without support.",
                        "method" => "Repeating one method until it feels natural is how it becomes your own.",
                        "selfExplanation" => "Explaining your reasoning turns following a method into understanding it.",
                        "methodComparison" => "Comparing methods shows you why one fits better than another.",
                        "solveOnOwn" => "Working the calculation yourself is what builds the ability to do it without help.",
                        _ => evidence.GoalFocus switch
                        {
                            "Suitability" => "Choosing a method that fits the problem is the skill this exercise type trains.",
                            "Efficiency" => "Spotting the quickest method saves effort on every later problem.",
                            "Matching" => "Recognising which method a problem calls for is what makes the first step easy.",
                            _ => "Seeing what improved across a run of exercises shows where practice is paying off.",
                        },
                    };
            }

            return question.TextKey switch
            {
                "reflection-q2-count-hintfree" => "Getting through without hints means you found each next step from what you already know.",
                "reflection-q2-count-clean" => "Exercises without a mistake show where your working is already reliable.",
                "reflection-q2-count-solo" => "Working the calculation yourself is what trains you to do it without help.",
                "reflection-goal-q2-pick-unsuitable" or "reflection-goal-q2-pick-inefficient" =>
                    "Noticing which method you reach for when it does not fit is the first step to choosing a better one.",
                "reflection-goal-q2-most-errors" or "reflection-goal-q2-most-errors-type" =>
                    "Seeing where mistakes gather tells you which method to practise next.",
                "reflection-goal-q2-most-hints" =>
                    "Seeing where the hints gather tells you which method to practise next.",
                "reflection-goal-q2-method-compare" =>
                    "Setting a method against your others shows whether it is really getting stronger.",
                "reflection-goal-q2-group-compare" =>
                    "Seeing whether the exercises where you did this went better shows whether it is worth the time.",
                "reflection-goal-q2-system-method" =>
                    "Knowing which method you hand over to the system shows which one to try yourself next.",
                "reflection-goal-q2-explain-method" or "reflection-goal-q2-compare-method" =>
                    "Knowing which method you do this in shows where the habit already lives.",
                _ => "",
            };
        }

        private static List<ReflectionQuestion> BuildQuestions(ReflectionEvidence evidence) => evidence.IsSession
            ? BuildSession(evidence)
            : evidence.IsGoal
                ? evidence.GoalExercises.Count > 0
                    // A goal with a readable window is asked its own questions.
                    ? [BuildGoalObservation(evidence), BuildGoalJudgement(evidence), BuildGoalNextAction(evidence)]
                    // A goal completed before the window was recorded, or one whose window was empty. The
                    // plain questions are all that can be asked of it, and they still ask something real.
                    : [BuildObservation(evidence), BuildJudgement(evidence), BuildNextAction(evidence)]
                : [BuildObservation(evidence), BuildJudgement(evidence), BuildNextAction(evidence)];

        // ── The end-of-session questions ──────────────────────────────────────
        //
        // Two questions, not three. An item is asked three because there is something to observe, to
        // judge and to commit to; a session is only ever asked the first and the last. The middle one is
        // missing on purpose rather than by omission: a judgement question needs a record that can settle
        // the answer, and "how did today compare with yesterday" cannot be settled from one day's row.

        /// <summary>
        /// Q1: what went well today, as a menu read from the day's own exercises.
        ///
        /// The options are the things that DID go well — every one of them is backed by a rule over the
        /// session's window, so the student is choosing between true statements rather than guessing at
        /// one. Nothing is graded, because the record cannot say which of several true things a student
        /// noticed. The menu is capped so it stays a quick answer rather than a survey.
        /// </summary>
        private static ReflectionQuestion BuildSessionObservation(ReflectionEvidence evidence)
        {
            var window = evidence.GoalExercises;

            var question = new ReflectionQuestion
            {
                Id = "session-q1-went-well",
                Kind = Session,
                ItemType = "session",
                TextKey = "reflection-session-q1",
            };

            var chips = new List<ReflectionChip>();

            if (window.Count == 0)
            {
                // Nothing was finished today, so there is no win to read out of the record. The honest
                // menu is about making the time at all, which is all a session with no completed
                // exercise consisted of.
                chips.Add(new ReflectionChip { Id = "session-went-showed-up", TextKey = "reflection-session-chip-showed-up" });
                chips.Add(new ReflectionChip { Id = "session-went-looked", TextKey = "reflection-session-chip-looked" });
            }
            else
            {
                // Finishing is the one thing a session cannot have happened without, so it is always on
                // the menu and always first. The rest are offered only when the day actually shows them.
                chips.Add(new ReflectionChip { Id = "session-went-finished", TextKey = "reflection-session-chip-finished" });

                if (window.Any(exercise => exercise.Errors == 0))
                    chips.Add(new ReflectionChip { Id = "session-went-clean", TextKey = "reflection-session-chip-clean" });
                if (window.Any(exercise => exercise.Hints == 0))
                    chips.Add(new ReflectionChip { Id = "session-went-nohints", TextKey = "reflection-session-chip-nohints" });
                if (window.Any(exercise => exercise.Own))
                    chips.Add(new ReflectionChip { Id = "session-went-alone", TextKey = "reflection-session-chip-alone" });
                if (window.Any(exercise => exercise.Explained))
                    chips.Add(new ReflectionChip { Id = "session-went-explained", TextKey = "reflection-session-chip-explained" });
                if (window.Any(exercise => exercise.Compared))
                    chips.Add(new ReflectionChip { Id = "session-went-compared", TextKey = "reflection-session-chip-compared" });

                // A day where every exercise cost both a mistake and a hint leaves "I finished them"
                // alone on the menu, and one chip is not a menu — it is a button with a foregone
                // conclusion. Making the time is still true on a hard day, so it is the floor.
                if (chips.Count < 2)
                    chips.Add(new ReflectionChip { Id = "session-went-showed-up", TextKey = "reflection-session-chip-showed-up" });
            }

            // Capped so the question stays a quick answer rather than a survey. The cap is generous
            // enough not to bite on its own, and the floor above is applied first so that it never
            // decides whether the question has enough answers.
            question.Chips = chips.Take(6).ToList();
            return question;
        }

        /// <summary>
        /// Q2: what to work on next session, which is the promise.
        ///
        /// The three chips name the same three things the daily intention offers at the start of the next
        /// session — more practice, a goal, a look at the numbers first — and deliberately so: the two
        /// are settled against each other tomorrow, and matching them is only possible because neither
        /// side invented its own vocabulary. A student who writes instead of tapping is judged on the
        /// text, which is why the "something else" answer needs no chip of its own.
        ///
        /// ItemType stays "session" so the exercise settlement cannot read this promise. It judges
        /// promises that name a dimension of the next exercise, and asking it to settle one about
        /// tomorrow's intention would close the promise unpaid.
        /// </summary>
        private static ReflectionQuestion BuildSessionNextAction(ReflectionEvidence evidence)
        {
            return new ReflectionQuestion
            {
                Id = "session-q2-next",
                Kind = NextAction,
                ItemType = "session",
                TextKey = "reflection-session-q2",
                Chips =
                [
                    new ReflectionChip { Id = "session-next-practice", TextKey = "reflection-session-chip-next-practice" },
                    new ReflectionChip { Id = "session-next-goal", TextKey = "reflection-session-chip-next-goal" },
                    new ReflectionChip { Id = "session-next-review", TextKey = "reflection-session-chip-next-review" },
                ],
            };
        }

        private static List<ReflectionQuestion> BuildSession(ReflectionEvidence evidence) =>
            [BuildSessionObservation(evidence), BuildSessionNextAction(evidence)];

        /// <summary>
        /// The translation key for one of the session promise chips, or empty when the id is not one of
        /// them.
        ///
        /// The client owns every word the student reads, so the promise is handed back as a KEY to
        /// resolve rather than as a sentence. `GetSessionPromise` uses this to show yesterday's promise
        /// in tomorrow's check-in, which has to be worded exactly as the chip the student chose.
        /// </summary>
        public static string SessionPromiseTextKey(string chipId) => chipId switch
        {
            "session-next-practice" => "reflection-session-chip-next-practice",
            "session-next-goal" => "reflection-session-chip-next-goal",
            "session-next-review" => "reflection-session-chip-next-review",
            _ => "",
        };

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

            // A GOAL with no readable window is kept on the comparison with the run before it: there is
            // nothing else to ask it, and "did this go better than last time" is at least checkable.
            //
            // An EXERCISE goes to the what-went-well menu instead, which is the same menu the
            // exercise-type goal is offered. See BuildExerciseWentWell.
            if (!evidence.IsGoal) return BuildExerciseWentWell(evidence, itemType);

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
        /// Q1 when an exercise has no step breakdown: the exercise-type GOAL's what-went-well menu, read
        /// from one exercise.
        ///
        /// It is the same menu, with the same facts behind it, so a student who just answered it about a
        /// goal meets it again after their next exercise rather than a second and differently worded
        /// question about the same thing.
        ///
        /// Two of the goal's options are deliberately absent. "My choices got better later" and "I got
        /// faster by the end" compare the later half of a set against the earlier half, and one exercise
        /// has one half — the option could never be true, and offering an answer that cannot be right is
        /// worse than leaving it out.
        /// </summary>
        private static ReflectionQuestion BuildExerciseWentWell(ReflectionEvidence evidence, string itemType)
        {
            var question = new ReflectionQuestion
            {
                Id = "q1-exercise-went-well",
                Kind = Observation,
                ItemType = itemType,
            };

            var options = new List<(string Id, string TextKey, bool True)>();

            void Offer(string id, string textKey, bool isTrue) => options.Add((id, textKey, isTrue));

            switch (evidence.Focus)
            {
                case "Suitability":
                    question.TextKey = "reflection-q1-went-well-suitability";
                    // Only when we can check it: an exercise we cannot find has no list of allowed
                    // methods, and the option would be a coin toss wearing a question's clothes.
                    if (evidence.HasAllowedMethods)
                        Offer("went-suitable-choice", "reflection-chip-went-suitable-choice", evidence.ChoseAllowedMethod);
                    Offer("went-clean", "reflection-chip-went-clean", evidence.Errors == 0);
                    Offer("went-nohints", "reflection-chip-went-nohints", evidence.Hints == 0);
                    break;

                case "Efficiency":
                    question.TextKey = "reflection-q1-went-well-efficiency";
                    if (evidence.HasAllowedMethods)
                        Offer("went-best-choice", "reflection-chip-went-best-choice", evidence.ChoseAllowedMethod);
                    Offer("went-clean", "reflection-chip-went-clean", evidence.Errors == 0);
                    Offer("went-nohints", "reflection-chip-went-nohints", evidence.Hints == 0);
                    break;

                default:
                    // Matching is the only type left, and the only one whose menu is about the decision
                    // rather than about a choice: it hands the method over, so there is no right one to
                    // have picked.
                    question.TextKey = "reflection-q1-went-well-matching";
                    Offer("went-clean", "reflection-chip-went-clean", evidence.Errors == 0);
                    Offer("went-nohints", "reflection-chip-went-nohints", evidence.Hints == 0);
                    Offer("went-explained", "reflection-chip-went-explained", evidence.DidExplain);
                    break;
            }

            question.Chips = [.. options.Select(option => new ReflectionChip { Id = option.Id, TextKey = option.TextKey })];
            question.AlignedChipIds = [.. options.Where(option => option.True).Select(option => option.Id)];

            // The goal menu's rule, for the goal menu's reason: an exercise where they made mistakes, took
            // hints AND picked a method it did not allow still got finished, and a student answering
            // honestly about that should not be paid nothing. Whichever option they name, they answered
            // honestly about a run that simply did not go their way.
            if (question.AlignedChipIds.Count == 0)
                question.PartialChipIds = [.. question.Chips.Select(chip => chip.Id)];

            question.Expectation = "they name something that genuinely went well in this exercise, and it did";

            return question;
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
                        new ReflectionChip { Id = "yn-compare-shown", TextKey = "reflection-chip-yn-compare-shown" },
                    ],
                    AlignedChipIds = [evidence.DidCompare ? "yn-compare-yes" : "yn-compare-shown"],
                    // NO MIDDLE OPTION. "I compared part of it" used to be offered and could never be the
                    // right answer, because the record holds a yes or a no and nothing in between. That
                    // made it a trap: it reads as the honest middle ground, and a student who declined the
                    // comparison and picked it was told they were wrong for the one answer that sounded
                    // most like the truth. The question is an either/or because the fact is an either/or.
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
                        new ReflectionChip { Id = "yn-explain-shown", TextKey = "reflection-chip-yn-explain-shown" },
                    ],
                    AlignedChipIds = [evidence.DidExplain ? "yn-explain-yes" : "yn-explain-shown"],
                    // No middle option, for the same reason as the comparison question above.
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
            question.ChipFacts = options
                .Where(option => option.True && GoalChipFacts.ContainsKey(option.Id))
                .ToDictionary(option => option.Id, option => GoalChipFacts[option.Id]);

            // The two "at least one" facts are stated with their counts, so a reply cannot round them up.
            if (question.ChipFacts.ContainsKey("went-no-errors"))
                question.ChipFacts["went-no-errors"] = $"{window.Count(e => e.Errors == 0)} of the {window.Count} exercises went by with no mistakes";
            if (question.ChipFacts.ContainsKey("went-no-hints"))
                question.ChipFacts["went-no-hints"] = $"{window.Count(e => e.Hints == 0)} of the {window.Count} exercises went by with no hints";

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
                    question.RecordFact = $"with this method your mistakes averaged {Fmt(mine)} per exercise, and with your other methods {Fmt(other.Value)}";
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
                        evidence,
                        "reflection-goal-q2-explain-method",
                        "they name the method they explained their reasoning in most often");

                case "methodComparison":
                    return BuildGoalGroupComparisonQuestion(
                        question, window, e => e.Compared,
                        "reflection-chip-cmp-compared", "reflection-chip-cmp-skipped",
                        "they say whether they made fewer mistakes in the exercises they compared",
                        evidence,
                        "reflection-goal-q2-compare-method",
                        "they name the method they compared most often");

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
                    question.RecordFact = "the exercises you handed over to the system were in "
                        + string.Join(", ", system.GroupBy(e => e.Method).OrderByDescending(g => g.Count())
                            .Select(g => $"{MethodKey(g.Key)} {Times(g.Count())}"));
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

        /// <summary>
        /// The goal question used when the pattern question would rest on something that did not happen
        /// — no mistakes or hints to place on a method, or no unsuitable choice to name. A question
        /// whose premise is false has no answer the student could give, and "I didn't use hints" is the
        /// honest reply to "which method took you the most hints", so it is replaced by a count that
        /// has a true answer whichever way the goal went.
        ///
        /// A goal about hints counts exercises without hints; every other goal counts those without a
        /// mistake, which is what the question text says.
        /// </summary>
        private static ReflectionQuestion BuildGoalAccuracyQuestion(ReflectionEvidence evidence)
        {
            var window = evidence.GoalExercises;
            var aboutHints = evidence.GoalQuality == "hints";
            var runs = aboutHints
                ? window.Count(e => e.Hints == 0)
                : window.Count(e => e.Errors == 0);

            return new ReflectionQuestion
            {
                Id = "q2-count",
                Kind = Judgement,
                ItemType = "goal",
                TextKey = aboutHints ? "reflection-q2-count-hintfree" : "reflection-q2-count-clean",
                Values = new Dictionary<string, string> { ["total"] = window.Count.ToString() },
                Chips =
                [
                    new ReflectionChip { Id = "band-all", TextKey = "reflection-chip-band-all" },
                    new ReflectionChip { Id = "band-most", TextKey = "reflection-chip-band-most" },
                    new ReflectionChip { Id = "band-some", TextKey = "reflection-chip-band-some" },
                    new ReflectionChip { Id = "band-none", TextKey = "reflection-chip-band-none" },
                ],
                AlignedChipIds = [BandFor(runs, window.Count)],
                Expectation = $"they are honest about how often it happened: {runs} of {window.Count} exercises",
                RecordFact = aboutHints
                    ? $"{runs} of the {window.Count} exercises went by with no hints at all"
                    : $"{runs} of the {window.Count} exercises went by without a single mistake",
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
            var rows = subset.ToList();

            // The premise has to be true before the question is asked: there must be an unsuitable
            // choice to name, or mistakes / hints to place on a method.
            var hintsQuestion = textKey == "reflection-goal-q2-most-hints";
            var premiseHolds = textKey switch
            {
                "reflection-goal-q2-pick-unsuitable" or "reflection-goal-q2-pick-inefficient" => rows.Count > 0,
                _ => rows.Sum(e => hintsQuestion ? e.Hints : e.Errors) > 0,
            };
            if (!premiseHolds) return BuildGoalAccuracyQuestion(evidence);

            question.TextKey = textKey;
            question.Chips = chips;

            var weakest = MostCommonMethod(rows);
            if (byErrors || weakest is null) weakest = MethodWithMost(rows, byErrors);

            question.AlignedChipIds = weakest is null ? [] : [$"pick-{weakest}"];
            if (question.AlignedChipIds.Count == 0)
                question.PartialChipIds = [.. chips.Select(chip => chip.Id)];

            question.Expectation = weakest is null ? $"{expectation}, which the record cannot single out" : expectation;

            // The tally the reply has to be written from. Without it the model had only a list of
            // exercises and filled in the rest, which is how a method picked once came back as "all three".
            var pickedWhenUnsuitable = textKey is "reflection-goal-q2-pick-unsuitable" or "reflection-goal-q2-pick-inefficient";
            if (pickedWhenUnsuitable)
            {
                var total = evidence.GoalExercises.Count;
                question.RecordFact = rows.Count == 0
                    ? $"the method you picked fitted in all {total} of the exercises"
                    : $"the method was not the suitable one in {rows.Count} of the {total} exercises, and there you picked "
                      + string.Join(", ", rows.GroupBy(e => e.Method).OrderByDescending(g => g.Count())
                          .Select(g => $"{MethodKey(g.Key)} {Times(g.Count())}"))
                      + $". Over all {total} exercises you picked "
                      + string.Join(", ", evidence.GoalExercises.GroupBy(e => e.Method).OrderByDescending(g => g.Count())
                          .Select(g => $"{MethodKey(g.Key)} {Times(g.Count())}"));
            }
            else
            {
                var hints = textKey == "reflection-goal-q2-most-hints";
                var tally = rows.GroupBy(e => e.Method)
                    .Select(g => new { g.Key, Total = hints ? g.Sum(e => e.Hints) : g.Sum(e => e.Errors) })
                    .Where(g => g.Total > 0)
                    .OrderByDescending(g => g.Total)
                    .Select(g => $"{MethodKey(g.Key)} {g.Total}");
                var joined = string.Join(", ", tally);
                question.RecordFact = joined.Length == 0
                    ? $"there were no {(hints ? "hints" : "mistakes")} in any of these exercises"
                    : $"your {(hints ? "hints" : "mistakes")} added up per method as: {joined}";
            }

            return question;
        }

        private static string Times(int count) => count switch
        {
            1 => "once",
            2 => "twice",
            _ => $"{count} times",
        };

        /// <summary>Q2 comparing two groups inside the same goal, on mistakes.</summary>
        private static ReflectionQuestion BuildGoalGroupComparisonQuestion(
            ReflectionQuestion question,
            List<ReflectionGoalExercise> window,
            Func<ReflectionGoalExercise, bool> inGroup,
            string inGroupChip,
            string outOfGroupChip,
            string expectation,
            ReflectionEvidence evidence,
            string oneGroupTextKey,
            string oneGroupExpectation)
        {
            var inside = window.Where(inGroup).ToList();
            var outside = window.Where(e => !inGroup(e)).ToList();

            // Only one kind present, so there is nothing to compare and the question would have a right
            // answer the student could not possibly know. It used to be replaced with a count of clean
            // runs, which is a question about MISTAKES and has nothing to do with what the goal was
            // about: a self-explanation goal can only be completed by explaining, so its window is
            // usually all-explained and the student was asked about their error counts instead.
            //
            // So the substitute is the question the other categories already ask for their own
            // dimension: which method this was done in most often. It stays inside the goal's subject,
            // and the record can answer it.
            if (inside.Count == 0 || outside.Count == 0)
            {
                var group = inside.Count > 0 ? inside : outside;
                var common = MostCommonMethod(group);

                question.TextKey = oneGroupTextKey;
                question.Chips =
                [
                    new ReflectionChip { Id = "pick-equalization", TextKey = "flexibility:equalization-method" },
                    new ReflectionChip { Id = "pick-substitution", TextKey = "flexibility:substitution-method" },
                    new ReflectionChip { Id = "pick-elimination", TextKey = "flexibility:elimination-method" },
                ];
                question.AlignedChipIds = common is null ? [] : [$"pick-{common}"];

                // A tie is not a question with one answer, so every chip pays the partial amount rather
                // than one of them being wrong for no reason the student could see.
                if (question.AlignedChipIds.Count == 0)
                    question.PartialChipIds = [.. question.Chips.Select(chip => chip.Id)];

                question.Expectation = common is null
                    ? $"{oneGroupExpectation}, which the record cannot single out"
                    : oneGroupExpectation;
                question.RecordFact = "across these exercises you used "
                    + string.Join(", ", group.GroupBy(e => e.Method).OrderByDescending(g => g.Count())
                        .Select(g => $"{MethodKey(g.Key)} {Times(g.Count())}"));

                return question;
            }

            var with = Mean(inside, e => e.Errors);
            var without = Mean(outside, e => e.Errors);
            var fewer = with < without - ComparisonTolerance;
            var more = with > without + ComparisonTolerance;
            var did = oneGroupTextKey.Contains("explain") ? "explained your reasoning" : "compared the methods";
            question.RecordFact = $"in the {inside.Count} exercise(s) where you {did} your mistakes averaged {Fmt(with)} each, "
                                + $"and in the other {outside.Count} they averaged {Fmt(without)} each";

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
            // A commitment is not a claim, so there is nothing to be right about. Neither is a session
            // question: "what went well today" has several true answers and the record is in no position
            // to say which one the student noticed.
            if (question.Kind is NextAction or Session)
                return new ReflectionVerdict { Status = "no-award", InsightXp = 0 };

            if (chipId.Length > 0 && question.AlignedChipIds.Contains(chipId))
                return new ReflectionVerdict { Status = "aligned", InsightXp = AlignedXp };

            if (chipId.Length > 0 && question.PartialChipIds.Contains(chipId))
                return new ReflectionVerdict { Status = "partial", InsightXp = PartialXp };

            if (chipId.Length > 0)
                return new ReflectionVerdict { Status = "not-aligned", InsightXp = 0 };

            // No chip at all, which is the help button: the student asked the companion to answer this
            // question rather than answering it. Nothing was claimed, so there is nothing to grade.
            return new ReflectionVerdict { Status = "unjudged", InsightXp = 0 };
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

            // The goal questions that are answered from the window's own pattern, which are told only
            // what they are about (see below).
            var aboutGoalPattern = evidence.IsGoal && question?.Id is "goal-q1-went-well" or "goal-q2-pattern" or "q2-count";

            if (evidence.IsSession)
            {
                parts.Add(evidence.GoalExercises.Count > 0
                    ? $"This is the end of their session today. They finished {evidence.InSet} exercise(s) " +
                      "in total, and the mistake and hint numbers below are TOTALS across all of them."
                    : "This is the end of their session today, and no exercise was finished in it.");
            }
            else if (evidence.IsGoal)
            {
                parts.Add($"This is a goal they completed, covering {evidence.InSet} exercise(s).");
                // Said outright, because the number in the row is a TOTAL and reads like a count of
                // something. "4 errors" over a three-exercise goal became "4 exercises" in a reply.
                if (!aboutGoalPattern)
                    parts.Add("The mistake and hint numbers below are TOTALS across all of those, not one " +
                              "exercise's numbers.");
            }

            // ONE DECISION AT A TIME. The record carries three of them, and handing all three over on
            // every question is what produced a reply about the solution on a question that asked
            // whether they compared two methods: a model told "they asked to be shown the solution"
            // brings it up whatever was asked, and the feedback then answers a different question from
            // the one on screen. A question about one decision is told about that decision, and the rest
            // is left out — including the mistake and hint totals, which have nothing to do with it.
            var aboutComparison = question?.Id == "q2-compared";
            var aboutExplanation = question?.Id == "q2-explained";
            var aboutAStep = question?.Id is "q1-step-sure" or "q1-step-fight";

            // Q3 asks what they will do NEXT, and is never graded, so there is nothing in the record it
            // needs. It used to be handed the whole history, which is how a question about the next
            // exercise came back with "you asked to see the solution" — a fact about the past, answering
            // a question about the future. The session's promise question is the same shape and is
            // named here for the same reason.
            var aboutThePromise = question?.Id is "q3-next-action" or "session-q2-next";

            if (aboutThePromise)
            {
                parts.Add("This question asks what they will do next time. Nothing about what already "
                          + "happened is needed to answer it, and nothing about it should be mentioned in the reply.");
            }
            else if (aboutComparison)
            {
                parts.Add(evidence.DidCompare
                    ? "They worked the comparison through themselves."
                    : evidence.WasShownComparison
                        ? "They asked to see the comparison rather than working it through."
                        : "We do not know whether they worked the comparison through.");
            }
            else if (aboutAStep)
            {
                // A step question asks which part of the working went well, so the one decision that bears
                // on it is whether they did the working at all. The comparison and the explanation are in
                // the record too, and handing them over as well is what turned "which part did you feel
                // sure about" into a reply about comparing two methods.
                parts.Add(evidence.DidSolveOnOwn
                    ? "They worked the solution out themselves rather than being shown it."
                    : evidence.WasShownAnswer
                        ? "They asked to be shown the solution rather than working it out."
                        : "We do not know whether they worked the solution out themselves.");
            }
            else if (aboutExplanation)
            {
                // "They did not explain it" rather than "they asked to be shown it": a decline covers both
                // asking for the explanation and skipping the step entirely, and only one of those is a
                // request. Saying they asked for it when they ignored it had the model thank a student for
                // taking the time to read an explanation they never opened.
                parts.Add(evidence.DidExplain
                    ? "They explained their own reasoning."
                    : evidence.WasShownExplanation
                        ? "They did not explain their own reasoning at that step."
                        : "We do not know whether they explained their reasoning.");
            }
            else if (aboutGoalPattern)
            {
                // A goal's pattern questions are about how the exercises compare with one another. The
                // decisions are left out for the same reason as above: a model told that the solution was
                // asked for will bring it up whatever the question was.
                parts.Add("This question is only about the pattern across the exercises listed below. "
                          + "Reply about that and nothing else.");
                if (!string.IsNullOrWhiteSpace(question?.RecordFact))
                    parts.Add($"The facts about this question: {question!.RecordFact}. Use these numbers exactly and never "
                              + "say \"all\", \"every\" or any count the facts do not state.");
                if (question?.Id == "goal-q1-went-well" && question.ChipFacts.Count > 0)
                    parts.Add("What is true of the options they were offered: " + string.Join("; ", question.ChipFacts.Values) + ".");
            }
            else if (evidence.HasDecisions)
            {
                parts.Add(evidence.DidExplain
                    ? "They chose to explain their own reasoning."
                    : evidence.WasShownExplanation
                        ? "They asked to be shown the explanation instead of explaining it themselves."
                        : "We do not know whether they explained their reasoning.");

                if (evidence.DidCompare || evidence.WasShownComparison)
                    parts.Add(evidence.DidCompare
                        ? "They compared the two methods themselves."
                        : "They skipped the comparison and did not work it through.");

                parts.Add(evidence.DidSolveOnOwn
                    ? "They chose to work the solution out themselves rather than being shown it."
                    : evidence.WasShownAnswer
                        ? "They asked to be shown the solution."
                        : "We do not know whether they worked the solution out themselves.");
            }
            else
            {
                parts.Add("No decision point exists for this item, so nothing is known about what they chose.");
            }

            if (!aboutComparison && !aboutExplanation && !aboutThePromise && !aboutGoalPattern)
                parts.Add($"{evidence.Errors} mistake(s) and {evidence.Hints} hint(s) were counted.");

            // The goal's exercises one by one, because its questions ask about their ORDER: did the
            // mistakes go down, was the later one faster, was any run clean, did they work one out
            // alone. Totals cannot answer any of that, so without this the model would be judging a
            // free-text answer like "I got faster" against no evidence at all and would be as likely to
            // contradict it as to confirm it.
            //
            // Stated as facts, never as a verdict: which of these add up to "something went well" is
            // still the reading the student is being asked to make.
            //
            // A session is listed the same way and for the same reason — its first question is a menu of
            // things that may have gone well, and the model can only reply to it honestly if it can see
            // what the day consisted of.
            if ((evidence.IsGoal || evidence.IsSession) && evidence.GoalExercises.Count > 0)
                parts.Add($"{(evidence.IsGoal ? "The goal's" : "The session's")} exercises, oldest first — {ExerciseRuns(evidence, question)}.");

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
        /// The window's exercises one by one, reduced to the measures THIS question is about.
        ///
        /// A goal on hints is told its hints and nothing about its mistakes, and the reverse; time only
        /// matters to the questions that ask about speed; the decisions only to the goals about a
        /// decision. Everything else is left out so a reply cannot be built from it. The first question's
        /// menu offers both kinds of measure, so it is shown both.
        /// </summary>
        private static string ExerciseRuns(ReflectionEvidence evidence, ReflectionQuestion? question)
        {
            var aboutGoalPattern = evidence.IsGoal && question?.Id is "goal-q1-went-well" or "goal-q2-pattern" or "q2-count";
            var showDecisions = !aboutGoalPattern || evidence.Focus is "selfExplanation" or "methodComparison" or "solveOnOwn";

            var narrowToQuality = question?.Id != "goal-q1-went-well";
            var onlyHints = narrowToQuality && evidence.Focus == "hintsAndErrors" && evidence.GoalQuality == "hints";
            var onlyMistakes = narrowToQuality && evidence.Focus == "hintsAndErrors" && evidence.GoalQuality == "errors";
            var showTime = !aboutGoalPattern || evidence.Focus is "method" or "exerciseType";

            return string.Join("; ", evidence.GoalExercises.Select((exercise, index) =>
                $"#{index + 1}: {MethodKey(exercise.Method)} method" +
                (onlyHints ? "" : $", {exercise.Errors} mistake(s)") +
                (onlyMistakes ? "" : $", {exercise.Hints} hint(s)") +
                (showTime ? $", {Fmt(exercise.Time)}s" : "") +
                (showDecisions && exercise.Own ? ", worked out alone" : showDecisions && exercise.WasShown ? ", asked to be shown" : "") +
                (showDecisions && exercise.Explained ? ", explained their reasoning" : "") +
                (showDecisions && exercise.Compared ? ", compared the methods" : "") +
                (exercise.Correct && (!aboutGoalPattern || evidence.Focus == "exerciseType") ? ", chose a method the exercise allowed" : "")));
        }

        /// <summary>
        /// The same record, said TO the student rather than about them.
        ///
        /// <see cref="DescribeRecord"/> is written for the prompt ("They worked the comparison through
        /// themselves."). The reply the student reads when the model cannot be reached is shown as it is,
        /// so the fact has to be in the second person, and it is scoped the same way: it names the one
        /// thing this question asks about and says nothing about anything else.
        ///
        /// Empty means the record holds nothing about this question. It never means "you did nothing",
        /// which is why the caller falls back to wording about the question rather than about them.
        /// </summary>
        public static string DescribeRecordToStudent(ReflectionEvidence evidence, ReflectionQuestion? question, string choice = "")
        {
            if (question is null || evidence.IsSession) return "";

            // A goal's "what went well" question is answered by the option they tapped: what that option
            // stands for, when the record backs it, and otherwise what the record does back.
            if (question.Id == "goal-q1-went-well")
            {
                if (!string.IsNullOrEmpty(choice) && question.ChipFacts.TryGetValue(choice, out var tapped))
                    return tapped;

                var backed = question.ChipFacts.Values.Take(3).ToList();
                return backed.Count switch
                {
                    0 => "",
                    1 => backed[0],
                    _ => string.Join(", ", backed.Take(backed.Count - 1)) + " and " + backed[^1],
                };
            }

            if (!string.IsNullOrWhiteSpace(question.RecordFact)) return question.RecordFact;

            switch (question.Id)
            {
                case "q2-compared":
                    return evidence.DidCompare
                        ? "you worked the comparison through yourself"
                        : evidence.WasShownComparison
                            // Not "you asked to see it": the record holds a yes or a no at that step, and a
                            // no covers both skipping it and handing it over.
                            ? "you went straight on without comparing the two methods"
                            : "";
                case "q2-explained":
                    return evidence.DidExplain
                        ? "you explained your own reasoning there"
                        : evidence.WasShownExplanation
                            ? "you moved on without putting your reasoning into words"
                            : "";
                case "q1-step-sure":
                case "q1-step-fight":
                {
                    // The step IS the answer here: the question asks which part they felt sure about, or
                    // which one cost them the most. It used to be answered with the solve-on-own decision,
                    // which is a different fact about the exercise and left the model nothing to name.
                    //
                    // AND IT IS THE STEP THEY NAMED, NOT EVERY STEP THAT QUALIFIES.
                    //
                    // This used to answer with every clean step joined together — "you got through the
                    // part where the method is set up and the part where the solution is found without a
                    // mistake". A student who tapped "choosing the method" was told about a part they had
                    // never mentioned, and a student who had made mistakes elsewhere read the list as a
                    // claim about the whole exercise. The question on screen asks about ONE part, so
                    // naming theirs back is what ties the reply to the answer it is replying to.
                    var chosenStep = choice.StartsWith("step-", StringComparison.Ordinal) ? choice[5..] : "";
                    if (question.Id == "q1-step-sure" && chosenStep.Length > 0
                        && evidence.CleanStepIds.Contains(chosenStep))
                        return $"you got through {StepGloss(chosenStep)} without a mistake";

                    var clean = evidence.Steps.Where(step => evidence.CleanStepIds.Contains(step.Id)).ToList();
                    if (!string.IsNullOrEmpty(question.Id) && question.Id == "q1-step-sure" && clean.Count > 0)
                        return "you got through " + string.Join(" and ", clean.Select(step => StepGloss(step.Id)))
                             + " without a mistake";

                    var worst = evidence.Steps
                        .OrderByDescending(step => step.Errors * 1000 + step.Hints)
                        .FirstOrDefault();
                    return worst is null || (worst.Errors == 0 && worst.Hints == 0)
                        ? ""
                        : $"{StepGloss(worst.Id)} is the part that cost you the most";
                }

                case "q1-exercise-went-well":
                {
                    // The menu the student is looking at, said as facts: these are the options the record
                    // can back, and they are also the good things Q1 is asking for. Naming them here is
                    // what stops a reply that says a rough exercise has nothing in it to celebrate.
                    var good = new List<string>();
                    if (evidence.Errors == 0) good.Add("you finished it without a single mistake");
                    if (evidence.Hints == 0) good.Add("you got through it with no hints");
                    if (evidence.DidExplain) good.Add("you explained your own reasoning");
                    if (evidence.DidCompare) good.Add("you compared the two methods");
                    if (evidence.HasAllowedMethods && evidence.ChoseAllowedMethod)
                        good.Add("you picked a method this exercise allowed");

                    return good.Count switch
                    {
                        0 => "",
                        1 => good[0],
                        _ => string.Join(", ", good.Take(good.Count - 1)) + " and " + good[^1],
                    };
                }
            }

            // The counts are the answer to the question that asks for them, so the number is what the
            // reply has to say. Nothing outside the window is counted and no number is invented.
            switch (question.TextKey)
            {
                case "reflection-q2-count-clean":
                    return $"you got through {evidence.CleanRuns} of them without a single mistake";
                case "reflection-q2-count-hintfree":
                    return $"{evidence.HintFreeRuns} of them went by with no hints at all";
                case "reflection-q2-count-solo":
                    return $"you worked {evidence.SolvedOnOwnRuns} of them out before seeing the answer";
            }

            return "";
        }

        /// <summary>
        /// What this question asks about, for the reply's author.
        ///
        /// It used to be the answer key too: the narrow judge that read a written answer was handed this
        /// line and asked whether the student's words referred to it, so the wording was written to be
        /// checkable ("they name the part that cost them the most"). With every answer now a chip, the
        /// record settles that question long before the model is called, and this line does the one job
        /// left: telling the author what the question is about so the reply stays inside it.
        /// </summary>
        public static string DescribeForPrompt(ReflectionQuestion question, IEnumerable<string> subjectTerms)
        {
            // Neither ungraded kind is told what it is worth.
            //
            // The old wording said "it never earns Insight XP", and the model reads that as something to
            // pass on: replies came back telling the student there was nothing here to score. In a
            // reflection, what an answer was worth is the one thing nobody should be talking about.
            if (question.Kind == NextAction)
            {
                var subject = NextActionSubject(question.TextKey);
                return "This is a next-step question: it has no right answer that could be checked, so "
                     + "nothing in the student's choice is confirmed or corrected here."
                     + (subject.Length == 0
                         ? ""
                         : $" It asks what they will do next time about {subject}, so the reply is about that "
                           + "and the next exercise, never about what happened in this one.");
            }

            if (question.Kind == Session)
                return "This is an end-of-session question: it has no right answer, and nothing to check the "
                     + "student's choice against, whatever they choose.";

            var terms = subjectTerms.Where(term => !string.IsNullOrWhiteSpace(term)).ToList();
            var clue = terms.Count > 0
                ? $" The question is about one of these, in the student's own language: {string.Join(", ", terms)}."
                : "";

            return $"What this question asks about: {question.Expectation}.{clue}";
        }
    }
}
