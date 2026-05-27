import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CSSProperties, ReactElement } from "react";
import { FlexibilityDragSource } from "@/types/flexibility/enums.ts";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { FlexibilityTerm as FlexibilityTermProps } from "@/types/math/term.ts";
import { FlexibilityTerm } from "@components/math/procedural-knowledge/FlexibilityTerm.tsx";

export function DraggableSubstitutionEquation({ equation, isFirstEquation }: { equation: FlexibilityEquation; isFirstEquation: boolean }): ReactElement {
    return (
        <div className={`draggable-substitution-equation`}>
            <DraggableExpression terms={equation.leftTerms} source={isFirstEquation ? FlexibilityDragSource.FirstLeft : FlexibilityDragSource.SecondLeft} />
            <p>&#61;</p>
            <DraggableExpression terms={equation.rightTerms} source={isFirstEquation ? FlexibilityDragSource.FirstRight : FlexibilityDragSource.SecondRight} />
        </div>
    );
}

function DraggableExpression({ terms, source }: { terms: FlexibilityTermProps[]; source: FlexibilityDragSource }): ReactElement {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `$draggable-${source}`,
        data: { source: source }
    });

    const style: CSSProperties = {
        transform: CSS.Translate.toString(transform),
        zIndex: "199"
    };

    return (
        <div className={"draggable-expression__grid"}>
            <div className={`draggable-expression__grid-item`}>
                {terms.map((term: FlexibilityTermProps, index: number) => {
                    return <FlexibilityTerm key={index} index={index} term={term} />;
                })}
            </div>
            <div className={`draggable-expression__grid-item draggable-expression__drag`} style={style} ref={setNodeRef} {...listeners} {...attributes}>
                {terms.map((term: FlexibilityTermProps, index: number) => {
                    return <FlexibilityTerm key={index} index={index} term={term} />;
                })}
            </div>
        </div>
    );
}
