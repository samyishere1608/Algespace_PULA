import { TranslationNamespaces } from "@/i18n.ts";
import React, { ReactElement } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Method } from "@/types/flexibility/enums.ts";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { SubstitutionParameters } from "@/types/flexibility/substitutionParameters.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { FlexibilityEquation as FlexibilityEquationProps } from "@/types/math/linearEquation.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { SolutionPoint } from "@components/flexibility/solution/SolutionPoint.tsx";
import { VariableSolution } from "@components/flexibility/solution/VariableSolution.tsx";
import { TransformedSystem } from "@components/flexibility/system/TransformedSystem.tsx";
import { BackSubstitutionEquation } from "@components/math/procedural-knowledge/BackSubstitutionEquation.tsx";
import { FlexibilityEquation } from "@components/math/procedural-knowledge/FlexibilityEquation.tsx";
import { DetermineSubstitutedEquation } from "@components/math/procedural-knowledge/SubstitutedEquation.tsx";
import EquivalenceSymbol from "@images/flexibility/equivalenceThin.svg";

export function SystemSolution({
    method,
    initialSystem,
    transformedSystem,
    applicationEquation,
    selectedEquation,
    firstSolutionVariable,
    otherVariable,
    firstSolutionIsFirstVariable,
    popover,
    substitutionInfo
}: {
    method: Method;
    initialSystem: [FlexibilityEquationProps, FlexibilityEquationProps];
    transformedSystem?: [FlexibilityEquationProps, FlexibilityEquationProps];
    applicationEquation: FlexibilityEquationProps;
    selectedEquation: FlexibilityEquationProps;
    firstSolutionVariable: Variable;
    otherVariable: Variable;
    firstSolutionIsFirstVariable: boolean;
    popover: ReactElement;
    substitutionInfo?: SubstitutionParameters;
}): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.Flexibility, TranslationNamespaces.General]);

    const transformationIntroduction: TranslationInterpolation = FlexibilityTranslations.getInstructionForSolvingSystemPast(method);
    const firstResult: TranslationInterpolation = FlexibilityTranslations.getFirstResultForEquationSelection(method);
    const secondResult: TranslationInterpolation = FlexibilityTranslations.getInstructionForSecondSolutionResult(firstSolutionVariable.name, otherVariable.name);

    return (
        <React.Fragment>
            <p>
                <Trans ns={TranslationNamespaces.Flexibility} i18nKey={transformationIntroduction.translationKey} values={transformationIntroduction.interpolationVariables as object} />
            </p>
            <TransformedSystem initialSystem={initialSystem} transformedSystem={transformedSystem} initialSystemStyle={{ border: "2px solid var(--green-text)", borderRadius: "1rem" }} />
            <p>
                <Trans ns={TranslationNamespaces.Flexibility} i18nKey={firstResult.translationKey} values={firstResult.interpolationVariables as object} />
            </p>
            <div className={"substitution-result-equation"}>
                {substitutionInfo !== undefined && substitutionInfo.equationInfo !== undefined && (
                    <React.Fragment>
                        <DetermineSubstitutedEquation initialSystem={initialSystem} transformedSystem={transformedSystem} substitutionInfo={substitutionInfo} />
                        <img style={{ width: "1.75rem", height: "auto", marginTop: "0.125rem" }} src={EquivalenceSymbol} alt={"equivalent"} />
                    </React.Fragment>
                )}
                <FlexibilityEquation equation={applicationEquation} classname={"flexibility-equation--light"} />
                <img src={EquivalenceSymbol} style={{ width: "1.75rem", height: "auto", marginTop: "0.125rem" }} alt={"equivalent"} />
                <VariableSolution variable={firstSolutionVariable} />
            </div>
            <p>
                <Trans ns={TranslationNamespaces.Flexibility} i18nKey={secondResult.translationKey} values={secondResult.interpolationVariables as object} />
            </p>
            <div className={"substitution-result-equation"}>
                <FlexibilityEquation equation={selectedEquation} classname={"flexibility-equation--light"} />
                <img src={EquivalenceSymbol} style={{ width: "1.75rem", height: "auto", marginTop: "0.125rem" }} alt={"equivalent"} />
                <BackSubstitutionEquation initialEquation={selectedEquation} variable={firstSolutionVariable} />
                <img style={{ width: "1.75rem", height: "auto", marginTop: "0.125rem" }} src={EquivalenceSymbol} alt={"equivalent"} />
                <VariableSolution variable={otherVariable} />
            </div>
            <p>{t(FlexibilityTranslations.SYSTEM_RESULT)}</p>
            <SolutionPoint firstFactor={firstSolutionIsFirstVariable ? firstSolutionVariable.value : otherVariable.value} secondFactor={firstSolutionIsFirstVariable ? otherVariable.value : firstSolutionVariable.value} />
            {popover}
        </React.Fragment>
    );
}
