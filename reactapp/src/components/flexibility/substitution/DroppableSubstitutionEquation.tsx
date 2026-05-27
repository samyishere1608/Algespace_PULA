import { useDroppable } from "@dnd-kit/core";
import React, { ReactElement } from "react";
import { FlexibilityDragTarget, SubstitutionError } from "@/types/flexibility/enums.ts";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { math } from "@/types/math/math.ts";
import { FlexibilityTerm as FlexibilityTermProps } from "@/types/math/term.ts";
import { FlexibilityCoefficient } from "@components/math/procedural-knowledge/FlexibilityCoefficient.tsx";
import { FlexibilityTerm } from "@components/math/procedural-knowledge/FlexibilityTerm.tsx";

export function DroppableSubstitutionEquation({ equation, isValidDropLocation, isTip }: {
    equation: FlexibilityEquation;
    isValidDropLocation: (isUnion: boolean, dropVariable?: string) => [boolean, SubstitutionError];
    isTip: boolean;
}): ReactElement {
    return (
        <div className={`draggable-substitution-equation`}>
            <DroppableExpression target={FlexibilityDragTarget.Left} terms={equation.leftTerms} isValidDropLocation={isValidDropLocation} isTip={isTip} />
            <p>&#61;</p>
            <DroppableExpression target={FlexibilityDragTarget.Right} terms={equation.rightTerms} isValidDropLocation={isValidDropLocation} isTip={isTip} />
        </div>
    );
}

function DroppableExpression({ target, terms, isValidDropLocation, isTip }: {
    target: FlexibilityDragTarget;
    terms: FlexibilityTermProps[];
    isValidDropLocation: (isUnion: boolean, dropVariable?: string) => [boolean, SubstitutionError];
    isTip: boolean;
}): ReactElement {
    return (
        <div className={`droppable-substitution-expression`}>
            {terms.map((term: FlexibilityTermProps, index: number) => {
                return <DroppableTerm key={index} target={target} index={index} term={term} isValidDropLocation={isValidDropLocation} isTip={isTip} />;
            })}
        </div>
    );
}

function DroppableTerm({ target, index, term, isValidDropLocation, isTip }: {
    target: FlexibilityDragTarget;
    index: number;
    term: FlexibilityTermProps;
    isValidDropLocation: (isUnion: boolean, dropVariable?: string) => [boolean, SubstitutionError];
    isTip: boolean;
}): ReactElement {
    let operator: ReactElement | undefined;
    if (index !== 0) {
        if (term.coefficient.s > 0) {
            operator = <p>&#43;</p>;
        } else {
            operator = index == 0 ? <p>-</p> : <p>&#8722;</p>; // "-" is smaller than minus symbol
        }
    } else if (term.coefficient.s < 0) {
        operator = <p>-</p>;
    }

    if (isTip && term.isUnion) {
        return <React.Fragment>
            {operator}
            <DropTarget isUnion={true} index={index} variable={term.variable as string} target={target} isValidDropLocation={isValidDropLocation}
                        child={<FlexibilityTerm index={0} term={term} />} />
        </React.Fragment>;
    }

    if (math.isZero(term.coefficient)) {
        return <DropTarget isUnion={false} index={index} target={target} child={<p>0</p>} />;
    }

    let showCoefficient = true;
    if (term.coefficient.d == 1 && term.coefficient.n == 1 && term.variable !== null) {
        showCoefficient = false;
    }

    return (
        <React.Fragment>
            {operator}
            {showCoefficient &&
                <DropTarget isUnion={false} index={index} target={target}
                            child={<FlexibilityCoefficient coefficient={term.coefficient} displayOne={term.variable === null} />} />}
            {term.variable !== null &&
                <DropTarget isUnion={false} index={index} target={target} variable={term.variable} child={<p>{term.variable}</p>}
                            isValidDropLocation={isValidDropLocation} />}
        </React.Fragment>
    );
}

function DropTarget({ target, index, child, variable, isValidDropLocation, isUnion }: {
    target: FlexibilityDragTarget;
    index: number;
    child: ReactElement;
    variable?: string;
    isValidDropLocation?: (isUnion: boolean, dropVariable?: string) => [boolean, SubstitutionError];
    isUnion: boolean;
}): ReactElement {
    const [isValid, error] = isValidDropLocation !== undefined ? isValidDropLocation(isUnion, variable) : [false, SubstitutionError.ExchangedFactor];

    const { isOver, setNodeRef } = useDroppable({
        id: `dropzone-${target}-${index}-${variable !== undefined ? variable : "factor"}`,
        data: {
            target: target,
            variable: variable,
            valid: isValid,
            error: error,
            index: index,
            isUnion: isUnion
        }
    });

    return (
        <div className={"droppable-substitution__dropzone"} style={{ backgroundColor: isOver ? "#1788AA" : "var(--dark-blue)" }} ref={setNodeRef}>
            {child}
        </div>
    );
}
