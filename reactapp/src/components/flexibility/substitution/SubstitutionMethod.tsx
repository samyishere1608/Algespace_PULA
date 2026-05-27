import { TranslationNamespaces } from "@/i18n.ts";
import React, { ReactElement, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { AgentExpression, AgentType, IsolatedIn, Method } from "@/types/flexibility/enums.ts";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { SubstitutionParameters, SubstitutionResultParameters } from "@/types/flexibility/substitutionParameters.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { FlexibilityHint } from "@components/flexibility/interventions/FlexibilityHint.tsx";
import { SubstitutionApplication } from "@components/flexibility/substitution/SubstitutionApplication.tsx";
import { SubstitutionResult } from "@components/flexibility/substitution/SubstitutionResult.tsx";
import { TransformedSystem } from "@components/flexibility/system/TransformedSystem.tsx";
import { SubstitutionSampleSolution } from "@components/flexibility/substitution/SubstitutionSampleSolution.tsx";

export function SubstitutionMethod({
                                       initialSystem,
                                       transformedSystem,
                                       firstVariable,
                                       secondVariable,
                                       isolatedVariables,
                                       loadNextStep,
                                       agentType,
                                       trackAction,
                                       trackError,
                                       trackHints,
                                       isTip = false
                                   }: {
    initialSystem: [FlexibilityEquation, FlexibilityEquation];
    transformedSystem?: [FlexibilityEquation, FlexibilityEquation];
    firstVariable: Variable;
    secondVariable: Variable;
    isolatedVariables: [IsolatedIn, IsolatedIn];
    loadNextStep: (equation: FlexibilityEquation, containsFirst: boolean, params?: SubstitutionParameters) => void;
    agentType?: AgentType;
    trackAction: (action: string) => void;
    trackError: () => void;
    trackHints: () => void;
    isTip?: boolean;
}): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Flexibility);

    const transformationIntroduction: TranslationInterpolation = FlexibilityTranslations.getInstructionForSolvingSystem(Method.Substitution);

    return (
        <React.Fragment>
            <p>
                <Trans ns={TranslationNamespaces.Flexibility} i18nKey={transformationIntroduction.translationKey}
                       values={transformationIntroduction.interpolationVariables as object} />
            </p>
            <TransformedSystem initialSystem={initialSystem} transformedSystem={transformedSystem} />
            <p>{t(FlexibilityTranslations.SUBSTITUTION_INSTR)}</p>
            <MethodApplication system={transformedSystem !== undefined ? transformedSystem : initialSystem} firstVariable={firstVariable} secondVariable={secondVariable}
                               isolatedVariables={isolatedVariables} loadNextStep={loadNextStep} agentType={agentType} trackAction={trackAction}
                               trackError={trackError} isTip={isTip} trackHints={trackHints}/>
        </React.Fragment>
    );
}

function MethodApplication({ system, firstVariable, secondVariable, isolatedVariables, loadNextStep, agentType, trackAction, trackError, trackHints, isTip }: {
    system: [FlexibilityEquation, FlexibilityEquation];
    firstVariable: Variable;
    secondVariable: Variable;
    isolatedVariables: [IsolatedIn, IsolatedIn];
    loadNextStep: (equation: FlexibilityEquation, containsFirst: boolean, params?: SubstitutionParameters) => void;
    agentType?: AgentType;
    trackAction: (action: string) => void;
    trackError: () => void;
    trackHints: () => void;
    isTip: boolean;
}): ReactElement {
    const [substitutionParams, setSubstitutionParams] = useState<SubstitutionResultParameters>();
    const [attempts, setAttempts] = useState<number>(0);
    const [showSampleSolution, setShowSampleSolution] = useState<boolean>(false);

    let content: ReactElement;
    if (showSampleSolution) {
        content = <SubstitutionSampleSolution system={system} firstVariable={firstVariable} secondVariable={secondVariable} isolatedVariables={isolatedVariables}
                                              loadNextStep={loadNextStep} agentType={agentType} isTip={isTip} />;
    } else if (substitutionParams !== undefined) {
        content =
            <SubstitutionResult system={system} firstVariable={firstVariable} substitutionParams={substitutionParams} setSubstitutionParams={setSubstitutionParams}
                                attempts={attempts} setShowSampleSolution={setShowSampleSolution} loadNextStep={loadNextStep} trackAction={trackAction}
                                agentType={agentType} isTip={isTip} />;

    } else {
        content =
            <SubstitutionApplication system={system} firstVariable={firstVariable} isolatedVariables={isolatedVariables} setSubstitutionParams={setSubstitutionParams}
                                     setAttempts={setAttempts} trackAction={trackAction} trackError={trackError} isTip={isTip} />;
    }

    return (
        <React.Fragment>
            {content}
            <FlexibilityHint hints={[FlexibilityTranslations.SUBSTITUTION_HINT_1, FlexibilityTranslations.SUBSTITUTION_HINT_2]}
                             disabled={substitutionParams !== undefined} agentType={agentType}
                             agentExpression={AgentExpression.Neutral} trackHint={trackHints} />
        </React.Fragment>
    );
}
