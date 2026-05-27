export interface ITranslationInterpolation {
    readonly translationKey: string;
    readonly interpolationVariables: object | null;
}

export class TranslationInterpolation implements ITranslationInterpolation {
    constructor(
        public readonly translationKey: string,
        public readonly interpolationVariables: object | null
    ) {}
}
