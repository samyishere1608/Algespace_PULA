import { ReactElement } from "react";
import { Language } from "@/i18n.ts";

const stepDE: string = "Schritt";
const stepEN: string = "Step";

export function Step({ language, num, instruction, description }: { language: string, num: number, instruction: string, description: string }): ReactElement {
    return <div className={"worked-examples__step"}>
        <p className={"worked-examples__step-label"}><strong>{language === Language.DE ? stepDE : stepEN} {num}:</strong></p>
        <p className={"worked-examples__step-text"}><b>{instruction}</b> {description}</p>
    </div>;
}