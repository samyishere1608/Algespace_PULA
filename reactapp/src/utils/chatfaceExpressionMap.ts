/**
 * How an expression file's path maps to a look and a mood.
 *
 * Deliberately in its own module with NO imports, so it can be checked by a plain Node script against
 * the real folders (`tools/i18n-fix/check-chatfaces.mjs`). The rest of the chatface module imports
 * image files through a Vite alias, which only exists inside a Vite build — keeping the rules here
 * means the rules are testable without one.
 *
 * A "mood" is the same character in the same outfit with a different face and prop, so the picture
 * itself says what kind of thing is being said:
 *
 *   hint      pointing up at a lightbulb      -> here is a hint
 *   question  hand on chin, question mark     -> you are being asked to decide something
 *   solo      fists up, confident             -> try it yourself, you can do this
 *   approve   fist up with a sparkle          -> yes, that was right
 *   celebrate both arms up, sparks            -> the exercise is finished
 *
 * WHICH ONE IS WHICH IS A RULE, NOT A PREFERENCE: a popover that ASKS the student something wears
 * `question`, and only a moment after they have done something wears `approve` or `celebrate`. The
 * confident `solo` pose is the one that breaks that rule by accident — it looks like praise, so
 * putting it on a question reads as congratulating a student for an answer they have not given yet.
 * It is currently unused for that reason; the art exists for every outfit, so a later moment that
 * genuinely says "work on your own" can take it.
 * `tools/ui-audit/check-popover-moods.mjs` enforces the rule for the yes/no prompt.
 */
export type ChatfaceMood = "hint" | "question" | "solo" | "approve" | "celebrate";

/**
 * Which mood each numbered crop in a sticker sheet is.
 *
 * NOT GUESSED. Every sheet holds five poses in the same order, and that order was confirmed by
 * putting the crops next to the five mood images the app already used for Pippin: crop 1 is the
 * lightbulb, 2 the question mark, 3 both arms up with sparks, 5 the one-fist sparkle. Crop 4 is the
 * remaining mood by elimination, and it reads as the confident "your turn" pose, which is what
 * `solo` means.
 *
 * If the art is ever replaced, check the order again before trusting this table — a wrong row does
 * not crash, it just shows the wrong face next to a hint.
 */
export const MOOD_BY_CROP: Record<string, ChatfaceMood> = {
    "1": "hint",
    "2": "question",
    "3": "celebrate",
    "4": "solo",
    "5": "approve",
};

/** The asset folder name for each character id. Note `Chibi` is Chimi, and `Pipin` has one P. */
export const CHARACTER_BY_FOLDER: Record<string, string> = {
    Pipin: "pippin",
    Chibi: "chimi",
    Lumi: "lumi",
    MasterZen: "masterzen",
};

/**
 * Lumi's folders are numbered differently from her shop items.
 *
 * `outfit 2` holds the headphone outfit, which is the art for `lumi-outfit-3`, and `outfit 3` holds
 * the explorer, which is `lumi-outfit-2`. Verified by comparing each folder against the full-body
 * asset that each shop item previews. The other three characters match one to one. Getting this
 * wrong does not look like a bug — it looks like the student is wearing somebody else's clothes.
 */
export const OUTFIT_NUMBER_OVERRIDES: Record<string, Record<number, number>> = {
    lumi: { 2: 3, 3: 2 },
};

/**
 * The shop item id a folder belongs to.
 *
 * Pippin has a separate `outfit-1` on top of his default (six shop items, five folders), so his
 * folders map straight across. Chimi, Lumi and Master Zen have five items and five folders, and their
 * folder 1 IS their default — their numbered body assets start at 1, and 1 is the look they wear with
 * nothing equipped.
 */
export function outfitIdForFolder(characterId: string, folderNumber: number): string {
    const number = OUTFIT_NUMBER_OVERRIDES[characterId]?.[folderNumber] ?? folderNumber;
    const isDefaultFolder = characterId !== "pippin" && number === 1;
    return isDefaultFolder ? `${characterId}-default` : `${characterId}-outfit-${number}`;
}

/**
 * Reads one expression file path and says which look and mood it is.
 *
 * The folder layout is the only index there is, so a renamed folder or a re-cut sheet is exactly the
 * thing that would silently leave a mood blank. Exported so the real folders can be checked.
 */
export function describeOutfitExpressionPath(path: string): { outfitId: string; mood: ChatfaceMood } | null {
    const match = path.match(/Chatfaces\/([^/]+)\/outfit (\d+)\/[^/]*_Cropped_(\d+)\.png$/);
    if (!match) return null;

    const characterId = CHARACTER_BY_FOLDER[match[1]];
    const mood = MOOD_BY_CROP[match[3]];
    if (!characterId || !mood) return null;

    return { outfitId: outfitIdForFolder(characterId, Number(match[2])), mood };
}

/** Turns "nothing equipped" into the id the expression maps are keyed by. */
export function normaliseOutfitId(characterId: string, outfitId: string | null | undefined): string {
    if (!outfitId || outfitId === "default") return `${characterId}-default`;
    return outfitId;
}
