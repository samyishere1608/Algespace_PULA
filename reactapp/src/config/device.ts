/**
 * Whether a student is stopped for having a screen that is too small.
 *
 * OFF. The gate was meant to keep the games off phones, but it fires on machines that meet the size it
 * asks for: browser zoom, a display-scale setting, or a window a little short is enough, and the
 * student who sees it has no way forward — the page shows a message and nothing else. Being let into a
 * tight layout is a far smaller problem than being locked out of the exercise, so until the check
 * itself is worth trusting it lets everyone through.
 *
 * Typed `boolean` on purpose: as a literal `false` TypeScript would narrow the guards to `never` and
 * stop type-checking the code inside them.
 */
export const DEVICE_GATE_ENABLED: boolean = false;
