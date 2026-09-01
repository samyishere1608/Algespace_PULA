import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";
import about from "@translations/de/about.json";
import elimination from "@translations/de/elimination.json";
import equalization from "@translations/de/equalization.json";
import error from "@translations/de/error.json";
import flexibility from "@translations/de/flexibility.json";
import general from "@translations/de/general.json";
import study from "@translations/de/study.json";
import substitution from "@translations/de/substitution.json";
import variables from "@translations/de/variables.json";
import student from "@translations/de/student.json";
import aboutJA from "@translations/ja/about.json";
import eliminationJA from "@translations/ja/elimination.json";
import equalizationJA from "@translations/ja/equalization.json";
import errorJA from "@translations/ja/error.json";
import flexibilityJA from "@translations/ja/flexibility.json";
import generalJA from "@translations/ja/general.json";
import studyJA from "@translations/ja/study.json";
import substitutionJA from "@translations/ja/substitution.json";
import variablesJA from "@translations/ja/variables.json";
import studentJA from "@translations/ja/student.json";
import aboutEN from "@translations/en/about.json";
import eliminationEN from "@translations/en/elimination.json";
import equalizationEN from "@translations/en/equalization.json";
import errorEN from "@translations/en/error.json";
import flexibilityEN from "@translations/en/flexibility.json";
import generalEN from "@translations/en/general.json";
import studyEN from "@translations/en/study.json";
import substitutionEN from "@translations/en/substitution.json";
import variablesEN from "@translations/en/variables.json";
import studentEN from "@translations/en/student.json";

export enum Language {
    DE = "de",
    EN = "en",
    JA = "ja"
}

export enum LanguageExtension {
    Nom = "-nom",
    Gen = "-gen",
    Akk = "-akk"
}

export enum TranslationNamespaces {
    About = "about",
    Elimination = "elimination",
    Error = "error",
    Equalization = "equalization",
    General = "general",
    Substitution = "substitution",
    Variables = "variables",
    Study = "study",
    Flexibility = "flexibility",
    Student = "student"
}

i18n.use(Backend)
    .use(LanguageDetector) // Required to keep language e.g. on page reload
    .use(initReactI18next)
    .init({
        detection: {
            order: ["localStorage"],
            lookupLocalStorage: "i18nextLng",
            caches: ["localStorage"]
        },
        fallbackLng: Language.DE,
        defaultNS: TranslationNamespaces.General,
        keySeparator: false,
        interpolation: {
            escapeValue: false,
            skipOnVariables: false
        },
        resources: {
            ja: {
                general: generalJA,
                elimination: eliminationJA,
                error: errorJA,
                equalization: equalizationJA,
                substitution: substitutionJA,
                variables: variablesJA,
                study: studyJA,
                about: aboutJA,
                flexibility: flexibilityJA,
                student: studentJA
            },
            en: {
                general: generalEN,
                elimination: eliminationEN,
                error: errorEN,
                equalization: equalizationEN,
                substitution: substitutionEN,
                variables: variablesEN,
                study: studyEN,
                about: aboutEN,
                flexibility: flexibilityEN,
                student: studentEN
            },
            de: {
                general,
                elimination,
                error,
                equalization,
                substitution,
                variables,
                study,
                about,
                flexibility,
                student
            }
        }
    });

export default i18n;

/** Returns the current language only if the backend supports it; otherwise falls back to "en". */
export function getCurrentLanguage(): string {
    const BACKEND_SUPPORTED = ["de", "en", "ja"];
    return BACKEND_SUPPORTED.includes(i18n.language) ? i18n.language : "en";
}
