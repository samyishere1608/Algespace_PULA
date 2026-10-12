using System.Text.Json.Serialization;

namespace webapi.Models.Student
{
    /// <summary>
    /// One chip offered under a reflection question.
    ///
    /// The chip is a QUICK ANSWER, not the expected one. The free text box stays the primary way to
    /// answer; a chip exists so a student who does not want to write three sentences can still make a
    /// claim we can check. Which is why the question itself never points at the chips.
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

        /// <summary>Chip ids that count as a partial answer, worth less Insight. Also withheld.</summary>
        [JsonIgnore]
        public List<string> PartialChipIds { get; set; } = [];

        /// <summary>
        /// What a free-text answer has to refer to, for the model to call it aligned. Empty when the
        /// question has nothing to check.
        ///
        /// This is what makes a text-only answer judgeable: instead of asking the model "is this
        /// aligned", which is how "it was good" used to pass, it is asked the narrow question "does
        /// this refer to the one thing the record already settled".
        /// </summary>
        [JsonIgnore]
        public string Expectation { get; set; } = "";
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

    /// <summary>Everything the bank needs about one reflection item, derived once and shared with grading.</summary>
    public class ReflectionEvidence
    {
        public bool IsGoal { get; set; }

        /// <summary>
        /// For a goal: its category, which decides the question. For an exercise: the exercise type.
        /// </summary>
        public string Focus { get; set; } = "";

        /// <summary>The method name as a translation key, when the goal was narrowed to one method.</summary>
        public string FocusLabelKey { get; set; } = "";

        public int Errors { get; set; }
        public int Hints { get; set; }

        /// <summary>How many exercises the question is about: one for an exercise item, the set for a goal.</summary>
        public int InSet { get; set; }

        // Run counts across the set, each for the dimension its question asks about.
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

        /// <summary>Errors on the attempt before this one, for the fallback question when steps are missing.</summary>
        public int PreviousErrors { get; set; }
        public bool HasHistory { get; set; }
    }

    /// <summary>The verdict for one answer.</summary>
    public class ReflectionVerdict
    {
        /// <summary>"aligned" | "partial" | "not-aligned" | "no-award" | "unjudged".</summary>
        public string Status { get; set; } = "not-aligned";
        public int InsightXp { get; set; }

        /// <summary>True when the record decided the verdict, false when the free text had to be read.</summary>
        public bool FromRecord { get; set; }
    }

    /// <summary>A queue item plus the questions built for it. Never persisted.</summary>
    public class ReflectionQueueItemResponse : ReflectionQueueRecord
    {
        public List<ReflectionQuestion> Questions { get; set; } = [];
    }
}
