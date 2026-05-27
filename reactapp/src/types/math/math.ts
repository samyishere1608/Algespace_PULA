import { MathJsInstance, all, create } from "mathjs";

export const math: MathJsInstance = create(all, {
    number: "Fraction"
});
