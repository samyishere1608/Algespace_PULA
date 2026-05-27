import { TranslationNamespaces } from "@/i18n.ts";
import { CSSProperties, ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Weight } from "@/types/equalization/enums";
import { EqualizationConstants } from "@/types/equalization/equalizationConstants.ts";
import { EqualizationEquation } from "@/types/equalization/equalizationEquation";
import { EqualizationExercise } from "@/types/equalization/equalizationExercise";
import { EqualizationTranslations } from "@/types/equalization/equalizationTranslations.ts";
import { EqualizationItem } from "@/types/shared/item";
import ImageEquation from "@components/math/conceptual-knowledge/ImageEquation.tsx";
import { getImageSourceByName } from "@utils/itemImageLoader.ts";

export default function SystemImage({ exercise }: { exercise: EqualizationExercise }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Equalization);

    return (
        <div className={"system-image__container"}>
            <div className={"system-image__background"}>
                <SystemScale equalizationEquation={exercise.firstEquation} />
                <SystemScale equalizationEquation={exercise.secondEquation} />
            </div>
            <div className={"system-image__clamp"}>
                <p>{t(EqualizationTranslations.SYSTEM_SIGN)}</p>
            </div>
        </div>
    );
}

function SystemScale({ equalizationEquation }: { equalizationEquation: EqualizationEquation }): ReactElement {
    return (
        <div className={"system-image__scale"}>
            <div className={"system-image__scale-plates"}>
                <SystemPlate items={equalizationEquation.leftItems} />
                <SystemPlate items={equalizationEquation.rightItems} />
            </div>
            <div className={"system-image__scale-equation"}>
                <ImageEquation equation={equalizationEquation.equation} style={{ color: "var(--dark-text)" }} />
            </div>
        </div>
    );
}

function SystemPlate({ items }: { items: EqualizationItem[] }): ReactElement {
    return (
        <div className={"system-image__scale-plate"}>
            {items.map((item: EqualizationItem, index: number) => {
                const width: number | undefined = EqualizationConstants.WEIGHT_SIZES.get(item.name as Weight);
                const containerSize: CSSProperties = {
                    width: window.innerWidth < 1800 ? `${width ? width / 2 : 1.5}rem` : `${width ? width / 1.5 : 2}rem`,
                    height: "auto",
                    marginTop: "auto",
                    display: "flex"
                };
                return (
                    <div key={index} style={containerSize}>
                        <img className={"draggable-item__image"} src={getImageSourceByName(item.name)} alt={item.name} />
                    </div>
                );
            })}
        </div>
    );
}
