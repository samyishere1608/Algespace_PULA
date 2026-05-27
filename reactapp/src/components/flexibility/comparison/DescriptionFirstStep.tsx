import { TranslationNamespaces } from "@/i18n.ts";
import { Fraction } from "mathjs";
import React, { ReactElement } from "react";
import { Trans, useTranslation } from "react-i18next";
import { EliminationParameters } from "@/types/flexibility/eliminationParameters.ts";
import { Case, IsolatedIn } from "@/types/flexibility/enums.ts";
import { FlexibilityTranslations } from "@/types/flexibility/flexibilityTranslations.ts";
import { FlexibilityEquation as FlexibilityEquationProps } from "@/types/math/linearEquation.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";

export function DescriptionFirstStep({ firstVariable, secondVariable, transformationInfo, transformedSystem, eliminationInfo }: {
    firstVariable: string;
    secondVariable: string;
    transformationInfo: [IsolatedIn, IsolatedIn];
    transformedSystem?: [FlexibilityEquationProps, FlexibilityEquationProps];
    eliminationInfo?: EliminationParameters
}): ReactElement | undefined {
    if (transformedSystem === undefined) {
        return undefined;
    }

    switch (transformationInfo[0]) {
        case IsolatedIn.None: {
            switch (transformationInfo[1]) {
                case IsolatedIn.None: {
                    return undefined;
                }
                case IsolatedIn.First: {
                    return (
                        <p>
                            <TransformationDescription description={FlexibilityTranslations.getTransformationDescription1(firstVariable, Case.Second)} />
                        </p>
                    );
                }
                case IsolatedIn.Second: {
                    return (
                        <p>
                            <TransformationDescription description={FlexibilityTranslations.getTransformationDescription1(secondVariable, Case.Second)} />
                        </p>
                    );
                }
                case IsolatedIn.Elimination: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <MultiplicationDescriptionForElimination isFirstEquation={false} factor={eliminationInfo.secondFactor} />
                            </p>
                        );
                    }
                    return undefined;
                }
                case IsolatedIn.EliminationFirst: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <TransformationDescriptionForElimination isFirstEquation={false} factor={eliminationInfo.secondFactor} variable={firstVariable} />
                            </p>
                        );
                    }
                    return undefined;
                }
                case IsolatedIn.EliminationSecond: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <TransformationDescriptionForElimination isFirstEquation={false} factor={eliminationInfo.secondFactor} variable={secondVariable} />
                            </p>
                        );
                    }
                    return undefined;
                }
            }
            break;
        }
        case IsolatedIn.First: {
            switch (transformationInfo[1]) {
                case IsolatedIn.None: {
                    return (
                        <p>
                            <TransformationDescription description={FlexibilityTranslations.getTransformationDescription1(firstVariable, Case.First)} />
                        </p>
                    );
                }
                case IsolatedIn.First: {
                    return (
                        <p>
                            <TransformationDescription description={FlexibilityTranslations.getTransformationDescription1(firstVariable, Case.Four)} />
                        </p>
                    );
                }
                case IsolatedIn.Second: {
                    return (
                        <p>
                            <TransformationDescription description={FlexibilityTranslations.getTransformationDescription2(firstVariable, secondVariable)} />
                        </p>
                    );
                }
                case IsolatedIn.Elimination: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <TransformationDescription description={FlexibilityTranslations.getTransformationDescription1(firstVariable, Case.First)} />
                                <MultiplicationDescriptionForElimination isFirstEquation={false} factor={eliminationInfo.secondFactor} />
                            </p>
                        );
                    }
                    return undefined;
                }
                case IsolatedIn.EliminationFirst: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <TransformationDescription description={FlexibilityTranslations.getTransformationDescription1(firstVariable, Case.First)} />
                                <TransformationDescriptionForElimination isFirstEquation={false} factor={eliminationInfo.secondFactor} variable={firstVariable} />
                            </p>
                        );
                    }
                    return undefined;
                }
                case IsolatedIn.EliminationSecond: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <TransformationDescription description={FlexibilityTranslations.getTransformationDescription1(firstVariable, Case.First)} />
                                <TransformationDescriptionForElimination isFirstEquation={false} factor={eliminationInfo.secondFactor} variable={secondVariable} />
                            </p>
                        );
                    }
                    return undefined;
                }
            }
            break;
        }
        case IsolatedIn.Second: {
            switch (transformationInfo[1]) {
                case IsolatedIn.None: {
                    return (
                        <p>
                            <TransformationDescription description={FlexibilityTranslations.getTransformationDescription1(secondVariable, Case.First)} />
                        </p>
                    );
                }
                case IsolatedIn.First: {
                    return (
                        <p>
                            <TransformationDescription description={FlexibilityTranslations.getTransformationDescription2(secondVariable, firstVariable)} />
                        </p>
                    );
                }
                case IsolatedIn.Second: {
                    return (
                        <p>
                            <TransformationDescription description={FlexibilityTranslations.getTransformationDescription1(secondVariable, Case.Four)} />
                        </p>
                    );
                }
                case IsolatedIn.Elimination: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <TransformationDescription description={FlexibilityTranslations.getTransformationDescription1(secondVariable, Case.First)} />
                                <MultiplicationDescriptionForElimination isFirstEquation={false} factor={eliminationInfo.secondFactor} />
                            </p>
                        );
                    }
                    return undefined;
                }
                case IsolatedIn.EliminationFirst: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <TransformationDescription description={FlexibilityTranslations.getTransformationDescription1(secondVariable, Case.First)} />
                                <TransformationDescriptionForElimination isFirstEquation={false} factor={eliminationInfo.secondFactor} variable={firstVariable} />
                            </p>
                        );
                    }
                    return undefined;
                }
                case IsolatedIn.EliminationSecond: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <TransformationDescription description={FlexibilityTranslations.getTransformationDescription1(secondVariable, Case.First)} />
                                <TransformationDescriptionForElimination isFirstEquation={false} factor={eliminationInfo.secondFactor} variable={secondVariable} />
                            </p>
                        );
                    }
                    return undefined;
                }
            }
            break;
        }
        case IsolatedIn.Elimination: {
            switch (transformationInfo[1]) {
                case IsolatedIn.None: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <MultiplicationDescriptionForElimination isFirstEquation={true} factor={eliminationInfo.firstFactor} />
                            </p>
                        );
                    }
                    return undefined;
                }
                case IsolatedIn.First: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <MultiplicationDescriptionForElimination isFirstEquation={true} factor={eliminationInfo.firstFactor} />
                                <TransformationDescription description={FlexibilityTranslations.getTransformationDescription1(firstVariable, Case.Second)} />
                            </p>
                        );
                    }
                    return undefined;
                }
                case IsolatedIn.Second: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <MultiplicationDescriptionForElimination isFirstEquation={true} factor={eliminationInfo.firstFactor} />
                                <TransformationDescription description={FlexibilityTranslations.getTransformationDescription1(secondVariable, Case.Second)} />
                            </p>
                        );
                    }
                    return undefined;
                }
                case IsolatedIn.Elimination: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <MultiplicationDescriptionForElimination isFirstEquation={true} factor={eliminationInfo.firstFactor} />
                                <MultiplicationDescriptionForElimination isFirstEquation={false} factor={eliminationInfo.secondFactor} />
                            </p>
                        );
                    }
                    return undefined;
                }
                case IsolatedIn.EliminationFirst: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <MultiplicationDescriptionForElimination isFirstEquation={true} factor={eliminationInfo.firstFactor} />
                                <TransformationDescriptionForElimination isFirstEquation={false} factor={eliminationInfo.secondFactor} variable={firstVariable} />
                            </p>
                        );
                    }
                    return undefined;
                }
                case IsolatedIn.EliminationSecond: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <MultiplicationDescriptionForElimination isFirstEquation={true} factor={eliminationInfo.firstFactor} />
                                <TransformationDescriptionForElimination isFirstEquation={false} factor={eliminationInfo.secondFactor} variable={secondVariable} />
                            </p>
                        );
                    }
                    return undefined;
                }
            }
            break;
        }
        case IsolatedIn.EliminationFirst: {
            switch (transformationInfo[1]) {
                case IsolatedIn.None: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <TransformationDescriptionForElimination isFirstEquation={true} factor={eliminationInfo.firstFactor} variable={firstVariable} />
                            </p>
                        );
                    }
                    return undefined;
                }
                case IsolatedIn.First: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <TransformationDescriptionForElimination isFirstEquation={true} factor={eliminationInfo.firstFactor} variable={firstVariable} />
                                <TransformationDescription description={FlexibilityTranslations.getTransformationDescription1(firstVariable, Case.Second)} />
                            </p>
                        );
                    }
                    return undefined;
                }
                case IsolatedIn.Second: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <TransformationDescriptionForElimination isFirstEquation={true} factor={eliminationInfo.firstFactor} variable={firstVariable} />
                                <TransformationDescription description={FlexibilityTranslations.getTransformationDescription1(secondVariable, Case.Second)} />
                            </p>
                        );
                    }
                    return undefined;
                }
                case IsolatedIn.Elimination: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <TransformationDescriptionForElimination isFirstEquation={true} factor={eliminationInfo.firstFactor} variable={firstVariable} />
                                <MultiplicationDescriptionForElimination isFirstEquation={false} factor={eliminationInfo.secondFactor} />
                            </p>
                        );
                    }
                    return undefined;
                }
                case IsolatedIn.EliminationFirst: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <TransformationDescriptionForElimination isFirstEquation={true} factor={eliminationInfo.firstFactor} variable={firstVariable} />
                                <TransformationDescriptionForElimination isFirstEquation={false} factor={eliminationInfo.secondFactor} variable={firstVariable} />
                            </p>
                        );
                    }
                    return undefined;
                }
                case IsolatedIn.EliminationSecond: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <TransformationDescriptionForElimination isFirstEquation={true} factor={eliminationInfo.firstFactor} variable={firstVariable} />
                                <TransformationDescriptionForElimination isFirstEquation={false} factor={eliminationInfo.secondFactor} variable={secondVariable} />
                            </p>
                        );
                    }
                    return undefined;
                }
            }
            break;
        }
        case IsolatedIn.EliminationSecond: {
            switch (transformationInfo[1]) {
                case IsolatedIn.None: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <TransformationDescriptionForElimination isFirstEquation={true} factor={eliminationInfo.firstFactor} variable={secondVariable} />
                            </p>
                        );
                    }
                    return undefined;
                }
                case IsolatedIn.First: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <TransformationDescriptionForElimination isFirstEquation={true} factor={eliminationInfo.firstFactor} variable={secondVariable} />
                                <TransformationDescription description={FlexibilityTranslations.getTransformationDescription1(firstVariable, Case.Second)} />
                            </p>
                        );
                    }
                    return undefined;
                }
                case IsolatedIn.Second: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <TransformationDescriptionForElimination isFirstEquation={true} factor={eliminationInfo.firstFactor} variable={secondVariable} />
                                <TransformationDescription description={FlexibilityTranslations.getTransformationDescription1(secondVariable, Case.Second)} />
                            </p>
                        );
                    }
                    return undefined;
                }
                case IsolatedIn.Elimination: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <TransformationDescriptionForElimination isFirstEquation={true} factor={eliminationInfo.firstFactor} variable={secondVariable} />
                                <MultiplicationDescriptionForElimination isFirstEquation={false} factor={eliminationInfo.secondFactor} />
                            </p>
                        );
                    }
                    return undefined;
                }
                case IsolatedIn.EliminationFirst: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <TransformationDescriptionForElimination isFirstEquation={true} factor={eliminationInfo.firstFactor} variable={secondVariable} />
                                <TransformationDescriptionForElimination isFirstEquation={false} factor={eliminationInfo.secondFactor} variable={firstVariable} />
                            </p>
                        );
                    }
                    return undefined;
                }
                case IsolatedIn.EliminationSecond: {
                    if (eliminationInfo !== undefined) {
                        return (
                            <p>
                                <TransformationDescriptionForElimination isFirstEquation={true} factor={eliminationInfo.firstFactor} variable={secondVariable} />
                                <TransformationDescriptionForElimination isFirstEquation={false} factor={eliminationInfo.secondFactor} variable={secondVariable} />
                            </p>
                        );
                    }
                    return undefined;
                }
            }
        }
    }
    return undefined;
}

function MultiplicationDescriptionForElimination({ isFirstEquation, factor }: { isFirstEquation: boolean; factor?: number | Fraction }): ReactElement | undefined {
    const { t } = useTranslation(TranslationNamespaces.Flexibility);
    if (factor !== undefined) {
        return (
            <React.Fragment>
                {t(isFirstEquation ? FlexibilityTranslations.MULTIPLICATION_DESCRIPTION_ELIMINATION_1 : FlexibilityTranslations.MULTIPLICATION_DESCRIPTION_ELIMINATION_2)}
                {numberOrFractionToString(factor)}
                {t(FlexibilityTranslations.MULTIPLICATION_DESCRIPTION_ELIMINATION_END)}
            </React.Fragment>
        );
    }
    return undefined;
}

function numberOrFractionToString(factor: number | Fraction): string {
    if (typeof factor === "number") {
        return factor.toString();
    }
    return `${factor.s < 0 ? "-" : ""}${factor.n}${factor.d === 1 ? "" : `/${factor.d}`}`;
}

function TransformationDescriptionForElimination({ isFirstEquation, factor, variable }: {
    isFirstEquation: boolean;
    factor?: number | Fraction;
    variable: string
}): ReactElement | undefined {
    const { t } = useTranslation(TranslationNamespaces.Flexibility);
    if (factor !== undefined) {
        const firstPart = FlexibilityTranslations.getTransformationDescriptionForElimination(variable, isFirstEquation);
        return (
            <React.Fragment>
                <Trans ns={TranslationNamespaces.Flexibility} i18nKey={firstPart.translationKey} values={firstPart.interpolationVariables as object} />
                {numberOrFractionToString(factor)}
                {t(FlexibilityTranslations.MULTIPLICATION_DESCRIPTION_ELIMINATION_END)}
            </React.Fragment>
        );
    }
    return undefined;
}

function TransformationDescription({ description }: { description: TranslationInterpolation }): ReactElement | undefined {
    return <Trans ns={TranslationNamespaces.Flexibility} i18nKey={description.translationKey} values={description.interpolationVariables as object} />;
}
