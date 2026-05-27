import { TranslationNamespaces } from "@/i18n.ts";
import { faCaretDown, faCaretRight, faChevronRight, faFireFlameCurved } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useAxios from "axios-hooks";
import { ReactElement, ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ErrorTranslations } from "@/types/shared/errorTranslations.ts";
import { CKExerciseResponse } from "@/types/shared/ckExerciseResponse.ts";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import Loader from "@components/shared/Loader.tsx";
import { Paths } from "@routes/paths.ts";
import "@styles/views/collapsible.scss";
import { isExerciseCompleted } from "@utils/utils.ts";

export function Collapsible({ text, children, isOpen = false, handleClick, isStudy = false }: { text: string; children: ReactNode; isOpen?: boolean; handleClick?: (isOpen: boolean) => void; isStudy?: boolean }): ReactElement {
    const [open, setOpen] = useState<boolean>(isOpen);

    return (
        <div className={"collapsible"}>
            <div className={`collapsible__header${isStudy ? "--study" : "--view"}`}>
                <div
                    className={`collapsible__button${isStudy ? "--study" : "--view"}`}
                    onClick={(): void => {
                        setOpen(!open);
                        if (handleClick) {
                            handleClick(!open);
                        }
                    }}
                >
                    {!open && <FontAwesomeIcon icon={faCaretRight} />}
                    {open && <FontAwesomeIcon icon={faCaretDown} />}
                    <p>{text}</p>
                </div>
            </div>
            <div className={"collapsible__contents"}>{open && children}</div>
        </div>
    );
}

function ExerciseList({ route, navigateTo, completedExercises }: { route: string; navigateTo: string; completedExercises?: (number | string)[] }): ReactElement {
    const { t } = useTranslation([TranslationNamespaces.General, TranslationNamespaces.Error]);
    const navigate = useNavigate();

    const [{ data, loading, error }] = useAxios(route);

    if (loading) return <Loader />;
    if (error) {
        console.error(error);
        return <p className={"exercise-list__load-error"}>{t(ErrorTranslations.ERROR_LOAD, { ns: TranslationNamespaces.Error })}</p>;
    }

    const exerciseList: CKExerciseResponse[] = data as CKExerciseResponse[];
    const exerciseIds: number[] = exerciseList.map((entry: CKExerciseResponse) => entry.id);
    return (
        <div className={"exercise-list"}>
            <div
                key={"tutorial"}
                className={"exercise-list__item" + (isExerciseCompleted("tutorial") ? "--completed" : "--todo")}
                onClick={() =>
                    navigate(navigateTo + Paths.TutorialSubPath, {
                        state: { exercises: exerciseIds }
                    })
                }
            >
                <p className={"exercise-font"}>{t(GeneralTranslations.TUTORIAL)}</p>
                <FontAwesomeIcon className={"exercise-font"} icon={faChevronRight} />
            </div>
            {exerciseList.map((entry: CKExerciseResponse, index) => {
                const isCompleted: boolean = isExerciseCompleted(entry.id, completedExercises);
                return (
                    <div
                        key={index}
                        className={"exercise-list__item" + (isCompleted ? "--completed" : "--todo")}
                        onClick={() =>
                            navigate(navigateTo + Paths.ExercisesSubPath + entry.id, {
                                state: { exercises: exerciseIds }
                            })
                        }
                    >
                        <p className={"exercise-font"}>
                            {t(GeneralTranslations.NAV_EXERCISE)} {index + 1}
                        </p>
                        {entry.level !== null && <Level level={entry.level} />}
                        <p className={"exercise-list__status"}>{isCompleted ? t(GeneralTranslations.COMPLETED) : "To-Do"}</p>
                        <FontAwesomeIcon className={"exercise-font"} icon={faChevronRight} />
                    </div>
                );
            })}
        </div>
    );
}

function Level({ level }: { level: number }): ReactElement {
    const levels: number[] = [...Array(level).keys()];

    return (
        <div className={"exercise-list__levels"}>
            {levels.map((index) => {
                return <FontAwesomeIcon key={index} icon={faFireFlameCurved} />;
            })}
        </div>
    );
}

export default function CollapsibleExerciseList({ text, route, navigateTo, completedExercises, isOpen, handleOpen }: { text: string; route: string; navigateTo: string; completedExercises?: (number | string)[]; isOpen?: boolean; handleOpen: (isOpen: boolean) => void }): ReactElement {
    const exerciseList: ReactElement = <ExerciseList route={route} navigateTo={navigateTo} completedExercises={completedExercises} />;
    return <Collapsible text={text} children={exerciseList} isOpen={isOpen} handleClick={handleOpen} />;
}
