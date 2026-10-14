using System.Text.Json.Serialization;

namespace webapi.Models.Student
{
    /// <summary>
    /// One chip offered under a reflection question.
    ///
    /// The chip is the answer, and the only way to give one: every question in the bank offers at least
    /// two, and the record grades the one that was chosen without asking the model to judge anything.
    /// </summary>
    public class ReflectionChip
    {
        /// <summary>Stable id, sent back when this chip is chosen. Stored in the reflection history.</summary>
        public string Id { get; set; } = "";

        /// <summary>
        /// Translation key for the chip's label, resolved by the client, where i18n lives. May carry a
        /// namespace prefix (e.g. "flexibility:elimination-method") when the words belong to another
        /// part of the app rather than a second copy of them being kept here.
        /// </summary>
        public string TextKey { get; set; } = "";
    }

    /// <summary>
    /// One reflection question, with the chips it offers and the answers it expects.
    ///
    /// The SERVER owns the bank. It decides which questions an item gets, which chips each one shows,
    /// and which of those chips count as a correct answer, so the question the student reads and the
    /// rule that grades it cannot drift apart. The client renders what it is given and sends the chosen
    /// chip back.
    /// </summary>
    public class ReflectionQuestion
    {
        /// <summary>Stable id, e.g. "q1-step-sure". Stored in the history so questions can be compared later.</summary>
        public string Id { get; set; } = "";

        /// <summary>"observation" | "judgement" | "next-action". The third kind never pays Insight.</summary>
        public string Kind { get; set; } = "";

        /// <summary>"goal" | "exercise", so the client can tell what the question is about if it needs to.</summary>
        public string ItemType { get; set; } = "";

        /// <summary>Translation key for the question text, which may contain the slots below.</summary>
        public string TextKey { get; set; } = "";

        /// <summary>
        /// Slot name to translation key, e.g. { "step": "reflection-step-setup" }.
        ///
        /// Keys rather than finished sentences, because the app's text lives in the client's locale
        /// files and this server has no business keeping a second copy of it in three languages.
        /// </summary>
        public Dictionary<string, string> Slots { get; set; } = [];

        /// <summary>
        /// Slot name to literal text, for things that are not translated at all: the student's own
        /// numbers. Kept apart from <see cref="Slots"/> so nobody has to guess whether a value is a key
        /// to resolve or a value to print.
        /// </summary>
        public Dictionary<string, string> Values { get; set; } = [];

        public List<ReflectionChip> Chips { get; set; } = [];

        /// <summary>
        /// Chip ids that count as a correct answer. Empty means the question pays nothing.
        ///
        /// NOT SENT TO THE CLIENT. It is the answer key: a student who opened devtools could read
        /// which chip is right and tap it, which would turn the one thing this design depends on — an
        /// honest claim about their own work — into a lookup.
        /// </summary>
        [JsonIgnore]
        public List<string> AlignedChipIds { get; set; } = [];

        /// <summary>
        /// Chip ids that count as a partial answer, worth less Insight. Also withheld.
        /// </summary>
        [JsonIgnore]
        public List<string> PartialChipIds { get; set; } = [];

        /// <summary>
        /// What this question asks about, in one line, for the model writing the reply.
        ///
        /// It used to be the answer key for a written answer: a narrow judge was handed this line and
        /// asked whether the student's words referred to it, which is why the wording reads as a
        /// description of a correct answer ("they name the part that cost them the most"). Chips are the
        /// only way to answer now and the record settles the verdict before the model is called, so its
        /// job is narrower: keeping the reply on the question that was asked. The values are left as they
        /// are because that is what they still describe — the subject of the question.
        /// </summary>
        [JsonIgnore]
        public string Expectation { get; set; } = "";

        /// <summary>
        /// What the record says about exactly this question, in the second person ("you picked
        /// equalization in 1 of the 3 exercises"). Server only. The reply is written from it, so a figure
        /// that is not here cannot turn up in the reply.
        /// </summary>
        [JsonIgnore]
        public string RecordFact { get; set; } = "";

        /// <summary>
        /// Why the thing this question asks about matters, in one sentence. Server only. It is what a reply
        /// adds beyond the answer, so the reply is never only the student's own words handed back.
        /// </summary>
        [JsonIgnore]
        public string Meaning { get; set; } = "";

        /// <summary>What is true behind each chip, in the second person, for the chips the record can back. Server only.</summary>
        [JsonIgnore]
        public Dictionary<string, string> ChipFacts { get; set; } = [];
    }

    /// <summary>One step of an exercise, reduced to what a question can be built from.</summary>
    public class ReflectionStepStat
    {
        public string Id { get; set; } = "";
        public string LabelKey { get; set; } = "";
        public double Time { get; set; }
        public int Errors { get; set; }
        public int Hints { get; set; }
    }

    /// <summary>
    /// One exercise inside a completed goal's window, reduced to what a question can be built from.
    ///
    /// The goal questions ask things like "did your errors go down" and "in which method did you make
    /// the most errors", so they need the individual exercises in ORDER, not just the totals. Every
    /// field here is a fact already recorded elsewhere; this is only a shape for reading them back.
    /// </summary>
    public class ReflectionGoalExercise
    {
        /// <summary>The solving method used, as the Method enum's value.</summary>
        public int Method { get; set; }

        /// <summary>
        /// The exercise type as a number: Efficiency 1, Suitability 2, Matching 3, and 0 for anything
        /// unrecognised.
        ///
        /// The attempts table keeps the type NAME, so the name is mapped to this number on the way in.
        /// The questions were specified against these numbers and every rule in the bank is written with
        /// them, so the number is what travels.
        /// </summary>
        public int ExerciseType { get; set; }

        public int Errors { get; set; }
        public int Hints { get; set; }
        public double Time { get; set; }

        /// <summary>They chose to work the solution out rather than being shown it.</summary>
        public bool Own { get; set; }

        /// <summary>They chose to explain their reasoning at the explanation step.</summary>
        public bool Explained { get; set; }

        /// <summary>They chose to work the comparison through.</summary>
        public bool Compared { get; set; }

        /// <summary>They asked to be shown the answer.</summary>
        public bool WasShown { get; set; }

        /// <summary>
        /// The method they chose was one the exercise allowed.
        ///
        /// Only meaningful for Suitability and Efficiency, which are the two types that ask the student
        /// to pick. Matching hands them the method, so it has no right answer to be right about and this
        /// stays false there — which is why the Matching questions are about errors instead.
        /// </summary>
        public bool Correct { get; set; }
    }

    /// <summary>
    /// A completed goal's window: the exercises it covered, plus the limit it was measured against.
    ///
    /// Stored as JSON on the queue row when the goal completes, because the window closes as soon as the
    /// goal is claimed and the questions are only asked afterwards.
    /// </summary>
    public class ReflectionGoalWindow
    {
        /// <summary>"hints" | "errors" | "", for the goal that sets a per-exercise limit.</summary>
        public string Quality { get; set; } = "";

        /// <summary>The per-exercise limit the goal set. 0 means no limit was set.</summary>
        public int Limit { get; set; }

        /// <summary>The exercises the goal covered, oldest first.</summary>
        public List<ReflectionGoalExercise> Exercises { get; set; } = [];

        /// <summary>
        /// The student's exercises from BEFORE this goal, bounded to a recent slice.
        ///
        /// Needed for two things: the question that compares this method against their others, and the
        /// options that read "I explained in a method I used to skip". Both are about behaviour outside
        /// the goal's own window — inside it, everything the goal is about has already changed.
        /// </summary>
        public List<ReflectionGoalExercise> OtherMethodExercises { get; set; } = [];

        /// <summary>Methods in which they had previously declined the thing this goal is about.</summary>
        public List<int> PriorSkippedExplanation { get; set; } = [];
        public List<int> PriorSkippedComparison { get; set; } = [];

        /// <summary>Methods in which they had previously asked the system to calculate.</summary>
        public List<int> PriorSystem { get; set; } = [];
    }

    /// <summary>Everything the bank needs about one reflection item, derived once and shared with grading.</summary>
    public class ReflectionEvidence
    {        public bool IsGoal { get; set; }

        /// <summary>
        /// The end-of-session reflection, which is about the day rather than about one item.
        ///
        /// Its window is the exercises finished TODAY, carried in <see cref="GoalExercises"/> because it
        /// is the same shape and the same questions are read from it. It has no category to be judged
        /// against, which is why both of its questions are ungraded.
        /// </summary>
        public bool IsSession { get; set; }

        /// <summary>
        /// For a goal: its category, which decides the question. For an exercise: the exercise type.
        /// </summary>
        public string Focus { get; set; } = "";

        /// <summary>
        /// For an exercise-type goal, WHICH type it was narrowed to ("Suitability" and so on), or empty
        /// for "any".
        ///
        /// Kept apart from <see cref="Focus"/> because for a goal that one is the CATEGORY — "exerciseType"
        /// — and the category is the same for all three types. Reading the type off it would silently
        /// give every exercise-type goal the questions for whichever type happened to be the fallback.
        /// </summary>
        public string GoalFocus { get; set; } = "";

        /// <summary>The method name as a translation key, when the goal was narrowed to one method.</summary>
        public string FocusLabelKey { get; set; } = "";

        public int Errors { get; set; }
        public int Hints { get; set; }

        /// <summary>How many exercises the question is about: one for an exercise item, the set for a goal.</summary>
        public int InSet { get; set; }

        // Run counts across the set, each for the dimension its question asks about.
        /// <summary>Exercises in the set that went by with no mistakes. Hints are counted separately, in <see cref="HintFreeRuns"/>.</summary>
        public int CleanRuns { get; set; }
        public int HintFreeRuns { get; set; }
        public int SolvedOnOwnRuns { get; set; }
        public int ExplainedSelfRuns { get; set; }
        public int ComparedRuns { get; set; }
        public int UsedFocusRuns { get; set; }

        // What the student chose. Read from the queue row's own snapshot, so no extra query.
        public bool HasDecisions { get; set; }
        public bool DidSolveOnOwn { get; set; }
        public bool WasShownAnswer { get; set; }
        public bool DidExplain { get; set; }
        public bool WasShownExplanation { get; set; }
        public bool DidCompare { get; set; }
        public bool WasShownComparison { get; set; }

        /// <summary>
        /// Which decision this exercise type actually has, and therefore which one a question about it
        /// can ask. Suitability identifies a method by comparing two, the other two by explaining the
        /// reasoning; asking about the wrong one would be asking about something the student never saw.
        /// </summary>
        public string DecisionDimension { get; set; } = "";

        public List<ReflectionStepStat> Steps { get; set; } = [];
        public List<string> CleanStepIds { get; set; } = [];
        public string CostliestStepId { get; set; } = "";

        /// <summary>
        /// The exercises this goal covered, oldest first, for the goal questions.
        ///
        /// Empty for an exercise item, and also when a goal's window could not be read back — an old row,
        /// or a goal completed before this was recorded. The goal questions then fall back to the plain
        /// ones, so a missing window degrades rather than breaks.
        /// </summary>
        public List<ReflectionGoalExercise> GoalExercises { get; set; } = [];

        /// <summary>The goal's per-exercise limit, and which dimension it limited. Empty when it set none.</summary>
        public string GoalQuality { get; set; } = "";
        public int GoalLimit { get; set; }

        /// <summary>
        /// The student's exercises OUTSIDE this goal's window, for the one question that compares this
        /// method against their others. Bounded to a recent slice, because the question is about the
        /// pattern rather than the whole history.
        /// </summary>
        public List<ReflectionGoalExercise> OtherMethodExercises { get; set; } = [];

        /// <summary>
        /// Methods in which the student had previously DECLINED the thing this goal is about.
        ///
        /// Several options read "I explained in a method I used to skip" and their like. "Used to" is
        /// the whole point — it is the change of habit that is worth naming, not the act itself — so the
        /// comparison is against their behaviour BEFORE the goal, not inside it.
        /// </summary>
        public List<int> PriorSkippedExplanation { get; set; } = [];
        public List<int> PriorSkippedComparison { get; set; } = [];

        /// <summary>Methods in which they had previously asked the system to calculate.</summary>
        public List<int> PriorSystem { get; set; } = [];

        /// <summary>Errors on the attempt before this one, for the fallback question when steps are missing.</summary>
        public int PreviousErrors { get; set; }
        public bool HasHistory { get; set; }

        /// <summary>
        /// Whether this exercise is one we can check a method choice against. False for Matching, which
        /// hands the method over rather than asking for one, and for any exercise whose own row cannot be
        /// found, where we would be guessing.
        /// </summary>
        public bool HasAllowedMethods { get; set; }

        /// <summary>The method they chose was one the exercise allowed. Only meaningful with the flag above.</summary>
        public bool ChoseAllowedMethod { get; set; }
    }

    /// <summary>The verdict for one answer.</summary>
    public class ReflectionVerdict
    {
        /// <summary>"aligned" | "partial" | "not-aligned" | "no-award" | "unjudged".</summary>
        public string Status { get; set; } = "not-aligned";
        public int InsightXp { get; set; }
    }

    /// <summary>A queue item plus the questions built for it. Never persisted.</summary>
    public class ReflectionQueueItemResponse : ReflectionQueueRecord
    {
        public List<ReflectionQuestion> Questions { get; set; } = [];
    }
}
