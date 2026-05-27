import { TranslationNamespaces } from "@/i18n.ts";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement } from "react";
import { Trans } from "react-i18next";
import { Method, SelectedEquation } from "@/types/flexibility/enums.ts";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { SubstitutionParameters } from "@/types/flexibility/substitutionParameters.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { FlexibilityEquation as FlexibilityEquationProps } from "@/types/math/linearEquation.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { VariableSolution } from "@components/flexibility/solution/VariableSolution.tsx";
import { FlexibilityEquation } from "@components/math/procedural-knowledge/FlexibilityEquation.tsx";
import { LinearSystemWithActions } from "@components/math/procedural-knowledge/LinearSystem.tsx";
import { DetermineSubstitutedEquation } from "@components/math/procedural-knowledge/SubstitutedEquation.tsx";
import EquivalenceSymbol from "@images/flexibility/equivalenceThin.svg";

export function EquationSelection({
    method,
    initialSystem,
    transformedSystem,
    methodEquation,
    firstSolutionVar,
    otherVariable,
    loadNextStep,
    substitutionInfo
}: {
    method: Method;
    initialSystem: [FlexibilityEquationProps, FlexibilityEquationProps];
    transformedSystem?: [FlexibilityEquationProps, FlexibilityEquationProps];
    methodEquation: FlexibilityEquationProps;
    firstSolutionVar: Variable;
    otherVariable: Variable;
    loadNextStep: (equation: SelectedEquation) => void;
    substitutionInfo?: SubstitutionParameters;
}): ReactElement {
    const transformationIntroduction: TranslationInterpolation = FlexibilityTranslations.getInstructionForSolvingSystemPast(method);
    const firstResult: TranslationInterpolation = FlexibilityTranslations.getFirstResultForEquationSelection(method);
    const instruction: TranslationInterpolation = FlexibilityTranslations.getInstructionForEquationSelection(firstSolutionVar.name, otherVariable.name);
    const buttonLabel: TranslationInterpolation = FlexibilityTranslations.getButtonLabelForEquationSelection(firstSolutionVar.name);

    return (
        <React.Fragment>
            <p>
                <Trans ns={TranslationNamespaces.Flexibility} i18nKey={transformationIntroduction.translationKey} values={transformationIntroduction.interpolationVariables as object} />
            </p>
            <SystemWithEquationSelection firstEquation={initialSystem[0]} secondEquation={initialSystem[1]} isInitialSystem={true} loadNextStep={loadNextStep} buttonLabel={buttonLabel} />
            {transformedSystem !== undefined && <SystemWithEquationSelection firstEquation={transformedSystem[0]} secondEquation={transformedSystem[1]} isInitialSystem={false} loadNextStep={loadNextStep} buttonLabel={buttonLabel} />}
            <p>
                <Trans ns={TranslationNamespaces.Flexibility} i18nKey={firstResult.translationKey} values={firstResult.interpolationVariables as object} />
            </p>
            <div className={"substitution-result-equation"}>
                {substitutionInfo !== undefined && substitutionInfo.equationInfo !== undefined && (
                    <div className={"substitution-result-equation"}>
                        <DetermineSubstitutedEquation initialSystem={initialSystem} transformedSystem={transformedSystem} substitutionInfo={substitutionInfo} />
                        <img style={{ width: "1.75rem", height: "auto", marginTop: "0.125rem" }} src={EquivalenceSymbol} alt={"equivalent"} />
                    </div>
                )}
                <FlexibilityEquation equation={methodEquation} classname={"flexibility-equation--light"} />
                <img src={EquivalenceSymbol} style={{ width: "1.75rem", height: "auto", marginTop: "0.125rem" }} alt={"equivalent"} />
                <VariableSolution variable={firstSolutionVar} />
            </div>
            <p>
                <Trans ns={TranslationNamespaces.Flexibility} i18nKey={instruction.translationKey} values={instruction.interpolationVariables as object} />
            </p>
        </React.Fragment>
    );
}

function SystemWithEquationSelection({ firstEquation, secondEquation, isInitialSystem, loadNextStep, buttonLabel }: { firstEquation: FlexibilityEquationProps; secondEquation: FlexibilityEquationProps; isInitialSystem: boolean; loadNextStep: (equation: SelectedEquation) => void; buttonLabel: TranslationInterpolation }) {
    const content: ReactElement = (
        <React.Fragment>
            <FontAwesomeIcon icon={faArrowLeft} />
            <Trans ns={TranslationNamespaces.Flexibility} i18nKey={buttonLabel.translationKey} values={buttonLabel.interpolationVariables as object} />
        </React.Fragment>
    );

    const firstAction: ReactElement = (
        <button className={"button transparent-button"} onClick={() => loadNextStep(isInitialSystem ? SelectedEquation.FirstInitial : SelectedEquation.FirstTransformed)}>
            {content}
        </button>
    );

    const secondAction: ReactElement = (
        <button className={"button transparent-button"} onClick={() => loadNextStep(isInitialSystem ? SelectedEquation.SecondInitial : SelectedEquation.SecondTransformed)}>
            {content}
        </button>
    );

    return (
        <div className={"system-transformation__transformable-system"} style={{ marginLeft: isInitialSystem ? "3.3rem" : 0 }}>
            {!isInitialSystem && <img src={EquivalenceSymbol} alt={"equivalent"} />}
            <LinearSystemWithActions firstEquation={firstEquation} secondEquation={secondEquation} firstAction={firstAction} secondAction={secondAction} />
        </div>
    );
}
