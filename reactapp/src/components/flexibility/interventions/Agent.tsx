import { ReactElement } from "react";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { getActiveBuddy, getActiveBuddyAvatarSrc } from "@utils/buddyUtils.ts";
import "@styles/flexibility/flexibility.scss";

/**
 * The character portrait shown next to an intervention popover.
 *
 * The generic pedagogical-agent artwork (AgentType / AgentExpression) is no longer used. This slot
 * now shows the student's own chosen character, so hints appear to come from the character they
 * picked rather than from an anonymous agent.
 *
 * The image itself comes from `getActiveBuddyAvatarSrc`, the same resolver the hint button uses, so
 * the face the student presses is the face that answers them. Keeping one resolver here rather than
 * a second copy in this file is what makes that hold when either side changes.
 */
export function Agent(): ReactElement {
    const { student } = useAuth();
    const studentId = student?.id ?? "guest";

    return (
        <div className="agent-image__container agent-image__container--large">
            <img src={getActiveBuddyAvatarSrc(studentId)} alt={getActiveBuddy(studentId).name} />
        </div>
    );
}

