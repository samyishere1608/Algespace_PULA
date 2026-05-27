import { LanguageExtension } from "@/i18n.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { appendLanguageExtension } from "@utils/translations.ts";

export class EliminationTranslations {
    // Translation keys for post-it
    static readonly POST_IT_TITLE: string = "post-it-title";
    static readonly POST_IT_SYSTEM: string = "post-it-system";
    static readonly POST_IT_TASK: string = "post-it-task";

    // Actions
    static readonly BUTTON_ADD_ROWS: string = "button-add-rows";
    static readonly BUTTON_SUB_ROWS: string = "button-sub-rows";
    static readonly BUTTON_SWITCH_ROWS: string = "button-switch-rows";
    static readonly INSTR_ADD_OR_SUB: string = "instr-add-or-sub-rows";
    static readonly INSTR_ADD_ROWS: string = "instr-add-rows";
    static readonly INSTR_SUB_ROWS: string = "instr-sub-rows";
    static readonly INSTR_MUL_ROWS: string = "instr-mul-rows";
    static readonly INSTR_DIV_ROWS: string = "instr-div-rows";
    static readonly INSTR_MAX_ROWS: string = "instr-max-rows";
    static readonly MUL_DIV_INSTR: string = "confirm-mul-or-div";

    static readonly getTextForAdditionConfirm = (index1: number, index2: number): TranslationInterpolation => {
        return new TranslationInterpolation("confirm-add-rows", { first: index1 + 1, second: index2 + 1 });
    };

    static readonly getTextForSubtractionConfirm = (index1: number, index2: number): TranslationInterpolation => {
        return new TranslationInterpolation("confirm-sub-rows", { first: index1 + 1, second: index2 + 1 });
    };

    static readonly getTextForFirstSolution = (variable: string): TranslationInterpolation => {
        return new TranslationInterpolation("first-solution", {
            variable: appendLanguageExtension(variable, LanguageExtension.Nom)
        });
    };

    static readonly getTextForFirstSolutionValue = (variable: string): TranslationInterpolation => {
        return new TranslationInterpolation("first-solution-value", {
            variable: appendLanguageExtension(variable, LanguageExtension.Nom)
        });
    };

    // Instructions solving system
    static readonly SYSTEM_SEL: string = "substitution-2";
    static readonly SYSTEM_SOL_1: string = "system-solution-1";
    static readonly SYSTEM_SOL_2: string = "system-solution-2";

    static readonly getTextForSystemSelection = (variable: string): TranslationInterpolation => {
        return new TranslationInterpolation("substitution-1", {
            variable: appendLanguageExtension(variable, LanguageExtension.Nom)
        });
    };

    static readonly getTextForGoodChoice = (isFirstEquationSelected: boolean): TranslationInterpolation => {
        return new TranslationInterpolation("good-choice", {
            count: appendLanguageExtension(isFirstEquationSelected ? "first" : "second", LanguageExtension.Gen)
        });
    };

    static readonly getTextBadChoice = (variable: string, isFirstEquationSelected: boolean): TranslationInterpolation => {
        return new TranslationInterpolation("bad-choice", {
            variable: appendLanguageExtension(variable, LanguageExtension.Akk),
            count: isFirstEquationSelected ? "second" : "first",
            count2: appendLanguageExtension(isFirstEquationSelected ? "second" : "first", LanguageExtension.Gen)
        });
    };

    static readonly getTextForNeutralChoice = (): TranslationInterpolation => {
        return new TranslationInterpolation("neutral-choice", null);
    };

    // Input field
    static readonly INPUT_ERROR_INSTR: string = "input-field-error-instr";
    static readonly INPUT_EVAL_ERROR: string = "input-field-evaluation-error";
    static readonly INPUT_RANGE_ERROR: string = "input-field-range-error";

    static readonly getInputError = (isMultiplication: boolean): TranslationInterpolation => {
        return new TranslationInterpolation("input-field-validation-error", { action: isMultiplication ? "input-action-mul" : "input-action-div" });
    };

    // Hints
    static readonly getHints = (): TranslationInterpolation[] => {
        return [new TranslationInterpolation("hint-1", null), new TranslationInterpolation("hint-2", null), new TranslationInterpolation("hint-3", null), new TranslationInterpolation("hint-4", null)];
    };

    // Switches
    static readonly SWITCH_IMAGES: string = "switch-label-images";
    static readonly SWITCH_FRACTIONS: string = "switch-label-fractions";

    // Tutorial
    static readonly TUTORIAL_TITLE: string = "tutorial-title";
    static readonly TUTORIAL_STORY_1: string = "tutorial-story-1";
    static readonly TUTORIAL_STORY_2: string = "tutorial-story-2";
    static readonly TUTORIAL_POST_IT: string = "tutorial-post-it";
    static readonly TUTORIAL_NOTEBOOK: string = "tutorial-notebook";
    static readonly TUTORIAL_ADD_SUB: string = "tutorial-add-subtract-buttons";
    static readonly TUTORIAL_ROW_SELECT: string = "tutorial-row-selection";
    static readonly TUTORIAL_SUB_PREVIEW: string = "tutorial-subtraction-preview";
    static readonly TUTORIAL_SUB_ACTIONS: string = "tutorial-subtraction-actions";
    static readonly TUTORIAL_NEW_ROW: string = "tutorial-new-row";
    static readonly TUTORIAL_UNDO_REDO: string = "tutorial-undo-redo-buttons";
    static readonly TUTORIAL_COPY_DEL: string = "tutorial-copy-delete-buttons";
    static readonly TUTORIAL_MUL_DIV: string = "tutorial-mul-div-buttons";
    static readonly TUTORIAL_MUL_INPUT: string = "tutorial-mul-input";
    static readonly TUTORIAL_MUL_ERROR: string = "tutorial-mul-error";
    static readonly TUTORIAL_MUL_VALID: string = "tutorial-mul-valid";
    static readonly TUTORIAL_MUL_RESULT: string = "tutorial-mul-result";
    static readonly TUTORIAL_IMAGES_SWITCH: string = "tutorial-images-switch";
    static readonly TUTORIAL_HINTS: string = "tutorial-hints-button";
    static readonly TUTORIAL_FLOATING_POINTS: string = "tutorial-floating-points";
    static readonly TUTORIAL_FRAC_SWITCH: string = "tutorial-fractions-switch";
    static readonly TUTORIAL_SOLUTION: string = "tutorial-solution";
}
