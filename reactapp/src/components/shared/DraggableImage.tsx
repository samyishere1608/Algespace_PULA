import { ReactElement } from "react";
import { getImageSourceByName } from "@utils/itemImageLoader.ts";
import "@styles/shared/draggable.scss";

export default function DraggableImage({ isVisible, imageName }: { isVisible: boolean; imageName: string }): ReactElement {
    return <img className={`draggable-item__image${isVisible ? "--visible" : "--hidden"}`} src={getImageSourceByName(imageName)} alt={imageName} />;
}
