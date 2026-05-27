import { createContext, useContext } from "react";

interface PippinLockContextValue {
    /** True if the student chose "solve on my own" at the start of the exercise. */
    soloMode: boolean;
    /** True if the student unlocked Pippin mid-exercise (forfeiting the 2× bonus). */
    pippinUnlocked: boolean;
    /** Call this when the student decides to unlock Pippin mid-exercise. */
    onUnlock: () => void;
}

export const PippinLockContext = createContext<PippinLockContextValue>({
    soloMode: false,
    pippinUnlocked: false,
    onUnlock: () => {},
});

export const usePippinLock = () => useContext(PippinLockContext);
