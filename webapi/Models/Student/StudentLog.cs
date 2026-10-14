using System.Text.Json;

namespace webapi.Models.Student
{
    /// <summary>
    /// The one timestamp format anything written to a database uses from now on.
    ///
    /// ISO-8601, UTC, millisecond precision, with the zone marker on the end. The marker is the point:
    /// the older columns in this database hold UTC without saying so, which means every reader has to
    /// be told the zone out of band and a naive parse silently shifts by the machine's offset.
    /// Milliseconds are the other half: several records are written inside the same second by design
    /// (the per-phase action rows), and without them those rows cannot be put in order.
    /// </summary>
    public static class LogStamp
    {
        public static string Now() => DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fff'Z'");
    }

    /// <summary>
    /// Every kind of thing that gets written to the student timeline.
    ///
    /// A fixed list, in code, mirrored into the LogVocabulary table at startup. Without a fixed list
    /// the column drifts - which is exactly what happened to the agency log's source column, where 25
    /// of 45 values appear exactly once because a row id was pasted into the middle of a category name.
    /// </summary>
    public static class LogEventType
    {
        public const string SessionStarted = "session.started";
        public const string SessionEnded = "session.ended";
        public const string IntentionSet = "intention.set";
        public const string GoalSet = "goal.set";
        public const string GoalDeleted = "goal.deleted";
        public const string GoalCompleted = "goal.completed";
        public const string ExerciseStarted = "exercise.started";
        public const string ExerciseCompleted = "exercise.completed";
        public const string ExerciseAbandoned = "exercise.abandoned";
        public const string DecisionMade = "decision.made";
        public const string ReflectionAsked = "reflection.asked";
        public const string ReflectionAnswered = "reflection.answered";
        public const string ReflectionVerdict = "reflection.verdict";
        public const string ReflectionCompleted = "reflection.completed";
        public const string XpAwarded = "xp.awarded";

        /// <summary>The labels written into LogVocabulary, so a chart can name a value without reading code.</summary>
        public static readonly (string Value, string Label)[] All =
        [
            (SessionStarted, "the student opened the dashboard, starting a session"),
            (SessionEnded, "the student pressed End Session (or the session was closed for them)"),
            (IntentionSet, "the student chose their plan for the day: practice, goal or review"),
            (GoalSet, "the student set a goal"),
            (GoalDeleted, "the student removed a goal they had set (this is the abandoned-goal measure)"),
            (GoalCompleted, "the student finished a goal"),
            (ExerciseStarted, "the student opened an exercise"),
            (ExerciseCompleted, "the student finished an exercise"),
            (ExerciseAbandoned, "an exercise was opened in this session and never finished"),
            (DecisionMade, "the student answered a yes/no decision inside an exercise"),
            (ReflectionAsked, "a reflection was put in the queue for the student"),
            (ReflectionAnswered, "the student answered one reflection question"),
            (ReflectionVerdict, "the record's verdict on that answer, and who wrote the reply"),
            (ReflectionCompleted, "the student finished or skipped a reflection item"),
            (XpAwarded, "the student was awarded XP"),
        ];
    }

    /// <summary>
    /// The values the agency log's source column may take.
    ///
    /// Deliberately short and closed. The column it guards currently holds 45 different values across
    /// 287 rows, 25 of which appear once, because ids were interpolated into it. The rule from here is
    /// that an id goes in a column, never into a category name.
    /// </summary>
    public static class LogAgencySource
    {
        public const string GoalSet = "goal-set";
        public const string GoalCompleted = "goal-completed";
        public const string SelfPickedGoal = "self-picked-goal";
        public const string AiSuggestedGoal = "ai-suggested-goal";
        public const string TargetedWeakArea = "targeted-weak-area";
        public const string ReflectionOptedIn = "reflection-opted-in";
        public const string ReflectionAligned = "reflection-aligned";
        public const string ReflectionFollowThrough = "reflection-follow-through";
        /// <summary>The Choice paid for committing to a next step. Its idempotency key is RefId, not this.</summary>
        public const string ReflectionCommit = "reflection-commit";
        public const string FacedAGap = "faced-a-gap";
        public const string DailyIntention = "daily-intention";
        public const string DailyIntentionFollowThrough = "daily-intention-follow-through";
        public const string PickedSolo = "picked-solo";
        public const string PickedPippin = "picked-pippin";
        public const string SoloSoloFollowedThrough = "solo-followed-through";
        public const string SoloQuickSurrender = "solo-quick-surrender";
        public const string DayReflection = "day-reflection";
        public const string Demo = "demo";

        public static readonly (string Value, string Label)[] All =
        [
            (GoalSet, "XP for setting a goal"),
            (GoalCompleted, "XP for finishing a goal"),
            (SelfPickedGoal, "XP for choosing your own goal"),
            (AiSuggestedGoal, "XP for taking a suggested goal"),
            (TargetedWeakArea, "XP for working on a named weak area"),
            (ReflectionOptedIn, "Choice for agreeing to reflect"),
            (ReflectionAligned, "Insight for an answer the record confirms"),
            (ReflectionFollowThrough, "Resolve for keeping a reflection promise"),
            (ReflectionCommit, "Choice for committing to a next step"),
            (FacedAGap, "Insight for facing something you had been avoiding"),
            (DailyIntention, "XP for setting a plan for the day"),
            (DailyIntentionFollowThrough, "Resolve for keeping that plan"),
            (PickedSolo, "Choice for working without the companion"),
            (PickedPippin, "Choice for asking the companion"),
            (SoloSoloFollowedThrough, "Resolve for finishing what you started alone"),
            (SoloQuickSurrender, "no XP: giving up immediately"),
            (DayReflection, "XP for the end-of-session reflection"),
            (Demo, "demo data, not a real student action"),
        ];
    }

    /// <summary>Storage for the timeline, the sessions it is grouped into, and the value labels.</summary>
    public static class StudentLogTable
    {
        /// <summary>
        /// One row per thing that happened, in order.
        ///
        /// WHY A SEPARATE TABLE. The detail of a session is spread across eight tables today, each
        /// keyed differently, so "what did this student do, from the daily plan to the end of the
        /// session" is a seven-way union that has to be rewritten whenever a module is added. This is a
        /// spine: a fixed envelope, a controlled label, and a reference to the row that holds the
        /// detail. It does not duplicate the detail - `AnchorRecord` keeps the per-phase numbers,
        /// `NlpAnalysis` keeps the language features, `ChatTranscript` keeps the conversation.
        /// </summary>
        public const string EventTable = "StudentEvent";
        public const string EventScheme =
            "Id INTEGER PRIMARY KEY AUTOINCREMENT, " +
            "StudentId INTEGER NOT NULL, " +
            "OccurredAt TEXT NOT NULL, " +
            "EventType TEXT NOT NULL, " +
            "SessionId TEXT NOT NULL DEFAULT '', " +
            "AttemptId INTEGER NOT NULL DEFAULT 0, " +
            "RefId TEXT NOT NULL DEFAULT '', " +
            "Value TEXT NOT NULL DEFAULT '', " +
            "Amount INTEGER NOT NULL DEFAULT 0, " +
            "Data TEXT NOT NULL DEFAULT '{}', " +
            "SchemaVersion INTEGER NOT NULL DEFAULT 1, " +
            "AppVersion TEXT NOT NULL DEFAULT '', " +
            "Language TEXT NOT NULL DEFAULT ''";

        /// <summary>
        /// One row per sitting: open while the student is on the dashboard, closed by End Session.
        ///
        /// The session id is resolved by the SERVER when an event is written rather than passed in by
        /// the client. That is what makes the spine work without threading a session id through every
        /// existing request model, and it means an event is grouped correctly even when the call that
        /// produced it comes from a part of the app that knows nothing about sessions.
        /// </summary>
        public const string SessionTable = "StudentSession";
        public const string SessionScheme =
            "Id TEXT PRIMARY KEY, " +
            "StudentId INTEGER NOT NULL, " +
            "StartedAt TEXT NOT NULL, " +
            "EndedAt TEXT NOT NULL DEFAULT '', " +
            "Language TEXT NOT NULL DEFAULT ''";

        /// <summary>
        /// Every value a log column may take, with the words to name it.
        ///
        /// Upserted from the constants above at startup, so a chart or the data dictionary can join for
        /// a label without anyone reading C# - and so the table cannot drift from the code that writes
        /// the values, which is the failure mode that made the agency log ungroupable.
        /// </summary>
        public const string VocabularyTable = "LogVocabulary";
        public const string VocabularyScheme =
            "Kind TEXT NOT NULL, " +
            "Value TEXT NOT NULL, " +
            "Label TEXT NOT NULL, " +
            "PRIMARY KEY (Kind, Value)";

        /// <summary>The `Kind` values used in the vocabulary table.</summary>
        public const string KindEventType = "EventType";
        public const string KindAgencySource = "AgencySource";
    }

    /// <summary>Closes the session and reports what it contained.</summary>
    public class EndSessionResponse
    {
        public string SessionId { get; set; } = "";
        /// <summary>Exercises opened in the session that were never finished.</summary>
        public int AbandonedExercises { get; set; }
        public string StartedAt { get; set; } = "";
        public string EndedAt { get; set; } = "";
    }

    /// <summary>Starts (or reopens) the sitting. Returns the id every later event is grouped under.</summary>
    public class StartSessionResponse
    {
        public string SessionId { get; set; } = "";
        public string StartedAt { get; set; } = "";
        /// <summary>True when an existing open session was reused rather than a new one created.</summary>
        public bool Resumed { get; set; }
    }

    /// <summary>Opens or closes the sitting, and says why it closed.</summary>
    public class StartSessionRequest
    {
        public long StudentId { get; set; }
        public string Language { get; set; } = "";
        /// <summary>Only used when closing: "end-session-button" | "session-reflection".</summary>
        public string Reason { get; set; } = "";
    }

    /// <summary>The plan the student chose for today, and the follow-up that can replace it.</summary>
    public class SetIntentionRequest
    {
        public long StudentId { get; set; }
        /// <summary>"practice" | "goal" | "review".</summary>
        public string Plan { get; set; } = "";
        /// <summary>Set when this is the answer to the "what will you work on?" follow-up rather than the first choice.</summary>
        public bool FollowUp { get; set; }
        public string Language { get; set; } = "";
    }
}
