using Microsoft.Data.Sqlite;

namespace webapi.Models.Database
{
    public static class DBSettings
    {
        public const string AlgeSpaceDB = "algespace.db";
        public const string StudiesDB = "studies.db";
        public const string StudentsDB = "students.db";

        public static string GetDBLocation(string dbName)
        {
            return Environment.CurrentDirectory + "/Data/databases/" + dbName;
        }

        /// <summary>
        /// How long a single statement waits for the write lock before giving up.
        ///
        /// SQLite permits exactly one writer at a time. Without a wait, a second writer does not queue
        /// behind the first — it fails immediately with "database is locked". Under concurrent use that
        /// turns a momentarily busy database into lost work, which is what a 120-student run produced
        /// by the hundred. Five seconds rides out the collision between several students finishing an
        /// exercise at the same moment, and is short enough that nobody experiences it as a hang.
        /// </summary>
        private const int BusyTimeoutMs = 5000;

        public static SqliteConnection GetSQLiteConnectionForExercisesDB() => OpenConnection(AlgeSpaceDB);

        public static SqliteConnection GetSQLiteConnectionForStudiesDB() => OpenConnection(StudiesDB);

        public static SqliteConnection GetSQLiteConnectionForStudentsDB() => OpenConnection(StudentsDB);

        /// <summary>
        /// Opens a database and applies the per-connection settings every caller needs.
        ///
        /// The connection is opened HERE rather than by the caller. That is the opposite of the usual
        /// arrangement and it is deliberate: the pragmas below are per-connection, there are nearly
        /// ninety call sites that each call `Open()` for themselves, and doing it centrally means every
        /// one of them gets the settings without being edited. Calling `Open()` on an already-open
        /// connection is a no-op in ADO.NET, so those call sites keep working untouched.
        ///
        /// Pooling is enabled because a connection used to be opened and closed on every request.
        /// </summary>
        public static SqliteConnection OpenConnection(string dbName)
        {
            var connection = new SqliteConnection($"Data Source={GetDBLocation(dbName)};Pooling=True");
            connection.Open();

            // synchronous=NORMAL is the recommendation that pairs with WAL, and the single largest
            // win on a slow disk: under WAL it stops every commit from forcing a full flush of the log,
            // which is what makes a commit cost milliseconds instead of fractions of one. It remains
            // crash-safe — a power loss cannot corrupt the database, at worst the last few transactions
            // are lost. FULL would be the choice only if that were unacceptable, and it is not worth
            // the cost here.
            using var command = connection.CreateCommand();
            command.CommandText = $"PRAGMA busy_timeout={BusyTimeoutMs}; PRAGMA synchronous=NORMAL;";
            command.ExecuteNonQuery();

            return connection;
        }

        /// <summary>
        /// Puts every database into WAL journal mode, once at startup.
        ///
        /// WHY WAL
        /// The default rollback journal makes a writer exclude readers and readers exclude writers for
        /// the whole transaction, so a single write serialises the entire file. Every route that writes
        /// — the exercise tracker's anchor upserts, the progress counters, goal changes — queues behind
        /// whichever commit is in flight. WAL lets readers continue against the last committed snapshot
        /// while a write is happening, which is what makes concurrent use workable at all.
        ///
        /// WHY IN CODE RATHER THAN ONCE BY HAND
        /// The setting is stored in the database file, so a database created fresh on a new machine or
        /// in a new container would silently be back on the default. Doing it here means a new
        /// deployment is correct the first time it starts, with no manual step to remember.
        ///
        /// Safe to run every time: setting the mode to WAL when it is already WAL is a no-op. Each
        /// database is independent, and a failure is reported rather than thrown — the application
        /// works either way, just slower when several people write at once.
        /// </summary>
        public static IReadOnlyList<string> EnableWriteAheadLogging()
        {
            var report = new List<string>();

            foreach (var dbName in new[] { StudentsDB, AlgeSpaceDB, StudiesDB })
            {
                try
                {
                    using var connection = new SqliteConnection("Data Source=" + GetDBLocation(dbName));
                    connection.Open();

                    using var command = connection.CreateCommand();
                    command.CommandText = "PRAGMA journal_mode=WAL;";

                    report.Add($"{dbName}={command.ExecuteScalar()?.ToString() ?? "unknown"}");
                }
                catch (Exception exception)
                {
                    report.Add($"{dbName}=FAILED ({exception.Message})");
                }
            }

            return report;
        }
    }
}
