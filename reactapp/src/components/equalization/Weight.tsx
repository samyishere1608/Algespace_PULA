import { CSSProperties, ReactElement } from "react";
import { DragSource, Weight as WeightProps } from "@/types/equalization/enums";
import { EqualizationConstants } from "@/types/equalization/equalizationConstants.ts";
import { EqualizationItem } from "@/types/shared/item";
import DraggableImage from "@components/shared/DraggableImage";
import DraggableItem from "@components/shared/DraggableItem";
import { getImageSourceByName } from "@utils/itemImageLoader.ts";

export default function Weight({ index, weightItem }: { index: number; weightItem: EqualizationItem }): ReactElement {
    const width: number = EqualizationConstants.WEIGHT_SIZES.get(weightItem.name as WeightProps) ?? 3;
    const weightSize: CSSProperties = {
        width: `${width}rem`,
        height: "100%"
    };

    if (weightItem.amount === 1) {
        return (
            <div style={weightSize}>
                <DraggableItem source={DragSource.Weights} item={weightItem} index={index} className="--inherit" children={<DraggableImage isVisible={true} imageName={weightItem.name} />} />
            </div>
        );
    } else {
        // For multiple weights, mimic weights behind
        return (
            <div
                className={"equalization__weight"}
                style={{
                    width: `${width + 0.25}rem`,
                    height: "100%",
                    backgroundImage: `url(${getImageSourceByName(weightItem.name)})`,
                    backgroundSize: `${width - 0.1}rem auto`
                }}
            >
                <div style={weightSize}>
                    <DraggableItem source={DragSource.Weights} item={weightItem} index={index} className="--inherit" children={<DraggableImage isVisible={true} imageName={weightItem.name} />} />
                </div>
            </div>
        );
    }
}
