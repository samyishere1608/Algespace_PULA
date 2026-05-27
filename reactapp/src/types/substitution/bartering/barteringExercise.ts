import { IMerchant, Merchant } from "./merchant.ts";
import { LinearEquation } from "@/types/math/linearEquation.ts";
import { Trade } from "./trade.ts";
import { Type } from "class-transformer";

export interface IBarteringExercise {
    readonly id: number;
    readonly linearEquation: LinearEquation;
    readonly firstMerchant: IMerchant;
    readonly secondMerchant: IMerchant;
    readonly thirdMerchant: IMerchant;
}

export class BarteringExercise implements IBarteringExercise {
    public readonly id: number;

    @Type(() => LinearEquation)
    public readonly linearEquation: LinearEquation;

    @Type(() => Merchant)
    public readonly firstMerchant: Merchant;

    @Type(() => Merchant)
    public readonly secondMerchant: Merchant;

    @Type(() => Merchant)
    public readonly thirdMerchant: Merchant;

    public trade!: Trade;

    constructor(id: number, linearEquation: LinearEquation, firstMerchant: Merchant, secondMerchant: Merchant, thirdMerchant: Merchant) {
        this.id = id;
        this.linearEquation = linearEquation;
        this.firstMerchant = firstMerchant;
        this.secondMerchant = secondMerchant;
        this.thirdMerchant = thirdMerchant;
    }

    public setTrade(): void {
        this.trade = Trade.computeTradeFromEquation(this.linearEquation);
    }
}
