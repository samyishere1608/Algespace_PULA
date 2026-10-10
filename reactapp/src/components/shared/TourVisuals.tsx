import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { faBullseye, faLightbulb, faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TranslationNamespaces } from "@/i18n.ts";
import { GrowingTree } from "@components/shared/GrowingTree.tsx";
import { WALLET_META, type AgencyWallet, type AgencyWallets } from "@utils/wardrobeUtils.ts";
import type { TourVisual } from "@utils/onboardingTour.ts";

interface Props {
    visual: TourVisual;
    /** The student's buddy, for the introduction step. */
    buddyName: string;
    buddyImage?: string;
    wallets: AgencyWallets;
}

/**
 * The graphics the opening steps use in place of a spotlight.
 *
 * Everything here is built from the app's OWN pieces — the agency colours and icons come from
 * `WALLET_META`, the growth tree is the real `GrowingTree` component, and the wording comes from the
 * same `agency-*` keys the "How to earn XP" popover uses. That matters more than it sounds: a tour
 * that invents its own colour for Resolve, or its own description of what earns Choice, teaches a
 * second version of the system that the student then has to unlearn.
 *
 * Returns null for a step with no visual, so the caller can render this unconditionally.
 */
export function TourVisualBlock({ visual, buddyName, buddyImage, wallets }: Props): ReactElement | null {
    const { t } = useTranslation(TranslationNamespaces.Student);

    switch (visual) {
        /**
         * The buddy introducing itself.
         *
         * The name is the student's ACTUAL buddy rather than a hard-coded "Pippin". For a first run
         * that is Pippin, because Pippin is the only character unlocked at the start — but a student
         * who has since switched to Lumi and replays the tour should not be told they are looking at
         * someone else's guide.
         */
        case "buddy":
            return (
                <div className={"tour-visual tour-visual--buddy"}>
                    {buddyImage !== undefined && (
                        <img className={"tour-visual__portrait"} src={buddyImage} alt={""} />
                    )}
                    <span className={"tour-visual__name"}>{buddyName}</span>
                </div>
            );

        /** The three solving methods — what the platform actually teaches. */
        case "methods":
            return (
                <div className={"tour-visual tour-visual__chips"}>
                    {/* The exercise module's OWN names for the three methods, read from its namespace
                        rather than re-typed here. Re-typing them is how an app ends up with two
                        different Japanese words for one method: these are the words the exercise
                        list itself shows. */}
                    <span className={"tour-visual__chip"}>{t("equalization-method", { ns: TranslationNamespaces.Flexibility })}</span>
                    <span className={"tour-visual__chip"}>{t("substitution-method", { ns: TranslationNamespaces.Flexibility })}</span>
                    <span className={"tour-visual__chip"}>{t("elimination-method", { ns: TranslationNamespaces.Flexibility })}</span>
                </div>
            );

        /** The three currencies, side by side, so "three separate tracks" is visible and not just said. */
        case "currency":
            return (
                <div className={"tour-visual tour-visual__chips"}>
                    {(["choice", "insight", "resolve"] as const).map((wallet) => (
                        <span key={wallet} className={"tour-visual__pill"} style={{ borderColor: WALLET_META[wallet].color }}>
                            <FontAwesomeIcon icon={WALLET_ICONS[wallet]} style={{ color: WALLET_META[wallet].color }} />
                            {t(WALLET_META[wallet].labelKey)}
                        </span>
                    ))}
                </div>
            );

        /**
         * The point system, in detail: what each currency is FOR, one line each.
         *
         * The descriptions are the dashboard's own `agency-*-desc` strings, so the tour and the
         * "How to earn XP" popover can never disagree about what earns what.
         */
        case "xp":
            return (
                <div className={"tour-visual tour-visual__rows"}>
                    {(["choice", "insight", "resolve"] as const).map((wallet) => (
                        <div key={wallet} className={"tour-visual__row"}>
                            <span className={"tour-visual__row-icon"} style={{ color: WALLET_META[wallet].color }}>
                                <FontAwesomeIcon icon={WALLET_ICONS[wallet]} />
                            </span>
                            <span className={"tour-visual__row-body"}>
                                <span className={"tour-visual__row-label"}>{t(WALLET_META[wallet].labelKey)}</span>
                                <span className={"tour-visual__row-desc"}>{t(WALLET_DESC_KEYS[wallet])}</span>
                            </span>
                        </div>
                    ))}
                </div>
            );

        /**
         * The growth tree — the REAL component, drawn with the student's own XP.
         *
         * Deliberately not an illustration of a tree. The tree on the Growth Tree tab is generated
         * from the three wallets, so showing a drawing would be showing something the student will
         * never actually have. On a first run this renders mostly bare, which is the honest picture
         * and the better lesson: it is empty because nothing has been earned yet.
         */
        case "tree":
            return (
                <div className={"tour-visual tour-visual--tree"}>
                    <GrowingTree choiceXP={wallets.choiceXP} insightXP={wallets.insightXP} resolveXP={wallets.resolveXP} />
                </div>
            );

        default:
            return null;
    }
}

/** The same three marks the nav pills and the XP popover use. */
const WALLET_ICONS = {
    choice: faBullseye,
    insight: faLightbulb,
    resolve: faShieldHalved,
} as const;

/** The dashboard's own descriptions of what earns each currency — reused, not rewritten. */
const WALLET_DESC_KEYS: Record<AgencyWallet, string> = {
    choice: "agency-choice-desc",
    insight: "agency-insight-desc",
    resolve: "agency-resolve-desc",
};
