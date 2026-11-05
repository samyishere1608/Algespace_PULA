/**
 * Whether the page being shown is the open, no-account version of AlgeSPACE.
 *
 * The plain version is a second entrance to the same app rather than a second app: the four modules
 * are the same components, in Japanese, for classrooms where consent to record does not exist. So it
 * is decided by the URL and nothing else — there is no flag to set, no storage to clear, and no way
 * for it to leak into an ordinary page once the teacher navigates away or closes the tab.
 *
 * Every place that could otherwise write — the tracker, the signed-in identity, the exercise
 * completion sync — asks this one question rather than each inventing a switch of its own. That
 * matters because a browser that signed a student in earlier still holds their id in localStorage:
 * without an explicit by-URL answer, the "open" version would quietly record the work of a visitor
 * who never agreed to anything.
 */
export const PLAIN_PREFIX = "/plain";

export function isPlainPath(pathname: string): boolean {
    return pathname === PLAIN_PREFIX || pathname.startsWith(`${PLAIN_PREFIX}/`);
}

export function isPlainMode(): boolean {
    return isPlainPath(window.location.pathname);
}

/**
 * The URL an app path is actually served from in the entrance that is open.
 *
 * Router navigation applies the basename by itself, so ordinary links need nothing. Assigning
 * `window.location.href` does not — it is a browser navigation, not a router one — and a path like
 * `/flexibility-training/` would leave the plain version for the ordinary app, which is tracked.
 * Everything that leaves through `window.location` must go through this first.
 */
export function appUrl(path: string): string {
    if (!isPlainMode() || !path.startsWith("/")) return path;

    return isPlainPath(path) ? path : `${PLAIN_PREFIX}${path}`;
}
