// Validates the pilot roster file before a single request is made: the counts, the arm split, the
// name rules the server enforces, and any duplicate. Run: node tools/pilot-audit/roster-check.cjs
const fs = require("fs");
const path = require("path");

const specPath = path.join(__dirname, "..", "pilot-accounts.json");
const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));

const problems = [];
const seen = new Map();
// The register route's own limits: MinLength(3), MaxLength(20), and a name that becomes a URL path
// segment and a CSV column, so anything beyond letters and digits is a question worth asking.
const NAME = /^[a-z0-9]{3,20}$/;

let total = 0;
for (const group of spec.groups) {
    const counts = new Map();
    for (const name of group.usernames) {
        total++;
        counts.set(name, (counts.get(name) ?? 0) + 1);
        if (!NAME.test(name)) problems.push(`${group.name}: "${name}" is not 3-20 lower-case letters/digits`);
        if (seen.has(name)) problems.push(`"${name}" appears twice: ${seen.get(name)} and ${group.name}`);
        seen.set(name, group.name);
    }
    for (const [name, n] of counts) if (n > 1) problems.push(`${group.name}: "${name}" listed ${n} times`);
    console.log(`${group.name.padEnd(10)} condition=${group.condition.padEnd(9)} accounts=${String(group.usernames.length).padStart(3)}`);

    // The two arms must be the same size, or a per-student comparison is not balanced.
    if (group.name === "blue") spec._blue = group.usernames.length;
    if (group.name === "red") spec._red = group.usernames.length;
}

if (spec._blue !== spec._red) problems.push(`arms are unbalanced: blue=${spec._blue}, red=${spec._red}`);

if (String(spec.password).length < 6) problems.push(`password is shorter than the server minimum of 6`);

console.log(`\ntotal accounts: ${total}`);
console.log(`problems: ${problems.length}`);
problems.forEach((p) => console.log("  - " + p));
process.exitCode = problems.length > 0 ? 1 : 0;
