import { Method } from "@/types/flexibility/enums.ts";
import { Type } from "class-transformer";

export interface IOption {
    readonly text: string;
    readonly isSolution: boolean;
    readonly reason?: string | undefined | null;
}

export class Option implements IOption {
    public readonly text: string;

    public readonly isSolution: boolean;

    public readonly reason?: string | null;

    constructor(text: string, isSolution: boolean, reason?: string | null) {
        this.text = text;
        this.isSolution = isSolution;
        this.reason = reason;
    }
}

export interface ISelfExplanation {
    readonly method: Method;
    readonly isSingleChoice: boolean;
    readonly options: IOption[];
}

export class SelfExplanation implements ISelfExplanation {
    public readonly method: Method;

    public readonly isSingleChoice: boolean;

    @Type(() => Option)
    public options: Option[];

    constructor(method: Method, isSingleChoice: boolean, options: Option[]) {
        this.method = method;
        this.isSingleChoice = isSingleChoice;
        this.options = options;
    }
}