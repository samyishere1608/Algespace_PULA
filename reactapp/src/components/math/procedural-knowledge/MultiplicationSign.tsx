import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Language } from "@/i18n.ts";

/**
 * The multiplication sign inside an equation.
 *
 * A raised dot is how English and German textbooks write a product, and a cross is how Japanese ones
 * do — the same operation under two notations. A student reads the one their own books use, so the
 * glyph follows the interface language rather than being fixed. Everything else in the equation is
 * unchanged by this, which is why it is one element rather than a different equation per language.
 */
export function MultiplicationSign(): ReactElement {
    const { i18n } = useTranslation();

    return <p>{i18n.language?.startsWith(Language.JA) ? "\u00d7" : "\u22c5"}</p>;
}
