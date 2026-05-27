import { faChevronLeft, faChevronRight, faLock, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, useState } from "react";
import { getOwnedOutfitIds } from "@utils/wardrobeUtils.ts";
import cashRegisterSound from "@/assets/sounds/Cash register.mp3";

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
    coinCost: number;
    owned: boolean;
}

export interface CharacterDef {
    id: string;
    name: string;
    /** Base character image (no outfit). Falls back to emoji if undefined. */
    baseSrc: string | undefined;
    baseEmoji: string;
    baseColor: string;
    unlockXp: number;
    shopItems: ShopItem[];
}

// ── Character + shop catalogue ────────────────────────────────────────────────
// Add outfit preview images to `previewSrc` as assets become available.

export const CHARACTER_CATALOGUE: CharacterDef[] = [
    {
        id: "pippin",
        name: "Pippin",
        baseSrc: pippinGif,
        baseEmoji: "🦊",
        baseColor: "#e07b39",
        unlockXp: 0,
        shopItems: [
            {
                id: "pippin-default",
                label: "Default Look",
                slot: "outfit",
                previewSrc: pippinGif,
                coinCost: 0,
                owned: true,   // always free
            },
            {
                id: "pippin-outfit-1",
                label: "Cozy Scholar",
                slot: "outfit",
                previewSrc: pippin1,
                coinCost: 100,
                owned: false,
            },
            {
                id: "pippin-outfit-2",
                label: "Forest Explorer",
                slot: "outfit",
                previewSrc: pippin2,
                coinCost: 250,
                owned: false,
            },
            {
                id: "pippin-outfit-3",
                label: "Ocean Breeze",
                slot: "outfit",
                previewSrc: pippin3,
                coinCost: 500,
                owned: false,
            },
            {
                id: "pippin-outfit-4",
                label: "Sunset Warrior",
                slot: "outfit",
                previewSrc: pippin4,
                coinCost: 750,
                owned: false,
            },
            {
                id: "pippin-outfit-5",
                label: "Starlight Mage",
                slot: "outfit",
                previewSrc: pippin5,
                coinCost: 1000,
                owned: false,
            },
        ],
    },
    {
        id: "chimi",
        name: "Chimi",
        baseSrc: chimi1,
        baseEmoji: "🐾",
        baseColor: "#f06292",
        unlockXp: 1000,
        shopItems: [
            {
                id: "chimi-default",
                label: "Default Look",
                slot: "outfit",
                previewSrc: chimi1,
                coinCost: 0,
                owned: true,
            },
            {
                id: "chimi-outfit-2",
                label: "Cozy Knit",
                slot: "outfit",
                previewSrc: chimi2,
                coinCost: 100,
                owned: false,
            },
            {
                id: "chimi-outfit-3",
                label: "Adventure Kit",
                slot: "outfit",
                previewSrc: chimi3,
                coinCost: 250,
                owned: false,
            },
            {
                id: "chimi-outfit-4",
                label: "Royal Cloak",
                slot: "outfit",
                previewSrc: chimi4,
                coinCost: 500,
                owned: false,
            },
            {
                id: "chimi-outfit-5",
                label: "Cosmic Wanderer",
                slot: "outfit",
                previewSrc: chimi5,
                coinCost: 750,
                owned: false,
            },
        ],
    },
    {
        id: "masterzen",
        name: "Master Zen",
        baseSrc: masterZen1,
        baseEmoji: "🧘",
        baseColor: "#6a5acd",
        unlockXp: 1500,
        shopItems: [
            {
                id: "masterzen-default",
                label: "Default Look",
                slot: "outfit",
                previewSrc: masterZen1,
                coinCost: 0,
                owned: true,
            },
            {
                id: "masterzen-outfit-2",
                label: "Twilight Robe",
                slot: "outfit",
                previewSrc: masterZen2,
                coinCost: 100,
                owned: false,
            },
            {
                id: "masterzen-outfit-3",
                label: "Mountain Sage",
                slot: "outfit",
                previewSrc: masterZen3,
                coinCost: 250,
                owned: false,
            },
            {
                id: "masterzen-outfit-4",
                label: "Storm Monk",
                slot: "outfit",
                previewSrc: masterZen4,
                coinCost: 500,
                owned: false,
            },
            {
                id: "masterzen-outfit-5",
                label: "Celestial Sensei",
                slot: "outfit",
                previewSrc: masterZen5,
                coinCost: 750,
                owned: false,
            },
        ],
    },
    {
        id: "lumi",
        name: "Lumi",
        baseSrc: lumi1,
        baseEmoji: "🌸",
        baseColor: "#c2185b",
        unlockXp: 3000,
        shopItems: [
            {
                id: "lumi-default",
                label: "Default Look",
                slot: "outfit",
                previewSrc: lumi1,
                coinCost: 0,
                owned: true,
            },
            {
                id: "lumi-outfit-2",
                label: "Spring Blossom",
                slot: "outfit",
                previewSrc: lumi2,
                coinCost: 100,
                owned: false,
            },
            {
                id: "lumi-outfit-3",
                label: "Ocean Dreamer",
                slot: "outfit",
                previewSrc: lumi3,
                coinCost: 250,
                owned: false,
            },
            {
                id: "lumi-outfit-4",
                label: "Midnight Glow",
                slot: "outfit",
                previewSrc: lumi4,
                coinCost: 500,
                owned: false,
            },
            {
                id: "lumi-outfit-5",
                label: "Starfall Dancer",
                slot: "outfit",
                previewSrc: lumi5,
                coinCost: 750,
                owned: false,
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
    studentId: number | string;
    characterId: string;
    currentXp: number;
    currentCoins: number;
    equippedOutfitId: string | undefined;
    onEquip: (characterId: string, itemId: string) => void;
    /** Called when student spends coins to buy an item — deduct coins in parent */
    onBuy: (characterId: string, itemId: string, coinCost: number) => void;
    onClose: () => void;
}

export default function CharacterShopModal({
    studentId,
    characterId,
    currentXp,
    currentCoins,
    equippedOutfitId,
    onEquip,
    onBuy,
    onClose,
}: Props): ReactElement {
    const character = CHARACTER_CATALOGUE.find((c) => c.id === characterId) ?? CHARACTER_CATALOGUE[0];

    // Merge static catalogue owned=true (free items) with localStorage-persisted owned ids (scoped per student)
    const ownedIds = getOwnedOutfitIds(studentId, character.id);
    const items = character.shopItems.map((item) => ({
        ...item,
        owned: item.coinCost === 0 || ownedIds.includes(item.id),
    }));
    const [itemIndex, setItemIndex] = useState<number>(() => {
        const idx = items.findIndex((i) => i.id === equippedOutfitId);
        return idx >= 0 ? idx : 0;
    });

    const currentItem = items[itemIndex] as ShopItem | undefined;
    const canAfford = currentItem ? currentCoins >= currentItem.coinCost : false;
    const isCharacterLocked = currentXp < character.unlockXp;


    function playCashRegister() {
        const audio = new Audio(cashRegisterSound);
        audio.play();
    }

    function prev(): void {
        setItemIndex((i) => (i - 1 + items.length) % items.length);
    }

    function next(): void {
        setItemIndex((i) => (i + 1) % items.length);
    }

    function handleAction(): void {
        if (!currentItem) return;
        if (currentItem.owned) {
            onEquip(character.id, currentItem.id);
        } else if (canAfford) {
            playCashRegister();
            onBuy(character.id, currentItem.id, currentItem.coinCost);
        }
    }

    // Decide what to show in the character viewport
    const previewSrc = currentItem?.previewSrc ?? character.baseSrc;

    return (
        <>
            <div className={"dash-modal-backdrop char-shop-backdrop"} onClick={onClose}>
                <div className={"char-shop"} onClick={(e) => e.stopPropagation()}>
                {/* Close */}
                <button className={"char-shop__close"} onClick={onClose}>
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
                            <span>Unlock at {character.unlockXp.toLocaleString()} XP</span>
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
                        <span className={"char-shop__item-name"}>{currentItem.label.toUpperCase()}</span>

                        {currentItem.owned ? (
                            <span className={"char-shop__cost char-shop__cost--owned"}>Owned</span>
                        ) : (
                            <span className={"char-shop__cost"}>
                                🪙 {currentItem.coinCost.toLocaleString()}
                            </span>
                        )}

                        <button
                            className={`char-shop__action-btn${
                                currentItem.owned
                                    ? " char-shop__action-btn--equip"
                                    : canAfford
                                    ? " char-shop__action-btn--buy"
                                    : " char-shop__action-btn--locked"
                            }`}
                            disabled={!currentItem.owned && !canAfford}
                            onClick={handleAction}
                        >
                            {currentItem.owned
                                ? equippedOutfitId === currentItem.id
                                    ? "Equipped ✓"
                                    : "Equip"
                                : canAfford
                                ? "Buy"
                                : `Need ${(currentItem.coinCost - currentCoins).toLocaleString()} more 🪙`}
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
