import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CSSProperties, ReactElement } from "react";
import { FlexibilityDragSource } from "@/types/flexibility/enums.ts";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { FlexibilityTerm as FlexibilityTermProps } from "@/types/math/term.ts";
import { FlexibilityTerm } from "@components/math/procedural-knowledge/FlexibilityTerm.tsx";

export function DraggableEqualizationEquation({ equation, isFirstEquation, isFirst, minWidth, disabled }: {
    equation: FlexibilityEquation;
    isFirstEquation: boolean;
    isFirst: boolean;
    minWidth: number;
    disabled: boolean
}): ReactElement {
    return (
        <div className={"draggable-equalization-equation__container"}>
            <p>{isFirst ? "1." : "2."}</p>
            <div className={`draggable-equalization-equation`}>
                <DraggableExpression terms={equation.leftTerms} source={isFirstEquation ? FlexibilityDragSource.FirstLeft : FlexibilityDragSource.SecondLeft}
                                     expressionWidth={minWidth - 2} isLeft={true} disabled={disabled} />
                <p>&#61;</p>
                <DraggableExpression terms={equation.rightTerms} source={isFirstEquation ? FlexibilityDragSource.FirstRight : FlexibilityDragSource.SecondRight}
                                     expressionWidth={minWidth} isLeft={false} disabled={disabled} />
            </div>
        </div>

    );
}

function DraggableExpression({ terms, source, expressionWidth, isLeft, disabled }: {
    terms: FlexibilityTermProps[];
    source: FlexibilityDragSource;
    expressionWidth: number;
    isLeft: boolean;
    disabled: boolean
}): ReactElement {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `$draggable-${source}`,
        data: { source: source },
        disabled: disabled
    });

    const style: CSSProperties = {
        transform: CSS.Translate.toString(transform),
        zIndex: "199"
    };

    return (
        <div className={`draggable-expression__container${isLeft ? "--left" : "--right"}`} style={{ minWidth: `${expressionWidth}rem` }}>
            <div className={"draggable-expression__grid"}>
                <div className={`draggable-expression__grid-item`}>
                    {terms.map((term: FlexibilityTermProps, index: number) => {
                        return <FlexibilityTerm key={index} index={index} term={term} />;
                    })}
                </div>
                <div className={`draggable-expression__grid-item draggable-expression__drag draggable-equalization-item`} style={style} ref={setNodeRef} {...listeners} {...attributes}>
                    {terms.map((term: FlexibilityTermProps, index: number) => {
                        return <FlexibilityTerm key={index} index={index} term={term} />;
                    })}
                </div>
            </div>
        </div>
    );
}
