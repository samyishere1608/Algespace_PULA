import { TranslationNamespaces } from "@/i18n.ts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import React, { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { AgentExpression, AgentType } from "@/types/flexibility/enums.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { FlexibilityPopover } from "@components/flexibility/interventions/FlexibilityPopover.tsx";
import "@styles/shared/popover.scss";

export function StepNextIntervention({
                                         children,
                                         handleNext,
                                         agentType,
                                         agentExpression,
                                     }: {
    children: ReactElement;
    handleNext: () => void;
    agentType?: AgentType;
    agentExpression?: AgentExpression;
}): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.General);

    return (
        <FlexibilityPopover agentType={agentType} agentExpression={agentExpression}>
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
