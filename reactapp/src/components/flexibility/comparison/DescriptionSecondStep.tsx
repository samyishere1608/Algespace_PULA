import { TranslationNamespaces } from "@/i18n.ts";
import { ReactElement } from "react";
import { Trans } from "react-i18next";
import { EliminationParameters } from "@/types/flexibility/eliminationParameters.ts";
import { IsolatedIn, Method } from "@/types/flexibility/enums.ts";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { SubstitutionParameters } from "@/types/flexibility/substitutionParameters.ts";
import { FlexibilityEquation as FlexibilityEquationProps } from "@/types/math/linearEquation.ts";
import { GameError, GameErrorType } from "@/types/shared/error.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";

export function DescriptionSecondStep({ method, variable, transformationInfo, transformedSystem, substitutionInfo, eliminationInfo }: {
    method: Method;
    variable: string;
    transformationInfo: [IsolatedIn, IsolatedIn];
    transformedSystem?: [FlexibilityEquationProps, FlexibilityEquationProps];
    substitutionInfo?: SubstitutionParameters;
    eliminationInfo?: EliminationParameters
}): ReactElement {
    let description: TranslationInterpolation;

    switch (method) {
        case Method.Equalization: {
            description = FlexibilityTranslations.getEqualizationDescriptionForStep2(variable);
            break;
        }

        case Method.Substitution: {
            if (substitutionInfo === undefined) {
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }
            const equation1IsFirst = !substitutionInfo.isFirstEquation;
            const equation1IsTransformed = transformedSystem !== undefined && transformationInfo[equation1IsFirst ? 0 : 1] !== IsolatedIn.None;
            const equation2IsTransformed = transformedSystem !== undefined && transformationInfo[equation1IsFirst ? 1 : 0] !== IsolatedIn.None;
            description = FlexibilityTranslations.getSubstitutionDescriptionForStep2(equation1IsFirst, equation1IsTransformed, equation2IsTransformed, substitutionInfo.variable as string, variable);
            break;
        }

        case Method.Elimination: {
            if (eliminationInfo === undefined) {
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }
            if (eliminationInfo.isAddition) {
                description = FlexibilityTranslations.getEliminationWithAdditionDescriptionForStep2(variable);
            } else {
                description = FlexibilityTranslations.getEliminationWithSubtractionDescriptionForStep2(eliminationInfo.switchedEquations, variable);
            }
        }
    }

    return (
        <p>
            <Trans ns={TranslationNamespaces.Flexibility} i18nKey={description.translationKey} values={description.interpolationVariables as object} />
        </p>
    );
}
