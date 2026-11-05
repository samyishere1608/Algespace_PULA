import { PreviewContext } from "@/contexts/previewContext.ts";
import { ReactElement } from "react";
import { Outlet } from "react-router-dom";

/**
 * The shell every plain page sits inside.
 *
 * One flag, in one place: the whole subtree behaves as a demonstration. `PreviewContext` is what the
 * tracker already reads to decide whether an attempt may be written, so mounting this provider is
 * what makes the modules inert — no attempt id, no Insight, no goal, no nudge — without a single
 * exercise component needing to know that the plain version exists.
 *
 * The language is set before React mounts (see `main.tsx`), so there is nothing to do here but wrap.
 */
export default function PlainLayout(): ReactElement {
    return (
        <PreviewContext.Provider value={true}>
            <Outlet />
        </PreviewContext.Provider>
    );
}
