import { TranslationNamespaces } from "@/i18n.ts";
import React, { ReactElement, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { AgentExpression, AgentType, ComparisonChoice, Method } from "@/types/flexibility/enums.ts";
import { FlexibilityTranslations, getMethodTranslation } from "@/types/flexibility/flexibilityTranslations.ts";
import { FlexibilityEquation as FlexibilityEquationProps } from "@/types/math/linearEquation.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { ContinueMessage } from "@components/flexibility/interventions/ContinueMessage.tsx";
import { FlexibilityPopover } from "@components/flexibility/interventions/FlexibilityPopover.tsx";
import { LinearSystem } from "@components/math/procedural-knowledge/LinearSystem.tsx";

export function ResolveConclusion({ initialSystem, firstMethod, secondMethod, loadNextStep, agentType, endTrackingPhase }: {
    initialSystem: [FlexibilityEquationProps, FlexibilityEquationProps];
    firstMethod: Method;
    secondMethod: Method;
    loadNextStep: () => void;
    agentType?: AgentType;
    endTrackingPhase: (choice?: string) => void;
}): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Flexibility);

    const conclusion: TranslationInterpolation = useMemo(() => FlexibilityTranslations.getResolvingConclusion(firstMethod, secondMethod), [firstMethod, secondMethod]);
    const firstMethodName: string = useMemo(() => getMethodTranslation(firstMethod), [firstMethod]);
    const secondMethodName: string = useMemo(() => getMethodTranslation(secondMethod), [secondMethod]);

    const [choice, setChoice] = useState<ComparisonChoice | undefined>(undefined);

    return (
        <React.Fragment>
            <p>{t(FlexibilityTranslations.COMPARISON_SYSTEM_INTRO)}</p>
            <LinearSystem firstEquation={initialSystem[0]} secondEquation={initialSystem[1]} />
            <p>
                <Trans ns={TranslationNamespaces.Flexibility} i18nKey={conclusion.translationKey} values={conclusion.interpolationVariables as object} />
            </p>
            <div className={"flexibility-popover__choice-buttons"}>
                <button className={"button primary-button"} onClick={() => {
                    endTrackingPhase(`chose INITIAL method ${Method[firstMethod]}`)
                    setChoice(ComparisonChoice.First);
                }} style={{ textTransform: "capitalize" }}
                        disabled={choice !== undefined}>
                    {t(firstMethodName)}
                </button>
                <button className={"button primary-button"} onClick={() => {
                    endTrackingPhase(`chose RESOLVE method ${Method[secondMethod]}`)
                    setChoice(ComparisonChoice.Second);
                }} style={{ textTransform: "capitalize" }}
                        disabled={choice !== undefined}>
                    {t(secondMethodName)}
                </button>
            </div>
            {choice !== undefined && (
                <FlexibilityPopover agentType={agentType} agentExpression={AgentExpression.Smiling}>
                    <ContinueMessage
                        message={choice === ComparisonChoice.First ? FlexibilityTranslations.RESOLVING_REPLY_DISAGREE : FlexibilityTranslations.RESOLVING_REPLY_AGREE}
                        loadNextStep={loadNextStep} />
                </FlexibilityPopover>
            )}
        </React.Fragment>
    );
}
