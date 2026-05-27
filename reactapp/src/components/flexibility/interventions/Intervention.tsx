import { TranslationNamespaces } from "@/i18n.ts";
import { faThumbsDown, faThumbsUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { AgentExpression, AgentType } from "@/types/flexibility/enums.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { FlexibilityPopover } from "@components/flexibility/interventions/FlexibilityPopover.tsx";
import "@styles/shared/popover.scss";

export function Intervention({ children, handleYes, handleNo, agentType, agentExpression, additionalMessage }: { children: ReactElement; handleYes: () => void; handleNo: () => void; agentType?: AgentType; agentExpression?: AgentExpression; additionalMessage?: string }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.General);

    return (
        <FlexibilityPopover agentType={agentType} agentExpression={agentExpression}>
            <React.Fragment>
                {children}
                {additionalMessage !== undefined && <p>{additionalMessage}</p>}
                <div className={"flexibility-popover__choice-buttons"}>
                    <button className={"button primary-button"} onClick={handleYes}>
                        <FontAwesomeIcon icon={faThumbsUp} />
                        {t(GeneralTranslations.BUTTON_YES)}
                    </button>
                    <button className={"button primary-button"} onClick={handleNo}>
                        {t(GeneralTranslations.BUTTON_NO)}
                        <FontAwesomeIcon icon={faThumbsDown} />
                    </button>
                </div>
            </React.Fragment>
        </FlexibilityPopover>
    );
}
