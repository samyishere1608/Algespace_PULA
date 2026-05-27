import { CSSProperties, ReactElement } from "react";
import { FlexibilityEquation } from "@/types/math/linearEquation.ts";
import { LinearSystem } from "@components/math/procedural-knowledge/LinearSystem.tsx";
import EquivalenceSymbol from "@images/flexibility/equivalence.svg";

export function TransformedSystem({ initialSystem, transformedSystem, initialSystemStyle }: { initialSystem: [FlexibilityEquation, FlexibilityEquation]; transformedSystem?: [FlexibilityEquation, FlexibilityEquation]; initialSystemStyle?: CSSProperties }): ReactElement {
    const firstSystem: ReactElement = <LinearSystem firstEquation={initialSystem[0]} secondEquation={initialSystem[1]} systemStyle={initialSystemStyle} />;

    if (transformedSystem === undefined) {
        return firstSystem;
    }

    return (
        <div className={"transformed-system"}>
            {firstSystem}
            <div className={"system-transformation__transformable-system"}>
                <img src={EquivalenceSymbol} alt={"equivalent"} style={{ marginRight: `1rem` }} />
                <LinearSystem firstEquation={transformedSystem[0]} secondEquation={transformedSystem[1]} />
            </div>
        </div>
    );
}
