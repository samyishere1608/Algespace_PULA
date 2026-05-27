export class TutorialInstruction {
    constructor(
        public readonly Instructions: string[] | undefined,
        public readonly ImageSourceDe: string,
        public readonly ImageSourceEn: string,
        public readonly Classname?: string
    ) {}
}
