import { ReactElement, useState } from "react";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { Variable } from "@/types/flexibility/variable.ts";
import { IsolatedIn } from "@/types/flexibility/enums.ts";
import { SubstitutionResultParameters } from "@/types/flexibility/substitutionParameters.ts";
import { SubstitutionDemoApplication } from "@components/flexibility/substitution/demo/SubstitutionDemoApplication.tsx";
import { SubstitutionDemoResult } from "@components/flexibility/substitution/demo/SubstitutionDemoResult.tsx";

export function SubstitutionDemo({ system, firstVariable, isolatedVariables }: {
    system: [FlexibilityEquation, FlexibilityEquation];
    firstVariable: Variable;
    isolatedVariables: [IsolatedIn, IsolatedIn];
}): ReactElement {
    const [substitutionParams, setSubstitutionParams] = useState<SubstitutionResultParameters>();

    let content: ReactElement;
    if (substitutionParams !== undefined) {
        content =
            <SubstitutionDemoResult system={system} substitutionParams={substitutionParams} setSubstitutionParams={setSubstitutionParams} />;

    } else {
        content =
            <SubstitutionDemoApplication system={system} firstVariable={firstVariable} isolatedVariables={isolatedVariables}
                                         setSubstitutionParams={setSubstitutionParams} />;
    }

    return content;
}