import { Type } from "class-transformer";
import { ILinearEquation, LinearEquation } from "@/types/math/linearEquation.ts";
import { Trade } from "./trade.ts";

export interface IMerchant {
    readonly productType: ProductType;
    readonly linearEquation: ILinearEquation;
}

export class Merchant implements IMerchant {
    public readonly productType: ProductType;

    @Type(() => LinearEquation)
    public readonly linearEquation: LinearEquation;

    public trade!: Trade;

    constructor(productType: ProductType, linearEquation: LinearEquation) {
        this.productType = productType;
        this.linearEquation = linearEquation;
    }

    public setTrade(): void {
        this.trade = Trade.computeTradeFromEquation(this.linearEquation);
    }
}

export enum ProductType {
    Fruits,
    Goods,
    Spices
}
