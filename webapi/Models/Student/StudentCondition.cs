using Dapper;
using Microsoft.Data.Sqlite;

namespace webapi.Models.Student
{
    /// <summary>
    /// Which arm of the study a student is in.
    ///
    /// TREATMENT is the app as it has been: dashboard, goals, reflection, nudges, the companion.
    /// CONTROL is the plain flexibility module — no dashboard, no nudges, no companion — with the
    /// exercise data recorded exactly as it is for everyone else. The difference is deliberately all
    /// on the side of what the student is shown, never in what is written down, because the point of the
    /// control arm is to be compared against the treatment arm on the same measurements.
    ///
    /// A COLUMN rather than a rule about the username. A username prefix would have been less code, but
    /// it makes the condition a property of the NAME: an account that is renamed, or created without the
    /// prefix, silently becomes the other arm — and a mistyped roster is not something an analysis can
    /// detect afterwards. The column can be assigned after the accounts exist, which is what the study
    /// actually needs: accounts are created first, and the split is decided later.
    ///
    /// The default is TREATMENT, on purpose. Every read that cannot establish the condition answers
    /// "treatment", which is the arm whose behaviour is the app everyone has been using — so a missing or
    /// unreadable value can never quietly move a student into the arm that gets less.
    /// </summary>
    public static class StudentCondition
    {
        public const string Treatment = "treatment";

        public const string Control = "control";

        /// <summary>The column, added to an existing database by <see cref="EnsureColumn"/>.</summary>
        public const string ColumnName = "Condition";

        /// <summary>
        /// Anything that is not recognisably control is treatment.
        ///
        /// Case-insensitive and trimmed, because this value will be typed into a request body by hand far
        /// more often than it will be written by a tool.
        /// </summary>
        public static string Normalize(string? value) =>
            string.Equals(value?.Trim(), Control, StringComparison.OrdinalIgnoreCase) ? Control : Treatment;

        /// <summary>
        /// Adds the column to a database that predates it, and does nothing on one that already has it.
        ///
        /// Called from the two places that read a student, rather than from startup: the students database
        /// lives on the deployment's volume and is opened per request, so there is no startup moment that
        /// is guaranteed to see it. `pragma_table_info` is the check because SQLite has no
        /// ADD COLUMN IF NOT EXISTS.
        /// </summary>
        public static void EnsureColumn(SqliteConnection conn)
        {
            var exists = conn.Query("SELECT name FROM pragma_table_info(@Table)", new { Table = StudentDBSettings.TableName })
                .Any(row => string.Equals((string)row.name, ColumnName, StringComparison.OrdinalIgnoreCase));

            if (exists) return;

            // DEFAULT is not only for the rows that predate the column: it is what an INSERT that does not
            // name it gets, which is every account this app registers, and it is what keeps the default
            // arm the treatment arm without the insert having to know this column exists.
            conn.Execute(
                $"ALTER TABLE {StudentDBSettings.TableName} ADD COLUMN {ColumnName} TEXT NOT NULL DEFAULT '{Treatment}'");
        }

        /// <summary>
        /// Whether this student is in the control arm, from the database rather than from the request.
        ///
        /// Never throws and never guesses upwards: an unknown student, a missing table, a missing column or
        /// an unreadable value all answer false, which leaves that student in the arm the app has always
        /// behaved as if they were in.
        /// </summary>
        public static bool IsControl(SqliteConnection conn, long studentId)
        {
            if (studentId <= 0) return false;

            try
            {
                var value = conn.ExecuteScalar<string?>(
                    $"SELECT {ColumnName} FROM {StudentDBSettings.TableName} WHERE Id = @Id",
                    new { Id = studentId });

                return Normalize(value) == Control;
            }
            catch
            {
                return false;
            }
        }
    }
}
