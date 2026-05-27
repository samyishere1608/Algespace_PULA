import { Fraction } from "mathjs";
import React, { ReactNode } from "react";
import { EliminationConstants } from "@/types/elimination/eliminationConstants.ts";
import { RowHeight } from "@/types/elimination/enums.ts";
import { OperationOutOfRangeError } from "@/types/elimination/operationOutOfRangeError.ts";
import { Row } from "@/types/elimination/row.ts";
import { EqualizationItemType } from "@/types/equalization/enums";
import { AgentCondition, IsolatedIn, SelectedEquation } from "@/types/flexibility/enums.ts";
import { IFlexibilityExercise } from "@/types/flexibility/flexibilityExercise.ts";
import { Coefficient } from "@/types/math/coefficient.ts";
import { Operator } from "@/types/math/enums.ts";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { math } from "@/types/math/math.ts";
import { FlexibilityTerm, ParenthesisTerm } from "@/types/math/term.ts";
import { GameError, GameErrorType } from "@/types/shared/error.ts";
import { EqualizationItem } from "@/types/shared/item";
import { FlexibilityExerciseResponse } from "@/types/flexibility/flexibilityExerciseResponse.ts";
import { NavigateFunction } from "react-router-dom";
import { Paths } from "@routes/paths.ts";

export function jsonObjectToMap(jsonObj: object): Map<string, number> | null {
    if (jsonObj === null || jsonObj === undefined) {
        return null;
    }

    const map: Map<string, number> = new Map<string, number>();
    const innerObj: object = Object.entries(jsonObj)[0][1] as object;
    if (innerObj === null) {
        return null;
    }
    Object.entries(innerObj).forEach(([key, value]): void => {
        map.set(key, value);
    });
    return map;
}

export function sumWeightOfItems(items: EqualizationItem[]): number {
    let weight: number = 0;
    items.forEach((item: EqualizationItem) => (weight += item.weight));
    return weight;
}

export function countSecondVariable(items: EqualizationItem[]): number {
    let count: number = 0;
    items.forEach((item: EqualizationItem): void => {
        if (item.itemType === EqualizationItemType.SecondVariable) {
            count++;
        }
    });
    return count;
}

export function displayOperator(index: number, operator: Operator): boolean {
    if (index !== 0) {
        return true;
    }
    return operator === Operator.Minus;
}

export function displayFeedBack(setFeedback: (value: React.SetStateAction<[boolean, string | ReactNode]>) => void, feedback: string | ReactNode): void {
    setFeedback([true, feedback]);
    setTimeout((): void => {
        setFeedback([false, ""]);
    }, 15000);
    return;
}

export function formatNumber(input: number): string {
    const parts: string[] = input.toString().split(".");
    if (parts.length < 2 || parts[1].length <= 4) {
        return input.toString();
    } else {
        return input.toFixed(4) + "...";
    }
}

export function increaseTableEntryHeight(row: Row, showImages: boolean): RowHeight {
    if (!showImages) {
        return RowHeight.Single;
    }
    const result: number = Math.max(rowsFromValue(row.first), rowsFromValue(row.second), rowsFromValue(row.costs));
    return result > 8 ? RowHeight.Triple : result > 4 ? RowHeight.Double : RowHeight.Single;
}

export function rowsFromValue(coefficient: Fraction): number {
    if (coefficient.s === -1 || coefficient.d !== 1) {
        return 0;
    }
    return coefficient.n <= EliminationConstants.MAX_IMAGES ? coefficient.n : 0;
}

export function isZero(coefficient: Coefficient): boolean {
    const fraction: Fraction = math.fraction(coefficient.value);
    return math.isZero(fraction);
}

export function countElementsInTerm(terms: FlexibilityTerm[]): number {
    let count: number = 0;
    terms.forEach((term: FlexibilityTerm, index: number): void => {
        if (index !== 0 || term.coefficient.s < 0) {
            count++;
        }
        if (!(term.coefficient.d == 1 && term.coefficient.n == 1)) {
            count++;
        }
        if (term.variable !== null) {
            count++;
        }
    });
    return count;
}

export function addOrSubtractCoefficients(add: boolean, fraction1: Fraction, fraction2: Fraction): Fraction {
    const result: Fraction = add ? math.add(fraction1, fraction2) : math.subtract(fraction1, fraction2);
    if (!satisfiesBounds(result)) {
        throw new OperationOutOfRangeError();
    }
    return result;
}

export function multiplyCoefficientWithScalar(coefficient: Fraction, scalar: number | Fraction): Fraction {
    const result: Fraction = math.multiply(coefficient, scalar) as Fraction;
    if (!satisfiesBounds(result)) {
        throw new OperationOutOfRangeError();
    }
    return result;
}

export function satisfiesBounds(coefficient: Fraction): boolean {
    return !((!math.isZero(coefficient) && math.smaller(coefficient, EliminationConstants.LOWER_BOUND) && math.larger(coefficient, -EliminationConstants.LOWER_BOUND)) || math.larger(coefficient, EliminationConstants.UPPER_BOUND));
}

export function numberOrFractionIsOne(input: number | Fraction): boolean {
    if (typeof input === "number") {
        if (input === 1) {
            return true;
        }
    } else if (input.s === 1 && input.n === input.d) {
        return true;
    }
    return false;
}

export function getFlexibilityFeedbackOrHintWidth(windowWidth: number, useAgent: boolean): number {
    if (useAgent) {
        return windowWidth <= 1200 ? windowWidth - 16.25 * 16 : windowWidth - 35 * 16;
    } else {
        return windowWidth <= 1200 ? windowWidth - 10 * 16 : windowWidth - 27.5 * 16;
    }
}

export function determineSecondEquation(selectedEquation: SelectedEquation, setSelectedEquation: (value: React.SetStateAction<[FlexibilityEquation, SelectedEquation] | undefined>) => void, exercise: IFlexibilityExercise, transformedSystem: [FlexibilityEquation, FlexibilityEquation] | undefined): void {
    switch (selectedEquation) {
        case SelectedEquation.FirstInitial: {
            setSelectedEquation([exercise.firstEquation, selectedEquation]);
            break;
        }
        case SelectedEquation.SecondInitial: {
            setSelectedEquation([exercise.secondEquation, selectedEquation]);
            break;
        }
        case SelectedEquation.FirstTransformed: {
            if (transformedSystem === undefined) {
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }
            setSelectedEquation([transformedSystem[0], selectedEquation]);
            break;
        }
        case SelectedEquation.SecondTransformed: {
            if (transformedSystem === undefined) {
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }
            setSelectedEquation([transformedSystem[1], selectedEquation]);
            break;
        }
    }
}

export function coefficientIsOne(factor: Fraction): boolean {
    return factor.n === 1 && factor.d === 1;
}

export function getTime(startTime: number): number {
    const endTime: number = performance.now();
    return (endTime - startTime) / 1000;
}

export function handleNavigationClick(isHome: boolean, setExitOverlay: (value: React.SetStateAction<[boolean, boolean]>) => void): void {
    if (isHome) {
        setExitOverlay([true, true]);
    } else {
        setExitOverlay([true, false]);
    }
}

export function getExerciseNumber(id: number, exerciseList?: number[]): number | undefined {
    let num;
    if (exerciseList !== undefined) {
        const index: number = exerciseList.findIndex((value) => value === id);
        if (index !== -1) {
            num = index + 1;
        }
    }
    return num;
}

export function isExerciseCompleted(id: number | string, completedExercises?: (number | string)[]): boolean {
    if (completedExercises === undefined) {
        return false;
    }
    const index: number = completedExercises.findIndex((entry) => entry === id);
    return index !== -1;
}

export function parenthesisToFlexibilityTerm(initialTerm: ParenthesisTerm): FlexibilityTerm {
    return new FlexibilityTerm(initialTerm.coefficient, initialTerm.variable);
}

export function getTransformationStatus(transformation: IsolatedIn): IsolatedIn {
    if (transformation === IsolatedIn.First) {
        return IsolatedIn.EliminationFirst;
    } else if (transformation === IsolatedIn.Second) {
        return IsolatedIn.EliminationSecond;
    }
    return IsolatedIn.Elimination;
}

export function navigateToNextExercise(studyId: number, currentExerciseId: number, exercises: FlexibilityExerciseResponse[], condition: AgentCondition, navigate: NavigateFunction): void {
    const index: number = exercises.findIndex((entry) => entry.id === currentExerciseId);

    if (index < exercises.length - 1) {
        navigate(Paths.FlexibilityStudyPath + `${studyId}/` + Paths.ExercisesSubPath + exercises[index + 1].id, {
            state: { exercises, condition }
        });
    } else {
        navigate(Paths.FlexibilityStudyEndPath);
    }
}