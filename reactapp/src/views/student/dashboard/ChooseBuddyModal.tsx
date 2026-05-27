import { faCheck, faLock, faPalette, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, useState } from "react";
import CharacterShopModal, { CHARACTER_CATALOGUE } from "./CharacterShopModal.tsx";

// ─── Customization types — populate when real assets are ready ────────────────

/** A single wearable item (hat, accessory, outfit, etc.).
 *  Add real asset paths + names when character art is available. */
export interface BuddyAccessory {
    id: string;
    label: string;
    slot: "hat" | "outfit" | "accessory" | "background";
    assetPath: string;   // relative import path to the PNG/SVG — empty until assets exist
    unlockXp: number;    // XP required to unlock this item
}

/** The full customization state saved per student. */
export interface BuddyCustomization {
    equippedAccessories: Record<string, string>;  // slot → accessoryId
    // Future: tintColor?: string;  nameplate?: string;
}

export interface Buddy {
    id: string;
    name: string;
    emoji: string;               // placeholder — swap for <img src={assetPath}> when art arrives
    color: string;               // avatar circle colour
    unlockXp: number;            // total student XP needed to unlock this buddy
    unlockHint: string;          // human-readable hint shown in the modal
    description: string;         // flavour text
    // Future: accessories: BuddyAccessory[];  — add items when assets are ready
}

// ── Buddy roster — unlockXp thresholds set; swap emoji for real images later ──
export const BUDDIES: Buddy[] = [
    {
        id: "pippin",
        name: "Pippin",
        emoji: "🦊",
        color: "#e07b39",
        unlockXp: 0,
        unlockHint: "",
        description: "Your cheerful starting companion. Always ready to help!",
    },
    {
        id: "chimi",
        name: "Chimi",
        emoji: "🐾",
        color: "#f06292",
        unlockXp: 1000,
        unlockHint: "Reach 1 000 XP",
        description: "A playful and energetic companion. Unlocks at 1 000 XP.",
    },
    {
        id: "masterzen",
        name: "Master Zen",
        emoji: "🧘",
        color: "#6a5acd",
        unlockXp: 1500,
        unlockHint: "Reach 1 500 XP",
        description: "Ancient wisdom meets modern math. Unlocks at 1 500 XP.",
    },
    {
        id: "lumi",
        name: "Lumi",
        emoji: "🌸",
        color: "#c2185b",
        unlockXp: 3000,
        unlockHint: "Reach 3 000 XP",
        description: "A rare companion for the truly dedicated. Unlocks at 3 000 XP.",
    },
];

interface Props {
    currentBuddyId: string;
    currentXp: number;           // student's total XP — drives unlock gates
    onSelect: (id: string) => void;
    onClose: () => void;
}

export default function ChooseBuddyModal({ currentBuddyId, currentXp, onSelect, onClose }: Props): ReactElement {
    const [shopCharacterId, setShopCharacterId] = useState<string | null>(null);
    // equippedOutfitId per character — persisted to backend when XP system is wired
    const [equippedOutfits, setEquippedOutfits] = useState<Record<string, string>>({});

    function handleEquip(characterId: string, itemId: string): void {
        setEquippedOutfits((prev) => ({ ...prev, [characterId]: itemId }));
    }

    function handleBuy(characterId: string, itemId: string, _cost: number): void {
        // TODO: deduct XP via API, mark item as owned in backend
        // For now, auto-equip on buy as placeholder
        handleEquip(characterId, itemId);
    }

    if (shopCharacterId) {
        return (
            <CharacterShopModal
                characterId={shopCharacterId}
                currentXp={currentXp}
                equippedOutfitId={equippedOutfits[shopCharacterId]}
                onEquip={handleEquip}
                onBuy={handleBuy}
                onClose={() => setShopCharacterId(null)}
            />
        );
    }

    return (
        <div className={"dash-modal-backdrop"} onClick={onClose}>
            <div className={"dash-modal"} onClick={(e) => e.stopPropagation()}>
                <div className={"dash-modal__header"}>
                    <h3>Choose Buddy</h3>
                    <button className={"dash-modal__close"} onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                <p className={"dash-modal__subtitle"}>Your buddy guides you through exercises. Earn XP to unlock new companions!</p>

                <div className={"buddy-chooser"}>
                    {BUDDIES.map((buddy) => {
                        const isUnlocked = currentXp >= buddy.unlockXp;
                        const isCurrent = currentBuddyId === buddy.id;
                        const xpProgress = buddy.unlockXp === 0 ? 100 : Math.min(100, (currentXp / buddy.unlockXp) * 100);

                        return (
                            <div
                                key={buddy.id}
                                className={`buddy-chooser__item${!isUnlocked ? " buddy-chooser__item--locked" : ""}${isCurrent ? " buddy-chooser__item--current" : ""}`}
                                onClick={() => isUnlocked && onSelect(buddy.id)}
                            >
                                <div
                                    className={`buddy-chooser__avatar${isCurrent ? " buddy-chooser__avatar--selected" : ""}`}
                                    style={{ backgroundColor: buddy.color }}
                                >
                                    {(() => {
                                        const catalogEntry = CHARACTER_CATALOGUE.find((c) => c.id === buddy.id);
                                        return catalogEntry?.baseSrc
                                            ? <img src={catalogEntry.baseSrc} alt={buddy.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
                                            : buddy.emoji;
                                    })()}
                                    {!isUnlocked && (
                                        <div className={"buddy-chooser__lock-overlay"}>
                                            <FontAwesomeIcon icon={faLock} />
                                        </div>
                                    )}
                                </div>

                                <span className={"buddy-chooser__name"}>{buddy.name}</span>
                                <span className={"buddy-chooser__desc"}>{buddy.description}</span>

                                {isUnlocked ? (
                                    <>
                                        <span className={"buddy-chooser__unlocked"}>
                                            <FontAwesomeIcon icon={faCheck} /> {isCurrent ? "Active" : "Unlocked"}
                                        </span>
                                        <div className={"buddy-chooser__card-actions"}>
                                            <button
                                                className={"buddy-chooser__select-btn"}
                                                onClick={(e) => { e.stopPropagation(); onSelect(buddy.id); }}
                                            >
                                                {isCurrent ? "Selected" : "Select"}
                                            </button>
                                            <button
                                                className={"buddy-chooser__shop-btn"}
                                                title={"Open outfit shop"}
                                                onClick={(e) => { e.stopPropagation(); setShopCharacterId(buddy.id); }}
                                            >
                                                <FontAwesomeIcon icon={faPalette} />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className={"buddy-chooser__unlock-progress"}>
                                        <div className={"buddy-chooser__unlock-bar-track"}>
                                            <div
                                                className={"buddy-chooser__unlock-bar-fill"}
                                                style={{ width: `${xpProgress}%` }}
                                            />
                                        </div>
                                        <span className={"buddy-chooser__unlock-label"}>
                                            {currentXp.toLocaleString()} / {buddy.unlockXp.toLocaleString()} XP
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
