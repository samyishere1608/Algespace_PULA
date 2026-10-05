import { TranslationNamespaces } from "@/i18n.ts";
import { faThumbsDown, faThumbsUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { AgentExpression, AgentType } from "@/types/flexibility/enums.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { usePendingNudge } from "@/contexts/nudgeContext.ts";
import { NUDGE_ASK_KEY } from "@utils/nudges.ts";
import { FlexibilityPopover } from "@components/flexibility/interventions/FlexibilityPopover.tsx";
import "@styles/shared/popover.scss";
import "@styles/shared/nudge.scss";

/**
 * A yes/no question from the agent, and the one place a decline can be turned back into a retry.
 *
 * When `reconsider` is given, "no" does not take effect straight away. The decline is offered back
 * to the student once (see `NudgeProvider`), and `handleNo` is then told what they decided. The offer
 * is not drawn as a dialog of its own: it replaces this one's body, so the question the student is
 * already reading becomes the offer. One card, one place, different text — which is what the
 * interaction actually is. A second card at the same anchor only reads as a glitch.
 */
export function Intervention({ children, handleYes, handleNo, agentType, agentExpression, additionalMessage, reconsider }: {
    children: ReactElement;
    handleYes: () => void;
    /**
     * `engaged` is true when a reconsidered decline became a retry, and false when it stood. Dialogs
     * that never reconsider simply ignore it, which their `() => void` handlers already do.
     */
    handleNo: (engaged: boolean) => void;
    agentType?: AgentType;
    agentExpression?: AgentExpression;
    additionalMessage?: string;
    /**
     * Runs before the decline takes effect, and resolves true when the student took the offer —
     * meaning the caller should run the path they originally declined. Absent when there is nothing
     * that can be offered, and "no" is then immediate.
     */
    reconsider?: () => Promise<boolean>;
}): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.General);
    const { t: tStudent } = useTranslation(TranslationNamespaces.Student);

    const nudge = usePendingNudge();
    const [asking, setAsking] = useState(false);

    function onNo(): void {
        if (reconsider === undefined) {
            handleNo(false);
            return;
        }

        // Guarded because reading the profile takes a moment: without this a second click would ask
        // again, and whichever answer landed last would be the one that counted.
        if (asking) return;

        setAsking(true);

        const settle = (engaged: boolean): void => {
            setAsking(false);
            handleNo(engaged);
        };

        reconsider().then(settle, () => settle(false));
    }

    // `asking` alone is not enough to justify the swap: it is true from the click, while the offer
    // only exists once the profile has been read. Until then this is still the question.
    const offer = asking ? nudge : null;

    // While the offer is up it is the only thing on screen, footnote included — leaving the original
    // text underneath would be the two-card problem again, just inside one box.
    const message = offer !== null ? tStudent("nudge-footnote") : additionalMessage;

    return (
        <FlexibilityPopover
            agentType={offer?.agentType ?? agentType}
            agentExpression={offer !== null ? AgentExpression.Smiling : agentExpression}
        >
            <React.Fragment>
                {offer !== null ? (
                    <div className={"nudge__body"}>
                        <p className={"nudge__label"}>{tStudent(offer.labelKey)}</p>
                        <p className={"nudge__ask"}>{tStudent(NUDGE_ASK_KEY)}</p>
                        <p className={"nudge__benefit"}>{tStudent(offer.benefitKey)}</p>
                        <p className={"nudge__evidence"}>
                            {tStudent("nudge-evidence", { opportunities: offer.opportunities, engaged: offer.engaged })}
                        </p>
                    </div>
                ) : children}
                {message !== undefined && <p>{message}</p>}
                <div className={"flexibility-popover__choice-buttons"}>
                    <button className={"button primary-button"} onClick={offer !== null ? () => offer.answer("Accepted") : handleYes}>
                        <FontAwesomeIcon icon={faThumbsUp} />
                        {t(GeneralTranslations.BUTTON_YES)}
                    </button>
                    <button className={"button primary-button"} onClick={offer !== null ? () => offer.answer("Declined") : onNo}>
                        {t(GeneralTranslations.BUTTON_NO)}
                        <FontAwesomeIcon icon={faThumbsDown} />
                    </button>
                </div>
            </React.Fragment>
        </FlexibilityPopover>
    );
}
