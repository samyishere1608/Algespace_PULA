import i18n, { Language, LanguageExtension, TranslationNamespaces, getCurrentLanguage } from "@/i18n.ts";
import { Operator } from "@/types/math/enums.ts";
import { Term } from "@/types/math/term.ts";

export function termsToTranslatedText(terms: Term[], extension?: LanguageExtension, pluralExtension?: boolean): string {
    const language: string = getCurrentLanguage();
    return terms.map((term: Term, index: number) => termToTranslatedText(term, true, index === 0, language, extension, pluralExtension)).join(" ");
}

export function termToTranslatedText(term: Term, translateOperator: boolean, onlyMinusOperator: boolean, language: string, extension?: LanguageExtension, pluralExtension?: boolean): string {
    return variableToTranslatedText(language, term.variable as string, term.coefficient.value as number, term.operator !== null ? (term.operator as Operator) : undefined, translateOperator, onlyMinusOperator, extension, pluralExtension);
}

export function variableToTranslatedText(language: string, variable: string, coefficient: number, operator?: Operator, translateOperator?: boolean, onlyMinusOperator?: boolean, extension?: LanguageExtension, pluralExtension?: boolean) {
    let op: string = "";
    if (translateOperator && operator !== undefined) {
        if (!(onlyMinusOperator && Operator.Plus)) {
            op = operatorToText(operator) + " ";
        }
    }

    if (coefficient > 1) {
        const factor: string = coefficient > 9 ? coefficient.toString() : i18n.t("number-" + coefficient, { ns: TranslationNamespaces.Variables });
        const item: string = i18n.t(variable + "-plural" + (!pluralExtension || language === Language.EN || extension === undefined ? "" : extension), { ns: TranslationNamespaces.Variables });
        return op + factor + " " + item;
    }

    return op + i18n.t(variable + (language === Language.EN || extension === undefined ? "" : extension), { ns: TranslationNamespaces.Variables });
}

function operatorToText(operator: Operator): string {
    if (operator === Operator.Minus) {
        return "minus";
    }
    return "plus";
}

export function appendLanguageExtension(input: string, extension: LanguageExtension): string {
    if (getCurrentLanguage() === Language.EN) {
        return i18n.t(input, { ns: TranslationNamespaces.Variables });
    }
    return i18n.t(input + extension, { ns: TranslationNamespaces.Variables });
}

export function appendPluralAndLanguageExtension(input: string, extension?: LanguageExtension): string {
    const plural: string = input + "-plural";
    if (getCurrentLanguage() === Language.EN || extension === undefined) {
        return i18n.t(plural, { ns: TranslationNamespaces.Variables });
    }
    return i18n.t(plural + extension, { ns: TranslationNamespaces.Variables });
}
