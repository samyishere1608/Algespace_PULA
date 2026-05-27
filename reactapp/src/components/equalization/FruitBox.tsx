import { ReactElement } from "react";
import { DragSource } from "@/types/equalization/enums";
import { GameError, GameErrorType } from "@/types/shared/error.ts";
import { EqualizationItem } from "@/types/shared/item";
import DraggableImage from "@components/shared/DraggableImage";
import DraggableItem from "@components/shared/DraggableItem";
import AppleDisplay from "@images/equalization/appleDisplay.png";
import AubergineDisplay from "@images/equalization/aubergineDisplay.png";
import BananaDisplay from "@images/equalization/bananaDisplay.png";
import CarrotDisplay from "@images/equalization/carrotDisplay.png";
import CoconutDisplay from "@images/equalization/coconutDisplay.png";
import LemonDisplay from "@images/equalization/lemonDisplay.png";
import LimeDisplay from "@images/equalization/limeDisplay.png";
import MelonDisplay from "@images/equalization/melonDisplay.png";
import PapayaDisplay from "@images/equalization/papayaDisplay.png";
import PearDisplay from "@images/equalization/pearDisplay.png";
import PineappleDisplay from "@images/equalization/pineappleDisplay.png";
import PumpkinDisplay from "@images/equalization/pumpkinDisplay.png";

const displays: Map<string, string> = new Map<string, string>([
    ["apple", AppleDisplay],
    ["aubergine", AubergineDisplay],
    ["banana", BananaDisplay],
    ["carrot", CarrotDisplay],
    ["coconut", CoconutDisplay],
    ["lemon", LemonDisplay],
    ["lime", LimeDisplay],
    ["melon", MelonDisplay],
    ["papaya", PapayaDisplay],
    ["pear", PearDisplay],
    ["pineapple", PineappleDisplay],
    ["pumpkin", PumpkinDisplay]
]);

function getDisplayImageSourceByName(name: string): string {
    const src: string | undefined = displays.get(name);
    if (src === undefined) {
        console.error(`The name ${name} of the display is not well defined.`);
        throw new GameError(GameErrorType.EXERCISE_ERROR);
    }
    return src;
}

export default function FruitBox({ source, item, containsItems }: { source: DragSource; item: EqualizationItem; containsItems: boolean }): ReactElement {
    if (containsItems) {
        return (
            <div className={"equalization__fruits-box"} style={{ backgroundImage: `url(${getDisplayImageSourceByName(item.name)})` }}>
                <DraggableItem source={source} item={item} index={0} className="--inherit" children={<DraggableImage isVisible={false} imageName={item.name} />} />
            </div>
        );
    } else {
        return <div className={"equalization__fruits-box"}></div>;
    }
}
