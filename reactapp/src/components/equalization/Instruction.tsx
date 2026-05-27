import { TranslationNamespaces } from "@/i18n.ts";
import { faArrowRight, faCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { evaluate } from "mathjs";
import React, { ReactElement, ReactNode, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { EqualizationExercise } from "@/types/equalization/equalizationExercise";
import { EqualizationTranslations } from "@/types/equalization/equalizationTranslations.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { getImageSourceByName } from "@utils/itemImageLoader.ts";

export default function Instruction({ translation, children }: { translation: TranslationInterpolation; children?: ReactNode }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.Equalization, TranslationNamespaces.Variables]);

    return (
        <div className={"instruction-board"}>
            <div className={"instruction-board__container"}>
                <div className={"instruction-board__background"}>
                    {translation.interpolationVariables !== null ? (
                        <p>
                            <Trans ns={[TranslationNamespaces.Equalization, TranslationNamespaces.Variables]} i18nKey={translation.translationKey} values={translation.interpolationVariables} />
                        </p>
                    ) : (
                        <p>{t(translation.translationKey, { ns: TranslationNamespaces.Equalization })}</p>
                    )}
                    {children}
                </div>
                <div className={"instruction-board__clamp"}>
                    <p>{t(EqualizationTranslations.TASK_SIGN, { ns: TranslationNamespaces.Equalization })}</p>
                </div>
            </div>
        </div>
    );
}

export function InstructionForScaleAndSystemRelation({ onContinue, onExplain, trackAction }: { onContinue: () => void; onExplain: () => void; trackAction: (action: string) => void }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.Equalization]);
    return (
        <div className={"instruction-board__contents"}>
            <button
                className={"button primary-button"}
                onClick={(): void => {
                    trackAction("SKIP equalization explanation");
                    onContinue();
                }}
            >
                {t(EqualizationTranslations.CONTINUE)}
            </button>
            <button
                className={"button primary-button"}
                onClick={(): void => {
                    trackAction("EXPLAIN equalization");
                    onExplain();
                }}
            >
                {t(EqualizationTranslations.EXPLAIN)}
            </button>
        </div>
    );
}

export function InstructionForContinuingWithSimplification({ handleClick }: { handleClick: () => void }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General]);
    return (
        <button className={"button primary-button"} onClick={handleClick}>
            {t(GeneralTranslations.BUTTON_CONTINUE)}
        </button>
    );
}

export function InstructionForSecondVariableInput({ exercise, handleCorrectSolution, trackAction, trackError }: { exercise: EqualizationExercise; handleCorrectSolution: () => void; trackAction: (action: string) => void; trackError: () => void }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.Variables, TranslationNamespaces.Equalization]);

    const [input, setInput] = useState("");
    const [validationError, setValidationError] = useState(false);
    const [warningIncorrectInput, setWarningIncorrectInput] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <React.Fragment>
            <div className={"instruction-board__contents"}>
                <div className={"image-equation"}>
                    <div className={"image-equation__image"}>
                        <img src={getImageSourceByName(exercise.secondVariable.name)} alt={exercise.secondVariable.name} />
                    </div>
                    <p className={"image-equation__operator"}>=</p>
                    <input autoFocus={!isTouchDevice()} className={`instruction-board__contents-input ${validationError || warningIncorrectInput ? "error" : ""}`} type="text" ref={inputRef} value={input} pattern="^[0-9+\-*\/]*$" maxLength={10} onBlur={handleBlur} onKeyDown={handleKeyDown} onChange={handleChange} />
                    <p> g</p>
                </div>
                <button className={"button primary-button"} onClick={handleClick}>
                    {t(GeneralTranslations.BUTTON_INSERT, { ns: TranslationNamespaces.General })}
                    <FontAwesomeIcon icon={faCheck} />
                </button>
            </div>
            {validationError && <p className={"instruction-board__contents-feedback"}>{t(EqualizationTranslations.INPUT_VALIDATION_ERR, { ns: TranslationNamespaces.Equalization })} &#43;, &#8722;, &#215;, &#8725;</p>}
            {warningIncorrectInput && <p className={"instruction-board__contents-feedback"}>{t(EqualizationTranslations.INPUT_INCORRECT_INPUT, { ns: TranslationNamespaces.Equalization })}</p>}
        </React.Fragment>
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleBlur(event: any): void {
        if (!validationError && (event.target.validity.patternMismatch || input === "")) {
            inputRef.current?.focus();
            setValidationError(true);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleKeyDown(event: any): void {
        if (event.key === "Enter") {
            handleClick();
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleChange(event: any): void {
        if (warningIncorrectInput) {
            setWarningIncorrectInput(false);
        }
        const isValid = !event.target.validity.patternMismatch;
        if (validationError) {
            if (isValid) {
                setValidationError(false);
            }
        } else if (!isValid) {
            setValidationError(true);
        }
        setInput(event.target.value);
    }

    function handleClick(): void {
        if (validationError) {
            return;
        }

        try {
            const evaluatedInput = evaluate(input);
            if (evaluatedInput === exercise.secondVariable.weight) {
                trackAction(`SOLUTION ${input}`);
                handleCorrectSolution();
            } else {
                trackError();
                trackAction(`Error: FALSE input ${input}`);
                setWarningIncorrectInput(true);
            }
        } catch (error) {
            trackError();
            trackAction(`Error: INVALID input ${input}`);
            setValidationError(true);
        }
    }

    function isTouchDevice(): boolean {
        return ("ontouchstart" in window || navigator.maxTouchPoints > 0) && window.innerWidth <= 1300;
    }
}

export function InstructionForDeterminingIsolatedVariable({ exercise }: { exercise: EqualizationExercise }): ReactElement {
    return (
        <React.Fragment>
            <div className={"instruction-board__contents"} style={{ color: "var(--dark-text)" }}>
                <div className={"image-equation"}>
                    <div className={"image-equation__image"}>
                        <img src={getImageSourceByName(exercise.secondVariable.name)} alt={exercise.secondVariable.name} />
                    </div>
                    <p className={"image-equation__operator"}>&#61;</p>
                    <p>{exercise.secondVariable.weight} g</p>
                </div>
                <div className={"image-equation"}>
                    <div className={"image-equation__image"}>
                        <img src={getImageSourceByName(exercise.isolatedVariable.name)} alt={exercise.isolatedVariable.name} />
                    </div>
                    <p className={"image-equation__operator"}>&#61;</p>
                    <p>?</p>
                </div>
            </div>
        </React.Fragment>
    );
}

export function InstructionForSolution({ exercise, handleClick }: { exercise: EqualizationExercise; handleClick: () => void }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General]);

    return (
        <React.Fragment>
            <div className={"instruction-board__contents"} style={{ color: "var(--dark-text)" }}>
                <div className={"image-equation"}>
                    <div className={"image-equation__image"}>
                        <img src={getImageSourceByName(exercise.secondVariable.name)} alt={exercise.secondVariable.name} />
                    </div>
                    <p className={"image-equation__operator"}>&#61;</p>
                    <p>{exercise.secondVariable.weight} g</p>
                </div>
                <div className={"image-equation"}>
                    <div className={"image-equation__image"}>
                        <img src={getImageSourceByName(exercise.isolatedVariable.name)} alt={exercise.isolatedVariable.name} />
                    </div>
                    <p className={"image-equation__operator"}>&#61;</p>
                    <p>{exercise.isolatedVariable.weight} g</p>
                </div>
            </div>
            <button className={"button primary-button"} onClick={handleClick}>
                {t(GeneralTranslations.BUTTON_CONTINUE)}
                <FontAwesomeIcon icon={faArrowRight} />
            </button>
        </React.Fragment>
    );
}
