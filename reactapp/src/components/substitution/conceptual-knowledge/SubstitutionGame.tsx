import { useAuth } from "@/contexts/AuthProvider.tsx";
import { TranslationNamespaces } from "@/i18n.ts";
import { faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement, ReactNode, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Operator } from "@/types/math/enums.ts";
import { GameError, GameErrorType } from "@/types/shared/error.ts";
import { SubstitutionItem } from "@/types/shared/item.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { CKExerciseType, SubstitutionPhase } from "@/types/studies/enums.ts";
import { IUser } from "@/types/studies/user.ts";
import { SubstitutionGamePhase, SubstitutionItemType, SubstitutionLocation } from "@/types/substitution/conceptual-knowledge/enums.ts";
import { ItemEquation } from "@/types/substitution/conceptual-knowledge/itemEquation.ts";
import { SubstitutionExercise } from "@/types/substitution/conceptual-knowledge/substitutionExercise.ts";
import { SubstitutionInfo } from "@/types/substitution/conceptual-knowledge/substitutionInfo.ts";
import { SubstitutionTranslations } from "@/types/substitution/substitutionTranslations.ts";
import HintPopover from "@components/shared/HintPopover.tsx";
import Introduction from "@components/substitution/conceptual-knowledge/Introduction.tsx";
import SubstitutionSolution, { SystemSolution, VariableSolution } from "@components/substitution/conceptual-knowledge/SubstitutionSolution.tsx";
import VariableSelection from "@components/substitution/conceptual-knowledge/VariableSelection.tsx";
import VariableSubstitution, { SecondVariableSubstitution } from "@components/substitution/conceptual-knowledge/VariableSubstitution.tsx";
import { Paths } from "@routes/paths.ts";
import useCKTracker from "@hooks/useCKTracker.ts";
import { setCKExerciseCompleted, setCKStudyExerciseCompleted } from "@utils/storageUtils.ts";

export default function SubstitutionGame({ exercise, actionOverlay, isStudy = false, studyId, collectData = true }: { exercise: SubstitutionExercise; actionOverlay?: ReactNode; isStudy?: boolean; studyId?: number; collectData?: boolean }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Substitution);
    const navigate = useNavigate();

    const firstItemEquation: ItemEquation = useMemo(() => {
        return ItemEquation.getItemEquationFromLinearEquation(exercise, exercise.firstEquation.equation);
    }, [exercise]); // Value is only recomputed if the parameter exercise changes and not during re-rendering

    const secondItemEquation: ItemEquation = useMemo(() => {
        return ItemEquation.getItemEquationFromLinearEquation(exercise, exercise.secondEquation.equation);
    }, [exercise]);

    const { user } = useAuth();
    if (isStudy) {
        if (user === undefined) {
            throw new GameError(GameErrorType.AUTH_ERROR);
        }
        if (studyId === undefined) {
            throw new GameError(GameErrorType.STUDY_ID_ERROR);
        }
    }
    const { trackActionInPhase, trackHintInPhase, trackErrorInPhase, setNextTrackingPhase, endTrackingPhase, endTracking } = useCKTracker(isStudy && collectData, user as IUser, CKExerciseType.Substitution, studyId as number, exercise.id, performance.now());
    const [returned, setReturned] = useState<boolean>(false);

    const [gamePhase, setGamePhase] = useState<SubstitutionGamePhase>(SubstitutionGamePhase.Introduction);
    const [substitutionInfo, setSubstitutionInfo] = useState<SubstitutionInfo | null>(null);
    const [hints, setHints] = useState<TranslationInterpolation[] | null>(null);

    const [showActionOverlay, setShowActionOverlay] = useState<boolean>(false);

    let contents;
    switch (gamePhase) {
        case SubstitutionGamePhase.Introduction: {
            contents = (
                <Introduction
                    exercise={exercise}
                    handleClick={(): void => {
                        setGamePhase(SubstitutionGamePhase.IsolatedVariableSelection);
                        setHints(SubstitutionTranslations.getHintsForFirstSelection(exercise.isolatedVariable.name));
                    }}
                />
            );
            break;
        }

        case SubstitutionGamePhase.IsolatedVariableSelection: {
            const textForSubstitutionGoal: TranslationInterpolation = SubstitutionTranslations.getTextForSubstitutionGoal(exercise.isolatedVariable.name, exercise.secondVariable.name);
            contents = (
                <VariableSelection
                    exercise={exercise}
                    firstItemEquation={firstItemEquation}
                    selectableIsInFirstEquation={!exercise.firstEquation.isIsolated}
                    secondItemEquation={secondItemEquation}
                    selectableIsInSecondEquation={!exercise.secondEquation.isIsolated}
                    selectableItemType={SubstitutionItemType.IsolatedVariable}
                    callback={(location: SubstitutionLocation, selectedItem: SubstitutionItem): void => {
                        setSubstitutionInfo(new SubstitutionInfo([], selectedItem, location));
                        setHints(SubstitutionTranslations.getHintsForFirstSubstitution(exercise, exercise.firstEquation.isIsolated ? firstItemEquation : secondItemEquation, selectedItem));
                        setGamePhase(SubstitutionGamePhase.IsolatedVariableSubstitution);
                        setNextTrackingPhase(SubstitutionPhase.FirstSubstitution);
                    }}
                    children={
                        <React.Fragment>
                            <p>
                                <Trans ns={TranslationNamespaces.Substitution} i18nKey={textForSubstitutionGoal.translationKey} values={textForSubstitutionGoal.interpolationVariables as object} />
                            </p>
                            <p>{t(SubstitutionTranslations.VAR_SELECTION)}</p>
                        </React.Fragment>
                    }
                    trackAction={trackActionInPhase}
                    trackError={trackErrorInPhase}
                />
            );
            break;
        }

        case SubstitutionGamePhase.IsolatedVariableSubstitution: {
            if (substitutionInfo === null) {
                console.error("An unexpected error occurred in the component 'SubstitutionGame': The object 'substitutionInfo' is null.");
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }

            const invertOperator: boolean = substitutionInfo.itemLocation === SubstitutionLocation.SecondEquation ? operatorIsMinus(firstItemEquation) : operatorIsMinus(secondItemEquation);

            contents = (
                <VariableSubstitution
                    exercise={exercise}
                    substitutionInfo={substitutionInfo}
                    firstItemEquation={firstItemEquation}
                    secondItemEquation={secondItemEquation}
                    invertOperator={invertOperator}
                    callback={(substitutedItems: SubstitutionItem[]): void => {
                        setSubstitutionInfo(new SubstitutionInfo(substitutedItems, substitutionInfo.selectedItem, substitutionInfo.itemLocation));
                        setHints(null);
                        setGamePhase(SubstitutionGamePhase.SubstitutionSolution);
                    }}
                    trackAction={trackActionInPhase}
                    trackError={trackErrorInPhase}
                />
            );
            break;
        }

        case SubstitutionGamePhase.SubstitutionSolution: {
            if (substitutionInfo === null) {
                console.error("An unexpected error occurred in the component 'SubstitutionGame': The object 'substitutionInfo' is null.");
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }

            contents = (
                <SubstitutionSolution
                    exercise={exercise}
                    firstItemEquation={firstItemEquation}
                    secondItemEquation={secondItemEquation}
                    substitutionInfo={substitutionInfo}
                    callback={() => {
                        setHints(SubstitutionTranslations.getHintsForSecondSelection(exercise.secondVariable.name));
                        setGamePhase(SubstitutionGamePhase.SecondVariableSelection);
                        setNextTrackingPhase(SubstitutionPhase.SecondSelection);
                    }}
                />
            );
            break;
        }

        case SubstitutionGamePhase.SecondVariableSelection: {
            const textForSecondVarValue: TranslationInterpolation = SubstitutionTranslations.getTextForSecondVarValue(exercise.secondVariable.name);
            const instrForSecondSubstitution: TranslationInterpolation = SubstitutionTranslations.getInstructionForSecondSubstitution(exercise.isolatedVariable.name, exercise.secondVariable.name);

            contents = (
                <VariableSelection
                    exercise={exercise}
                    firstItemEquation={firstItemEquation}
                    selectableIsInFirstEquation={true}
                    secondItemEquation={secondItemEquation}
                    selectableIsInSecondEquation={true}
                    selectableItemType={SubstitutionItemType.SecondVariable}
                    callback={(location: SubstitutionLocation, selectedItem: SubstitutionItem): void => {
                        setSubstitutionInfo(new SubstitutionInfo([], selectedItem, location));
                        setHints(SubstitutionTranslations.getHintsForSecondSubstitution(exercise, selectedItem));
                        setGamePhase(SubstitutionGamePhase.CoinSubstitution);
                        setNextTrackingPhase(returned ? SubstitutionPhase.RepeatedSecondSubstitution : SubstitutionPhase.SecondSubstitution);
                    }}
                    children={
                        <React.Fragment>
                            <p>
                                <Trans ns={TranslationNamespaces.Substitution} i18nKey={textForSecondVarValue.translationKey} values={textForSecondVarValue.interpolationVariables as object} />
                            </p>
                            <VariableSolution variable={exercise.secondVariable} />
                            <p>
                                <Trans ns={TranslationNamespaces.Substitution} i18nKey={instrForSecondSubstitution.translationKey} values={instrForSecondSubstitution.interpolationVariables as object} />
                            </p>
                        </React.Fragment>
                    }
                    trackAction={trackActionInPhase}
                    trackError={trackErrorInPhase}
                />
            );
            break;
        }

        case SubstitutionGamePhase.CoinSubstitution: {
            if (substitutionInfo === null) {
                console.error("An unexpected error occurred in the component 'SubstitutionGame': The object 'substitutionInfo' is null.");
                throw new GameError(GameErrorType.GAME_LOGIC_ERROR);
            }

            contents = (
                <SecondVariableSubstitution
                    exercise={exercise}
                    substitutionInfo={substitutionInfo}
                    firstItemEquation={firstItemEquation}
                    secondItemEquation={secondItemEquation}
                    callback={(): void => {
                        setHints(null);
                        setGamePhase(SubstitutionGamePhase.SystemSolution);
                    }}
                    trackAction={trackActionInPhase}
                    trackError={trackErrorInPhase}
                />
            );
            break;
        }

        case SubstitutionGamePhase.SystemSolution: {
            endTrackingPhase();
            endTracking();
            contents = (
                <SystemSolution
                    exercise={exercise}
                    firstItemEquation={firstItemEquation}
                    secondItemEquation={secondItemEquation}
                    handleEnd={(): void => {
                        if (isStudy) {
                            if (collectData) {
                                setCKStudyExerciseCompleted(studyId as number, "substitution", exercise.id);
                            }
                            navigate(Paths.CKStudyPath + studyId);
                        } else {
                            setCKExerciseCompleted(exercise.id, "substitution");
                            setShowActionOverlay(true);
                        }
                    }}
                />
            );
            break;
        }
    }

    return (
        <React.Fragment>
            {showActionOverlay && actionOverlay}
            <div className={"substitution"}>
                <div className={"substitution__contents"}>{contents}</div>
                <div className={`substitution__footer ${gamePhase === SubstitutionGamePhase.CoinSubstitution && !returned ? "space" : "end"}`}>
                    {gamePhase === SubstitutionGamePhase.CoinSubstitution && !returned && (
                        <button
                            className={"button primary-button"}
                            onClick={(): void => {
                                trackActionInPhase("RETURN to SECOND SELECTION");
                                setGamePhase(SubstitutionGamePhase.SecondVariableSelection);
                                setReturned(true);
                                setNextTrackingPhase(SubstitutionPhase.RepeatedSecondSelection);
                            }}
                        >
                            <FontAwesomeIcon icon={faRotateLeft} />
                        </button>
                    )}
                    {hints && <HintPopover hints={hints} namespaces={[TranslationNamespaces.Substitution]} trackHint={trackHintInPhase} />}
                </div>
            </div>
        </React.Fragment>
    );
}

function operatorIsMinus(equation: ItemEquation): boolean {
    if (equation.leftItems[0].itemType === SubstitutionItemType.IsolatedVariable) {
        return equation.leftItems[0].operator === Operator.Minus;
    } else {
        return equation.rightItems[0].operator === Operator.Minus;
    }
}
