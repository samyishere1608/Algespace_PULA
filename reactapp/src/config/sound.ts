/**
 * Whether the award sounds play.
 *
 * OFF for the pilot, by the professor's decision. A control student works without the points those
 * chimes announce, so for them a fanfare marks nothing at all — and in a classroom it competes with
 * the teacher. The feature is not deleted: every player reads this flag, so setting it back to `true`
 * restores all four sounds exactly as they were.
 *
 * The flag also guards the `new Audio(...)` construction rather than only the `.play()` call. That is
 * deliberate — constructing an Audio with a source starts fetching the mp3, so gating only playback
 * would still download four files nobody hears.
 *
 * Typed `boolean` on purpose: as a literal `false` TypeScript would narrow the guards to `never` and
 * stop type-checking the code inside them.
 */
export const SOUND_ENABLED: boolean = false;
