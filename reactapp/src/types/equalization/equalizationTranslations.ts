import i18n, { Language, LanguageExtension, TranslationNamespaces, getCurrentLanguage } from "@/i18n.ts";
import { EqualizationItemType, ScaleAllocation } from "@/types/equalization/enums.ts";
import { EqualizationExercise } from "@/types/equalization/equalizationExercise.ts";
import { EqualizationItem } from "@/types/shared/item.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { appendLanguageExtension, appendPluralAndLanguageExtension, variableToTranslatedText } from "@utils/translations.ts";

export class EqualizationTranslations {
    static readonly SYSTEM_SIGN: string = "sign-system";
    static readonly TASK_SIGN: string = "sign-task";
    static readonly WARNING_MAX_CAPACITY: string = "warning-max-capacity";

    // Instructions (as instructions are exercise specific - they include names for the type of displayed fruits - we might require interpolation variables, i.e. we access translations via methods)
    static readonly getFirstInstruction = (exercise: EqualizationExercise): TranslationInterpolation => {
        return new TranslationInterpolation("instruction-equalization", {
            variable: "no-" + (getCurrentLanguage() === Language.EN ? exercise.isolatedVariable.name : exercise.isolatedVariable.name + LanguageExtension.Nom)
        });
    };

    static readonly getInstructionForRelation = (): TranslationInterpolation => {
        return new TranslationInterpolation("instruction-relation", null);
    };

    static readonly getInstructionForRelationReason = (): TranslationInterpolation => {
        return new TranslationInterpolation("instruction-relation-reason", null);
    };

    static readonly getInstructionForSimplification = (): TranslationInterpolation => {
        return new TranslationInterpolation("instruction-simplification", null);
    };

    static readonly getInstructionForDeterminingSecondVariable = (exercise: EqualizationExercise): TranslationInterpolation => {
        return new TranslationInterpolation("instruction-determining-second-variable", {
            variable: appendLanguageExtension(exercise.secondVariable.name, LanguageExtension.Nom)
        });
    };

    static readonly getInstructionForDeterminingIsolatedVariable = (exercise: EqualizationExercise): TranslationInterpolation => {
        return new TranslationInterpolation("instruction-determining-isolated-variable", {
            firstVar: appendLanguageExtension(exercise.secondVariable.name, LanguageExtension.Nom),
            firstWeight: exercise.secondVariable.weight,
            secVar: appendLanguageExtension(exercise.isolatedVariable.name, LanguageExtension.Gen)
        });
    };

    static readonly getSolutionInstruction = (): TranslationInterpolation => {
        return new TranslationInterpolation("instruction-solution", null);
    };

    // Buttons
    static readonly CONTINUE: string = "button-continue";
    static readonly EXPLAIN: string = "button-explain";
    static readonly ADOPT_WEIGHT: string = "button-adopt-weight";

    // Feedback
    static readonly FEEDBACK_EMPTY_SCALE: string = "feedback-empty-scale";
    static readonly FEEDBACK_IMBALANCE: string = "feedback-imbalance";
    static readonly FEEDBACK_SIMPLIFICATION_REQ: string = "feedback-simplification-required";
    static readonly FEEDBACK_SIMPLIFICATION_INV: string = "feedback-simplification-invalid";
    static readonly FEEDBACK_SIMPLIFICATION_ISO: string = "feedback-simplification-isolated";
    static readonly FEEDBACK_INV_WEIGHT: string = "feedback-invalid-weight";

    static readonly getFeedbackForInvalidBalanceOnEqualization = (exercise: EqualizationExercise): TranslationInterpolation => {
        return new TranslationInterpolation("feedback-equalization-invalid-balance", {
            variable: appendLanguageExtension(exercise.secondVariable.name, LanguageExtension.Gen)
        });
    };

    static readonly getFeedbackForInvalidBalanceOnEqualizationSimplification = (exercise: EqualizationExercise): TranslationInterpolation => {
        return new TranslationInterpolation("feedback-equalization-invalid-simplification", {
            variable: appendLanguageExtension(exercise.secondVariable.name, LanguageExtension.Gen)
        });
    };

    static readonly getFeedbackForIsolatedVariableOnEqualization = (exercise: EqualizationExercise): TranslationInterpolation => {
        return new TranslationInterpolation("feedback-equalization-isolated", {
            variable: appendLanguageExtension(exercise.isolatedVariable.name, LanguageExtension.Akk)
        });
    };

    // Hints
    static readonly LEFT: string = "left";
    static readonly RIGHT: string = "right";
    static readonly FIRST: string = "first";
    static readonly SECOND: string = "second";

    static readonly getEqualizationHints = (exercise: EqualizationExercise): TranslationInterpolation[] => {
        const translations: TranslationInterpolation[] = [
            new TranslationInterpolation("hint-equalization-1", {
                variable: appendPluralAndLanguageExtension(exercise.isolatedVariable.name)
            }),
            new TranslationInterpolation("hint-equalization-2", null)
        ];

        const transLeft: string = i18n.t(EqualizationTranslations.LEFT, { ns: TranslationNamespaces.Variables });
        const transRight: string = i18n.t(EqualizationTranslations.RIGHT, { ns: TranslationNamespaces.Variables });

        switch (exercise.scaleAllocation) {
            case ScaleAllocation.LeftFirst: {
                translations.push(
                    new TranslationInterpolation("hint-equalization-3", {
                        firstDir: transLeft,
                        secDir: transRight
                    }),
                    new TranslationInterpolation("hint-equalization-4a", {
                        firstDir: transLeft,
                        secDir: transRight,
                        dirScaleImage: appendLanguageExtension(exercise.secondEquation.leftIsolated ? EqualizationTranslations.RIGHT : EqualizationTranslations.LEFT, LanguageExtension.Gen),
                        count: appendLanguageExtension(EqualizationTranslations.SECOND, LanguageExtension.Gen),
                        variable: appendPluralAndLanguageExtension(exercise.isolatedVariable.name, LanguageExtension.Akk)
                    })
                );
                break;
            }

            case ScaleAllocation.LeftSecond: {
                translations.push(
                    new TranslationInterpolation("hint-equalization-3", {
                        firstDir: transLeft,
                        secDir: transRight
                    }),
                    new TranslationInterpolation("hint-equalization-4a", {
                        firstDir: transRight,
                        secDir: i18n.t(EqualizationTranslations.LEFT, { ns: TranslationNamespaces.Variables }),
                        dirScaleImage: appendLanguageExtension(exercise.secondEquation.leftIsolated ? EqualizationTranslations.RIGHT : EqualizationTranslations.LEFT, LanguageExtension.Gen),
                        count: appendLanguageExtension(EqualizationTranslations.SECOND, LanguageExtension.Gen),
                        variable: appendPluralAndLanguageExtension(exercise.isolatedVariable.name, LanguageExtension.Akk)
                    })
                );
                break;
            }

            case ScaleAllocation.RightFirst: {
                translations.push(
                    new TranslationInterpolation("hint-equalization-3", {
                        firstDir: transRight,
                        secDir: transLeft
                    }),
                    new TranslationInterpolation("hint-equalization-4a", {
                        firstDir: transLeft,
                        secDir: transRight,
                        dirScaleImage: appendLanguageExtension(exercise.firstEquation.leftIsolated ? EqualizationTranslations.RIGHT : EqualizationTranslations.LEFT, LanguageExtension.Gen),
                        count: appendLanguageExtension(EqualizationTranslations.FIRST, LanguageExtension.Gen),
                        variable: appendPluralAndLanguageExtension(exercise.isolatedVariable.name, LanguageExtension.Akk)
                    })
                );
                break;
            }

            case ScaleAllocation.RightSecond: {
                translations.push(
                    new TranslationInterpolation("hint-equalization-3", {
                        firstDir: transRight,
                        secDir: transLeft
                    }),
                    new TranslationInterpolation("hint-equalization-4a", {
                        firstDir: transRight,
                        secDir: transLeft,
                        dirScaleImage: appendLanguageExtension(exercise.firstEquation.leftIsolated ? EqualizationTranslations.RIGHT : EqualizationTranslations.LEFT, LanguageExtension.Gen),
                        count: appendLanguageExtension(EqualizationTranslations.FIRST, LanguageExtension.Gen),
                        variable: appendPluralAndLanguageExtension(exercise.isolatedVariable.name, LanguageExtension.Akk)
                    })
                );
                break;
            }

            case ScaleAllocation.None: {
                translations.push(
                    new TranslationInterpolation("hint-equalization-4b", {
                        dirFirstImage: appendLanguageExtension(exercise.firstEquation.leftIsolated ? EqualizationTranslations.RIGHT : EqualizationTranslations.LEFT, LanguageExtension.Gen),
                        dirSecImage: appendLanguageExtension(exercise.secondEquation.leftIsolated ? EqualizationTranslations.RIGHT : EqualizationTranslations.LEFT, LanguageExtension.Gen),
                        variable: appendPluralAndLanguageExtension(exercise.isolatedVariable.name, LanguageExtension.Akk)
                    })
                );
                break;
            }
        }

        return translations;
    };

    static readonly getSimplificationHints = (exercise: EqualizationExercise, leftItems: EqualizationItem[], rightItems: EqualizationItem[]): TranslationInterpolation[] => {
        const [leftWeight, leftVariables] = countItems(leftItems);
        const [rightWeight, rightVariables] = countItems(rightItems);

        const weight: number = Math.min(leftWeight, rightWeight);
        const variables: number = Math.min(leftVariables, rightVariables);

        const translations: TranslationInterpolation[] = [new TranslationInterpolation("hint-simplification-1", null)];

        if (weight !== 0 && variables !== 0) {
            translations.push(
                new TranslationInterpolation("hint-simplification-2a", {
                    weight: weight,
                    variable: variableToTranslatedText(getCurrentLanguage(), exercise.secondVariable.name, variables, undefined, false, false, LanguageExtension.Akk)
                })
            );
        } else if (weight !== 0) {
            translations.push(
                new TranslationInterpolation("hint-simplification-2b", {
                    weight: weight
                })
            );
        } else {
            translations.push(
                new TranslationInterpolation("hint-simplification-2c", {
                    variable: variableToTranslatedText(getCurrentLanguage(), exercise.secondVariable.name, variables, undefined, false, false, LanguageExtension.Akk)
                })
            );
        }

        return translations;
    };

    static readonly getSecondVariableHints = (exercise: EqualizationExercise, leftItems: EqualizationItem[], rightItems: EqualizationItem[]): TranslationInterpolation[] => {
        const [leftWeight, leftVariables] = countItems(leftItems);
        const [rightWeight, rightVariables] = countItems(rightItems);

        const firstCount: number = Math.max(leftWeight, rightWeight);
        const secCount: number = Math.max(leftVariables, rightVariables);

        return [
            new TranslationInterpolation("hint-determining-second-variable-1", {
                variable: appendPluralAndLanguageExtension(exercise.secondVariable.name, LanguageExtension.Akk)
            }),
            new TranslationInterpolation("hint-determining-second-variable-2", null),
            new TranslationInterpolation("hint-determining-second-variable-3", {
                firstCount: firstCount,
                secCount: secCount
            }),
            new TranslationInterpolation("hint-determining-second-variable-4", {
                firstCount: firstCount,
                secCount: secCount,
                thirdCount: firstCount / secCount
            })
        ];
    };

    static readonly getIsolatedVariableHints = (exercise: EqualizationExercise): TranslationInterpolation[] => {
        return [
            new TranslationInterpolation("hint-determining-isolated-variable-1", null),
            new TranslationInterpolation("hint-determining-isolated-variable-2", {
                firstVar: appendPluralAndLanguageExtension(exercise.secondVariable.name),
                secVar: appendLanguageExtension(exercise.isolatedVariable.name, LanguageExtension.Gen)
            })
        ];
    };

    // Input field
    static readonly INPUT_INCORRECT_INPUT: string = "input-field-incorrect-input";
    static readonly INPUT_VALIDATION_ERR: string = "input-field-validation-error";

    // Tutorial
    static readonly TUTORIAL_TITLE: string = "tutorial-title";
    static readonly TUTORIAL_STORY_1: string = "tutorial-story-1";
    static readonly TUTORIAL_STORY_2: string = "tutorial-story-2";
    static readonly TUTORIAL_STORY_3: string = "tutorial-story-3";
    static readonly TUTORIAL_STORY_4: string = "tutorial-story-4";
    static readonly TUTORIAL_INSTRUCTION: string = "tutorial-instruction";
    static readonly TUTORIAL_SCALE: string = "tutorial-scale";
    static readonly TUTORIAL_ITEMS: string = "tutorial-items";
    static readonly TUTORIAL_SYSTEM: string = "tutorial-system";
    static readonly TUTORIAL_UNDO_REDO: string = "tutorial-undo-redo-buttons";
    static readonly TUTORIAL_HINTS: string = "tutorial-hints-button";
    static readonly TUTORIAL_VERIFY: string = "tutorial-verify-button";
}

function countItems(items: EqualizationItem[]): [number, number] {
    let weight: number = 0;
    let variables: number = 0;
    items.forEach((item: EqualizationItem): void => {
        if (item.itemType === EqualizationItemType.Weight) {
            weight += item.weight;
        } else {
            variables++;
        }
    });
    return [weight, variables];
}
