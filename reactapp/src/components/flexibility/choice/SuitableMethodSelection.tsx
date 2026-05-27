import { TranslationNamespaces } from "@/i18n.ts";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { AgentExpression, AgentType, Method } from "@/types/flexibility/enums.ts";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { SingleChoice } from "@components/flexibility/choice/SingleChoice.tsx";
import { FlexibilityHint } from "@components/flexibility/interventions/FlexibilityHint.tsx";
import { LinearSystem } from "@components/math/procedural-knowledge/LinearSystem.tsx";

export function SuitableMethodSelection({ firstEquation, secondEquation, question, loadNextStep, agentType, trackHints }: { firstEquation: FlexibilityEquation; secondEquation: FlexibilityEquation; question: string; loadNextStep: (method: Method) => void; agentType?: AgentType, trackHints:() => void }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.Flexibility, TranslationNamespaces.General]);

    const [selectedOption, setSelectedOption] = useState<number | undefined>();

    return (
        <React.Fragment>
            <p>{t(FlexibilityTranslations.INTRO_SYSTEM)}</p>
            <LinearSystem firstEquation={firstEquation} secondEquation={secondEquation} />
            <div className={"method-selection"}>
                <p>{question}</p>
                <SingleChoice options={[t(FlexibilityTranslations.EQUALIZATION), t(FlexibilityTranslations.SUBSTITUTION), t(FlexibilityTranslations.ELIMINATION)]} selectedOption={selectedOption} setSelectedOption={setSelectedOption} disabled={false} optionClassname={"method-selection__option"} />
            </div>
            {selectedOption !== undefined && (
                <button className={"button primary-button"} onClick={handleChoice}>
                    {t(GeneralTranslations.BUTTON_CONTINUE, { ns: TranslationNamespaces.General })}
                    <FontAwesomeIcon icon={faArrowRight} />
                </button>
            )}
            <FlexibilityHint hints={[FlexibilityTranslations.SUITABLE_HINT]} agentType={agentType} agentExpression={AgentExpression.Neutral} disabled={false} trackHint={trackHints}/>
        </React.Fragment>
    );

    function handleChoice(): void {
        if (selectedOption === 0) {
            loadNextStep(Method.Equalization);
        } else if (selectedOption === 1) {
            loadNextStep(Method.Substitution);
        } else {
            loadNextStep(Method.Elimination);
        }
    }
}
