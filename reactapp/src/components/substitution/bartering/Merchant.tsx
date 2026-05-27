import { faRotate } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement } from "react";
import { BarteringItem } from "@/types/shared/item.ts";
import { Merchant as MerchantProps, ProductType } from "@/types/substitution/bartering/merchant.ts";
import { RetailBox } from "@/types/substitution/bartering/retailBox.ts";
import { Trade } from "@/types/substitution/bartering/trade.ts";
import ImageEquation from "@components/math/conceptual-knowledge/ImageEquation.tsx";
import TentFruitsLarge from "@images/substitution/tentFruitsLarge.png";
import TentFruitsSmall from "@images/substitution/tentFruitsSmall.png";
import TentGoodsLarge from "@images/substitution/tentGoodsLarge.png";
import TentGoodsSmall from "@images/substitution/tentGoodsSmall.png";
import TentSpicesLarge from "@images/substitution/tentSpicesLarge.png";
import TentSpicesSmall from "@images/substitution/tentSpicesSmall.png";
import RetailBoxDropzone from "./RetailBoxDropzone.tsx";

export default function Merchant({ id, merchant, boxes, isValidDropLocation, exchangeItems, trackAction }: { id: number; merchant: MerchantProps; boxes: RetailBox[]; isValidDropLocation: (item: BarteringItem | null, trade: Trade | null) => boolean; exchangeItems: (boxes: RetailBox[], trade: Trade) => void; trackAction: (action: string) => void }): ReactElement {
    const isLarge: boolean = merchant.trade.secondInput !== null || merchant.trade.secondOutput !== null;
    let backgroundImage: string;
    switch (merchant.productType) {
        case ProductType.Fruits:
            backgroundImage = isLarge ? TentFruitsLarge : TentFruitsSmall;
            break;

        case ProductType.Goods:
            backgroundImage = isLarge ? TentGoodsLarge : TentGoodsSmall;
            break;

        case ProductType.Spices:
            backgroundImage = isLarge ? TentSpicesLarge : TentSpicesSmall;
    }

    return (
        <div className={"bartering__merchant"} style={{ backgroundImage: `url(${backgroundImage})` }}>
            <ImageEquation equation={merchant.linearEquation} style={{ color: "var(--light-text)", marginTop: "2.25rem" }} />
            <div className={"retail-boxes--merchant"}>
                {boxes.map((box: RetailBox) => {
                    return <RetailBoxDropzone key={box.id} id={box.id} item={box.item} isValidDropzone={isValidDropLocation(box.item, merchant.trade)} />;
                })}
                <button
                    className={"button primary-button"}
                    disabled={!isExchangeable(merchant.trade, boxes)}
                    onClick={(): void => {
                        exchangeItems(boxes, merchant.trade);
                        trackAction(`EXCHANGE with ${id}`);
                    }}
                >
                    <FontAwesomeIcon icon={faRotate} />
                </button>
            </div>
        </div>
    );
}

function isExchangeable(trade: Trade, boxes: RetailBox[]): boolean {
    if (boxes[0].item === null && boxes[1].item === null) {
        return false;
    }

    if (canTrade(trade.firstInput, boxes)) {
        if (trade.secondInput !== null) {
            return canTrade(trade.secondInput, boxes);
        }
        return true;
    }

    return false;
}

function canTrade(merchantItem: BarteringItem, boxes: RetailBox[]): boolean {
    let amount: number = 0;

    boxes.forEach((box: RetailBox) => {
        if (box.item !== null && box.item.name === merchantItem.name) {
            amount += box.item.amount;
        }
    });

    return amount >= merchantItem.amount;
}
