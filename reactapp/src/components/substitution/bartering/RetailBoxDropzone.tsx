import { useDroppable } from "@dnd-kit/core";
import React, { ReactElement } from "react";
import { BarteringItem } from "@/types/shared/item.ts";
import DraggableImage from "@components/shared/DraggableImage.tsx";
import DraggableItem from "@components/shared/DraggableItem.tsx";
import { getImageSourceByName } from "@utils/itemImageLoader.ts";
import "@styles/substitution/bartering.scss";

export default function RetailBoxDropzone({ id, item, isValidDropzone }: { id: number; item: BarteringItem | null; isValidDropzone: boolean }): ReactElement {
    const { isOver, setNodeRef } = useDroppable({
        id: `dropzone-${id}`,
        data: {
            target: id,
            canDrop: isValidDropzone
        }
    });

    return (
        <div className={"retail-box"} ref={setNodeRef} style={{ opacity: isOver ? "80%" : "1" }}>
            {item !== null && ( // We use a greyscale image behind the draggable item to indicate the original position and as the number is not draggable (cannot be set as background as greyscale filter applies to children as well and ":before" cannot be used dynamically
                <React.Fragment>
                    <div className={"retail-box__item"}>
                        <div className={"draggable-item__container--3rem-max"}>
                            <img className={"retail-box__greyscale-image"} src={getImageSourceByName(item.name)} alt={item.name} />
                        </div>
                    </div>
                    <div className={"retail-box__amount"}>
                        <p>{item.amount}</p>
                    </div>
                    <div className={"retail-box__item"}>
                        <DraggableItem source={id} item={item} index={id} className="--3rem-max" children={<DraggableImage isVisible={true} imageName={item.name} />} />
                    </div>
                </React.Fragment>
            )}
            {isOver && !isValidDropzone && (
                <div className={"retail-box__item"}>
                    <p className={"retail-box__item-invalid"}>
                        <span>&#10060;</span>
                    </p>
                </div>
            )}
        </div>
    );
}
