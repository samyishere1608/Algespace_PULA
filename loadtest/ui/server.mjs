/**
 * The test page's server. No dependencies — Node's own HTTP module and the suite's own modules.
 *
 *   node loadtest/ui/server.mjs
 *   → http://localhost:4599/loadtest/
 *
 * The API serves the SAME page at `/loadtest/` from its own port (see `LoadTestController`), and
 * both hosts use the same four route names under that path. The page's URLs are relative, so there
 * is one page file and neither host can drift from the other.
 *
 * It serves one page and streams a run over Server-Sent Events. SSE rather than WebSocket because
 * the traffic is one-way and a run is a stream of progress facts; there is nothing to send back
 * mid-run, and a plain `EventSource` needs no client library.
 *
 * Only one run at a time. Two simultaneous simulations would contend for the same database and make
 * both results meaningless.
 */

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runStudentSimulation, DEFAULTS } from "../lib/pipeline.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = join(HERE, "index.html");
const PORT = Number(process.env.PORT ?? 4599);

/** The directory both hosts serve this page from. `./run` in the page resolves against it, which is
 *  the reason a redirect is needed for the bare path: without the trailing slash it would be
 *  `/run`. */
const BASE = "/loadtest";

let running = false;

const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");

    // ── The bare path and the legacy root both land on the real one ────────
    if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname === BASE) {
        response.writeHead(302, { "Location": `${BASE}/${url.search}` });
        response.end();
        return;
    }

    // ── The page itself ───────────────────────────────────────────────────
    if (url.pathname === `${BASE}/`) {
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(readFileSync(PAGE));
        return;
    }

    // ── Which backend to point at by default ──────────────────────────────
    if (url.pathname === `${BASE}/info`) {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ defaultBase: DEFAULTS.base }));
        return;
    }

    // ── Static health check, so the page can say whether the API is reachable ─
    if (url.pathname === `${BASE}/target`) {
        const base = url.searchParams.get("base") ?? DEFAULTS.base;

        let reachable = false;
        let detail = "";

        try {
            const probe = await fetch(`${base}/flexibility-training/getFlexibilityExercises`, {
                signal: AbortSignal.timeout(4000),
            });
            reachable = probe.ok;
            detail = `HTTP ${probe.status}`;
        } catch (error) {
            detail = error?.message ?? String(error);
        }

        response.writeHead(200, { "Content-Type": "application/json" });
        // `endpoint`, not `base`, so this answer is shaped like the API's. The page reads only
        // `reachable` and `detail`, but two hosts returning different keys for the same fact is the
        // kind of difference that becomes a bug the first time anything else reads it.
        response.end(JSON.stringify({ endpoint: base, reachable, detail }));
        return;
    }

    // ── A run, streamed ───────────────────────────────────────────────────
    if (url.pathname === `${BASE}/run`) {
        if (running) {
            response.writeHead(409, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ error: "A run is already in progress." }));
            return;
        }

        running = true;

        response.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            // Without this, a proxy in front of the page may buffer the whole stream and the point of
            // streaming progress would be lost.
            "X-Accel-Buffering": "no",
        });

        let closed = false;
        request.on("close", () => { closed = true; });

        const send = (payload) => {
            if (closed) return;
            try { response.write(`data: ${JSON.stringify(payload)}\n\n`); } catch { closed = true; }
        };

        const number = (name, fallback) => {
            const raw = url.searchParams.get(name);
            const value = raw === null ? NaN : Number(raw);
            return Number.isFinite(value) ? value : fallback;
        };

        try {
            const result = await runStudentSimulation({
                students: number("students", DEFAULTS.students),
                durationSeconds: number("durationSeconds", DEFAULTS.durationSeconds),
                timeScale: number("timeScale", DEFAULTS.timeScale),
                includeAi: url.searchParams.get("includeAi") === "1",
                keep: url.searchParams.get("keep") === "1",
                base: url.searchParams.get("base") ?? DEFAULTS.base,
                allowRemote: url.searchParams.get("allowRemote") === "1",
            }, send);

            send({ type: "result", result });
        } catch (error) {
            send({ type: "error", message: String(error?.message ?? error) });
        } finally {
            running = false;
            try { response.end(); } catch { /* client already gone */ }
        }

        return;
    }

    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("Not found");
});

server.listen(PORT, () => {
    console.log(`\nAlgeSpace load test page\n`);
    console.log(`  open    http://localhost:${PORT}${BASE}/`);
    console.log(`  target  ${DEFAULTS.base} (changeable on the page)`);
    console.log(`\n  The backend must be running. Ctrl+C to stop.`);
    console.log(`  The API serves this same page at /loadtest/ on its own port.\n`);
});
