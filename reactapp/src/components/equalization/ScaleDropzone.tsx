import { TranslationNamespaces } from "@/i18n.ts";
import { useDroppable } from "@dnd-kit/core";
import React, { CSSProperties, ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { DragSource, Weight } from "@/types/equalization/enums";
import { EqualizationConstants } from "@/types/equalization/equalizationConstants.ts";
import { EqualizationTranslations } from "@/types/equalization/equalizationTranslations.ts";
import { EqualizationItem } from "@/types/shared/item";
import DraggableImage from "@components/shared/DraggableImage";
import DraggableItem from "@components/shared/DraggableItem";

export default function ScaleDropzone({ items, margin, source, isValidDropzone, maxCapacity }: { items: EqualizationItem[]; margin: string; source: DragSource; isValidDropzone: (target: DragSource) => boolean; maxCapacity: number }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Equalization);

    const { isOver, setNodeRef } = useDroppable({
        id: `dropzone-${source}`,
        data: {
            target: source
        }
    });

    const hasMaxItems: boolean = items.length === maxCapacity;
    const over: boolean = isOver && isValidDropzone(source);
    const style: CSSProperties = {
        marginBottom: margin,
        backgroundColor: over ? (hasMaxItems ? "rgba(255,0,0,0.5)" : "rgba(98,128,136,0.5)") : "transparent"
    };

    // Droppable component
    const dropzone: ReactElement = (
        <div className="scale__dropzone" style={style} ref={setNodeRef}>
            {items.map((item: EqualizationItem, index: number) => {
                const width: number = EqualizationConstants.WEIGHT_SIZES.get(item.name as Weight) ?? 3;
                return (
                    <div key={index} style={{ width: `${width}rem`, height: "auto", marginTop: "auto" }}>
                        <DraggableItem source={source} item={item} index={index} className="--inherit" children={<DraggableImage isVisible={true} imageName={item.name} />} />
                    </div>
                );
            })}
        </div>
    );

    // HTML
    return (
        <React.Fragment>
            {over && hasMaxItems ? (
                <div className={"scale__dropzone-error"}>
                    <p>{t(EqualizationTranslations.WARNING_MAX_CAPACITY)}</p>
                    {dropzone}
                </div>
            ) : (
                dropzone
            )}
        </React.Fragment>
    );
}
