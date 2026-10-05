/**
 * Latency and outcome statistics for the load tests.
 *
 * PERCENTILES, NOT AVERAGES.
 * The whole reason to run this suite is to find requests that waited on a database lock while the
 * rest were fast. A mean hides exactly those: 99 requests at 8 ms and one at 12 s average out to
 * 128 ms, which reads as "fine". p95, p99 and max are the columns that expose it, so they are what
 * the report leads with.
 */

/**
 * Nearest-rank percentile of an ASCENDING array.
 *
 * Nearest-rank rather than interpolation: the numbers here are wall-clock milliseconds of real
 * requests, and inventing a value between two of them would report a latency that no request took.
 */
export function percentile(sorted, p) {
    if (sorted.length === 0) return 0;
    const rank = Math.ceil((p / 100) * sorted.length);
    return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))];
}

/** Latency summary for one list of durations in milliseconds. */
export function describe(durations) {
    if (durations.length === 0) {
        return { count: 0, mean: 0, p50: 0, p90: 0, p95: 0, p99: 0, max: 0 };
    }

    const sorted = [...durations].sort((a, b) => a - b);
    const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;

    return {
        count: sorted.length,
        mean,
        p50: percentile(sorted, 50),
        p90: percentile(sorted, 90),
        p95: percentile(sorted, 95),
        p99: percentile(sorted, 99),
        max: sorted[sorted.length - 1],
    };
}

/** Rounds for display. Sub-millisecond precision below 10 ms, whole milliseconds above it. */
export function ms(value) {
    if (value === 0) return "0";
    if (value < 10) return value.toFixed(1);
    return String(Math.round(value));
}

/** Groups rows into a Map keyed by the given function, preserving first-seen order. */
export function groupBy(rows, keyFn) {
    const groups = new Map();
    for (const row of rows) {
        const key = keyFn(row);
        const bucket = groups.get(key);
        if (bucket === undefined) groups.set(key, [row]);
        else bucket.push(row);
    }
    return groups;
}

/** Renders an aligned text table. Column widths follow the widest cell. */
export function renderTable(headers, rows) {
    const widths = headers.map((header, index) =>
        Math.max(header.length, ...rows.map((row) => String(row[index] ?? "").length), 1));

    const line = (cells) =>
        cells.map((cell, index) => String(cell ?? "").padEnd(widths[index])).join("  ").trimEnd();

    const divider = widths.map((width) => "-".repeat(width)).join("  ");

    return [line(headers), divider, ...rows.map((row) => line(row))].join("\n");
}
