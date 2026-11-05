// Guards the one promise the plain version makes: nothing is recorded.
//
//   node tools/ui-audit/check-plain-mode.mjs
//
// The promise is kept by four separate places agreeing — the URL check, the preview flag, the
// identity provider and the completion sync. None of them can tell whether the others are still
// doing their job, so a later edit that adds a fifth write path would look completely normal and
// would only show up as unexplained rows in the research database. These assertions fail instead.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const read = (path) => readFileSync(path, "utf8");
const problems = [];

function require_(condition, message) {
    if (!condition) problems.push(message);
}

// 1. The single source of truth, and the prefix the teacher is given.
const plainMode = read("reactapp/src/utils/plainMode.ts");
require_(/PLAIN_PREFIX\s*=\s*"\/plain"/.test(plainMode), "plainMode.ts: prefix is no longer \"/plain\"");
require_(/export function isPlainPath/.test(plainMode), "plainMode.ts: isPlainPath is missing");
require_(/export function isPlainMode/.test(plainMode), "plainMode.ts: isPlainMode is missing");
require_(
    /pathname === PLAIN_PREFIX \|\| pathname\.startsWith\(`\$\{PLAIN_PREFIX\}\/`\)/.test(plainMode),
    "plainMode.ts: /plain must match exactly and as a prefix, and /plainer must not match"
);
require_(
    /export function appUrl\(path: string\): string/.test(plainMode),
    "plainMode.ts: appUrl is missing, so full-page navigation cannot know about the prefix"
);

// 2. The plain tree is its own router with /plain as the basename, so every existing path and link
//    lands under the prefix without the modules knowing.
const routes = read("reactapp/src/routes/Routes.tsx");
require_(
    /createBrowserRouter\(plainRoutes,\s*\{\s*basename:\s*Paths\.PlainPrefix\s*\}\)/.test(routes),
    "Routes.tsx: the plain tree is not mounted with Paths.PlainPrefix as its basename"
);
require_(/<PlainLayout \/>/.test(routes), "Routes.tsx: the plain tree does not mount PlainLayout");
require_(
    /path: Paths\.HomePath,\s*element: <Home \/>/.test(routes),
    "Routes.tsx: the plain tree does not serve the ordinary home page"
);
require_(
    /const moduleRoutes = \[/.test(routes),
    "Routes.tsx: the modules are no longer defined once and shared by both entrances"
);

// 3. The plain home page is the ordinary one, showing the four modules instead of a single tile, and
//    offering no way to sign in — signing in is done at the ordinary address.
const home = read("reactapp/src/views/Home.tsx");
require_(/isPlainMode\(\)/.test(home), "Home.tsx: the plain home page no longer knows it is plain");
for (const item of ["equalization-item", "substitution-item", "elimination-item", "flexibility-item"]) {
    require_(home.includes(item), `Home.tsx: the plain map is missing the ${item} tile`);
}
require_(
    /!isPlain && <NavLink to=\{Paths\.StudiesLoginPath\}/.test(home),
    "Home.tsx: the plain home page still offers the study sign-in"
);
require_(
    /!isPlain && \(student \?/.test(home),
    "Home.tsx: the plain home page still shows a sign-in or a student badge"
);
require_(
    /homepage__navigation-item homepage__navigation-item--plain"\} onClick=\{\(\) => navigate\(Paths\.StudentLoginPath\)\}/.test(home),
    "Home.tsx: the ordinary home page lost its single sign-in tile"
);

// 4. The preview flag is what makes an exercise inert.
const plainLayout = read("reactapp/src/views/plain/PlainLayout.tsx");
require_(
    /<PreviewContext\.Provider value=\{true\}>/.test(plainLayout),
    "PlainLayout.tsx: PreviewContext is not switched on, so exercises would record attempts"
);

// 5. No identity in the plain version, even if this browser signed someone in earlier.
const auth = read("reactapp/src/contexts/AuthProvider.tsx");
require_(/isPlainMode\(\)/.test(auth), "AuthProvider.tsx: does not consult isPlainMode()");
require_(
    /plain \? visitor : signedIn/.test(auth),
    "AuthProvider.tsx: a stored student would still be exposed on /plain"
);

// 6. Both completion writes are gated. The server sync is the choke point every module passes
//    through; the local mark is the one that would show up on the next student's screen.
const storage = read("reactapp/src/utils/storageUtils.ts");
const syncBody = storage.slice(storage.indexOf("function syncExerciseToBackend"));
require_(
    syncBody.slice(0, 600).includes("isPlainMode()"),
    "storageUtils.ts: syncExerciseToBackend no longer refuses to post from /plain"
);
const setBody = storage.slice(storage.indexOf("function setExerciseCompleted"));
require_(
    setBody.slice(0, 900).includes("isPlainMode()"),
    "storageUtils.ts: setExerciseCompleted no longer refuses to write locally from /plain"
);

// 7. The companion is the only thing the plain version removes on purpose.
const exercise = read("reactapp/src/views/flexibility/FlexibilityExercise.tsx");
require_(
    /const preview: boolean = usePreviewMode\(\);/.test(exercise),
    "FlexibilityExercise.tsx: does not read the preview flag"
);
require_(
    /const noCompanion: boolean = isControl \|\| preview;/.test(exercise),
    "FlexibilityExercise.tsx: the plain version would still show the companion"
);

// 8. Japanese before the first paint, not after a switch.
const i18n = read("reactapp/src/i18n.ts");
require_(
    /isPlainMode\(\)\) \{\s*try \{\s*localStorage\.setItem\("i18nextLng", Language\.JA\)/.test(i18n),
    "i18n.ts: the plain version no longer starts in Japanese"
);

// 9. The plain tree is mounted with a basename, so a browser-level navigation to a bare app path
//    leaves it for the ordinary, tracked app. Router navigation handles the prefix itself; assigning
//    window.location does not, and that is exactly how finishing a plain exercise used to dump the
//    student into the logged-in version.
const offenders = [];
(function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name)) {
            const text = readFileSync(full, "utf8");
            const lines = text.split("\n");
            lines.forEach((line, index) => {
                // `.href` is required so that a router's `location` variable is not mistaken for this.
                const match = line.match(/(?:window\.)?location\.href\s*=\s*(.+?);/)
                    || line.match(/window\.location\s*=\s*([^;]+);/)
                    || line.match(/location\.(?:assign|replace)\(\s*([^)]+)\)/);
                if (match && !match[1].trim().startsWith("appUrl(")) {
                    offenders.push(`${full}:${index + 1}  ${line.trim()}`);
                }
            });
        }
    }
})("reactapp/src");

for (const offender of offenders) {
    problems.push(`leaves /plain for the tracked app: ${offender} (wrap the path in appUrl())`);
}

if (problems.length > 0) {
    for (const problem of problems) console.log(`FAIL ${problem}`);
    console.log(`\n${problems.length} problem(s) found. The plain version can record data.`);
    process.exit(1);
}

console.log("OK  plain mode: 10 invariants hold, nothing can be recorded and nothing escapes to the tracked app");
