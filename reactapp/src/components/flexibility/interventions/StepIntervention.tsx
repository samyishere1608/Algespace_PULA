import { TranslationNamespaces } from "@/i18n.ts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import React, { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { AgentExpression, AgentType } from "@/types/flexibility/enums.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { FlexibilityPopover } from "@components/flexibility/interventions/FlexibilityPopover.tsx";
import type { ChatfaceMood } from "@utils/chatfaceUtils.ts";
import "@styles/shared/popover.scss";

export function StepNextIntervention({
                                         children,
                                         handleNext,
                                         agentType,
                                         agentExpression,
                                         mood,
                                     }: {
    children: ReactElement;
    handleNext: () => void;
    agentType?: AgentType;
    agentExpression?: AgentExpression;

    /**
     * Overrides the face this prompt wears.
     *
     * Needed because "next step, press Continue" is not always the same kind of moment: when the
     * prompt repeats a question ("would you like to solve it yourself?") the companion should be
     * thinking, not congratulating.
     */
    mood?: ChatfaceMood;
}): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.General);

    // An explicit mood wins. Otherwise a caller that passes an expression still decides the face
    // through it (Smiling becomes approve, Thinking becomes question), and a caller that passes none
    // gets `approve` rather than no expression at all.
    const resolvedMood = mood ?? (agentExpression === undefined ? "approve" : undefined);

    return (
        <FlexibilityPopover agentType={agentType} agentExpression={agentExpression} mood={resolvedMood}>
            <React.Fragment>
                {children}
                <div className={"flexibility-popover__choice-buttons"}>
                    <button className={"button primary-button"} onClick={handleNext}>
                        {t(GeneralTranslations.BUTTON_CONTINUE)}
                        <FontAwesomeIcon icon={faArrowRight} />
                    </button>
                </div>
            </React.Fragment>
        </FlexibilityPopover>
    );
}
