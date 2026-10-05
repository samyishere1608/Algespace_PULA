namespace webapi.Models.Anchors
{
    /// <summary>
    /// Writes one named record against an attempt, where the caller supplies the name.
    ///
    /// The study-mirroring routes take their name from an enum, because the study's schema is one
    /// column per phase. Some of what we record is not a phase at all — a nudge and how it was
    /// answered, for instance — so those need to name themselves.
    /// </summary>
    public class TrackAnchorRecordRequest
    {
        public long UserId { get; set; }

        /// <summary>The attempt this record belongs to, as returned by createEntry.</summary>
        public long Id { get; set; }

        public string Name { get; set; } = "";

        public string Choice { get; set; } = "";
    }
}
