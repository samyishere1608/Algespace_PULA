import { useDroppable } from "@dnd-kit/core";
import { ReactElement } from "react";
import { FlexibilityDragTarget } from "@/types/flexibility/enums.ts";
import { FlexibilityTerm as FlexibilityTermProps } from "@/types/math/term.ts";
import { FlexibilityTerm } from "@components/math/procedural-knowledge/FlexibilityTerm.tsx";

export function DroppableEqualizationEquation({ leftTerms, rightTerms, classname }: {
    leftTerms: FlexibilityTermProps[] | undefined; rightTerms: FlexibilityTermProps[] | undefined; classname?: string
}): ReactElement {
    return (
        <div className={`droppable-equalization-equation${classname}`}>
            <DroppableExpression target={FlexibilityDragTarget.Left} terms={leftTerms} />
            <p>&#61;</p>
            <DroppableExpression target={FlexibilityDragTarget.Right} terms={rightTerms} />
        </div>
    );
}

function DroppableExpression({ target, terms }: { target: FlexibilityDragTarget; terms: FlexibilityTermProps[] | undefined }): ReactElement {
    const { isOver, setNodeRef } = useDroppable({
        id: `dropzone-${target}`,
        data: {
            target: target
        }
    });

    return (
        <div style={{ backgroundColor: isOver ? "#045b86" : "var(--dark-blue)" }}
             className={`droppable-expression__dropzone${terms === undefined ? "--empty" : "--full"}`} ref={setNodeRef}>
            {terms !== undefined && (
                <div className={"droppable-expression"}>
                    {terms.map((term: FlexibilityTermProps, index: number) => {
                        return <FlexibilityTerm key={index} index={index} term={term} />;
                    })}
                </div>
            )}
        </div>
    );
}
