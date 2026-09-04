// Persist equipped outfit and owned outfits per character in localStorage.
// Keys are scoped per student so that different logins never share wardrobe data.

const equippedKey = (studentId: number | string, charId: string) =>
    `algespace_equipped_${studentId}_${charId}`;
const ownedKey = (studentId: number | string, charId: string) =>
    `algespace_owned_${studentId}_${charId}`;
const activeBuddyKey = (studentId: number | string) =>
    `algespace_active_buddy_${studentId}`;

export function getEquippedOutfitId(studentId: number | string, characterId: string): string | null {
    return localStorage.getItem(equippedKey(studentId, characterId));
}

export function persistEquippedOutfitId(studentId: number | string, characterId: string, itemId: string): void {
    localStorage.setItem(equippedKey(studentId, characterId), itemId);
}

export function getOwnedOutfitIds(studentId: number | string, characterId: string): string[] {
    try {
        return JSON.parse(localStorage.getItem(ownedKey(studentId, characterId)) ?? "[]") as string[];
    } catch {
        return [];
    }
}

export function persistOwnedOutfitId(studentId: number | string, characterId: string, itemId: string): void {
    const owned = getOwnedOutfitIds(studentId, characterId);
    if (!owned.includes(itemId)) {
        owned.push(itemId);
        localStorage.setItem(ownedKey(studentId, characterId), JSON.stringify(owned));
    }
}

export function getActiveBuddyId(studentId: number | string): string {
    return localStorage.getItem(activeBuddyKey(studentId)) ?? "pippin";
}

export function persistActiveBuddyId(studentId: number | string, buddyId: string): void {
    localStorage.setItem(activeBuddyKey(studentId), buddyId);
}

// ── Agency wallet helpers (unlocks are milestone-based, never spend) ─────────

export type AgencyWallet = "choice" | "insight" | "resolve";

export interface AgencyWallets {
    choiceXP: number;
    insightXP: number;
    resolveXP: number;
}

/** Softer unlock thresholds (outfits + buddies) — calibrated to real earning
 *  rates so milestones stay reachable. Deliberately gentler than the Growth
 *  Tree, which is a long-term visual and keeps its own scale. */
export const AGENCY_LEVEL_THRESHOLDS = [0, 50, 100, 150, 250, 400];

export function getAgencyLevel(xp: number): number {
    let level = 0;
    for (let i = 0; i < AGENCY_LEVEL_THRESHOLDS.length; i++) {
        if (xp >= AGENCY_LEVEL_THRESHOLDS[i]) level = i;
        else break;
    }
    return level;
}

export const WALLET_META: Record<AgencyWallet, { color: string; labelKey: string }> = {
    choice: { color: "#ffd166", labelKey: "agency-choice" },
    insight: { color: "#06d6a0", labelKey: "agency-insight" },
    resolve: { color: "#ef476f", labelKey: "agency-resolve" },
};

export function getWalletXp(wallets: AgencyWallets, wallet: AgencyWallet): number {
    return wallet === "choice" ? wallets.choiceXP : wallet === "insight" ? wallets.insightXP : wallets.resolveXP;
}

// ── Character unlock announcements (one-time celebration popup) ────────────

const announcedUnlockKey = (studentId: number | string) =>
    `algespace_unlocked_announced_${studentId}`;

export function getAnnouncedUnlocks(studentId: number | string): string[] {
    try {
        return JSON.parse(localStorage.getItem(announcedUnlockKey(studentId)) ?? "[]") as string[];
    } catch {
        return [];
    }
}

export function markUnlockAnnounced(studentId: number | string, characterId: string): void {
    const announced = getAnnouncedUnlocks(studentId);
    if (!announced.includes(characterId)) {
        announced.push(characterId);
        localStorage.setItem(announcedUnlockKey(studentId), JSON.stringify(announced));
    }
}
