import { ReactElement } from "react";
import { DragSource } from "@/types/equalization/enums";
import { EqualizationConstants } from "@/types/equalization/equalizationConstants.ts";
import { EqualizationItem } from "@/types/shared/item";
import { sumWeightOfItems } from "@utils/utils";
import ScaleDropzone from "./ScaleDropzone";

export default function DigitalScale({ items, isValidDropzone }: { items: EqualizationItem[]; isValidDropzone: (target: DragSource) => boolean }): ReactElement {
    return (
        <div className={"digital-scale"}>
            <ScaleDropzone items={items} margin={"4.5rem"} source={DragSource.DigitalScale} isValidDropzone={isValidDropzone} maxCapacity={EqualizationConstants.MAX_ITEMS_DIG_SCALE} />
            <div className={"image-equation digital-scale__equation"}>
                <p>{sumWeightOfItems(items)} g</p>
            </div>
        </div>
    );
}
