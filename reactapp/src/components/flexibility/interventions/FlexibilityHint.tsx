import { TranslationNamespaces } from "@/i18n.ts";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { AgentExpression, AgentType } from "@/types/flexibility/enums.ts";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { Agent } from "@components/flexibility/interventions/Agent.tsx";
import useWindowDimensions from "@hooks/useWindowDimensions.ts";
import { getActiveBuddyAvatarSrc, getActiveBuddyName } from "@utils/buddyUtils.ts";
import { getFlexibilityFeedbackOrHintWidth } from "@utils/utils.ts";
import "@styles/shared/popover.scss";

export function FlexibilityHint({ hints, disabled, agentType, agentExpression, trackHint }: { hints: string[]; disabled: boolean; agentType?: AgentType; agentExpression?: AgentExpression, trackHint?: () => void }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Flexibility);
    const { windowWidth } = useWindowDimensions();
    const { student } = useAuth();
    const useAgent = agentType !== undefined && agentExpression !== undefined;

    // The button wears the companion's own portrait, so it is obvious at a glance who is about to
    // answer, and the label says what pressing it does. Same face as the popover will show, because
    // both read it from the same resolver.
    const studentId = student?.id ?? "guest";
    const buddyName = getActiveBuddyName(studentId);
    const buddyAvatarSrc = getActiveBuddyAvatarSrc(studentId);

    const [open, setOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        setCurrentIndex(0);
    }, [hints]); // If hints change, reset count

    const hintButtonRef = useRef<HTMLButtonElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const getNextHint = useCallback((): void => {
        if(trackHint != undefined)
            trackHint();
        if (currentIndex < hints.length - 1) {
            setCurrentIndex((previousHint: number) => previousHint + 1);
        } else if (hints.length !== 1) {
            setCurrentIndex(0);
        }
    }, [currentIndex, hints.length, trackHint]);

    const handleClickOutside = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (event: any): void => {
            if (hintButtonRef.current && !hintButtonRef.current.contains(event.target) && contentRef.current && !contentRef.current.contains(event.target)) {
                setOpen(!open);
                getNextHint();
            }
        },
        [getNextHint, open]
    );

    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [handleClickOutside]);

    const width = useMemo(() => getFlexibilityFeedbackOrHintWidth(windowWidth, useAgent), [useAgent, windowWidth]);

    return (
        <React.Fragment>
            {open && (
                <div className={`flexibility-popover ${useAgent ? "agent-popover" : ""}`} style={{ maxWidth: `${width}px` }} ref={contentRef}>
                    {/* Inside the popover so it is positioned relative to the dialog — see FlexibilityPopover.tsx.
                        As a sibling it could only use a fixed `left`, which left the character overlapping the
                        dialog at some window widths and hundreds of pixels away from it at others. */}
                    {useAgent && <Agent />}
                    <button className={"span-button primary-button hint-popover__button"} onClick={handleClick}>
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                    <div className={`hint-popover__container ${useAgent ? "agent-popover__container" : ""}`}>
                        <p>{t(hints[currentIndex])}</p>
                    </div>
                </div>
            )}
            <button className={"button primary-button help-button flexibility-hint-button"} onClick={handleClick} ref={hintButtonRef} disabled={disabled}>
                <span className={"flexibility-hint-button__avatar"} aria-hidden={true}>
                    <img src={buddyAvatarSrc} alt={""} />
                </span>
                <span className={"flexibility-hint-button__label"}>{t(FlexibilityTranslations.HINT_BUTTON_ASK, { buddy: buddyName })}</span>
            </button>
        </React.Fragment>
    );

    function handleClick(): void {
        if (open) {
            getNextHint();
        }
        setOpen(!open);
    }
}
