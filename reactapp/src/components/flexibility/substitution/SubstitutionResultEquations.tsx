import { FlexibilityEquation as FlexibilityEquationProps } from "@/types/math/linearEquation.ts";
import { SubstitutionResultParameters } from "@/types/flexibility/substitutionParameters.ts";
import React, { ReactElement } from "react";
import { SubstitutedEquation } from "@components/math/procedural-knowledge/SubstitutedEquation.tsx";
import { FlexibilityEquation } from "@components/math/procedural-knowledge/FlexibilityEquation.tsx";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import EquivalenceSymbol from "@images/flexibility/equivalenceDarkThin.svg";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";

export function SubstitutionResultEquations({ system, substitutionParams, containsFraction }: {
    system: [FlexibilityEquationProps, FlexibilityEquationProps];
    substitutionParams: SubstitutionResultParameters;
    containsFraction: boolean
}): ReactElement {
    return <div className={"substitution-result"}>
        <div className={"substitution-application__numbers"}>
            <p>1.</p>
            <p>2.</p>
        </div>
        <div className={"substitution-application__system"}>
            {substitutionParams.isFirstEquation ?
                <SubstitutedEquation initialEquation={system[0]} substitutionParams={substitutionParams} containsFraction={containsFraction}
                                     classname={substitutionParams.isValid ? "flexibility-equation--green" : "flexibility-equation--red"} /> :
                <FlexibilityEquation equation={system[0]} />}
            {!substitutionParams.isFirstEquation ?
                <SubstitutedEquation initialEquation={system[1]} substitutionParams={substitutionParams} containsFraction={containsFraction}
                                     classname={substitutionParams.isValid ? "flexibility-equation--green" : "flexibility-equation--red"} /> :
                <FlexibilityEquation equation={system[1]} />}
        </div>
    </div>;
}

export function EquivalentSubstitutionEquations({ system, substitutionParams, containsFraction, substitutionResult }: {
    system: [FlexibilityEquationProps, FlexibilityEquationProps];
    substitutionParams: SubstitutionResultParameters;
    containsFraction: boolean;
    substitutionResult: FlexibilityEquationProps
}): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Flexibility);

    return <React.Fragment>
        <p>{t(FlexibilityTranslations.SUBSTITUTION_PARENTHESIS)}</p>
        <div className={"substitution-result-equation"}>
            {substitutionParams.isFirstEquation ? (
                <SubstitutedEquation initialEquation={system[0]} substitutionParams={substitutionParams} containsFraction={containsFraction}
                                     classname={"flexibility-equation--dark"} colour={"dark"} />
            ) : (
                <SubstitutedEquation initialEquation={system[1]} substitutionParams={substitutionParams} containsFraction={containsFraction}
                                     classname={"flexibility-equation--dark"} colour={"dark"} />
            )}
            <img style={{ width: "1.75rem", height: "auto", marginTop: "0.125rem" }} src={EquivalenceSymbol} alt={"equivalent"} />
            <FlexibilityEquation equation={substitutionResult} classname={"flexibility-equation--dark"} colour={"dark"} />
        </div>
    </React.Fragment>;
}