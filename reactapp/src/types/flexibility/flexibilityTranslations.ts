import { getCurrentLanguage, Language } from "@/i18n.ts";
import { Case, Method, SelectedEquation } from "@/types/flexibility/enums.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";

export class FlexibilityTranslations {
    static readonly EQUALIZATION: string = "equalization-method";
    static readonly SUBSTITUTION: string = "substitution-method";
    static readonly ELIMINATION: string = "elimination-method";

    static readonly BUTTON_SELECT_INITIAL_SYSTEM: string = "button-select-initial-system";
    static readonly BUTTON_SELECT_TRANSFORMED_SYSTEM: string = "button-select-transformed-system";
    static readonly BUTTON_SOLVE_X: string = "button-solve-x";
    static readonly BUTTON_SOLVE_Y: string = "button-solve-y";
    static readonly BUTTON_ADD: string = "button-add";
    static readonly BUTTON_SUBTRACT: string = "button-subtract";
    static readonly BUTTON_TRY_AGAIN: string = "button-try-again";

    static readonly INTRO_SYSTEM: string = "system-introduction";

    static readonly SINGLE_EFFICIENT_INSTR: string = "single-efficient-method-instruction";
    static readonly MULTIPLE_EFFICIENT_INSTR: string = "multiple-efficient-method-instruction";
    static readonly EFFICIENT_METHOD_HINT: string = "efficient-method-hint";
    static readonly EQUALIZATION_NOT_EFFICIENT: string = "equalization-not-efficient";
    static readonly SUBSTITUTION_NOT_EFFICIENT: string = "substitution-not-efficient";
    static readonly ELIMINATION_NOT_EFFICIENT: string = "elimination-not-efficient";
    static readonly EQUALIZATION_NOT_EFFICIENT_NO_TRANSFORMATION: string = "equalization-not-efficient-no-transformation";
    static readonly SUBSTITUTION_NOT_EFFICIENT_NO_TRANSFORMATION: string = "substitution-not-efficient-no-transformation";
    static readonly ELIMINATION_NOT_EFFICIENT_NO_TRANSFORMATION: string = "elimination-not-efficient-no-transformation";

    static readonly EXPLANATION_SINGLE_CHOICE: string = "self-explanation-single-choice";
    static readonly EXPLANATION_MULTIPLE_CHOICE: string = "self-explanation-multiple-choice";
    static readonly EXPLANATION_HINT: string = "self-explanation-hint";
    static readonly EXPLANATION_FEEDBACK_SINGLE: string = "self-explanation-feedback-single-choice";
    static readonly EXPLANATION_FEEDBACK_MULTIPLE_ALL_FAULTY: string = "self-explanation-feedback-multiple-choice-all-faulty";
    static readonly EXPLANATION_FEEDBACK_MULTIPLE_SOME_FAULTY: string = "self-explanation-feedback-multiple-choice-some-faulty";
    static readonly EXPLANATION_FEEDBACK_MULTIPLE_MISSING: string = "self-explanation-feedback-multiple-choice-missing";

    static readonly SUCCESS_MESSAGE_TASK: string = "success-message-task";

    static readonly SELECT_SUITABLE_INSTR: string = "suitable-method-instruction";
    static readonly SUITABLE_HINT: string = "suitable-method-hint";

    static readonly SYSTEM_TRANSFORMATION_ADDITIONAL_INSTR: string = "system-transformation-additional-instruction";
    static readonly SYSTEM_TRANSFORMATION_ELIMINATION_INSTR: string = "system-transformation-elimination-instruction";
    static readonly SYSTEM_TRANSFORMATION_EQUALIZATION_FEEDBACK: string = "system-transformation-equalization-feedback";
    static readonly SYSTEM_TRANSFORMATION_SUBSTITUTION_FEEDBACK: string = "system-transformation-substitution-feedback";
    static readonly SYSTEM_TRANSFORMATION_ELIMINATION_FEEDBACK: string = "system-transformation-elimination-feedback";

    static readonly SAMPLE_SOLUTION: string = "sample-solution";
    static readonly TRY_AGAIN: string = "try-again";
    static readonly EQUALIZATION_INSTR: string = "equalization-instruction";
    static readonly EQUALIZATION_HINT: string = "equalization-hint";
    static readonly EQUALIZATION_SAME_SOURCE_ERROR: string = "equalization-same-source-error";
    static readonly EQUALIZATION_TWO_VAR_ERROR: string = "equalization-two-variables-error";
    static readonly EQUALIZATION_SOLUTION: string = "equalization-solution";
    static readonly EQUALIZATION_SAMPLE_SOLUTION: string = "equalization-sample-solution";

    static readonly SUBSTITUTION_INSTR: string = "substitution-instruction";
    static readonly SUBSTITUTION_HINT_1: string = "substitution-hint-1";
    static readonly SUBSTITUTION_HINT_2: string = "substitution-hint-2";
    static readonly SUBSTITUTION_ERROR_FACTOR: string = "substitution-error-factor";
    static readonly SUBSTITUTION_ERROR_VARIABLE: string = "substitution-error-variable";
    static readonly SUBSTITUTION_ERROR_NOT: string = "substitution-error-not-exchangeable";
    static readonly SUBSTITUTION_SOLUTION: string = "substitution-solution";
    static readonly SUBSTITUTION_PARENTHESIS: string = "substitution-parenthesis";

    static readonly ELIMINATION_INSTR: string = "elimination-instruction";
    static readonly ELIMINATION_INSTR_STEP_1: string = "elimination-instruction-step-1";
    static readonly ELIMINATION_INSTR_STEP_2_1: string = "elimination-instruction-step-2-1";
    static readonly ELIMINATION_INSTR_STEP_2_2: string = "elimination-instruction-step-2-2";
    static readonly ELIMINATION_INSTR_STEP_3_1: string = "elimination-instruction-step-3-1";
    static readonly ELIMINATION_INSTR_STEP_3_2: string = "elimination-instruction-step-3-2";
    static readonly ELIMINATION_INPUT_ERROR: string = "elimination-input-error";
    static readonly ELIMINATION_SOLUTION: string = "elimination-solution";
    static readonly ELIMINATION_SAMPLE_SOLUTION: string = "elimination-sample-solution";
    static readonly ELIMINATION_FAULTY: string = "elimination-faulty";
    static readonly ELIMINATION_HINT_1: string = "elimination-hint-1";
    static readonly ELIMINATION_HINT_2: string = "elimination-hint-2";

    static readonly FIRST_SOLUTION_CHOICE: string = "first-solution-choice";
    static readonly FIRST_SOLUTION_MANUAL_TASK: string = "first-solution-manual-computation";
    static readonly FIRST_SOLUTION_INPUT_ERROR: string = "first-solution-input-error";
    static readonly FIRST_SOLUTION_WRONG_INPUT: string = "first-solution-wrong-input";
    static readonly FIRST_SOLUTION_SOLUTION: string = "first-solution-solution";
    static readonly FIRST_SOLUTION_SAMPLE_SOLUTION: string = "first-solution-sample-solution";
    static readonly FIRST_SOLUTION_AUTO_CONTINUE: string = "first-solution-auto-continue";
    static readonly FIRST_SOLUTION_SUCCESS_CONTINUE: string = "first-solution-success-continue";
    static readonly SYSTEM_RESULT: string = "system-solution";
    static readonly SYSTEM_SOLUTION_SUCCESS: string = "system-solution-success";
    static readonly SYSTEM_SOLUTION_SUCCESS_CONTINUE: string = "system-solution-success-continue";

    static readonly COMPARISON_SYSTEM_INTRO: string = "comparison-system-introduction";
    static readonly RESOLVING_REPLY_AGREE: string = "resolving-reply-agree";
    static readonly RESOLVING_REPLY_DISAGREE: string = "resolving-reply-disagree";
    static readonly COMPARISON_TASK_1: string = "comparison-task-1";
    static readonly COMPARISON_TASK_2: string = "comparison-task-2";
    static readonly COMPARISON_REPLY_AGREE: string = "comparison-reply-agree";
    static readonly COMPARISON_REPLY_DISAGREE: string = "comparison-reply-disagree";
    static readonly COMPARISON_YOUR_APPROACH: string = "comparison-your-approach";
    static readonly COMPARISON_CLASSMATE_APPROACH: string = "comparison-classmate-approach";
    static readonly MULTIPLICATION_DESCRIPTION_ELIMINATION_END: string = "comparison-multiplication-description-end";
    static readonly MULTIPLICATION_DESCRIPTION_ELIMINATION_1: string = "comparison-multiplication-description-1";
    static readonly MULTIPLICATION_DESCRIPTION_ELIMINATION_2: string = "comparison-multiplication-description-2";

    static readonly MATCHING_INSTRUCTION_1: string = "matching-instruction-1";
    static readonly MATCHING_QUESTION: string = "matching-question";
    static readonly MATCHING_HINT: string = "matching-hint";
    static readonly MATCHING_SOLUTION: string = "matching-solution";
    static readonly MATCHING_ALTERNATIVES: string = "matching-alternatives";

    static readonly EQUALIZATION_DEMO_1: string = "equalization-demo-1";
    static readonly EQUALIZATION_DEMO_2: string = "equalization-demo-2";
    static readonly EQUALIZATION_DEMO_SOL: string = "equalization-demo-solution";
    static readonly SUBSTITUTION_DEMO_1: string = "substitution-demo-1";
    static readonly SUBSTITUTION_DEMO_2: string = "substitution-demo-2";
    static readonly SUBSTITUTION_DEMO_SOL: string = "substitution-demo-solution";
    static readonly ELIMINATION_DEMO: string = "elimination-demo";
    static readonly ELIMINATION_DEMO_SOL: string = "elimination-demo-solution";
    static readonly ELIMINATION_DEMO_ERROR: string = "elimination-demo-error";
    static readonly DEMO_TRY_AGAIN: string = "demo-try-again";

    static readonly BACK_TO_EXPLANATION1 :string =   "back-to-explanation-1";
    static readonly BACK_TO_EXPLANATION2 :string =   "back-to-explanation-2";
    static readonly BACK_TO_EXPLANATION3 :string =   "back-to-explanation-3";
    static readonly BACK_TO_EXPLANATION4 :string =   "back-to-explanation-4";
    static readonly BACK_TO_EXPLANATION5 :string =   "back-to-explanation-5";
    static readonly BUTTON_SHOW_SAMPLE_SOLUTION :string =   "show-sample-solution";

    static readonly PERSONAL_CALCULATION_START_1: string = "personal-calculation-start-1";
    static readonly PERSONAL_CALCULATION_START_2: string = "personal-calculation-start-2";
    static readonly PERSONAL_CALCULATION_START_3: string = "personal-calculation-start-3";
    static readonly PERSONAL_CALCULATION_START_4: string = "personal-calculation-start-4";
    static readonly PERSONAL_CALCULATION_END_1: string = "personal-calculation-ending-1";
    static readonly PERSONAL_CALCULATION_END_4: string = "personal-calculation-ending-4";

    static readonly PERSONAL_COMPARISON_START_1: string = "personal-comparison-start-1";
    static readonly PERSONAL_COMPARISON_START_2: string = "personal-comparison-start-2";
    static readonly PERSONAL_COMPARISON_START_3: string = "personal-comparison-start-3";
    static readonly PERSONAL_COMPARISON_START_4: string = "personal-comparison-start-4";
    static readonly PERSONAL_COMPARISON_END_1: string = "personal-comparison-ending-1";

    static readonly PERSONAL_RESOLVING_END_1: string = "personal-resolving-ending-1";
    static readonly PERSONAL_Explain_END_1: string = "personal-explain-ending-1";


    static readonly PERSONAL_END_2: string = "personal-ending-2";

    static readonly COMPARISON_QUESTION: string = "comparison-question";

    static readonly getPersonalExplainTranslation = (
        option: number,
        method: Method
    ): TranslationInterpolation => {
        switch (option) {
            case 1:
                return new TranslationInterpolation("personal-explain-start-1", {
                    method: `$t(${getMethodTranslation(method)})`,
                });
            case 2:
                return new TranslationInterpolation("personal-explain-start-2", {
                    method: `$t(${getMethodTranslation(method)})`,
                });
            case 3:
                return new TranslationInterpolation("personal-explain-start-3", {
                    method: `$t(${getMethodTranslation(method)})`,
                });
            case 4:
                return new TranslationInterpolation("personal-explain-start-4", {
                    method: `$t(${getMethodTranslation(method)})`,
                });
            case 5:
                return new TranslationInterpolation("personal-explain-start-5", {
                    method: `$t(${getMethodTranslation(method)})`,
                });
            default:
                throw new Error(`Unknown option: ${option}`);
        }
    };


    static readonly getPersonalResolveTranslation = (
        option: number,
        method: Method
    ): TranslationInterpolation => {
        switch (option) {
            case 1:
                return new TranslationInterpolation("personal-resolving-start-1", {
                    method: `$t(${getMethodTranslation(method)})`,
                });
            case 2:
                return new TranslationInterpolation("personal-resolving-start-2", {
                    method: `$t(${getMethodTranslation(method)})`,
                });
            case 3:
                return new TranslationInterpolation("personal-resolving-start-3", {
                    method: `$t(${getMethodTranslation(method)})`,
                });
            case 4:
                return new TranslationInterpolation("personal-resolving-start-4", {
                    method: `$t(${getMethodTranslation(method)})`,
                });
            default:
                throw new Error(`Unknown option: ${option}`);
        }
    };


    static readonly getInstructionForSolvingSystem = (method: Method): TranslationInterpolation => {
        return new TranslationInterpolation("solving-system-instruction", {
            method: `$t(${getMethodTranslation(method)})`
        });
    };

    static readonly getInstructionForSolvingSystemPast = (method: Method): TranslationInterpolation => {
        return new TranslationInterpolation("solving-system-instruction-past", {
            method: `$t(${getMethodTranslation(method)})`
        });
    };

    static readonly getInstructionForSystemTransformation = (method: Method): TranslationInterpolation => {
        return new TranslationInterpolation("system-transformation-instruction", {
            method: `$t(${getMethodTranslation(method)})`
        });
    };

    static readonly getQuestionForSEInterventionForEfficiency = (method: Method): TranslationInterpolation => {
        return new TranslationInterpolation("self-explanation-efficiency-intervention", {
            method: `$t(${getMethodTranslation(method)})`
        });
    };

    static readonly getInstructionForSelfExplanationExercise = (method: Method, systemTransformation: boolean): TranslationInterpolation => {
        return new TranslationInterpolation(systemTransformation ? "self-explanation-instruction" : "self-explanation-no-transformation-instruction", {
            method: `$t(${getMethodTranslation(method)})`
        });
    };

    static readonly getInstructionForFindingFirstSolution = (method: Method, isTransformed: boolean): TranslationInterpolation => {
        return new TranslationInterpolation(isTransformed ? "first-solution-transformed-instruction" : "first-solution-instruction", {
            method: `$t(${getMethodTranslation(method)})`
        });
    };

    static readonly getInputLabelForSolution = (variable: string): TranslationInterpolation => {
        return new TranslationInterpolation("first-solution-input-label", {
            variable: variable
        });
    };

    static readonly getFirstResultForEquationSelection = (method: Method): TranslationInterpolation => {
        return new TranslationInterpolation("equation-selection-first-result", {
            method: `$t(${getMethodTranslation(method)})`
        });
    };

    static readonly getInstructionForEquationSelection = (firstSolution: string, otherVariable: string): TranslationInterpolation => {
        return new TranslationInterpolation("equation-selection-instruction", {
            firstSolution: firstSolution,
            otherVariable: otherVariable
        });
    };

    static readonly getButtonLabelForEquationSelection = (variable: string): TranslationInterpolation => {
        return new TranslationInterpolation("equation-selection-button-label", {
            variable: variable
        });
    };

    static readonly getInstructionForFindingSecondSolution = (variable: string): TranslationInterpolation => {
        return new TranslationInterpolation("second-solution-instruction", {
            variable: variable
        });
    };

    static readonly getInstructionForSecondSolutionResult = (firstSolution: string, otherVariable: string): TranslationInterpolation => {
        return new TranslationInterpolation("second-solution-result", {
            firstSolution: firstSolution,
            otherVariable: otherVariable
        });
    };

    static readonly getComparisonPrompt = (method: Method): TranslationInterpolation => {
        return new TranslationInterpolation("comparison-prompt", {
            method: `$t(${getMethodTranslation(method)})`
        });
    };

    static readonly getResolvingPrompt = (method: Method): TranslationInterpolation => {
        return new TranslationInterpolation("resolving-prompt", {
            method: `$t(${getMethodTranslation(method)})`
        });
    };

    static readonly getResolvingQuestion = (method: Method): TranslationInterpolation => {
        return new TranslationInterpolation("resolving-question", {
            method: `$t(${getMethodTranslation(method)})`
        });
    };

    static readonly getResolvingConclusion = (firstMethod: Method, secondMethod: Method): TranslationInterpolation => {
        return new TranslationInterpolation("resolving-conclusion", {
            firstMethod: `$t(${getMethodTranslation(firstMethod)})`,
            secondMethod: `$t(${getMethodTranslation(secondMethod)})`
        });
    };

    static readonly getComparisonLayoutDescription = (method: Method): TranslationInterpolation => {
        return new TranslationInterpolation("comparison-layout", {
            method: `$t(${getMethodTranslation(method)})`
        });
    };

    static readonly getTransformationDescription1 = (variable: string, condition: Case): TranslationInterpolation => {
        let text: string;
        switch (condition) {
            case Case.First: {
                text = "comparison-transform-description-1";
                break;
            }
            case Case.Second: {
                text = "comparison-transform-description-2";
                break;
            }
            case Case.Four: {
                text = "comparison-transform-description-4";
                break;
            }
        }
        return new TranslationInterpolation(text, {
            variable: variable
        });
    };

    static readonly getTransformationDescription2 = (firstVariable: string, secondVariable: string): TranslationInterpolation => {
        return new TranslationInterpolation("comparison-transform-description-3", {
            firstVariable: firstVariable,
            secondVariable: secondVariable
        });
    };

    static readonly getTransformationDescriptionForElimination = (variable: string, isFirst: boolean): TranslationInterpolation => {
        return new TranslationInterpolation(isFirst ? "comparison-transform-description-1-elimination" : "comparison-transform-description-2-elimination", {
            variable: variable
        });
    };

    static readonly getSubstitutionSampleSolutionDescription = (variable: string, isFirst: boolean): TranslationInterpolation => {
        return new TranslationInterpolation(isFirst ? "substitution-sample-solution-1" : "substitution-sample-solution-2", {
            variable: variable
        });
    };

    static readonly getEqualizationDescriptionForStep2 = (variable: string): TranslationInterpolation => {
        return new TranslationInterpolation("comparison-step-2-equalization-description", {
            variable: variable
        });
    };

    static readonly getSubstitutionDescriptionForStep2 = (equation1IsFirst: boolean, equation1IsTransformed: boolean, equation2IsTransformed: boolean, substitutedVariable: string, solutionVariable: string): TranslationInterpolation => {
        return new TranslationInterpolation("comparison-step-2-substitution-description", {
            equation1: `$t(${getEquationTranslation(equation1IsFirst, equation1IsTransformed, true)})`,
            equation2: `$t(${getEquationTranslation(!equation1IsFirst, equation2IsTransformed, false)})`,
            substitutedVariable: substitutedVariable,
            solutionVariable: solutionVariable
        });
    };

    static readonly getEliminationWithAdditionDescriptionForStep2 = (variable: string): TranslationInterpolation => {
        return new TranslationInterpolation("comparison-step-2-elimination-description-addition", {
            variable: variable
        });
    };

    static readonly getEliminationWithSubtractionDescriptionForStep2 = (equation1IsFirst: boolean, variable: string): TranslationInterpolation => {
        return new TranslationInterpolation("comparison-step-2-elimination-description-subtraction", {
            equation1: `$t(${getEquationTranslation(equation1IsFirst, false, false)})`,
            equation2: `$t(${getEquationTranslation(!equation1IsFirst, false, true)})`,
            variable: variable
        });
    };

    static readonly getDescriptionForStep3 = (firstVariable: string, secondVariable: string, equation: SelectedEquation): TranslationInterpolation => {
        return new TranslationInterpolation("comparison-step-3-description", {
            firstVariable: firstVariable,
            equation: `$t(${getEquationString(equation)})`,
            secondVariable: secondVariable
        });
    };

    static readonly getSecondMatchingInstruction = (method: Method): TranslationInterpolation => {
        return new TranslationInterpolation(method === Method.Elimination ? "matching-instruction-2-elimination" : "matching-instruction-2", {
            method: `$t(${getMethodTranslation(method)})`
        });
    };

    static readonly getInstructionForSelfExplanationMatchingExercise = (method: Method): TranslationInterpolation => {
        return new TranslationInterpolation("matching-self-explanation-instruction", {
            method: `$t(${getMethodTranslation(method)})`
        });
    };

    static readonly getBackButtonLabel = (method: Method): TranslationInterpolation => {
        return new TranslationInterpolation("back-button", {
            method: `$t(${getMethodTranslation(method)})`
        });
    };
}

export function getMethodTranslation(method: Method): string {
    switch (method) {
        case Method.Equalization:
            return FlexibilityTranslations.EQUALIZATION;

        case Method.Substitution:
            return FlexibilityTranslations.SUBSTITUTION;

        case Method.Elimination:
            return FlexibilityTranslations.ELIMINATION;
    }
}

function getEquationString(equation: SelectedEquation): string {
    switch (equation) {
        case SelectedEquation.FirstInitial:
            return "first-equation";
        case SelectedEquation.SecondInitial:
            return "second-equation";
        case SelectedEquation.FirstTransformed:
            return "first-equation-transformed";
        case SelectedEquation.SecondTransformed:
            return "second-equation-transformed";
    }
}

function getEquationTranslation(isFirst: boolean, isTransformed: boolean, useGen: boolean): string {
    return `${isFirst ? "first" : "second"}-equation${isTransformed ? "-transformed" : ""}${useGen && getCurrentLanguage() === Language.DE ? "-gen" : ""}`;
}

export function getDefinitionByMethod(method: Method): string {
    switch (method) {
        case Method.Equalization:
            return "equalization-def";

        case Method.Substitution:
            return "substitution-def";

        case Method.Elimination:
            return "elimination-def";
    }
}
