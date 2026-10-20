/**
 * Study configuration — the settings a study run turns on or off, in one place.
 *
 * These are build-time values: Vite inlines `import.meta.env.*` when it builds, so changing one means
 * a rebuild and a redeploy, not a restart. That is deliberate for the pilot, where the setting has to
 * be fixed for every student in the room rather than adjustable per browser.
 */

/**
 * Whether students skip the concept tutorial (bartering → equalization → elimination) on first login.
 *
 * With this on, a student who signs in lands on the dashboard instead of being walked through the
 * three demos first. Nothing is deleted: each method's tutorial is still listed on its own page, which
 * the method cards on the home page lead to, so a lesson can still put the class through them.
 *
 * On by default, because that is what the pilot needs. Set `VITE_SKIP_CONCEPT_TUTORIAL=false` to put
 * the first-login walkthrough back. Pippin's dashboard walkthrough is a separate tour and still runs.
 */
export const SKIP_CONCEPT_TUTORIAL: boolean =
    (import.meta.env.VITE_SKIP_CONCEPT_TUTORIAL ?? "true") !== "false";
