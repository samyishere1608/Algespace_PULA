import { ReactElement } from "react";
import { AgentExpression, AgentType, Method } from "@/types/flexibility/enums.ts";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { SubstitutionParameters } from "@/types/flexibility/substitutionParameters.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { FlexibilityEquation as FlexibilityEquationProps } from "@/types/math/linearEquation.ts";
import { ContinueMessage } from "@components/flexibility/interventions/ContinueMessage.tsx";
import { FlexibilityPopover } from "@components/flexibility/interventions/FlexibilityPopover.tsx";
import { SystemSolution } from "@components/flexibility/solution/SystemSolution.tsx";

export function EfficiencyExerciseEnd({
    method,
    initialSystem,
    transformedSystem,
    methodEquation,
    selectedEquation,
    firstSolutionVar,
    otherVariable,
    firstSolutionIsFirstVariable,
    loadNextStep,
    substitutionInfo,
    agentType
}: {
    method: Method;
    initialSystem: [FlexibilityEquationProps, FlexibilityEquationProps];
    transformedSystem?: [FlexibilityEquationProps, FlexibilityEquationProps];
    methodEquation: FlexibilityEquationProps;
    selectedEquation: FlexibilityEquationProps;
    firstSolutionVar: Variable;
    otherVariable: Variable;
    firstSolutionIsFirstVariable: boolean;
    loadNextStep: () => void;
    substitutionInfo?: SubstitutionParameters;
    agentType?: AgentType;
}): ReactElement {
    const popover: ReactElement = (
        <FlexibilityPopover agentType={agentType} agentExpression={AgentExpression.Smiling}>
            <ContinueMessage message={FlexibilityTranslations.SYSTEM_SOLUTION_SUCCESS_CONTINUE} loadNextStep={loadNextStep} />
        </FlexibilityPopover>
    );

    return <SystemSolution method={method} initialSystem={initialSystem} transformedSystem={transformedSystem} applicationEquation={methodEquation} selectedEquation={selectedEquation} firstSolutionVariable={firstSolutionVar} otherVariable={otherVariable} firstSolutionIsFirstVariable={firstSolutionIsFirstVariable} popover={popover} substitutionInfo={substitutionInfo} />;
}
