import { faChevronLeft, faChevronRight, faLock, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { CSSProperties, ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import { AgencyWallet, AgencyWallets, WALLET_META, getAgencyLevel, getWalletXp } from "@utils/wardrobeUtils.ts";

// ── Asset imports ─────────────────────────────────────────────────────────────
import shopBg from "@images/Character/Clothshop.jpg";

// Pippin
import pippinGif from "@images/Character/Pipin_de.png";
import pippin1 from "@images/Character/Character assets/Pipin/1.png";
import pippin2 from "@images/Character/Character assets/Pipin/2.png";
import pippin3 from "@images/Character/Character assets/Pipin/3.png";
import pippin4 from "@images/Character/Character assets/Pipin/4.png";
import pippin5 from "@images/Character/Character assets/Pipin/5.png";

// Master Zen
import masterZen1 from "@images/Character/Character assets/Master Zen/1.png";
import masterZen2 from "@images/Character/Character assets/Master Zen/2.png";
import masterZen3 from "@images/Character/Character assets/Master Zen/3.png";
import masterZen4 from "@images/Character/Character assets/Master Zen/4.png";
import masterZen5 from "@images/Character/Character assets/Master Zen/5.png";

// Lumi
import lumi1 from "@images/Character/Character assets/Lumi/1.png";
import lumi2 from "@images/Character/Character assets/Lumi/2.png";
import lumi3 from "@images/Character/Character assets/Lumi/3.png";
import lumi4 from "@images/Character/Character assets/Lumi/4.png";
import lumi5 from "@images/Character/Character assets/Lumi/5.png";

// Chimi
import chimi1 from "@images/Character/Character assets/Chimi/1.png";
import chimi2 from "@images/Character/Character assets/Chimi/2.png";
import chimi3 from "@images/Character/Character assets/Chimi/3.png";
import chimi4 from "@images/Character/Character assets/Chimi/4.png";
import chimi5 from "@images/Character/Character assets/Chimi/5.png";

// ── Shop item types ───────────────────────────────────────────────────────────

export type OutfitSlot = "outfit";   // extend with "hat" | "accessory" when assets arrive

export interface ShopItem {
    id: string;
    label: string;
    slot: OutfitSlot;
    /** Path to the character image wearing this outfit.
     *  Use undefined for items whose assets aren't ready yet. */
    previewSrc: string | undefined;
    /** Unlocks when the character's agency wallet reaches this level. */
    unlockLevel: number;
}

export interface CharacterDef {
    id: string;
    name: string;
    /** Base character image (no outfit). Falls back to emoji if undefined. */
    baseSrc: string | undefined;
    baseEmoji: string;
    baseColor: string;
    /** Agency wallet that unlocks this character. */
    unlockWallet: AgencyWallet;
    /** Wallet level required to unlock this character. */
    unlockLevel: number;
    shopItems: ShopItem[];
}

// ── Character + shop catalogue ────────────────────────────────────────────────
// Outfits unlock at wallet levels 1-5 (same thresholds as the Growth Tree).

export const CHARACTER_CATALOGUE: CharacterDef[] = [
    {
        id: "pippin",
        name: "Pippin",
        baseSrc: pippinGif,
        baseEmoji: "🦊",
        baseColor: "#e07b39",
        unlockWallet: "choice",
        unlockLevel: 0,
        shopItems: [
            {
                id: "pippin-default",
                label: "Default Look",
                slot: "outfit",
                previewSrc: pippinGif,
                unlockLevel: 0,
            },
            {
                id: "pippin-outfit-1",
                label: "Cozy Scholar",
                slot: "outfit",
                previewSrc: pippin1,
                unlockLevel: 1,
            },
            {
                id: "pippin-outfit-2",
                label: "Forest Explorer",
                slot: "outfit",
                previewSrc: pippin2,
                unlockLevel: 2,
            },
            {
                id: "pippin-outfit-3",
                label: "Ocean Breeze",
                slot: "outfit",
                previewSrc: pippin3,
                unlockLevel: 3,
            },
            {
                id: "pippin-outfit-4",
                label: "Sunset Warrior",
                slot: "outfit",
                previewSrc: pippin4,
                unlockLevel: 4,
            },
            {
                id: "pippin-outfit-5",
                label: "Starlight Mage",
                slot: "outfit",
                previewSrc: pippin5,
                unlockLevel: 5,
            },
        ],
    },
    {
        id: "chimi",
        name: "Chimi",
        baseSrc: chimi1,
        baseEmoji: "🐾",
        baseColor: "#3a86ff",
        unlockWallet: "choice",
        unlockLevel: 3,
        shopItems: [
            {
                id: "chimi-default",
                label: "Default Look",
                slot: "outfit",
                previewSrc: chimi1,
                unlockLevel: 0,
            },
            {
                id: "chimi-outfit-2",
                label: "Cozy Knit",
                slot: "outfit",
                previewSrc: chimi2,
                unlockLevel: 1,
            },
            {
                id: "chimi-outfit-3",
                label: "Adventure Kit",
                slot: "outfit",
                previewSrc: chimi3,
                unlockLevel: 2,
            },
            {
                id: "chimi-outfit-4",
                label: "Royal Cloak",
                slot: "outfit",
                previewSrc: chimi4,
                unlockLevel: 3,
            },
            {
                id: "chimi-outfit-5",
                label: "Cosmic Wanderer",
                slot: "outfit",
                previewSrc: chimi5,
                unlockLevel: 4,
            },
        ],
    },
    {
        id: "masterzen",
        name: "Master Zen",
        baseSrc: masterZen1,
        baseEmoji: "🧘",
        baseColor: "#6a5acd",
        unlockWallet: "insight",
        unlockLevel: 3,
        shopItems: [
            {
                id: "masterzen-default",
                label: "Default Look",
                slot: "outfit",
                previewSrc: masterZen1,
                unlockLevel: 0,
            },
            {
                id: "masterzen-outfit-2",
                label: "Twilight Robe",
                slot: "outfit",
                previewSrc: masterZen2,
                unlockLevel: 1,
            },
            {
                id: "masterzen-outfit-3",
                label: "Mountain Sage",
                slot: "outfit",
                previewSrc: masterZen3,
                unlockLevel: 2,
            },
            {
                id: "masterzen-outfit-4",
                label: "Storm Monk",
                slot: "outfit",
                previewSrc: masterZen4,
                unlockLevel: 3,
            },
            {
                id: "masterzen-outfit-5",
                label: "Celestial Sensei",
                slot: "outfit",
                previewSrc: masterZen5,
                unlockLevel: 4,
            },
        ],
    },
    {
        id: "lumi",
        name: "Lumi",
        baseSrc: lumi1,
        baseEmoji: "🌸",
        baseColor: "#c2185b",
        unlockWallet: "resolve",
        unlockLevel: 3,
        shopItems: [
            {
                id: "lumi-default",
                label: "Default Look",
                slot: "outfit",
                previewSrc: lumi1,
                unlockLevel: 0,
            },
            {
                id: "lumi-outfit-2",
                label: "Spring Blossom",
                slot: "outfit",
                previewSrc: lumi2,
                unlockLevel: 1,
            },
            {
                id: "lumi-outfit-3",
                label: "Ocean Dreamer",
                slot: "outfit",
                previewSrc: lumi3,
                unlockLevel: 2,
            },
            {
                id: "lumi-outfit-4",
                label: "Midnight Glow",
                slot: "outfit",
                previewSrc: lumi4,
                unlockLevel: 3,
            },
            {
                id: "lumi-outfit-5",
                label: "Starfall Dancer",
                slot: "outfit",
                previewSrc: lumi5,
                unlockLevel: 4,
            },
        ],
    },
];

// ── Utility: resolve the preview image for an equipped outfit item ───────────
export function resolveOutfitSrc(characterId: string, itemId: string): string | undefined {
    const char = CHARACTER_CATALOGUE.find((c) => c.id === characterId);
    if (!char) return undefined;
    const item = char.shopItems.find((i) => i.id === itemId);
    return item?.previewSrc ?? char.baseSrc;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
    characterId: string;
    wallets: AgencyWallets;
    equippedOutfitId: string | undefined;
    onEquip: (characterId: string, itemId: string) => void;
    onClose: () => void;
}

export default function CharacterShopModal({
    characterId,
    wallets,
    equippedOutfitId,
    onEquip,
    onClose,
}: Props): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Student);
    const character = CHARACTER_CATALOGUE.find((c) => c.id === characterId) ?? CHARACTER_CATALOGUE[0];

    const walletXp = getWalletXp(wallets, character.unlockWallet);
    const walletMeta = WALLET_META[character.unlockWallet];
    const walletName = t(walletMeta.labelKey);
    const isCharacterLocked = getAgencyLevel(walletXp) < character.unlockLevel;

    const items = character.shopItems.map((item) => ({
        ...item,
        unlocked: getAgencyLevel(walletXp) >= item.unlockLevel,
    }));
    const [itemIndex, setItemIndex] = useState<number>(() => {
        const idx = items.findIndex((i) => i.id === equippedOutfitId);
        return idx >= 0 ? idx : 0;
    });

    const currentItem = items[itemIndex] as (ShopItem & { unlocked: boolean }) | undefined;
    const currentItemUnlocked = currentItem?.unlocked ?? false;

    function prev(): void {
        setItemIndex((i) => (i - 1 + items.length) % items.length);
    }

    function next(): void {
        setItemIndex((i) => (i + 1) % items.length);
    }

    function handleAction(): void {
        if (!currentItem || !currentItemUnlocked) return;
        onEquip(character.id, currentItem.id);
    }

    // Decide what to show in the character viewport
    const previewSrc = currentItem?.previewSrc ?? character.baseSrc;

    return (
        <>
            <div className={"dash-modal-backdrop char-shop-backdrop"} onClick={onClose}>
                <div className={"char-shop"} style={{ "--wallet": walletMeta.color, "--buddy": character.baseColor } as CSSProperties} onClick={(e) => e.stopPropagation()}>
                {/* Close */}
                <button className={"char-shop__close"} onClick={onClose} aria-label={t("dashboard-wardrobe")}>
                    <FontAwesomeIcon icon={faTimes} />
                </button>

                {/* Wardrobe viewport */}
                <div
                    className={"char-shop__viewport"}
                    style={{ backgroundImage: `url(${shopBg})` }}
                >
                    {isCharacterLocked && (
                        <div className={"char-shop__locked-overlay"}>
                            <FontAwesomeIcon icon={faLock} />
                            <span>{t("shop-unlock-wallet", { wallet: walletName, level: character.unlockLevel })}</span>
                        </div>
                    )}

                    {previewSrc ? (
                        <img
                            key={currentItem?.id ?? "base"}
                            className={"char-shop__character-img"}
                            src={previewSrc}
                            alt={character.name}
                        />
                    ) : (
                        <div
                            className={"char-shop__character-fallback"}
                            style={{ backgroundColor: character.baseColor }}
                        >
                            {character.baseEmoji}
                        </div>
                    )}

                    {/* Arrows — only shown when there are items to browse */}
                    {items.length > 1 && !isCharacterLocked && (
                        <>
                            <button className={"char-shop__arrow char-shop__arrow--left"} onClick={prev}>
                                <FontAwesomeIcon icon={faChevronLeft} />
                            </button>
                            <button className={"char-shop__arrow char-shop__arrow--right"} onClick={next}>
                                <FontAwesomeIcon icon={faChevronRight} />
                            </button>
                        </>
                    )}
                </div>

                {/* Item info + action */}
                {currentItem && !isCharacterLocked && (
                    <div className={"char-shop__info"}>
                        <span className={"char-shop__item-name"}>{t(`shop-outfit-${currentItem.id}`, currentItem.label).toUpperCase()}</span>

                        {currentItemUnlocked ? (
                            <span className={"char-shop__cost char-shop__cost--owned"}>{t("shop-owned")}</span>
                        ) : (
                            <span className={"char-shop__cost"} style={{ color: walletMeta.color }}>
                                <FontAwesomeIcon icon={faLock} /> {t("shop-outfit-locked", { wallet: walletName, level: currentItem.unlockLevel })}
                            </span>
                        )}

                        <button
                            className={`char-shop__action-btn${
                                currentItemUnlocked ? " char-shop__action-btn--equip" : " char-shop__action-btn--locked"
                            }`}
                            onClick={handleAction}
                            disabled={!currentItemUnlocked}
                        >
                            {currentItemUnlocked
                                ? equippedOutfitId === currentItem.id
                                    ? t("shop-equipped")
                                    : t("shop-equip")
                                : t("shop-locked")}
                        </button>

                        {/* Dot indicators */}
                        <div className={"char-shop__dots"}>
                            {items.map((item, i) => (
                                <button
                                    key={item.id}
                                    className={`char-shop__dot${i === itemIndex ? " char-shop__dot--active" : ""}`}
                                    onClick={() => setItemIndex(i)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {items.length === 0 && !isCharacterLocked && (
                    <div className={"char-shop__info"}>
                        <span className={"char-shop__item-name"}>{character.name}</span>
                        <span className={"char-shop__cost char-shop__cost--owned"}>
                            More outfits coming soon!
                        </span>
                    </div>
                )}
            </div>
            </div>
        </>
    );
}
