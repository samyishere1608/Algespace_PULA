import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, useCallback, useEffect, useRef } from "react";
import { AgentExpression, AgentType } from "@/types/flexibility/enums.ts";
import { Agent } from "@components/flexibility/interventions/Agent.tsx";
import useWindowDimensions from "@hooks/useWindowDimensions.ts";
import { getFlexibilityFeedbackOrHintWidth } from "@utils/utils.ts";

export function FlexibilityPopover({ children, agentType, agentExpression }: { children: ReactElement; agentType?: AgentType; agentExpression?: AgentExpression }): ReactElement {
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
            {useAgent && <Agent />}
            <div className={`flexibility-popover__container ${useAgent ? "agent-popover__container" : ""}`}>{children}</div>
        </div>
    );
}

export function ClosableFlexibilityPopover({ children, setShowContent, agentType, agentExpression }: { children: ReactElement; setShowContent: (value: React.SetStateAction<boolean>) => void; agentType?: AgentType; agentExpression?: AgentExpression }): ReactElement {
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
            {useAgent && <Agent />}
            <button className={"span-button primary-button hint-popover__button"} onClick={() => setShowContent(false)}>
                <FontAwesomeIcon icon={faXmark} />
            </button>
            <div className={`flexibility-popover__container ${useAgent ? "agent-popover__container" : ""}`}>{children}</div>
        </div>
    );
}
