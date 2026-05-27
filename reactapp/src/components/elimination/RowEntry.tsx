import { Fraction } from "mathjs";
import { ReactElement } from "react";
import { EliminationConstants } from "@/types/elimination/eliminationConstants.ts";
import { RowHeight } from "@/types/elimination/enums.ts";
import { math } from "@/types/math/math.ts";
import { getImageSourceByName } from "@utils/itemImageLoader.ts";
import { formatNumber } from "@utils/utils.ts";

export default function RowEntry({ entry, variable, showFractions, showImages, entryHeight }: { entry: Fraction; variable: string; showFractions: boolean; showImages: boolean; entryHeight: RowHeight }): ReactElement {
    let content: ReactElement | undefined;
    if (showImages && substitutableByImages(entry)) {
        content = <EntryImages variable={variable as string} amount={entry.n} />;
    } else {
        content = <EntryCoefficient coefficient={entry} showFractions={showFractions} />;
    }

    let height: string;
    switch (entryHeight) {
        case RowHeight.Single: {
            height = "3.5rem";
            break;
        }
        case RowHeight.Double: {
            height = "4rem";
            break;
        }
        case RowHeight.Triple: {
            height = "5.5rem";
            break;
        }
    }

    return (
        <th className={"notebook__table-entry"} style={{ height: height }}>
            {content}
        </th>
    );

    function substitutableByImages(fraction: Fraction): boolean {
        if (fraction.d === 1 && fraction.s === 1) {
            return fraction.n > 0 && fraction.n <= EliminationConstants.MAX_IMAGES;
        }
        return false;
    }
}

export function EntryImages({ variable, amount }: { variable: string; amount: number }) {
    return (
        <div className={"notebook__table-images-entry"}>
            {[...Array(amount)].map((_, index: number) => {
                return <img src={getImageSourceByName(variable)} alt={variable} key={index} />;
            })}
        </div>
    );
}

function EntryCoefficient({ coefficient, showFractions }: { coefficient: Fraction; showFractions: boolean }): ReactElement {
    if (math.isZero(coefficient)) {
        return <p>0</p>;
    } else if (showFractions && coefficient.d !== 1 && coefficient.n < EliminationConstants.UPPER_BOUND && coefficient.d < EliminationConstants.UPPER_BOUND) {
        // We check upper bound to prevent fractions that are too large
        return (
            <div className={"notebook__fraction"}>
                <p className={"notebook__fraction-numerator"}>{coefficient.s * coefficient.n}</p>
                <p className={"notebook__fraction-denominator"}>{coefficient.d}</p>
            </div>
        );
    } else {
        return <p>{formatNumber((coefficient.s * coefficient.n) / coefficient.d)}</p>;
    }
}
