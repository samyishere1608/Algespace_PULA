import { TranslationNamespaces } from "@/i18n.ts";
import { faArrowLeft, faArrowRight, faList } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { CSSProperties, ReactElement, useMemo, useState } from "react";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import { TutorialInstruction } from "@/types/shared/tutorialInstruction.ts";
import { Paths } from "@routes/paths.ts";
import "@styles/views/tutorial.scss";

export default function Tutorial({ title, isGerman, instructions, returnTo, setTutorialCompleted, navigateToExercise, exercises, isStudy = false, hideReturnButton = false }: { title: string; isGerman: boolean; instructions: TutorialInstruction[]; returnTo: string; setTutorialCompleted: () => void; navigateToExercise?: string; exercises?: string[] | undefined; isStudy?: boolean; hideReturnButton?: boolean }): ReactElement {
    const navigate = useNavigate();
    const { t } = useTranslation(TranslationNamespaces.General);

    const [index, setIndex] = useState<number>(0);

    const numberOfInstructions: number = useMemo(() => {
        return instructions.length;
    }, [instructions]);

    const instruction: TutorialInstruction = instructions[index];

    const isLastIndex: boolean = index === numberOfInstructions - 1;

    const backgroundImage: CSSProperties = {
        backgroundImage: `url(${isGerman ? instruction.ImageSourceDe : instruction.ImageSourceEn})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center"
    };

    return (
        <div className={`tutorial ${instruction.Classname ? instruction.Classname : ""}`} style={{ ...backgroundImage }}>
            {index == 0 && <p className={"tutorial__title"}>{title}</p>}
            {!isLastIndex && instruction.Instructions && (
                <div className={"tutorial__instructions"}>
                    {instruction.Instructions?.map((instruction: string, index: number) => {
                        return <p key={index}>{instruction}</p>;
                    })}
                </div>
            )}
            {isLastIndex && (
                <div className={"tutorial__instructions"}>
                    <p>{t(GeneralTranslations.TUTORIAL_END)}</p>
                    <p>{isStudy ? t(GeneralTranslations.TUTORIAL_END_STUDY) : t(GeneralTranslations.TUTORIAL_END_PLAIN)}</p>
                </div>
            )}
            <div className={"tutorial__buttons"}>
                {index !== 0 && (
                    <button className={"button primary-button"} onClick={() => setIndex((previousIndex: number) => previousIndex - 1)}>
                        <FontAwesomeIcon icon={faArrowLeft} />
                        {t(GeneralTranslations.TUTORIAL_PREV_INSTR)}
                    </button>
                )}
                {isLastIndex &&
                    (isStudy ? (
                        <React.Fragment>
                            <button
                                className={"button primary-button"}
                                onClick={(): void => {
                                    setTutorialCompleted();
                                    navigate(returnTo);
                                }}
                            >
                                <FontAwesomeIcon icon={faList} />
                                {t(GeneralTranslations.TUTORIAL_EXERCISES)}
                            </button>
                        </React.Fragment>
                    ) : (
                        <React.Fragment>
                            {!hideReturnButton && (
                                <button className={"button primary-button"} onClick={() => navigate(returnTo)}>
                                    <FontAwesomeIcon icon={faList} />
                                    {t(GeneralTranslations.TUTORIAL_EXERCISES)}
                                </button>
                            )}
                            {exercises && (
                                <button className={"button primary-button"} onClick={loadFirstExercise}>
                                    {t(GeneralTranslations.TUTORIAL_FIRST_EXERCISE)}
                                    <FontAwesomeIcon icon={faArrowRight} />
                                </button>
                            )}
                        </React.Fragment>
                    ))}
                {!isLastIndex && (
                    <button className={"button primary-button"} onClick={loadNextInstruction}>
                        {t(GeneralTranslations.TUTORIAL_NEXT_INSTR)}
                        <FontAwesomeIcon icon={faArrowRight} />
                    </button>
                )}
            </div>
        </div>
    );

    function loadNextInstruction(): void {
        setTutorialCompleted();
        setIndex((previousIndex: number) => previousIndex + 1);
    }

    function loadFirstExercise(): void {
        setTutorialCompleted();

        if (!exercises) {
            console.error("No exercises were provided.");
            throw new Error();
        }

        const id: number = parseInt(exercises[0]);
        navigate(navigateToExercise + Paths.ExercisesSubPath + id, {
            state: { exercises: exercises }
        });
    }
}
