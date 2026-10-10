import axios from "axios";

/**
 * The student's measured behaviour across the anchored avoidance dimensions.
 *
 * This is the server's own reading of the anchor store — what a student consistently engages with
 * and what they consistently turn down. It is the evidence behind a nudge and, later, behind an
 * AI goal suggestion, so it is fetched rather than recomputed here: one definition of "avoiding
 * something", in one place.
 */

const BACKEND = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7273";

/** How often a student engaged with one element, and whether that counts as a gap. */
export interface AvoidanceElementStat {
    /** One of `ANCHOR_ELEMENT`. */
    element: string;
    /** The specific method or exercise type, or empty for the yes/no dimensions. */
    value: string;
    /** How many times the student was in a position to engage. */
    opportunities: number;
    /** How many of those they took. */
    engaged: number;
    /** Engaged ÷ opportunities, 0 when never offered. */
    engagementRate: number;
    /** True when this is something the student has consistently avoided. */
    isGap: boolean;
    /** Human-readable name, safe to show a student. */
    label: string;
}

export interface AvoidanceProfile {
    studentId: number;
    computedAt: string;
    /** Completed attempts this profile is based on. */
    attempts: number;
    elements: AvoidanceElementStat[];
    /** The subset that counts as a gap, most-avoided first. */
    gaps: AvoidanceElementStat[];
    averageHints: number | null;
    averageErrors: number | null;
    /** True while there is not yet enough history to say anything. */
    isColdStart: boolean;
}

/**
 * In-flight and resolved fetches, keyed by student.
 *
 * The profile is asked for at every declined decision, which can be several times inside a single
 * exercise, and it can only change when an exercise completes. Caching the PROMISE rather than the
 * result matters: two declines a moment apart would otherwise both see an empty cache and both go
 * to the network.
 */
const cache = new Map<number, Promise<AvoidanceProfile | null>>();

/** Drops the cache. Call when something has just changed the answer — at the end of an exercise. */
export function forgetAvoidanceProfile(studentId?: number): void {
    if (studentId === undefined) cache.clear();
    else cache.delete(studentId);
}

/**
 * Returns the profile, or null when it cannot be read.
 *
 * Null means "we do not know", which callers must treat the same as "no gaps": a failed request is
 * never a reason to nag a student about something we have not actually observed.
 */
export function getAvoidanceProfile(studentId: number): Promise<AvoidanceProfile | null> {
    const cached = cache.get(studentId);
    if (cached) return cached;

    const request = axios
        .get<AvoidanceProfile>(`${BACKEND}/anchor-tracking/profile/${studentId}`)
        .then((response) => response.data ?? null)
        .catch(() => {
            // Not cached: a failure is usually transient, and caching it would suppress the feature
            // for the rest of the page's life.
            cache.delete(studentId);
            return null;
        });

    cache.set(studentId, request);
    return request;
}
