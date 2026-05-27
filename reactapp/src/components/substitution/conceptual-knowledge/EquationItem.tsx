import { ReactElement } from "react";
import { Operator } from "@/types/math/enums.ts";
import { SubstitutionItem } from "@/types/shared/item.ts";
import { SubstitutionLocation } from "@/types/substitution/conceptual-knowledge/enums.ts";
import DraggableItem from "@components/shared/DraggableItem.tsx";
import { getImageSourceByName } from "@utils/itemImageLoader.ts";

const contents = (item: SubstitutionItem, classname?: string): ReactElement => (
    <div className={classname !== undefined ? `equation-item__contents ${classname}` : "equation-item__contents"}>
        <p>
            {item.amount}
            <span>&#215;</span>
        </p>
        <div className={"equation-item__image-container"}>
            <img src={getImageSourceByName(item.name)} alt={item.name} />
        </div>
    </div>
);

const operator = (operator: Operator, index: number): ReactElement => {
    if (operator === Operator.Plus) {
        return <p className={"substitution-equation__operator"}>&#43;</p>;
    } else {
        return index === 0 ? <p className={"substitution-equation__operator"}>-</p> : <p className={"substitution-equation__operator"}>&#8722;</p>;
    }
};

export function PlainEquationItem({ item, index, showOperator, cssClass, invertedOperator }: { item: SubstitutionItem; index: number; showOperator: boolean; cssClass?: string; invertedOperator?: Operator }): ReactElement {
    return (
        <div className={`equation-item ${cssClass !== undefined ? cssClass : ""}`}>
            {showOperator && (invertedOperator !== undefined ? operator(invertedOperator, index) : operator(item.operator, index))}
            {contents(item)}
        </div>
    );
}

export function SelectableEquationItem({ location, item, index, showOperator, isSolution, handleClick }: { location: SubstitutionLocation; item: SubstitutionItem; index: number; showOperator: boolean; isSolution: (item: SubstitutionItem) => boolean; handleClick: (isValid: boolean, selectedItem: SubstitutionItem, location: SubstitutionLocation) => void }): ReactElement {
    return (
        <div className={"equation-item"}>
            {showOperator && operator(item.operator, index)}
            <button className="equation-item__button-body" onClick={() => handleClick(isSolution(item), item, location)}>
                {contents(item)}
            </button>
        </div>
    );
}

export function DraggableEquationItem({ item, index, showOperator, inDropzone }: { item: SubstitutionItem; index: number; showOperator: boolean; inDropzone: boolean }): ReactElement {
    return (
        <div className={"equation-item"}>
            {showOperator && operator(item.operator, index)}
            <div className={"equation-item__grid"}>
                {contents(item, "equation-item__grid-item")}
                <DraggableItem source={inDropzone} item={item} index={index} className="--substitution equation-item__grid-item" children={contents(item)} />
            </div>
        </div>
    );
}
