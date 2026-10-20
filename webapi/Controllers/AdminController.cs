using System.Security.Cryptography;
using System.Text;
using Dapper;
using Microsoft.AspNetCore.Mvc;
using webapi.Models.Database;
using webapi.Models.Student;

namespace webapi.Controllers
{
    /// <summary>
    /// The two things that cannot be done through the student app: emptying the student database before
    /// a study, and seeing what is in it now.
    ///
    /// WHY A ROUTE RATHER THAN A SHELL. The database is a SQLite file on the deployment's volume, and the
    /// people who need this are researchers with a browser, not operators with a terminal and a SQLite
    /// binary. A guarded route also means the wipe is one reviewable piece of code that can only do one
    /// thing, rather than an ad-hoc command someone has to remember how to spell.
    ///
    /// WHAT IT CANNOT DO. It never touches `algespace.db` (the exercise catalogue) or `studies.db`. A
    /// volume wipe would take those with it and leave the app with no exercises at all, which is the
    /// mistake this route exists to make impossible.
    ///
    /// OFF UNLESS CONFIGURED. Both routes answer 404 when `Admin:ResetKey` is unset, so a deployment that
    /// does not set it has no such surface rather than an unprotected one.
    /// </summary>
    [ApiController]
    [Route("admin")]
    public class AdminController(IConfiguration configuration, ILogger<AdminController> logger) : ControllerBase
    {
        /// <summary>
        /// The body value that proves the caller meant it.
        ///
        /// A key alone is not enough for an irreversible route: a mistyped URL with a valid header would
        /// otherwise be enough to empty a database the day before a study. The word is deliberately not
        /// something that can be produced by accident.
        /// </summary>
        public const string ConfirmToken = "DELETE-STUDENT-DATA";

        /// <summary>
        /// The confirmation word for removing accounts by prefix. Deliberately different from
        /// <see cref="ConfirmToken"/>: forgetting one of the two words should not be able to turn "clean the
        /// activity" into "delete the logins", or the other way round.
        /// </summary>
        public const string DeleteAccountsToken = "DELETE-ACCOUNTS";

        /// <summary>The key this route demands, or null when the route should not exist at all.</summary>
        private string? ResetKey =>
            configuration.GetValue<string>("Admin:ResetKey") is { Length: > 0 } key ? key : null;

        private bool Authorized()
        {
            var required = ResetKey;
            if (required is null) return false;

            var supplied = Request.Headers["X-Admin-Key"].ToString();
            if (string.IsNullOrEmpty(supplied)) return false;

            // Constant time: this is the only gate on a route that deletes everything.
            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(supplied), Encoding.UTF8.GetBytes(required));
        }

        /// <summary>What is in the student database right now, per table. Read-only.</summary>
        [HttpGet("status")]
        public ActionResult Status()
        {
            if (ResetKey is null) return NotFound();
            if (!Authorized()) return Unauthorized();

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();

            var counts = StudentTables(conn)
                .Select(table => new { table, rows = CountRows(conn, table) })
                .Where(entry => entry.rows > 0)
                .OrderByDescending(entry => entry.rows)
                .ToList();

            return Ok(new
            {
                database = DBSettings.GetDBLocation(DBSettings.StudentsDB),
                totalRows = counts.Sum(entry => entry.rows),
                tables = counts,
            });
        }

        /// <summary>
        /// Empties the student database.
        ///
        /// `keepAccounts: true` wipes the ACTIVITY and keeps the logins, which is the order a study wants:
        /// create the class first, then clean, so nothing the researcher did while testing survives into
        /// the first session but nobody has to be given a new username.
        ///
        /// `keepAccounts: false` takes the accounts as well, and because the primary key is autoincrement
        /// the ids start again at 1 afterwards.
        /// </summary>
        [HttpPost("reset")]
        public ActionResult Reset([FromBody] AdminResetRequest request)
        {
            if (ResetKey is null) return NotFound();
            if (!Authorized()) return Unauthorized();

            if (!string.Equals(request.Confirm, ConfirmToken, StringComparison.Ordinal))
                return BadRequest($"Send {{\"confirm\":\"{ConfirmToken}\"}} to confirm. Nothing was deleted.");

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();

            // The vocabulary and schema tables are lookup data rather than student data, so they are not
            // in StudentTables and are never touched: deleting them would only make the next request
            // re-seed the same rows.
            var removed = new List<object>();
            var emptied = new List<string>();

            foreach (var table in StudentTables(conn).Where(table => table != "Students"))
            {
                var rows = conn.Execute($"DELETE FROM {table}");
                emptied.Add(table);
                if (rows > 0) removed.Add(new { table, rows });
            }

            // NlpAnalysis carries no student id: it hangs off a reflection history row by HistoryId, so
            // deleting the history would otherwise leave analysis rows pointing at nothing.
            if (TableExists(conn, "NlpAnalysis") && ColumnExists(conn, "NlpAnalysis", "HistoryId"))
            {
                var rows = conn.Execute("DELETE FROM NlpAnalysis");
                if (rows > 0) removed.Add(new { table = "NlpAnalysis", rows });
            }

            if (!request.KeepAccounts)
            {
                var rows = conn.Execute("DELETE FROM Students");
                emptied.Add("Students");
                if (rows > 0) removed.Add(new { table = "Students", rows });
            }

            // Ids restart from 1 for every emptied table. Accounts that survive keep theirs, which is the
            // point of keeping them.
            foreach (var table in emptied)
                conn.Execute("DELETE FROM sqlite_sequence WHERE name = @Name", new { Name = table });

            // VACUUM returns the space to the filesystem; a study's window should start from a small file
            // rather than one still carrying the pages of everything deleted above.
            conn.Execute("VACUUM");

            // Merge the write-ahead log back into the main file.
            //
            // Without this the deletions live only in `students.db-wal`, and anyone who copies
            // `students.db` alone — which is exactly what downloading it from the host's volume browser
            // does — gets the pre-deletion contents. Measured here: the app saw 0 rows while the same
            // file copied without its `-wal` still reported 2002. TRUNCATE also empties the log, so the
            // pair on disk is one consistent file plus an empty journal.
            conn.Query("PRAGMA wal_checkpoint(TRUNCATE)");

            var remaining = StudentTables(conn).ToDictionary(table => table, table => CountRows(conn, table));

            logger.LogWarning(
                "[Admin] Student database reset. keepAccounts={KeepAccounts}, removed={Removed}, remainingRows={Remaining}",
                request.KeepAccounts,
                string.Join(", ", removed.Select(entry => entry.ToString())),
                remaining.Values.Sum());

            return Ok(new
            {
                keepAccounts = request.KeepAccounts,
                removed,
                remaining = remaining.Where(entry => entry.Value > 0).ToDictionary(entry => entry.Key, entry => entry.Value),
            });
        }

        /// <summary>
        /// Deletes the accounts whose username starts with a prefix, and everything those accounts own.
        ///
        /// Why a prefix rather than a list: the accounts to remove are the ones a tool created, and a tool
        /// names them in a family (`lt_s001` … `lt_s120`). Listing them would mean a hand-typed list that
        /// is wrong the moment one is added, and this way the same route removes a finished class with
        /// `jp-test-student-` later.
        ///
        /// DRY BY DEFAULT. `DryRun` is true unless the caller says otherwise, so a call that forgets the
        /// flag reports what it would delete and deletes nothing. Deleting accounts is not reversible: the
        /// rows behind them go with them.
        /// </summary>
        [HttpPost("delete-accounts")]
        public ActionResult DeleteAccounts([FromBody] AdminDeleteAccountsRequest request)
        {
            if (ResetKey is null) return NotFound();
            if (!Authorized()) return Unauthorized();

            if (!string.Equals(request.Confirm, DeleteAccountsToken, StringComparison.Ordinal))
                return BadRequest($"Send {{\"confirm\":\"{DeleteAccountsToken}\"}} to confirm. Nothing was deleted.");

            var prefix = (request.UsernamePrefix ?? "").Trim();
            // Two characters, because one is a family name that is also the start of another ("l" would
            // take "lt_runner" and every "lea…" with it). An empty prefix is a full wipe, which is what
            // /admin/reset is for.
            if (prefix.Length < 2)
                return BadRequest("usernamePrefix must be at least 2 characters. Use /admin/reset for a full wipe.");

            using var conn = DBSettings.GetSQLiteConnectionForStudentsDB();
            conn.Open();

            // Escaped, because LIKE treats `_` as "any single character" and `%` as "anything": the prefix
            // `lt_` would otherwise also match `ltXanything`.
            var pattern = prefix
                .Replace("\\", "\\\\")
                .Replace("%", "\\%")
                .Replace("_", "\\_") + "%";

            var matched = conn.Query<(long Id, string Username)>(
                $"SELECT Id, Username FROM {StudentDBSettings.TableName} WHERE Username LIKE @Pattern ESCAPE '\\' ORDER BY Username",
                new { Pattern = pattern })
                .Select(row => new { id = row.Id, username = row.Username })
                .ToList();

            if (matched.Count == 0)
                return Ok(new { dryRun = request.DryRun, prefix, accounts = Array.Empty<object>(), removed = Array.Empty<object>() });

            var ids = matched.Select(entry => entry.id).ToList();

            if (request.DryRun)
                return Ok(new { dryRun = true, prefix, accounts = matched, removed = Array.Empty<object>() });

            var removed = new List<object>();
            foreach (var table in StudentTables(conn).Where(table => table != StudentDBSettings.TableName))
            {
                var rows = conn.Execute($"DELETE FROM {table} WHERE StudentId IN @Ids", new { Ids = ids });
                if (rows > 0) removed.Add(new { table, rows });
            }

            // Analysis rows hang off a history row rather than a student, so anything left pointing at a
            // deleted history row is garbage.
            if (TableExists(conn, "NlpAnalysis") && ColumnExists(conn, "NlpAnalysis", "HistoryId"))
            {
                var rows = conn.Execute("DELETE FROM NlpAnalysis WHERE HistoryId NOT IN (SELECT Id FROM ReflectionHistory)");
                if (rows > 0) removed.Add(new { table = "NlpAnalysis", rows });
            }

            var accounts = conn.Execute($"DELETE FROM {StudentDBSettings.TableName} WHERE Id IN @Ids", new { Ids = ids });

            // Same reason as the reset: the deletions live in the write-ahead log until it is merged, and a
            // copy of the file on its own would still show these accounts.
            conn.Query("PRAGMA wal_checkpoint(TRUNCATE)");

            logger.LogWarning(
                "[Admin] Deleted {Accounts} accounts with prefix '{Prefix}'. Removed: {Removed}",
                accounts, prefix, string.Join(", ", removed.Select(entry => entry.ToString())));

            return Ok(new { dryRun = false, prefix, accounts = matched, removed });
        }

        /// <summary>
        /// Every table that holds something about a student, found rather than listed.
        ///
        /// Found, because a hardcoded list is wrong the moment a table is added, and being wrong here
        /// means a study starts with someone's leftover rows in it. A table counts as student data if it
        /// has a StudentId column, which is the convention every one of these tables follows.
        /// </summary>
        private static List<string> StudentTables(Microsoft.Data.Sqlite.SqliteConnection conn)
        {
            var tables = conn.Query<string>(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
                .Where(name => ColumnExists(conn, name, "StudentId"))
                .ToList();

            // The accounts table is keyed by its own Id rather than by StudentId, so it is the one table
            // the convention above cannot find. Included only when it exists.
            if (TableExists(conn, StudentDBSettings.TableName)) tables.Add(StudentDBSettings.TableName);

            return tables;
        }

        private static bool TableExists(Microsoft.Data.Sqlite.SqliteConnection conn, string table) =>
            conn.ExecuteScalar<int>(
                "SELECT COUNT(1) FROM sqlite_master WHERE type = 'table' AND name = @Name",
                new { Name = table }) > 0;

        private static bool ColumnExists(Microsoft.Data.Sqlite.SqliteConnection conn, string table, string column) =>
            conn.Query("SELECT name FROM pragma_table_info(@Table)", new { Table = table })
                .Any(row => string.Equals((string)row.name, column, StringComparison.OrdinalIgnoreCase));

        private static long CountRows(Microsoft.Data.Sqlite.SqliteConnection conn, string table) =>
            conn.ExecuteScalar<long>($"SELECT COUNT(*) FROM {table}");
    }

    /// <summary>The body of a reset. `Confirm` must equal <see cref="AdminController.ConfirmToken"/>.</summary>
    public class AdminResetRequest
    {
        public string Confirm { get; set; } = "";

        /// <summary>
        /// Whether the logins survive. True wipes the work and keeps the accounts, which is what a study
        /// wants before its first session; false is a full reset.
        /// </summary>
        public bool KeepAccounts { get; set; } = true;
    }

    /// <summary>
    /// The body of a targeted account delete. `Confirm` must equal
    /// <see cref="AdminController.DeleteAccountsToken"/>.
    /// </summary>
    public class AdminDeleteAccountsRequest
    {
        public string Confirm { get; set; } = "";

        /// <summary>Usernames starting with this are removed, with everything they own.</summary>
        public string UsernamePrefix { get; set; } = "";

        /// <summary>
        /// True unless the caller says otherwise, so a call that forgets this flag reports what it would
        /// delete rather than deleting it.
        /// </summary>
        public bool DryRun { get; set; } = true;
    }
}
