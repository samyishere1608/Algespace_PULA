import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, useCallback, useEffect, useRef } from "react";
import { AgentExpression, AgentType } from "@/types/flexibility/enums.ts";
import { Agent } from "@components/flexibility/interventions/Agent.tsx";
import useWindowDimensions from "@hooks/useWindowDimensions.ts";
import type { ChatfaceMood } from "@utils/chatfaceUtils.ts";
import { getFlexibilityFeedbackOrHintWidth } from "@utils/utils.ts";

/**
 * The expression art that stands in for a plain `AgentExpression`.
 *
 * `AgentExpression` is the old pedagogical-agent vocabulary and only says "thinking" or "smiling",
 * which is enough to pick a portrait now that the portrait is the student's own character. Both
 * meanings map onto a drawn expression: thinking is the character with a hand on its chin and a
 * question mark, smiling is the thumbs-up. Callers that know better — a hint, a decision, the end of
 * an exercise — pass `mood` and win over this.
 */
function moodForExpression(agentExpression: AgentExpression | undefined): ChatfaceMood | undefined {
    switch (agentExpression) {
        case AgentExpression.Thinking:
            return "question";
        case AgentExpression.Smiling:
            return "approve";
        default:
            return undefined;
    }
}

export function FlexibilityPopover({ children, agentType, agentExpression, mood }: { children: ReactElement; agentType?: AgentType; agentExpression?: AgentExpression; mood?: ChatfaceMood }): ReactElement {
    const useAgent = agentType !== undefined && agentExpression !== undefined;
    const { windowWidth } = useWindowDimensions();
    const width = getFlexibilityFeedbackOrHintWidth(windowWidth, useAgent);

    return (
        <div className={`flexibility-popover ${useAgent ? "agent-popover" : ""}`} style={{ maxWidth: `${width}px` }}>
            {/* The character is rendered INSIDE the popover so it can be positioned relative to the
                dialog. As a sibling it could only use a fixed `left`, and because the dialog is
                horizontally centred in `.flexibility-view__contents` while its width is computed in
                JS, the two drifted apart by hundreds of pixels — or overlapped — depending purely on
                window width. */}
            {useAgent && <Agent mood={mood ?? moodForExpression(agentExpression)} />}
            <div className={`flexibility-popover__container ${useAgent ? "agent-popover__container" : ""}`}>{children}</div>
        </div>
    );
}

export function ClosableFlexibilityPopover({ children, setShowContent, agentType, agentExpression, mood }: { children: ReactElement; setShowContent: (value: React.SetStateAction<boolean>) => void; agentType?: AgentType; agentExpression?: AgentExpression; mood?: ChatfaceMood }): ReactElement {
    const useAgent = agentType !== undefined && agentExpression !== undefined;
    const { windowWidth } = useWindowDimensions();
    const width = getFlexibilityFeedbackOrHintWidth(windowWidth, useAgent);

    const contentRef = useRef<HTMLDivElement>(null);

    const handleClickOutside = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (event: any): void => {
            if (contentRef.current && !contentRef.current.contains(event.target)) {
                setShowContent(false);
            }
        },
        [setShowContent]
    );

    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [handleClickOutside]);

    return (
        <div className={`flexibility-popover ${useAgent ? "agent-popover" : ""}`} style={{ maxWidth: `${width}px` }} ref={contentRef}>
            {/* Inside the popover so it is positioned relative to the dialog — see FlexibilityPopover.
                A side effect: with an agent present, clicking the character no longer counts as
                clicking OUTSIDE and so will not dismiss the popover. That reads better than the
                character being a dead zone that closes the hint you are reading. */}
            {useAgent && <Agent mood={mood ?? moodForExpression(agentExpression)} />}
            <button className={"span-button primary-button hint-popover__button"} onClick={() => setShowContent(false)}>
                <FontAwesomeIcon icon={faXmark} />
            </button>
            <div className={`flexibility-popover__container ${useAgent ? "agent-popover__container" : ""}`}>{children}</div>
        </div>
    );
}
