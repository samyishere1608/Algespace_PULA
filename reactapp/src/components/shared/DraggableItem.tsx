import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CSSProperties, ReactElement, ReactNode } from "react";
import { DragSource } from "@/types/equalization/enums";
import { IItem } from "@/types/shared/item";

export default function DraggableItem({ source, item, index, className, children }: { source: DragSource | number | boolean; item: IItem; index: number; className: string; children: ReactNode }): ReactElement {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: source != null ? `$draggable-${item.name}-${source}-${index}` : `$draggable-${item.name}-${index}`,
        data: {
            item: item,
            source: source,
            index: index
        }
    });

    const style: CSSProperties = {
        transform: CSS.Translate.toString(transform),
        zIndex: "199"
    };

    return (
        <div className={`draggable-item__container${className}`} style={style} ref={setNodeRef} {...listeners} {...attributes}>
            {children}
        </div>
    );
}
