import { CSSProperties, ReactElement, ReactNode } from "react";
import { RelationSymbol } from "@/types/math/enums.ts";
import { LinearEquation } from "@/types/math/linearEquation.ts";
import { Term } from "@/types/math/term.ts";
import "@styles/shared/equation.scss";
import ImageTerm from "./ImageTerm.tsx";

export default function ImageEquation({ equation, style }: { equation: LinearEquation; style?: CSSProperties }): ReactElement {
    let relationSymbol: ReactNode;
    switch (equation.relation) {
        case RelationSymbol.Equal: {
            relationSymbol = <p>&#61;</p>;
            break;
        }

        case RelationSymbol.Smaller: {
            relationSymbol = <p style={{ color: "red" }}>&#60;</p>;
            break;
        }
        default: {
            relationSymbol = <p style={{ color: "red" }}>&#62;</p>;
            break;
        }
    }

    return (
        <div className={"image-equation"} style={style}>
            {equation.leftTerms.map((term: Term, index: number) => {
                return <ImageTerm key={index} index={index} term={term} />;
            })}
            {relationSymbol}
            {equation.rightTerms.map((term: Term, index: number) => {
                return <ImageTerm key={index} index={index} term={term} />;
            })}
        </div>
    );
}
