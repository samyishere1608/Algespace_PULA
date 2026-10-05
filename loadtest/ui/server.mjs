/**
 * The test page's server. No dependencies — Node's own HTTP module and the suite's own modules.
 *
 *   node loadtest/ui/server.mjs
 *   → http://localhost:4599
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

let running = false;

const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");

    // ── The page itself ─────────────────────────────────────────────────────
    if (url.pathname === "/" || url.pathname === "/index.html") {
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(readFileSync(PAGE));
        return;
    }

    // ── Static health check, so the page can say whether the API is reachable ─
    if (url.pathname === "/api/target") {
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
        response.end(JSON.stringify({ base, reachable, detail }));
        return;
    }

    // ── A run, streamed ─────────────────────────────────────────────────────
    if (url.pathname === "/api/run") {
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
    console.log(`  open    http://localhost:${PORT}`);
    console.log(`  target  ${DEFAULTS.base} (changeable on the page)`);
    console.log(`\n  The backend must be running. Ctrl+C to stop.\n`);
});
