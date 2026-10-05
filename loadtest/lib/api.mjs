/**
 * The HTTP client the scenarios are written against, plus the classification of every outcome.
 *
 * WHY CLASSIFICATION IS THE POINT
 * A concurrency problem in this backend does not announce itself as a 500. Every controller wraps its
 * work in try/catch and returns `BadRequest(exception.Message)`, so a SQLite write that lost the lock
 * arrives as **400 with "database is locked" in the body**. Counting status codes alone would file
 * that as a client error and the suite would report a clean run while writes were being dropped.
 * The body is therefore inspected first, and the class that wins is the most actionable one.
 */

export const CLASS = {
    OK: "ok",
    /** 429 from the global rate limiter. A capacity ceiling, not a bug — counted apart for that reason. */
    THROTTLED: "throttled",
    /** SQLite could not get the lock. THE class this suite exists to surface. */
    BUSY: "busy",
    CLIENT: "client",
    SERVER: "server",
    TIMEOUT: "timeout",
    NETWORK: "network",
};

const BUSY_PATTERN = /database is locked|database table is locked|SQLITE_BUSY|database is busy/i;
const THROTTLE_PATTERN = /too many requests|rate limit/i;

/** The classes that mean the request did not do its job. */
export const FAILED_CLASSES = [CLASS.THROTTLED, CLASS.BUSY, CLASS.CLIENT, CLASS.SERVER, CLASS.TIMEOUT, CLASS.NETWORK];

/**
 * Decides what happened, most-specific first.
 *
 * Order matters and is deliberate: body text beats status code, so a 400 carrying a lock error is
 * reported as `busy`, and a 400 from a genuine validation failure stays `client`.
 */
export function classify(status, text) {
    if (BUSY_PATTERN.test(text)) return CLASS.BUSY;
    if (status === 429 || THROTTLE_PATTERN.test(text)) return CLASS.THROTTLED;
    if (status >= 200 && status < 300) return CLASS.OK;
    if (status >= 500) return CLASS.SERVER;
    return CLASS.CLIENT;
}

/**
 * A global request-rate gate.
 *
 * The server rate-limits to a fixed window per host (see `Program.cs`), so an unthrottled load test
 * spends its whole run collecting 429s and measures nothing about the database. This lets a run be
 * held at a rate the server will actually serve, and `--rps 0` leaves the limiter itself as the thing
 * under test.
 *
 * Slots are reserved in arrival order by moving a cursor forward, rather than by sleeping a fixed
 * interval, so the achieved rate converges on the requested one instead of drifting below it.
 */
function createRateGate(rps) {
    if (!rps || rps <= 0) return async () => { };

    const intervalMs = 1000 / rps;
    let nextSlot = performance.now();

    return async function awaitSlot() {
        const now = performance.now();
        const slot = Math.max(now, nextSlot);
        nextSlot = slot + intervalMs;

        const wait = slot - now;
        if (wait >= 1) await new Promise((resolve) => setTimeout(resolve, wait));
    };
}

/**
 * @param {object} options
 * @param {string} options.baseUrl        e.g. http://localhost:7273
 * @param {string} [options.apiKey]       sent as X-API-Key; only needed when the server runs outside Development
 * @param {number} [options.timeoutMs]    per-request deadline
 * @param {number} [options.rps]          global requests/second ceiling, 0 for none
 * @param {(sample: object) => void} options.record  called once per request, success or not
 */
export function createClient({ baseUrl, apiKey, timeoutMs = 15000, rps = 0, record }) {
    const awaitSlot = createRateGate(rps);

    async function send(method, path, body, { scenario, step }) {
        await awaitSlot();

        const started = performance.now();
        let status = 0;
        let text = "";
        let klass;

        try {
            const headers = { Accept: "application/json" };
            // Only set Content-Type when there is a body: sending it on a GET makes some servers
            // treat the request as preflighted, which adds a round trip to every read.
            if (body !== undefined) headers["Content-Type"] = "application/json";
            if (apiKey) headers["X-API-Key"] = apiKey;

            const response = await fetch(`${baseUrl}${path}`, {
                method,
                headers,
                body: body === undefined ? undefined : JSON.stringify(body),
                signal: AbortSignal.timeout(timeoutMs),
            });

            status = response.status;
            text = await response.text();
            klass = classify(status, text);
        } catch (error) {
            // A timeout and a refused connection are different failures with different fixes, so
            // they must not collapse into one "network" bucket.
            const name = error?.name ?? "";
            klass = name === "TimeoutError" || name === "AbortError" ? CLASS.TIMEOUT : CLASS.NETWORK;
            text = String(error?.message ?? error);
        }

        record({ scenario, step, method, path, status, klass, ms: performance.now() - started });

        let json;
        if (klass === CLASS.OK) {
            try { json = JSON.parse(text); } catch { /* a 200 with no JSON body is fine (Ok()) */ }
        }

        return { ok: klass === CLASS.OK, status, klass, text, json };
    }

    const client = {
        get: (path, scope) => send("GET", path, undefined, scope),
        post: (path, body, scope) => send("POST", path, body, scope),
        put: (path, body, scope) => send("PUT", path, body, scope),

        /**
         * Binds the client to one scenario name.
         *
         * The scenario name has to be captured at REQUEST time, not read from a shared field when the
         * response lands: with many workers in flight, a shared field would be overwritten by another
         * worker while this one was awaiting, and every sample after that would be attributed to the
         * wrong scenario. Binding removes the possibility rather than documenting it.
         */
        forScenario: (scenario) => ({
            get: (path, step) => client.get(path, { scenario, step }),
            post: (path, body, step) => client.post(path, body, { scenario, step }),
            put: (path, body, step) => client.put(path, body, { scenario, step }),
        }),
    };

    return client;
}
