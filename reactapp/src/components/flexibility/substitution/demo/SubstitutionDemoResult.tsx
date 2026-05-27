import { TranslationNamespaces } from "@/i18n.ts";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { SubstitutionResultParameters } from "@/types/flexibility/substitutionParameters.ts";
import { FlexibilityEquation as FlexibilityEquationProps } from "@/types/math/linearEquation.ts";
import { getSubstitutionErrorMessage } from "@utils/substitutionUtils.ts";
import { SubstitutionResultEquations } from "@components/flexibility/substitution/SubstitutionResultEquations.tsx";

export function SubstitutionDemoResult(
    {
        system,
        substitutionParams,
        setSubstitutionParams
    }: {
        system: [FlexibilityEquationProps, FlexibilityEquationProps];
        substitutionParams: SubstitutionResultParameters;
        setSubstitutionParams: (value: React.SetStateAction<SubstitutionResultParameters | undefined>) => void;
    }
): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.Flexibility, TranslationNamespaces.General]);

    const containsFraction: boolean = substitutionParams.substitutionItems.some((term) => term.coefficient.d !== 1);

    return (
        <React.Fragment>
            <SubstitutionResultEquations system={system} substitutionParams={substitutionParams} containsFraction={containsFraction} />
            {(!substitutionParams.isValid && substitutionParams.error !== undefined) &&
                <p>{t(getSubstitutionErrorMessage(substitutionParams.error))} {t(FlexibilityTranslations.TRY_AGAIN)}</p>
            }
            {substitutionParams.isValid && <p>{t(FlexibilityTranslations.SUBSTITUTION_DEMO_SOL)}</p>}
            <button className={"button primary-button"} onClick={() => setSubstitutionParams(undefined)}>
                <FontAwesomeIcon icon={faArrowLeft} />
                {t(FlexibilityTranslations.DEMO_TRY_AGAIN)}
            </button>
        </React.Fragment>
    );
}