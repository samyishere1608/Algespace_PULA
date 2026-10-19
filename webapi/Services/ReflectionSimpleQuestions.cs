using webapi.Models.Student;

namespace webapi.Services
{
    /// <summary>
    /// The three simple questions, and the options each one offers.
    ///
    /// WHAT CHANGED AND WHY. Nothing is tapped any more. The dashboard above the question is a still
    /// picture of the student's own numbers, and each question NAMES the thing it is about, because the
    /// server already knows it: "your mistakes were highest in applying the method" needs no tap to be
    /// true. That removes every tap rule, every glow state and the whole "which thing did you mean"
    /// layer, and it leaves three plain menus.
    ///
    /// WHY EVERY "WHY" OPTION IS CHECKABLE. Each option is a description of behaviour with a fingerprint
    /// in the record: "I was in a hurry" is checkable against the time, "I did not know what to do"
    /// against the hints. So "right" means "your description matches your numbers", never "your feeling
    /// is correct". That is what makes the question fair to an eleven-year-old and still measurable.
    ///
    /// A completed goal fixes the behaviour it was about, so a goal never asks about that behaviour.
    /// An explain goal cannot ask why they did not explain, because completing it means they always did.
    /// </summary>
    public static class ReflectionSimpleQuestions
    {
        public const string WentWell = "q1-went-well";
        public const string Hardest = "q1-hardest";
        public const string Why = "q2-why";
        public const string Longest = "q2-longest";
        public const string Next = "q3-next";

        private const string NotSure = "not-sure";
        private const string NotSureYet = "not-sure-yet";

        /// <summary>
        /// The questions for one finished exercise, or one finished goal.
        ///
        /// Three, and the first one is asked on a single screen in two picks: which part went best, and
        /// why it did. The second pick only appears once the first is made, because a reason for "applying
        /// the method" is a different question from a reason for "finding the solution" — and asking the
        /// two separately meant a whole extra turn to say one sentence.
        /// </summary>
        public static List<ReflectionQuestion> Build(ReflectionEvidence evidence)
        {
            var type = TypeKey(evidence);
            var q1 = OpeningQuestion(evidence, type);
            var q2 = WhyQuestion(evidence, type) ?? LongestQuestion(evidence) ?? Nothing(evidence);

            // Never ask the same thing twice. When the opening question has no parts to look at it falls
            // back to reading the time bars, and that is exactly what Q2 falls back to as well - so on an
            // attempt with no per-step costs the two would arrive as one question asked two ways.
            if (q2.Id == q1.Id) q2 = Nothing(evidence);

            var q3 = NextQuestion(evidence, type, reasonChip: "");
            return [q1, q2, q3];
        }

        /// <summary>
        /// "Which part went best, and why?"
        ///
        /// A goal asks it about its exercises, an exercise about its own parts. A goal with no usable
        /// window has no "which of them" to ask and an exercise with no step rows has no parts to point at,
        /// so both fall back to the statements, which the totals can still settle.
        /// </summary>
        private static ReflectionQuestion OpeningQuestion(ReflectionEvidence evidence, string type)
        {
            if (evidence.IsGoal && GoalOpening(evidence) is { } goal) return goal;
            if (!evidence.IsGoal && BestPartQuestion(evidence) is { } parts) return parts;

            return WentWellQuestion(evidence, type);
        }

        /// <summary>A question with nothing to ask, kept so the shape holds.</summary>
        private static ReflectionQuestion Nothing(ReflectionEvidence evidence) => new()
        {
            Id = Why,
            Kind = ReflectionQuestionBank.Judgement,
            ItemType = evidence.IsGoal ? "goal" : "exercise",
            TextKey = "reflection-simple-nothing",
            Chips = [Chip(NotSure, "reflection-opt-not-sure")],
        };

        /// <summary>
        /// The exercise's opening question, formed the same way the reason question is: the record picks
        /// the part, and the student says why it came out that way.
        ///
        /// It used to ask the student to pick the part as well, which made the opening question a reading
        /// of the Mistakes and Hints tiles and nothing more - the part that went best is usually the one
        /// with zeros beside it. Naming it here makes the question the one thing a student cannot read off
        /// a tile: WHY that part came out clean. The ordering is the exact inverse of the costliest-part
        /// question, so the two halves of the reflection are chosen by one rule pointed in two directions.
        /// </summary>
        private static ReflectionQuestion? BestPartQuestion(ReflectionEvidence evidence)
        {
            var phases = UsablePhases(evidence);
            if (phases.Count < 2) return null;

            var best = phases
                .OrderBy(part => part.Errors + part.Hints)
                .ThenBy(part => part.Errors)
                .ThenBy(part => part.Time)
                .First();

            // WHICH PARTS SHARE THE LEAD. The record separates parts by mistakes, then hints, then time -
            // but announcing that tiebreak in the question ("the same mistakes and hints as choosing the
            // method, but quicker") hands the student the answer to the very question that follows, whose
            // whole menu is those measures. So the tie is stated as a tie, the question asks what they did
            // better, and the comparison is left to Pippin's reply once they have answered.
            var level = phases
                .Where(part => part.Errors == best.Errors && part.Hints == best.Hints)
                .ToList();

            // One baseline, and it is the one the question names: the other parts of THIS attempt. The
            // menu used to measure against the student's usual ("fewer mistakes than before") while the
            // question pointed at the parts, so a part with the fewest mistakes could be marked wrong
            // because their usual happened to be zero already.
            var fewestMistakes = phases.Min(part => part.Errors);
            var fewestHints = phases.Min(part => part.Hints);
            var quickest = phases.Min(part => part.Time);

            var question = new ReflectionQuestion
            {
                Id = "q1-parts",
                Kind = ReflectionQuestionBank.Observation,
                ItemType = "exercise",
                TextKey = level.Count == phases.Count ? "reflection-simple-q1-parts-all"
                    : level.Count > 1 ? "reflection-simple-q1-parts-tie"
                    : "reflection-simple-q1-parts",
                Slots = { ["part"] = best.LabelKey },
                Values = { ["count"] = level.Count.ToString() },
                RecordFact = PartFact(best) + (level.Count > 1 ? ", level with another part on both" : ""),
                Meaning = "Naming why a part went well is how you find the thing worth repeating.",
                Chips =
                [
                    Chip("part-mistakes", "reflection-opt-fewest-mistakes"),
                    Chip("part-hints", "reflection-opt-fewest-hints"),
                    Chip("part-fast", "reflection-part-why-quickest"),
                    Chip("part-method", "reflection-part-why-method-right"),
                    Chip(NotSure, "reflection-opt-not-sure"),
                ],
            };

            // Every reason the record backs counts as right, because several can be true at once ("fewest
            // mistakes" and "fewest hints" together) and marking the second one wrong would punish a
            // student for reading their own chart correctly.
            var backed = new List<string>();

            if (best.Errors == fewestMistakes) backed.Add("part-mistakes");
            if (best.Hints == fewestHints) backed.Add("part-hints");
            if (best.Time == quickest) backed.Add("part-fast");

            // "I knew the method was right" is a claim about the whole run, so it is only offered for a
            // part the method held up in: a clean one. Anywhere else it would be a free answer.
            if (best.Errors == 0 && MethodWasAllowed(evidence)) backed.Add("part-method");

            question.AlignedChipIds = backed;
            question.Expectation = "the reason they give is true of the part the record picked";
            return question;
        }

        /// <summary>Whether the method they used was one the exercise allowed, or whether it is unchecked.</summary>
        private static bool MethodWasAllowed(ReflectionEvidence evidence) =>
            !evidence.HasAllowedMethods || evidence.ChoseAllowedMethod;

        /// <summary>One part's numbers, as a clause a reply can put after a colon.</summary>
        private static string PartFact(ReflectionStepStat part)
        {
            var pieces = new List<string>();
            pieces.Add(part.Errors == 0 ? "no mistakes" : $"{part.Errors} {(part.Errors == 1 ? "mistake" : "mistakes")}");
            pieces.Add(part.Hints == 0 ? "no hints" : $"{part.Hints} {(part.Hints == 1 ? "hint" : "hints")}");

            return $"{Word(part.LabelKey)} took you {part.Time:0} s with {string.Join(" and ", pieces)}";
        }

        /// <summary>
        /// The goal's opening question: the exercise that went best, and what put it there.
        ///
        /// The same shape as the one about the exercise that cost the most, pointed the other way: the
        /// record picks the run (fewest mistakes, then fewest hints, then quickest) and the student says
        /// what made it that. Ties count, so a run that shares the lead on a measure is supported by it.
        ///
        /// Null when fewer than two exercises were recorded: "the best of them" then means nothing, and
        /// the caller falls back to the statements.
        /// </summary>
        private static ReflectionQuestion? GoalOpening(ReflectionEvidence evidence)
        {
            var runs = evidence.GoalExercises;
            if (runs.Count < 2) return null;

            var bestIndex = 0;
            for (var n = 1; n < runs.Count; n++)
            {
                var run = runs[n];
                var held = runs[bestIndex];
                if (run.Errors != held.Errors) { if (run.Errors < held.Errors) bestIndex = n; continue; }
                if (run.Hints != held.Hints) { if (run.Hints < held.Hints) bestIndex = n; continue; }
                if (run.Time < held.Time) bestIndex = n;
            }

            var best = runs[bestIndex];

            // Same reasoning as the exercise panel: the winner may be level with other runs on mistakes and
            // hints, which the record settled with time. The question states the tie instead of the
            // tiebreak, so the "what was good about it" menu stays a question and not an echo.
            var level = new List<int>();
            for (var n = 0; n < runs.Count; n++)
                if (runs[n].Errors == best.Errors && runs[n].Hints == best.Hints) level.Add(n);

            var question = new ReflectionQuestion
            {
                Id = "q1-goal-best",
                Kind = ReflectionQuestionBank.Observation,
                ItemType = "goal",
                TextKey = level.Count == runs.Count ? "reflection-simple-q1-goal-all"
                    : level.Count > 1 ? "reflection-simple-q1-goal-tie"
                    : "reflection-simple-q1-goal",
                Values =
                {
                    ["n"] = (bestIndex + 1).ToString(),
                    ["count"] = level.Count.ToString(),
                },
                RecordFact = $"exercise {bestIndex + 1} took {best.Time:0} s, with " +
                             (best.Errors == 0 ? "no mistakes" : $"{best.Errors} {(best.Errors == 1 ? "mistake" : "mistakes")}") +
                             " and " +
                             (best.Hints == 0 ? "no hints" : $"{best.Hints} {(best.Hints == 1 ? "hint" : "hints")}") +
                             (level.Count > 1
                                 ? $", level with exercise {level.First(n => n != bestIndex) + 1} on both"
                                 : string.Empty),
                Meaning = "Naming what made one exercise your best is how you find the thing worth repeating.",
                Chips =
                [
                    Chip("m-mistakes", "reflection-opt-fewest-mistakes"),
                    Chip("m-hints", "reflection-opt-fewest-hints"),
                    Chip("m-time", "reflection-opt-quickest"),
                    Chip(NotSure, "reflection-opt-not-sure"),
                ],
            };

            var fewestMistakes = runs.Min(run => run.Errors);
            var fewestHints = runs.Min(run => run.Hints);
            var quickest = runs.Min(run => run.Time);

            var backed = new List<string>();
            if (best.Errors == fewestMistakes) backed.Add("m-mistakes");
            if (best.Hints == fewestHints) backed.Add("m-hints");
            if (best.Time == quickest) backed.Add("m-time");

            question.AlignedChipIds = backed;
            question.Expectation = "the reason they give is true of the exercise the record picked";
            return question;
        }


        // ── Q1: what went well ────────────────────────────────────────────────

        /// <summary>
        /// Four statements about the item, exactly one of which is true. The student reads the dashboard
        /// to find it, which is the reading skill, and the record settles whether they found it.
        /// </summary>
        private static ReflectionQuestion WentWellQuestion(ReflectionEvidence evidence, string type)
        {
            var statement = new ReflectionQuestion
            {
                Id = WentWell,
                Kind = ReflectionQuestionBank.Observation,
                ItemType = evidence.IsGoal ? "goal" : "exercise",
                TextKey = "reflection-simple-q1",
                RecordFact = ItemFact(evidence),
                Meaning = "Noticing what went well is how you find the habit worth repeating.",
            };

            // A goal only reaches this when it has no usable window (see GoalOpening), so there is no
            // "all of them" to talk about: the statements read as one run, which is exactly what the
            // totals on the queue row describe.
            var all = Statements(evidence, type);
            var truths = all.Where(s => s.True).ToList();
            var falsehoods = all.Where(s => !s.True).ToList();

            if (truths.Count == 0)
            {
                // Nothing on the list is true. Asking "what went well" would be asking the student to
                // pick a lie, so the question becomes a reading of the chart instead.
                var hardest = LongestQuestion(evidence);
                if (hardest is not null) return hardest;

                statement.TextKey = "reflection-simple-q1-none";
                statement.Chips = [Chip(NotSure, "reflection-opt-not-sure")];
                return statement;
            }

            // One true statement, then falsehoods in a stable order, then "I'm not sure".
            var correct = truths[0];
            var menu = new List<(string Id, string Key)> { (correct.Id, correct.Key) };
            menu.AddRange(falsehoods.Take(2).Select(option => (option.Id, option.Key)));

            // Shuffled so the true statement is not always the first chip, which would turn a reading
            // question into a reflex.
            var random = new Random(correct.Id.Aggregate(17, (acc, ch) => unchecked(acc * 31 + ch)));
            foreach (var option in menu.OrderBy(_ => random.Next()))
                statement.Chips.Add(Chip(option.Id, option.Key));

            statement.AlignedChipIds = [correct.Id];
            statement.Chips.Add(Chip(NotSure, "reflection-opt-not-sure"));
            statement.Expectation = "they pick the statement their own dashboard shows is true";
            return statement;
        }

        /// <summary>
        /// The statements a run can be happy about, each with the number that settles it.
        ///
        /// A goal never reaches them with a window: it opens with <see cref="GoalOpening"/> instead, and
        /// only the windowless fallback lands here, where the totals describe one run.
        /// </summary>
        private static List<(string Id, string Key, bool True)> Statements(ReflectionEvidence evidence, string type)
        {
            var list = new List<(string, string, bool)>();

            list.Add(("s-nohints", "reflection-opt-no-hints", evidence.Hints == 0));
            list.Add(("s-nomistakes", "reflection-opt-no-mistakes", evidence.Errors == 0));
            list.Add(("s-myself", "reflection-opt-worked-myself", evidence.DidSolveOnOwn && !evidence.WasShownAnswer));
            if (type is "suitability" or "efficiency")
                list.Add(("s-pickedfit", "reflection-opt-picked-fit", evidence.HasAllowedMethods && evidence.ChoseAllowedMethod));
            if (type is "efficiency" or "matching")
                list.Add(("s-explained", "reflection-opt-explained", evidence.DidExplain && !evidence.WasShownExplanation));
            if (type == "suitability")
                list.Add(("s-compared", "reflection-opt-compared", evidence.DidCompare && !evidence.WasShownComparison));

            return list;
        }

        // ── Q2: why the costliest thing ───────────────────────────────────────

        /// <summary>
        /// Names the thing that cost the most, then offers three descriptions of behaviour plus "not
        /// sure". One of the three matches the record; the other two are the readings a child is most
        /// likely to reach for, and finding out which one fits is the point of the question.
        /// </summary>
        private static ReflectionQuestion? WhyQuestion(ReflectionEvidence evidence, string type)
        {
            if (evidence.IsGoal) return GoalWhy(evidence, type);

            var phases = UsablePhases(evidence);

            // ORDER OF SUBJECTS, most worth explaining first. A step the student was OFFERED and skipped
            // is the one they made a decision about, so it comes before a part that merely cost a mistake
            // or two. Otherwise a Suitability run with one slip in it would never ask about the comparison
            // the student turned down, which is the more interesting thing they did.
            if (evidence.DecisionDimension.Length > 0 && !(evidence.DidExplain || evidence.DidCompare))
                return DecisionWhy(evidence, type);

            var costliest = phases.Count == 0
                ? null
                : phases.OrderByDescending(step => step.Errors + step.Hints).ThenByDescending(step => step.Errors).First();

            if (costliest is not null && costliest.Errors + costliest.Hints > 0)
                return PhaseWhy(evidence, phases, costliest);

            if (type is "suitability" or "efficiency" && evidence.HasAllowedMethods && !evidence.ChoseAllowedMethod)
                return PickWhy(evidence, type);

            if (phases.Count >= 2) return LongestQuestion(evidence);

            return null;
        }

        /// <summary>A part of the exercise cost them, so the question is about that part.</summary>
        private static ReflectionQuestion PhaseWhy(
            ReflectionEvidence evidence, List<ReflectionStepStat> phases, ReflectionStepStat part)
        {
            var others = phases.Where(s => !ReferenceEquals(s, part)).ToList();
            var otherMean = others.Count == 0 ? 0 : others.Average(s => s.Time);
            var slower = otherMean > 0 && part.Time > otherMean * 1.1;
            var faster = otherMean > 0 && part.Time < otherMean * 0.9;

            var question = new ReflectionQuestion
            {
                Id = Why,
                Kind = ReflectionQuestionBank.Judgement,
                ItemType = "exercise",
                TextKey = part.Errors > 0 ? "reflection-simple-q2-mistakes" : "reflection-simple-q2-hints",
                Slots = { ["part"] = part.LabelKey },
                Values =
                {
                    ["count"] = (part.Errors > 0 ? part.Errors : part.Hints).ToString(),
                },
                RecordFact = $"in {Word(part.LabelKey)} you made {part.Errors} {(part.Errors == 1 ? "mistake" : "mistakes")}" +
                             (part.Hints > 0 ? $" and used {part.Hints} {(part.Hints == 1 ? "hint" : "hints")}" : "") +
                             $", and it took you {part.Time:0} s while your other parts took about {otherMean:0} s each",
                Meaning = "Finding the reason behind a hard part is what turns a number into something you can change.",
            };

            // The three descriptions of behaviour, each with the number that would confirm it.
            var options = new List<(string Id, string Key, bool Fits)>
            {
                ("why-hurry", "reflection-why-hurry", faster),
                ("why-slow", "reflection-why-slow", slower),
                ("why-unsure", "reflection-why-unsure", part.Hints > 0),
            };

            return WithReasons(question, options);
        }

        /// <summary>The compare or explain step was skipped or handed over, so the question is about it.</summary>
        private static ReflectionQuestion DecisionWhy(ReflectionEvidence evidence, string type)
        {
            var explained = type is "efficiency" or "matching";

            var question = new ReflectionQuestion
            {
                Id = Why,
                Kind = ReflectionQuestionBank.Judgement,
                ItemType = "exercise",
                TextKey = explained ? "reflection-simple-q2-skipped-explain" : "reflection-simple-q2-skipped-compare",
                // The fact has to ADD something to the question: "you skipped it" is already the question.
                // What it can add is what the skipped step would have told them.
                RecordFact = evidence.HasAllowedMethods && !evidence.ChoseAllowedMethod
                    ? $"the method you picked did not fit this exercise, and {(explained ? "explaining" : "comparing")} is how you would have seen that"
                    : evidence.HasAllowedMethods && evidence.ChoseAllowedMethod
                        ? $"the method you picked did fit, so {(explained ? "explaining it" : "comparing")} would have confirmed it"
                        : $"you went straight on to the answer, so {(explained ? "the reason behind your choice" : "the other method")} never came up",
                Meaning = explained
                    ? "Explaining your reasoning is how you find out whether you understood the step or only followed it."
                    : "Comparing with someone else is how you find out why one method fits better than another.",
            };

            // The app records a decision as Engaged or Declined, nothing finer, so the only thing to ask
            // about is the skip.
            var options = new List<(string, string, bool)>
            {
                ("why-sure", "reflection-why-sure", evidence.HasAllowedMethods && evidence.ChoseAllowedMethod),
                ("why-hurry", "reflection-why-hurry", QuickerThanUsual(evidence)),
                ("why-not-help", "reflection-why-not-help", (explained ? evidence.PriorSkippedExplanation.Count : evidence.PriorSkippedComparison.Count) >= 2),
            };

            return WithReasons(question, options);
        }

        /// <summary>They picked a method the exercise did not allow.</summary>
        private static ReflectionQuestion PickWhy(ReflectionEvidence evidence, string type)
        {
            var question = new ReflectionQuestion
            {
                Id = Why,
                Kind = ReflectionQuestionBank.Judgement,
                ItemType = "exercise",
                TextKey = type == "suitability"
                    ? "reflection-simple-q2-pick-suitability"
                    : "reflection-simple-q2-pick-efficiency",
                RecordFact = $"the method you picked ({evidence.SelectedMethod}) was not one this exercise allowed",
                Meaning = "Noticing which method you reach for when it does not fit is the first step to choosing a better one.",
            };

            var options = new List<(string, string, bool)>
            {
                ("why-hurry", "reflection-why-hurry", QuickerThanUsual(evidence)),
                ("why-unsure", "reflection-why-unsure", evidence.Hints > 0 || evidence.Errors > 0),
                ("why-favourite", "reflection-why-favourite", false),
            };

            return WithReasons(question, options);
        }

        /// <summary>
        /// The reason menu for a goal. A completed goal fixes the behaviour it required, so this asks what
        /// made one exercise cost more than the others, which is the thing that still varies.
        /// </summary>
        private static ReflectionQuestion? GoalWhy(ReflectionEvidence evidence, string type)
        {
            var runs = evidence.GoalExercises;
            if (runs.Count == 0) return null;

            // ORDER MATTERS TWICE OVER: which exercise is "the one that cost the most", and, when two of
            // them tie on mistakes, which one to name. A tie left unbroken gives the question two right
            // answers while the chips are computed against one exercise only, so the tie is settled the
            // same way the cost is ranked: mistakes, then hints, then the time it took.
            var worst = runs
                .OrderByDescending(run => run.Errors + run.Hints)
                .ThenByDescending(run => run.Errors)
                .ThenByDescending(run => run.Hints)
                .ThenByDescending(run => run.Time)
                .First();
            var others = runs.Where(run => !ReferenceEquals(run, worst)).ToList();
            var otherMean = others.Count == 0 ? 0 : others.Average(run => run.Time);
            var index = runs.IndexOf(worst) + 1;

            var question = new ReflectionQuestion
            {
                Id = Why,
                Kind = ReflectionQuestionBank.Judgement,
                ItemType = "goal",
                TextKey = evidence.GoalQuality == "hints"
                    ? "reflection-simple-q2-goal-hints"
                    : "reflection-simple-q2-goal",
                Values =
                {
                    ["n"] = index.ToString(),
                    ["count"] = (worst.Errors + worst.Hints).ToString(),
                },
                RecordFact = $"exercise {index} had {worst.Errors} {(worst.Errors == 1 ? "mistake" : "mistakes")} and {worst.Hints} {(worst.Hints == 1 ? "hint" : "hints")}, and your other " +
                             $"goal exercises averaged {Average(others.DefaultIfEmpty(worst).Average(run => run.Errors), "mistake", "mistakes")} each",
                Meaning = "Seeing where the cost gathered tells you which exercise to practise next.",
            };

            var methodHard = MethodCostsMore(evidence, worst);

            var options = new List<(string, string, bool)>
            {
                ("why-tricky", "reflection-why-tricky", methodHard),
                ("why-hurry", "reflection-why-hurry", otherMean > 0 && worst.Time < otherMean * 0.9),
                ("why-unsure", "reflection-why-unsure", worst.Hints > 0),
            };

            // Suitability and Efficiency goals still have a pick to be wrong about inside the window.
            if (type is "suitability" or "efficiency")
                options.Insert(0, ("why-pick", "reflection-why-pick", !worst.Correct));

            return WithReasons(question, options);
        }

        private static bool MethodCostsMore(ReflectionEvidence evidence, ReflectionGoalExercise run)
        {
            var runs = evidence.GoalExercises;
            var mine = runs.Where(r => r.Method == run.Method).ToList();
            var rest = runs.Where(r => r.Method != run.Method).ToList();
            if (mine.Count == 0 || rest.Count == 0) return false;

            return mine.Average(r => r.Errors) > rest.Average(r => r.Errors) + 0.5;
        }

        /// <summary>Turns three candidate reasons into the menu: one fits, three do not, "not sure" last.</summary>
        private static ReflectionQuestion WithReasons(
            ReflectionQuestion question, List<(string Id, string Key, bool Fits)> options)
        {
            // One that fits, then the ones that do not, so the menu always contains a supported answer
            // when the record can support one, and the two most likely misreadings beside it.
            // EVERY option the record backs counts as right. Two of them can be true at once ("it was slow"
            // and "I needed a hint there"), and marking the second wrong would punish a student for reading
            // their own chart correctly.
            var fitting = options.Where(option => option.Fits).ToList();
            var rest = options.Where(option => !option.Fits).ToList();

            var menu = new List<(string Id, string Key, bool Fits)>();
            menu.AddRange(fitting.Take(3));
            if (menu.Count < 3) menu.AddRange(rest.Take(3 - menu.Count));
            if (menu.Count == 0) menu.AddRange(options.Take(3));

            var seed = string.Join("", menu.Select(option => option.Id)).Aggregate(17, (acc, ch) => unchecked(acc * 31 + ch));
            var random = new Random(seed);
            foreach (var option in menu.OrderBy(_ => random.Next()))
                question.Chips.Add(Chip(option.Id, option.Key));

            if (fitting.Count > 0) question.AlignedChipIds = [.. fitting.Select(option => option.Id)];
            question.Chips.Add(Chip(NotSure, "reflection-opt-not-sure"));
            question.Expectation = "they pick the description of what happened that their own numbers back";
            return question;
        }

        // ── The reading fallback ──────────────────────────────────────────────

        /// <summary>
        /// Which part took longest. Used when nothing went wrong, and when Q1 has no true statement: a
        /// question with no honest answer is worse than a simpler question.
        /// </summary>
        private static ReflectionQuestion? LongestQuestion(ReflectionEvidence evidence)
        {
            var phases = UsablePhases(evidence);
            if (phases.Count < 2) return null;

            var longest = phases.OrderByDescending(s => s.Time).First();

            var question = new ReflectionQuestion
            {
                Id = Longest,
                Kind = ReflectionQuestionBank.Observation,
                ItemType = evidence.IsGoal ? "goal" : "exercise",
                TextKey = "reflection-simple-q2-longest",
                RecordFact = $"the longest part was {Word(longest.LabelKey)} at {longest.Time:0} s",
                Meaning = "Knowing which part takes the time is what tells you where the practice belongs.",
            };

            foreach (var part in phases)
                question.Chips.Add(Chip($"p-{part.Id}", part.LabelKey));

            question.AlignedChipIds = [$"p-{longest.Id}"];
            question.Chips.Add(Chip(NotSure, "reflection-opt-not-sure"));
            question.Expectation = "they read the time bars and name the part that took longest";
            return question;
        }

        // ── Q3: what next ─────────────────────────────────────────────────────

        /// <summary>
        /// The plan, which is never marked. It is recorded so tomorrow can be compared with it.
        ///
        /// When the reason they just gave is known, the question names it and the plan that answers it
        /// goes first: "Next time, what will you do about going too fast?" followed by "Slow down". A
        /// commitment that follows from what they said is worth more than one that sits beside it, and
        /// the student who has just written "I was in a hurry" has half answered the generic version.
        /// </summary>
        private static ReflectionQuestion NextQuestion(ReflectionEvidence evidence, string type, string reasonChip)
        {
            var plans = PlanIds(evidence, type);
            var answer = PlanForReason(evidence, type, reasonChip);

            string textKey = "reflection-simple-q3";
            var slots = new Dictionary<string, string>();

            if (answer is not null)
            {
                // The answering plan leads whether or not it was already on the list, so the first chip is
                // always the one that speaks to what they said.
                plans.Remove(answer.Value.Plan);
                plans.Insert(0, answer.Value.Plan);
                textKey = "reflection-simple-q3-topic";
                slots["topic"] = answer.Value.TopicKey;
            }

            return new ReflectionQuestion
            {
                Id = Next,
                Kind = ReflectionQuestionBank.NextAction,
                ItemType = evidence.IsGoal ? "goal" : "exercise",
                TextKey = textKey,
                Slots = slots,
                Chips = [.. plans.Select(plan => Chip(plan, $"reflection-plan-{plan}")), Chip(NotSureYet, "reflection-plan-not-sure")],
                Meaning = "",
            };
        }

        /// <summary>
        /// The plan question, retargeted at the reason the student actually gave.
        ///
        /// The queue sends this question before any answer exists, so the plain version arrives first and
        /// is replaced by this one with the verdict on the reason question. The object handed in is the
        /// one that was already built - it keeps its id and its panel, and only the wording and the order
        /// of its chips change, so the rest of the flow cannot tell the difference.
        /// </summary>
        public static ReflectionQuestion? RetargetPlan(
            ReflectionQuestion plan, ReflectionEvidence evidence, string reasonChip)
        {
            if (reasonChip.Length == 0) return null;

            var type = TypeKey(evidence);
            var answer = PlanForReason(evidence, type, reasonChip);
            if (answer is null) return null;

            var plans = PlanIds(evidence, type);
            plans.Remove(answer.Value.Plan);
            plans.Insert(0, answer.Value.Plan);

            plan.TextKey = "reflection-simple-q3-topic";
            plan.Slots = new Dictionary<string, string> { ["topic"] = answer.Value.TopicKey };
            plan.Chips = [.. plans.Select(id => Chip(id, $"reflection-plan-{id}")), Chip(NotSureYet, "reflection-plan-not-sure")];
            return plan;
        }

        /// <summary>
        /// Which plan answers which reason, and the words for the reason in the question.
        ///
        /// A reason with no plan worth attaching - "I'm not sure", or the neutral question - returns null,
        /// and the plan question stays as it was rather than naming something the student never said.
        /// </summary>
        private static (string Plan, string TopicKey)? PlanForReason(
            ReflectionEvidence evidence, string type, string reasonChip)
        {
            var skipped = type is "efficiency" or "matching";   // which step was on offer decides the wording

            return reasonChip switch
            {
                "why-hurry" => ("slow_down", "reflection-topic-hurry"),
                "why-slow" => ("check_each_step", "reflection-topic-slow"),
                "why-unsure" => ("try_before_hint", "reflection-topic-unsure"),
                "why-sure" => (skipped ? "explain_choice" : "compare_classmate",
                               skipped ? "reflection-topic-skipped-explain" : "reflection-topic-skipped-compare"),
                "why-not-help" => (skipped ? "explain_choice" : "compare_classmate",
                                   skipped ? "reflection-topic-skipped-explain" : "reflection-topic-skipped-compare"),
                "why-tricky" => ("practise_method", "reflection-topic-tricky"),
                "why-pick" => ("check_fit", "reflection-topic-pick"),
                "why-favourite" => ("check_fit", "reflection-topic-favourite"),
                _ => null,
            };
        }

        private static List<string> PlanIds(ReflectionEvidence evidence, string type)
        {
            var plans = new List<string>();

            // The goal's own plan first, so the promise points at the thing the student was working on.
            switch (evidence.Focus)
            {
                case "selfExplanation": plans.Add("explain_choice"); break;
                case "methodComparison": plans.Add("compare_classmate"); break;
                case "solveOnOwn": plans.Add("try_myself_first"); break;
                case "method": plans.Add("practise_method"); break;
                case "hintsAndErrors": plans.Add("try_before_hint"); break;
            }

            plans.Add("slow_down");
            plans.Add("check_each_step");
            plans.Add("try_before_hint");
            if (type is "efficiency" or "matching") plans.Add("explain_choice");
            if (type == "suitability") plans.Add("compare_classmate");
            plans.Add("hint_when_stuck");
            plans.Add("practise_method");
            if (type == "suitability") plans.Add("check_fit");

            return [.. plans.Distinct().Take(6)];
        }

        // ── Shared helpers ────────────────────────────────────────────────────

        private static ReflectionChip Chip(string id, string key) => new() { Id = id, TextKey = key };

        /// <summary>
        /// A number and its unit, with the unit singular at exactly one.
        ///
        /// The averages in these facts are one decimal place, so "averaged 1 mistakes each" is a real
        /// thing an eleven-year-old would be shown and would notice.
        /// </summary>
        private static string Average(double value, string one, string many) =>
            $"{value:0.#} {(Math.Abs(value - 1) < 0.05 ? one : many)}";

        private static List<ReflectionStepStat> UsablePhases(ReflectionEvidence evidence) =>
            [.. evidence.Steps.Where(s => s.Time > 0 || s.Errors > 0 || s.Hints > 0)];

        /// <summary>
        /// Whether this run really was quicker than the student's earlier ones.
        ///
        /// It used to compare MISTAKES against the previous attempt, which answered a different question
        /// from the one the chip asks and could never be checked against anything on screen. The
        /// comparison is time now, and the panel shows the figure it is made from ("your usual"), so a
        /// student can see whether the description fits before they choose it.
        /// </summary>
        private static bool QuickerThanUsual(ReflectionEvidence evidence)
        {
            if (evidence.UsualSeconds <= 0) return false;

            var total = evidence.Steps.Sum(step => step.Time);
            return total > 0 && total < evidence.UsualSeconds * 0.9;
        }

        /// <summary>"suitability" | "efficiency" | "matching", for the type that decides the menus.</summary>
        private static string TypeKey(ReflectionEvidence evidence) => evidence.Focus switch
        {
            "Suitability" => "suitability",
            "Efficiency" => "efficiency",
            "Matching" => "matching",
            _ => evidence.GoalFocus switch
            {
                "Suitability" => "suitability",
                "Efficiency" => "efficiency",
                "Matching" => "matching",
                _ => "",
            },
        };

        /// <summary>The item's own numbers, as one sentence the reply can quote.</summary>
        private static string ItemFact(ReflectionEvidence evidence)
        {
            var mistakes = evidence.Errors == 0 ? "no mistakes" : $"{evidence.Errors} {(evidence.Errors == 1 ? "mistake" : "mistakes")}";
            var hints = evidence.Hints == 0 ? "no hints" : $"{evidence.Hints} {(evidence.Hints == 1 ? "hint" : "hints")}";

            return evidence.IsGoal
                ? $"across {evidence.InSet} exercises you made {mistakes} and used {hints}"
                : $"in this exercise you made {mistakes} and used {hints}";
        }

        private static string Word(string labelKey) => labelKey switch
        {
            "reflection-step-choose" => "choosing the method",
            "reflection-step-setup" => "applying the method",
            "reflection-step-solve" => "finding the solution",
            "reflection-step-explain" => "explaining",
            _ => "that part",
        };
    }
}
