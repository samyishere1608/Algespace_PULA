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

// ── Coin wallet (separate from XP so spending doesn't affect rank) ────────────
const coinsKey = (studentId: number | string) => `algespace_coins_${studentId}`;

export function getCoins(studentId: number | string): number {
    const val = parseInt(localStorage.getItem(coinsKey(studentId)) ?? "0", 10);
    if (isNaN(val)) {
        // Corrupted value (e.g. "NaN" written by a previous bug) — reset to 0
        localStorage.setItem(coinsKey(studentId), "0");
        return 0;
    }
    return val;
}

export function addCoins(studentId: number | string, amount: number): number {
    const newTotal = getCoins(studentId) + amount;
    localStorage.setItem(coinsKey(studentId), String(newTotal));
    return newTotal;
}

export function spendCoins(studentId: number | string, amount: number): number {
    const current = getCoins(studentId);
    if (current < amount) throw new Error("Not enough coins");
    const newTotal = current - amount;
    localStorage.setItem(coinsKey(studentId), String(newTotal));
    return newTotal;
}
