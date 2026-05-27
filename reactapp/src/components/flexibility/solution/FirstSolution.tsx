import { TranslationNamespaces } from "@/i18n.ts";
import React, { ReactElement } from "react";
import { Trans } from "react-i18next";
import {AgentCondition, AgentType, Method} from "@/types/flexibility/enums.ts";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { SubstitutionParameters } from "@/types/flexibility/substitutionParameters.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { FlexibilityEquation as FlexibilityEquationProps } from "@/types/math/linearEquation.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { VariableComputation } from "@components/flexibility/solution/VariableComputation.tsx";
import { TransformedSystem } from "@components/flexibility/system/TransformedSystem.tsx";
import { FlexibilityEquation } from "@components/math/procedural-knowledge/FlexibilityEquation.tsx";
import { DetermineSubstitutedEquation } from "@components/math/procedural-knowledge/SubstitutedEquation.tsx";
import EquivalenceSymbol from "@images/flexibility/equivalence.svg";

export function FirstSolution(
    {
        method,
        initialSystem,
        transformedSystem,
        methodEquation,
        variable,
        loadNextStep,
        substitutionInfo,
        agentType,
        additionalMessage,
        trackAction,
        trackError,
        trackChoice,
        trackType,
        trackInterventionChoice,
        condition,
        decideCalculationIntervention,
    }: {
        method: Method;
        initialSystem: [FlexibilityEquationProps, FlexibilityEquationProps];
        transformedSystem?: [FlexibilityEquationProps, FlexibilityEquationProps];
        methodEquation: FlexibilityEquationProps;
        variable: Variable;
        loadNextStep: () => void;
        substitutionInfo?: SubstitutionParameters;
        agentType?: AgentType;
        additionalMessage?: string;
        trackAction: (action: string) => void;
        trackError: () => void;
        trackChoice: (choice: string) => void;
        trackType: (type: number) => void;
        trackInterventionChoice: (choice: string) => void;
        condition: AgentCondition;
        decideCalculationIntervention: () => Promise<{ trigger: boolean; messageType: number }>;
    }
): ReactElement {
    const transformationIntroduction: TranslationInterpolation = FlexibilityTranslations.getInstructionForSolvingSystemPast(method);
    const equationInstruction: TranslationInterpolation = FlexibilityTranslations.getInstructionForFindingFirstSolution(method, transformedSystem !== undefined);

    return (
        <React.Fragment>
            <p>
                <Trans ns={TranslationNamespaces.Flexibility} i18nKey={transformationIntroduction.translationKey}
                       values={transformationIntroduction.interpolationVariables as object} />
            </p>
            <TransformedSystem initialSystem={initialSystem} transformedSystem={transformedSystem} />
            <p>
                <Trans ns={TranslationNamespaces.Flexibility} i18nKey={equationInstruction.translationKey}
                       values={equationInstruction.interpolationVariables as object} />
            </p>
            {substitutionInfo === undefined || substitutionInfo.equationInfo === undefined ? (
                <FlexibilityEquation equation={methodEquation} classname={"flexibility-equation--light"} />
            ) : (
                <div className={"substitution-result-equation"}>
                    <DetermineSubstitutedEquation initialSystem={initialSystem} transformedSystem={transformedSystem} substitutionInfo={substitutionInfo} />
                    <img style={{ width: "1.75rem", height: "auto", marginTop: "0.125rem" }} src={EquivalenceSymbol} alt={"equivalent"} />
                    <FlexibilityEquation equation={methodEquation} classname={"flexibility-equation--light"} />
                </div>
            )}
            <VariableComputation variable={variable} loadNextStep={loadNextStep} additionalMessage={additionalMessage} agentType={agentType}
                                 trackAction={trackAction} trackError={trackError} trackChoice={trackChoice} trackType={trackType} trackInterventionChoice={trackInterventionChoice} condition={condition} decideCalculationIntervention={decideCalculationIntervention}/>
        </React.Fragment>
    );
}
