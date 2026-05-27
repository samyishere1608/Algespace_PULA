import { ReactElement, useMemo } from "react";
import { DragSource, EqualizationItemType } from "@/types/equalization/enums";
import { EqualizationConstants } from "@/types/equalization/equalizationConstants.ts";
import { EqualizationExercise } from "@/types/equalization/equalizationExercise";
import { Coefficient } from "@/types/math/coefficient.ts";
import { Operator, RelationSymbol } from "@/types/math/enums";
import { LinearEquation as LinearEquationProps } from "@/types/math/linearEquation";
import { Term } from "@/types/math/term";
import { EqualizationItem } from "@/types/shared/item";
import ImageEquation from "@components/math/conceptual-knowledge/ImageEquation.tsx";
import { sumWeightOfItems } from "@utils/utils";
import BalancedScale from "@images/equalization/balancedScale.png";
import LeftScale from "@images/equalization/leftScale.png";
import RightScale from "@images/equalization/rightScale.png";
import ScaleDropzone from "./ScaleDropzone";

export default function BalanceScale({ exercise, leftItems, rightItems, isValidDropzone }: { exercise: EqualizationExercise; leftItems: EqualizationItem[]; rightItems: EqualizationItem[]; isValidDropzone: (target: DragSource) => boolean }): ReactElement {
    // Compute the relation represented by the scale and the corresponding displayed equation
    const leftTerms: Term[] = useMemo(() => {
        return computeTerms(exercise, leftItems);
    }, [exercise, leftItems]);

    const rightTerms: Term[] = useMemo(() => {
        return computeTerms(exercise, rightItems);
    }, [exercise, rightItems]);

    const relation: RelationSymbol = useMemo(() => {
        return determineRelationSymbol(leftItems, rightItems);
    }, [leftItems, rightItems]);

    const equation: LinearEquationProps = new LinearEquationProps(leftTerms, rightTerms, relation);

    const equalHeight: string = "7.48rem";
    const minHeight: string = "6.23rem";
    const maxHeight: string = "9.98rem";

    let backgroundImage: string;
    let marginBottomLeft: string;
    let marginBottomRight: string;
    switch (relation) {
        case RelationSymbol.Equal: {
            backgroundImage = BalancedScale;
            marginBottomLeft = equalHeight;
            marginBottomRight = equalHeight;
            break;
        }
        case RelationSymbol.Smaller: {
            backgroundImage = RightScale;
            marginBottomLeft = maxHeight;
            marginBottomRight = minHeight;
            break;
        }
        case RelationSymbol.Larger: {
            backgroundImage = LeftScale;
            marginBottomLeft = minHeight;
            marginBottomRight = maxHeight;
            break;
        }
    }

    return (
        <div className={`balance-scale${relation === RelationSymbol.Equal ? "--balanced" : "--imbalanced"}`} style={{ backgroundImage: `url(${backgroundImage})` }}>
            <div className={"balance-scale__plates"}>
                <ScaleDropzone items={leftItems} margin={marginBottomLeft} source={DragSource.BalanceScaleLeft} isValidDropzone={isValidDropzone} maxCapacity={exercise.maximumCapacity ?? EqualizationConstants.MAX_ITEMS_SCALE} />
                <ScaleDropzone items={rightItems} margin={marginBottomRight} source={DragSource.BalanceScaleRight} isValidDropzone={isValidDropzone} maxCapacity={exercise.maximumCapacity ?? EqualizationConstants.MAX_ITEMS_SCALE} />
            </div>
            <div className={"balance-scale__equation"}>
                <ImageEquation equation={equation} style={{ color: "var(--dark-text)" }} />
            </div>
        </div>
    );
}

function determineRelationSymbol(itemsLeft: EqualizationItem[], itemsRight: EqualizationItem[]): RelationSymbol {
    const leftWeight: number = sumWeightOfItems(itemsLeft);
    const rightWeight: number = sumWeightOfItems(itemsRight);

    if (leftWeight === rightWeight) {
        return RelationSymbol.Equal;
    } else if (leftWeight > rightWeight) {
        return RelationSymbol.Larger;
    } else {
        return RelationSymbol.Smaller;
    }
}

function computeTerms(exercise: EqualizationExercise, items: EqualizationItem[]): Term[] {
    let isolatedVarCount: number = 0;
    let secondVarCount: number = 0;
    let weightsCount: number = 0;

    items.forEach((item: EqualizationItem): void => {
        switch (item.itemType) {
            case EqualizationItemType.IsolatedVariable: {
                isolatedVarCount++;
                break;
            }

            case EqualizationItemType.SecondVariable: {
                secondVarCount++;
                break;
            }

            case EqualizationItemType.Weight: {
                weightsCount += item.weight;
                break;
            }
        }
    });

    let terms: Term[] = [];
    if (isolatedVarCount > 0) {
        terms = [...terms, new Term(null, Coefficient.createNumberCoefficient(isolatedVarCount), exercise.isolatedVariable.name)];
    }
    if (secondVarCount > 0) {
        if (isolatedVarCount > 0) {
            terms = [...terms, new Term(Operator.Plus, Coefficient.createNumberCoefficient(secondVarCount), exercise.secondVariable.name)];
        } else {
            terms = [...terms, new Term(null, Coefficient.createNumberCoefficient(secondVarCount), exercise.secondVariable.name)];
        }
    }

    if (isolatedVarCount > 0 || secondVarCount > 0) {
        if (weightsCount > 0) {
            terms = [...terms, new Term(Operator.Plus, Coefficient.createNumberCoefficient(weightsCount), EqualizationConstants.WEIGHT_VAR)];
        }
    } else {
        terms = [...terms, new Term(null, Coefficient.createNumberCoefficient(weightsCount), EqualizationConstants.WEIGHT_VAR)];
    }

    return terms;
}
