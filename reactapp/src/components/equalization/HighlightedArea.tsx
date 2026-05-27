import React, { CSSProperties, ReactElement } from "react";
import { EqualizationExercise } from "@/types/equalization/equalizationExercise.ts";
import { EqualizationGameState } from "@/types/equalization/equalizationGameState.ts";
import { GameError, GameErrorType } from "@/types/shared/error.ts";
import { countSecondVariable } from "@utils/utils.ts";

export default function HighlightedArea({ scaleRect, systemRect, gameState, exercise }: { scaleRect: DOMRect | undefined; systemRect: DOMRect | undefined; gameState: EqualizationGameState; exercise: EqualizationExercise }): ReactElement {
    if (scaleRect === undefined || systemRect === undefined) {
        console.error("An unexpected error occurred in the component 'HighlightedArea': One or both of the objects 'scaleRect' and 'systemRect' are undefined.");
        throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
    }

    const fontSize: number = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const scaleRecHeight: number = scaleRect.height / fontSize - 8; // -15.5 (border start) + 6.5 (margin scale) + 1 (additional space)
    const stylePlateLeft: CSSProperties = {
        left: `${scaleRect.left / fontSize}rem`,
        width: "15.5rem",
        height: `${scaleRecHeight}rem`
    };
    const stylePlateRight: CSSProperties = {
        left: `${scaleRect.right / fontSize - 15.5}rem`,
        width: "15.5rem",
        height: `${scaleRecHeight}rem`
    };

    const systemRectHeight: number = systemRect.height / fontSize - (window.innerWidth < 1800 ? 5 : 8); // 5 = 5.75 (scale height) - 0.5 (g) + 1.25 (additional space)
    const countLeft: number = countSecondVariable(gameState.leftItems);

    const isolatedCountsAreEqual: boolean = exercise.firstEquation.isolatedVariableCount === exercise.secondEquation.isolatedVariableCount;
    const firstEquationMultiplier: number = isolatedCountsAreEqual ? 1 : exercise.firstEquation.isolatedVariableCount;
    const secondEquationMultiplier: number = isolatedCountsAreEqual ? 1 : exercise.secondEquation.isolatedVariableCount;

    return (
        <React.Fragment>
            <div className={"scale-highlighted-area-left"} style={stylePlateLeft}></div>
            <div className={"scale-highlighted-area-right"} style={stylePlateRight}></div>
            {exercise.firstEquation.leftIsolated ? (
                <div className={"system-highlighted-area"} style={getSystemRect(systemRectHeight, getDistanceLeft(true, false), exercise.firstEquation.secondVariableCount * secondEquationMultiplier === countLeft)}></div>
            ) : (
                <div className={"system-highlighted-area"} style={getSystemRect(systemRectHeight, getDistanceLeft(true, true), exercise.firstEquation.secondVariableCount * secondEquationMultiplier === countLeft)}></div>
            )}
            {exercise.secondEquation.leftIsolated ? (
                <div className={"system-highlighted-area"} style={getSystemRect(systemRectHeight, getDistanceLeft(false, false), exercise.secondEquation.secondVariableCount * firstEquationMultiplier === countLeft)}></div>
            ) : (
                <div className={"system-highlighted-area"} style={getSystemRect(systemRectHeight, getDistanceLeft(false, true), exercise.secondEquation.secondVariableCount * firstEquationMultiplier === countLeft)}></div>
            )}
        </React.Fragment>
    );
}

function getSystemRect(height: number, width: number, colorBlue: boolean): CSSProperties {
    return {
        left: `${width}rem`,
        width: window.innerWidth < 1800 ? "7.25rem" : "10.25rem",
        height: `${height}rem`,
        borderColor: colorBlue ? "var(--primary-blue)" : "var(--secondary-orange)"
    };
}

function getDistanceLeft(isFirstScale: boolean, isFirst: boolean): number {
    if (isFirstScale) {
        if (isFirst) {
            return 2.5;
        }
        return window.innerWidth < 1800 ? 11 : 14.75;
    }
    if (isFirst) {
        return window.innerWidth < 1800 ? 18.25 : 25;
    }
    return window.innerWidth < 1800 ? 26.75 : 37.25;
}
