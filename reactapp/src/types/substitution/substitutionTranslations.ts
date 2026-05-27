import { Language, LanguageExtension, getCurrentLanguage } from "@/i18n.ts";
import { LinearEquation } from "@/types/math/linearEquation.ts";
import { GameError, GameErrorType } from "@/types/shared/error.ts";
import { SubstitutionItem } from "@/types/shared/item.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { SubstitutionItemType } from "@/types/substitution/conceptual-knowledge/enums.ts";
import { ItemEquation } from "@/types/substitution/conceptual-knowledge/itemEquation.ts";
import { SubstitutionConstants } from "@/types/substitution/conceptual-knowledge/substitutionConstants.ts";
import { SubstitutionExercise } from "@/types/substitution/conceptual-knowledge/substitutionExercise.ts";
import { appendLanguageExtension, appendPluralAndLanguageExtension, termsToTranslatedText, variableToTranslatedText } from "@utils/translations.ts";

export class SubstitutionTranslations {
    // Introduction
    static readonly INTRO_FIRST_LINE: string = "introduction-first-line";

    static readonly getDescriptionForFirstEquation = (equation: LinearEquation): TranslationInterpolation => {
        return new TranslationInterpolation("description-first-eq", {
            left: termsToTranslatedText(equation.leftTerms, LanguageExtension.Akk, false),
            right: termsToTranslatedText(equation.rightTerms, LanguageExtension.Akk, false)
        });
    };

    static readonly getDescriptionForSecondEquation = (equation: LinearEquation): TranslationInterpolation => {
        return new TranslationInterpolation("description-sec-eq", {
            left: termsToTranslatedText(equation.leftTerms, LanguageExtension.Akk, false),
            right: termsToTranslatedText(equation.rightTerms, LanguageExtension.Akk, false)
        });
    };

    static readonly getTextForLastLine = (firstVariable: string, secondVariable: string): TranslationInterpolation => {
        return new TranslationInterpolation("introduction-last-line", {
            firstVar: appendLanguageExtension(firstVariable, LanguageExtension.Akk),
            secVar: appendLanguageExtension(secondVariable, LanguageExtension.Nom)
        });
    };

    // First substitution
    static readonly VAR_SELECTION: string = "variable-selection";
    static readonly VAR_SELECTION_ERR_SECOND: string = "variable-selection-error-second-var";
    static readonly VAR_SELECTION_ERR_COIN: string = "variable-selection-error-coin";
    static readonly SUBSTITUTION_ERR_EMPTY: string = "substitution-error-empty";
    static readonly SUBSTITUTION_ERR_MAX_CAPACITY: string = "substitution-error-max-capacity";
    static readonly FIRST_SUBSTITUTION_EQUIV: string = "first-substitution-equivalence";

    static readonly getTextForSubstitutionGoal = (firstVariable: string, secondVariable: string): TranslationInterpolation => {
        return new TranslationInterpolation("substitution-goal", {
            firstVar: appendPluralAndLanguageExtension(firstVariable, LanguageExtension.Akk),
            secVar: appendPluralAndLanguageExtension(secondVariable, LanguageExtension.Akk)
        });
    };

    static readonly getErrorForSelectionIsolatedVar = (firstVariable: string, secondVariable: string): TranslationInterpolation => {
        return new TranslationInterpolation("variable-selection-error-iso-var", {
            firstVar: appendLanguageExtension(firstVariable, LanguageExtension.Nom),
            secVar: appendPluralAndLanguageExtension(secondVariable)
        });
    };

    static readonly getInstructionForFirstSubstitution = (variable: string): TranslationInterpolation => {
        return new TranslationInterpolation("first-substitution-instruction", {
            variable: appendLanguageExtension(variable, LanguageExtension.Akk)
        });
    };

    static readonly getErrorForIsolatedSubstitution = (variable: string): TranslationInterpolation => {
        return new TranslationInterpolation("substitution-error-isolated", {
            variable: getCurrentLanguage() === Language.EN ? variable : "no-" + variable + LanguageExtension.Nom
        });
    };

    static readonly getErrorForInvalidSubstitution = (variable: string): TranslationInterpolation => {
        return new TranslationInterpolation("substitution-error-invalid", {
            variable: appendLanguageExtension(variable, LanguageExtension.Akk)
        });
    };

    static readonly getSuccessMessage = (substitutedIntoFirst: boolean): TranslationInterpolation => {
        return new TranslationInterpolation("first-substitution-success", {
            equation: substitutedIntoFirst ? "first" : "second"
        });
    };

    // Second substitution
    static readonly SYSTEM_SOL_1: string = "system-solution-1";
    static readonly SYSTEM_SOL_2: string = "system-solution-2";
    static readonly NEXT_EXERCISE: string = "next-exercise";
    static readonly COIN_SUBSTITUTION: string = "coin-substitution";

    static readonly getTextForSecondVarQuestion = (variable: string): TranslationInterpolation => {
        return new TranslationInterpolation("second-variable-question", {
            variable: appendLanguageExtension(variable, LanguageExtension.Nom)
        });
    };

    static readonly getTextForSecondVarValue = (variable: string): TranslationInterpolation => {
        return new TranslationInterpolation("second-variable-value", {
            variable: appendLanguageExtension(variable, LanguageExtension.Nom)
        });
    };

    static readonly getInstructionForSecondSubstitution = (firstVariable: string, secondVariable: string): TranslationInterpolation => {
        return new TranslationInterpolation("second-substitution-instruction", {
            firstVar: appendLanguageExtension(firstVariable, LanguageExtension.Nom),
            secVar: appendPluralAndLanguageExtension(secondVariable)
        });
    };

    // Hints
    static readonly getHintsForFirstSelection = (variable: string): TranslationInterpolation[] => {
        return [
            new TranslationInterpolation("hint-first-selection-1", null),
            new TranslationInterpolation("hint-first-selection-2", null),
            new TranslationInterpolation("hint-first-selection-3", {
                variable: appendLanguageExtension(variable, LanguageExtension.Nom)
            })
        ];
    };

    static readonly getHintsForFirstSubstitution = (exercise: SubstitutionExercise, equation: ItemEquation, selectedVariable: SubstitutionItem): TranslationInterpolation[] => {
        let secondVariableAmount, coins;
        if (equation.leftItems[0].itemType === SubstitutionItemType.IsolatedVariable) {
            const isCoin: boolean = equation.rightItems[0].itemType === SubstitutionItemType.Coin;
            [secondVariableAmount, coins] = getSubstitutionAmounts(selectedVariable.amount, equation.leftItems[0].amount, isCoin ? equation.rightItems[1].amount : equation.rightItems[0].amount, isCoin ? equation.rightItems[0].amount : equation.rightItems[1].amount);
        } else {
            const isCoin: boolean = equation.leftItems[0].itemType === SubstitutionItemType.Coin;
            [secondVariableAmount, coins] = getSubstitutionAmounts(selectedVariable.amount, equation.rightItems[0].amount, isCoin ? equation.leftItems[1].amount : equation.leftItems[0].amount, isCoin ? equation.leftItems[0].amount : equation.leftItems[1].amount);
        }

        return [
            new TranslationInterpolation("hint-first-substitution-1", {
                variable: appendPluralAndLanguageExtension(exercise.secondVariable.name)
            }),
            new TranslationInterpolation("hint-first-substitution-2", null),
            new TranslationInterpolation("hint-first-substitution-3", {
                variable: variableToTranslatedText(getCurrentLanguage(), exercise.secondVariable.name, secondVariableAmount, undefined, undefined, undefined, LanguageExtension.Akk),
                coins: variableToTranslatedText(getCurrentLanguage(), SubstitutionConstants.COIN, coins, undefined, undefined, undefined, LanguageExtension.Akk)
            })
        ];
    };

    static readonly getHintsForSecondSelection = (variable: string): TranslationInterpolation[] => {
        return [
            new TranslationInterpolation("hint-second-selection-1", null),
            new TranslationInterpolation("hint-second-selection-2", {
                variable: appendLanguageExtension(variable, LanguageExtension.Akk)
            })
        ];
    };

    static readonly getHintsForSecondSubstitution = (exercise: SubstitutionExercise, selectedVariable: SubstitutionItem): TranslationInterpolation[] => {
        const amount: number = exercise.secondVariable.solution * selectedVariable.amount;
        return [
            new TranslationInterpolation("hint-second-substitution-1", null),
            new TranslationInterpolation("hint-second-substitution-2", {
                coins: variableToTranslatedText(getCurrentLanguage(), SubstitutionConstants.COIN, amount, undefined, undefined, undefined, LanguageExtension.Akk)
            })
        ];
    };

    // Tutorial
    static readonly TUTORIAL_TITLE: string = "substitution-tutorial-title";
    static readonly TUTORIAL_STORY_1: string = "substitution-tutorial-story-1";
    static readonly TUTORIAL_STORY_2: string = "substitution-tutorial-story-2";
    static readonly TUTORIAL_GENERAL: string = "substitution-tutorial-general";
    static readonly TUTORIAL_SELECTION: string = "substitution-tutorial-selection";
    static readonly TUTORIAL_HINTS: string = "substitution-tutorial-hints-button";
    static readonly TUTORIAL_SUBSTITUTION: string = "substitution-tutorial-substitution";
    static readonly TUTORIAL_UNDO: string = "substitution-tutorial-undo-button";
}

export class BarteringTranslations {
    static readonly TASK_SIGN: string = "task-sign";
    static readonly INVENTORY_SIGN: string = "inventory-sign";
    static readonly INVENTORY_WARN: string = "warning-inventory-full";

    static readonly getDescriptionForBartering = (equation: LinearEquation): TranslationInterpolation => {
        return new TranslationInterpolation("bartering-description", {
            left: termsToTranslatedText(equation.leftTerms, LanguageExtension.Akk, false),
            right: termsToTranslatedText(equation.rightTerms, LanguageExtension.Akk, false)
        });
    };

    static readonly getHintsForBartering = (): TranslationInterpolation[] => {
        return [new TranslationInterpolation("hint-bartering-1", null), new TranslationInterpolation("hint-bartering-2", null), new TranslationInterpolation("hint-bartering-3", null)];
    };

    // Tutorial
    static readonly TUTORIAL_TITLE: string = "bartering-tutorial-title";
    static readonly TUTORIAL_STORY: string = "bartering-tutorial-story";
    static readonly TUTORIAL_TASK: string = "bartering-tutorial-task";
    static readonly TUTORIAL_INVENTORY: string = "bartering-tutorial-inventory";
    static readonly TUTORIAL_MERCHANT: string = "bartering-tutorial-merchant";
    static readonly TUTORIAL_EXCHANGE: string = "bartering-tutorial-exchange-button";
    static readonly TUTORIAL_HINTS: string = "bartering-tutorial-hints-button";
    static readonly TUTORIAL_UNDO_REDO: string = "bartering-tutorial-undo-redo-buttons";
}

function getSubstitutionAmounts(substitutedVariableAmount: number, isolatedVariableAmount: number, secondVariableAmount: number, coins: number): [number, number] {
    const factor: number = substitutedVariableAmount / isolatedVariableAmount;
    if (!Number.isInteger(factor)) {
        console.error("An unexpected error occurred in the function 'getSubstitutionAmounts': The system is not well defined.");
        throw new GameError(GameErrorType.EXERCISE_ERROR);
    }
    return [secondVariableAmount * factor, coins * factor];
}
