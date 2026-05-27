import { useDroppable } from "@dnd-kit/core";
import React, { ReactElement } from "react";
import { Operator } from "@/types/math/enums.ts";
import { SubstitutionItem } from "@/types/shared/item.ts";
import { SubstitutionConstants } from "@/types/substitution/conceptual-knowledge/substitutionConstants.ts";
import { DraggableEquationItem, PlainEquationItem } from "@components/substitution/conceptual-knowledge/EquationItem.tsx";
import { displayOperator } from "@utils/utils.ts";

export default function DropzoneEquation({ placeholder, items, showOperator }: { placeholder: SubstitutionItem; items: SubstitutionItem[]; showOperator: boolean }): ReactElement {
    const { isOver, setNodeRef } = useDroppable({
        id: "dropzone"
    });

    const hasMaxItems: boolean = items.length === SubstitutionConstants.MAX_SUBSTITUTION_ITEMS;

    return (
        <React.Fragment>
            {showOperator && placeholder.operator !== null && (placeholder.operator === Operator.Plus ? <p className={"substitution-equation__operator"}>&#43;</p> : <p className={"substitution-equation__operator"}>-</p>)}
            <div
                className={"substitution-equation__dropzone"}
                ref={setNodeRef}
                style={{
                    backgroundColor: isOver ? (hasMaxItems ? "rgba(255,0,0,0.5)" : "#bfb79c") : "transparent",
                    overflowY: items.length > 8 ? "scroll" : "visible",
                    overflowX: "visible"
                }}
            >
                {items.length === 0 ? (
                    <PlainEquationItem item={placeholder} index={0} showOperator={false} cssClass={"dropzone-empty"} />
                ) : (
                    <React.Fragment>
                        {items.map((item: SubstitutionItem, index: number) => {
                            return <DraggableEquationItem key={index} item={item} index={index} showOperator={displayOperator(index, item.operator)} inDropzone={true} />;
                        })}
                    </React.Fragment>
                )}
            </div>
        </React.Fragment>
    );
}
