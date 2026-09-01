import { faCheck, faLock, faPalette, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { CSSProperties, ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import CharacterShopModal, { CHARACTER_CATALOGUE } from "./CharacterShopModal.tsx";
import { AgencyWallet, AgencyWallets, WALLET_META, getAgencyLevel, getWalletXp } from "@utils/wardrobeUtils.ts";

// ─── Customization types — populate when real assets are ready ────────────────

/** A single wearable item (hat, accessory, outfit, etc.).
 *  Add real asset paths + names when character art is available. */
export interface BuddyAccessory {
    id: string;
    label: string;
    slot: "hat" | "outfit" | "accessory" | "background";
    assetPath: string;   // relative import path to the PNG/SVG — empty until assets exist
    unlockLevel: number; // agency wallet level required to unlock this item
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
    /** Agency wallet that unlocks this buddy. */
    unlockWallet: AgencyWallet;
    /** Wallet level required to unlock this buddy. */
    unlockLevel: number;
    description: string;         // flavour text
    // Future: accessories: BuddyAccessory[];  — add items when assets are ready
}

// ── Buddy roster — wallet-themed unlocks (same levels as the Growth Tree) ─────
export const BUDDIES: Buddy[] = [
    {
        id: "pippin",
        name: "Pippin",
        emoji: "🦊",
        color: "#e07b39",
        unlockWallet: "choice",
        unlockLevel: 0,
        description: "Your cheerful starting companion. Always ready to help!",
    },
    {
        id: "chimi",
        name: "Chimi",
        emoji: "🐾",
        color: "#3a86ff",
        unlockWallet: "choice",
        unlockLevel: 3,
        description: "A playful, decisive companion. Unlocks at Choice level 3.",
    },
    {
        id: "masterzen",
        name: "Master Zen",
        emoji: "🧘",
        color: "#6a5acd",
        unlockWallet: "insight",
        unlockLevel: 3,
        description: "Ancient wisdom meets modern math. Unlocks at Insight level 3.",
    },
    {
        id: "lumi",
        name: "Lumi",
        emoji: "🌸",
        color: "#c2185b",
        unlockWallet: "resolve",
        unlockLevel: 3,
        description: "A rare companion for the truly dedicated. Unlocks at Resolve level 3.",
    },
];

interface Props {
    currentBuddyId: string;
    wallets: AgencyWallets;      // agency XP — drives wallet-level unlock gates
    onSelect: (id: string) => void;
    onClose: () => void;
}

export default function ChooseBuddyModal({ currentBuddyId, wallets, onSelect, onClose }: Props): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Student);
    const [shopCharacterId, setShopCharacterId] = useState<string | null>(null);
    // equippedOutfitId per character — persisted to backend when XP system is wired
    const [equippedOutfits, setEquippedOutfits] = useState<Record<string, string>>({});

    function handleEquip(characterId: string, itemId: string): void {
        setEquippedOutfits((prev) => ({ ...prev, [characterId]: itemId }));
    }

    if (shopCharacterId) {
        return (
            <CharacterShopModal
                characterId={shopCharacterId}
                wallets={wallets}
                equippedOutfitId={equippedOutfits[shopCharacterId]}
                onEquip={handleEquip}
                onClose={() => setShopCharacterId(null)}
            />
        );
    }

    return (
        <div className={"dash-modal-backdrop"} onClick={onClose}>
            <div className={"dash-modal"} onClick={(e) => e.stopPropagation()}>
                <div className={"dash-modal__header"}>
                    <h3>{t("buddy-title")}</h3>
                    <button className={"dash-modal__close"} onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                <p className={"dash-modal__subtitle"}>{t("buddy-subtitle")}</p>

                <div className={"buddy-chooser"}>
                    {BUDDIES.map((buddy) => {
                        const walletXp = getWalletXp(wallets, buddy.unlockWallet);
                        const walletLevel = getAgencyLevel(walletXp);
                        const isUnlocked = buddy.unlockLevel === 0 || walletLevel >= buddy.unlockLevel;
                        const isCurrent = currentBuddyId === buddy.id;
                        const xpProgress = buddy.unlockLevel === 0 ? 100 : Math.min(100, (walletLevel / buddy.unlockLevel) * 100);
                        const walletMeta = WALLET_META[buddy.unlockWallet];

                        return (
                            <div
                                key={buddy.id}
                                className={`buddy-chooser__item${!isUnlocked ? " buddy-chooser__item--locked" : ""}${isCurrent ? " buddy-chooser__item--current" : ""}`}
                                style={{ "--wallet": walletMeta.color, "--buddy": buddy.color } as CSSProperties}
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
                                <span className={"buddy-chooser__desc"}>{t(`buddy-desc-${buddy.id}`, buddy.description)}</span>

                                {isUnlocked ? (
                                    <>
                                        <span className={"buddy-chooser__unlocked"}>
                                            <FontAwesomeIcon icon={faCheck} /> {isCurrent ? t("buddy-active") : t("buddy-unlocked")}
                                        </span>
                                        <div className={"buddy-chooser__card-actions"}>
                                            <button
                                                className={"buddy-chooser__select-btn"}
                                                onClick={(e) => { e.stopPropagation(); onSelect(buddy.id); }}
                                            >
                                                {isCurrent ? t("buddy-selected") : t("buddy-select")}
                                            </button>
                                            <button
                                                className={"buddy-chooser__shop-btn"}
                                                title={t("buddy-shop-title")}
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
                                                style={{ width: `${xpProgress}%`, background: walletMeta.color }}
                                            />
                                        </div>
                                        <span className={"buddy-chooser__unlock-label"} style={{ color: walletMeta.color }}>
                                            {t(walletMeta.labelKey)} Lv {walletLevel} / {buddy.unlockLevel}
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
