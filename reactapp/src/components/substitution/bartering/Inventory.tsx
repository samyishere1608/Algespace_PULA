import { TranslationNamespaces } from "@/i18n.ts";
import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { BarteringItem } from "@/types/shared/item.ts";
import { RetailBox } from "@/types/substitution/bartering/retailBox.ts";
import { Trade } from "@/types/substitution/bartering/trade.ts";
import { BarteringTranslations } from "@/types/substitution/substitutionTranslations.ts";
import RetailBoxDropzone from "@components/substitution/bartering/RetailBoxDropzone.tsx";

export default function Inventory({ inventory, canDrop }: { inventory: RetailBox[]; canDrop: (item: BarteringItem | null, trade: Trade | null) => boolean }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Substitution);

    return (
        <div className={"inventory__container"}>
            <div className={"inventory__sign"}>
                <p>{t(BarteringTranslations.INVENTORY_SIGN)}</p>
            </div>
            <div className={"inventory-boxes-container"}>
                <div className={"retail-boxes"}>
                    {inventory.map((box: RetailBox) => {
                        return <RetailBoxDropzone key={box.id} id={box.id} item={box.item} isValidDropzone={canDrop(box.item, null)} />;
                    })}
                </div>
            </div>
        </div>
    );
}
