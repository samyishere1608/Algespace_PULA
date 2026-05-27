import { useAuth } from "@/contexts/AuthProvider.tsx";
import { TranslationNamespaces } from "@/i18n.ts";
import { faRotateLeft, faRotateRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { produce } from "immer";
import { Fraction, evaluate } from "mathjs";
import React, { ReactElement, ReactNode, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useImmer } from "use-immer";
import { EliminationConstants } from "@/types/elimination/eliminationConstants.ts";
import { EliminationExercise } from "@/types/elimination/eliminationExercise.ts";
import { EliminationTranslations } from "@/types/elimination/eliminationTranslations.ts";
import { InputError, NotebookState } from "@/types/elimination/enums.ts";
import { OperationOutOfRangeError } from "@/types/elimination/operationOutOfRangeError.ts";
import { Row } from "@/types/elimination/row.ts";
import { math } from "@/types/math/math.ts";
import { GameError, GameErrorType } from "@/types/shared/error.ts";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import { CKExerciseType } from "@/types/studies/enums.ts";
import { IUser } from "@/types/studies/user.ts";
import HeadEntry, { HeadEntryForCosts } from "@components/elimination/HeadEntry.tsx";
import PostIt from "@components/elimination/PostIt.tsx";
import TableInputRow from "@components/elimination/TableInputRow.tsx";
import TableRow, { EmptyTableRow, PlainTableRow } from "@components/elimination/TableRow.tsx";
import CancelAction from "@components/elimination/notebookActions/CancelAction.tsx";
import ConfirmAddition, { AddSubError } from "@components/elimination/notebookActions/ConfirmAddition.tsx";
import ConfirmMulDiv, { MulDivError } from "@components/elimination/notebookActions/ConfirmMulDiv.tsx";
import ConfirmSubtraction from "@components/elimination/notebookActions/ConfirmSubtraction.tsx";
import EquationChoice from "@components/elimination/notebookActions/EquationChoice.tsx";
import EquationSelection from "@components/elimination/notebookActions/EquationSelection.tsx";
import FirstSolution from "@components/elimination/notebookActions/FirstSolution.tsx";
import InitialAction, { MaxRowsWarning } from "@components/elimination/notebookActions/InitialAction.tsx";
import HintPopover from "@components/shared/HintPopover.tsx";
import Switch from "@components/shared/Switch.tsx";
import { Paths } from "@routes/paths.ts";
import useCKTracker from "@hooks/useCKTracker.ts";
import { setCKExerciseCompleted, setCKStudyExerciseCompleted } from "@utils/storageUtils.ts";

export default function EliminationGame({ exercise, actionOverlay, isStudy = false, studyId, collectData = true }: { exercise: EliminationExercise; actionOverlay?: ReactNode; isStudy?: boolean; studyId?: number; collectData?: boolean }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Elimination);
    const navigate = useNavigate();

    const { user } = useAuth();
    if (isStudy) {
        if (user === undefined) {
            throw new GameError(GameErrorType.AUTH_ERROR);
        }
        if (studyId === undefined) {
            throw new GameError(GameErrorType.STUDY_ID_ERROR);
        }
    }
    const { trackAction, trackHint, trackError, endTracking, trackChoice } = useCKTracker(isStudy && collectData, user as IUser, CKExerciseType.Elimination, studyId as number, exercise.id, performance.now());

    const hints: TranslationInterpolation[] = useMemo(() => EliminationTranslations.getHints(), []);

    const [gameHistory, setGameHistory] = useImmer([Row.initializeRows(exercise)]);
    const [currentStep, setCurrentStep] = useState<number>(0);
    const rows: Row[] = gameHistory[currentStep];

    const [selectedRows, setSelectedRows] = useImmer([] as number[]);
    const [notebookState, setNotebookState] = useState<NotebookState>(NotebookState.Initial);

    const [validationError, setValidationError] = useState<[boolean, InputError]>([false, InputError.Validation]);
    const [mulDivInput, setMulDivInput] = useState("");

    const [displayImages, setDisplayImages] = useState(false);
    const [displayFractions, setDisplayFractions] = useState(false);

    const [showActionOverlay, setShowActionOverlay] = useState<boolean>(false);

    const [firstEquationSelected, setFirstEquationSelected] = useState<boolean>(false);

    if (![NotebookState.FirstSolution, NotebookState.EquationSelection, NotebookState.GoodChoice, NotebookState.BadChoice, NotebookState.NeutralChoice].includes(notebookState)) {
        const index: number = rows.findIndex((row: Row) => (math.isZero(row.first) && row.second.n === row.second.d && row.second.s !== -1) || (row.first.n === row.first.d && row.first.s !== -1 && math.isZero(row.second)));
        if (index !== -1) {
            setSelectedRows([index]);
            setNotebookState(NotebookState.FirstSolution);
        }
    }

    let actions;
    switch (notebookState) {
        case NotebookState.Initial: {
            if (rows.length >= EliminationConstants.MAX_ROWS) {
                actions = <MaxRowsWarning />;
            } else {
                actions = <InitialAction addOrSubRows={loadAdditionOrSubtractionAction} />;
            }
            break;
        }

        case NotebookState.Addition: {
            const textForConfirmAddition: TranslationInterpolation = EliminationTranslations.getTextForAdditionConfirm(selectedRows[0], selectedRows[1]);

            if (selectedRows.length < 2) {
                actions = <CancelAction text={EliminationTranslations.INSTR_ADD_ROWS} cancelAction={cancelAction} />;
            } else if (validationError[0]) {
                actions = <AddSubError text={textForConfirmAddition} cancelAction={cancelAction} />;
            } else {
                actions = <ConfirmAddition exercise={exercise} rows={rows} selectedRows={selectedRows} text={textForConfirmAddition} showFractions={displayFractions} cancelAction={cancelAction} addRows={() => addOrSubtractRows(true)} />;
            }
            break;
        }

        case NotebookState.Subtraction: {
            const textForConfirmSubtraction: TranslationInterpolation = EliminationTranslations.getTextForSubtractionConfirm(selectedRows[0], selectedRows[1]);

            if (selectedRows.length < 2) {
                actions = <CancelAction text={EliminationTranslations.INSTR_SUB_ROWS} cancelAction={cancelAction} />;
            } else if (validationError[0]) {
                actions = <AddSubError text={textForConfirmSubtraction} cancelAction={cancelAction} />;
            } else {
                actions = <ConfirmSubtraction exercise={exercise} rows={rows} selectedRows={selectedRows} text={textForConfirmSubtraction} showFractions={displayFractions} cancelAction={cancelAction} switchSequence={switchSequenceOfSelectedRows} subtractRows={() => addOrSubtractRows(false)} />;
            }
            break;
        }

        case NotebookState.Multiplication: {
            if (mulDivInput === "") {
                actions = <CancelAction text={EliminationTranslations.INSTR_MUL_ROWS} cancelAction={cancelAction} />;
            } else if (validationError[0]) {
                actions = <MulDivError errorType={validationError[1]} isMultiplication={true} cancelAction={cancelAction} />;
            } else {
                actions = <ConfirmMulDiv cancelAction={cancelAction} multiplyOrDivideRow={multiplyOrDivideRow} />;
            }

            break;
        }

        case NotebookState.Division: {
            if (mulDivInput === "") {
                actions = <CancelAction text={EliminationTranslations.INSTR_DIV_ROWS} cancelAction={cancelAction} />;
            } else if (validationError[0]) {
                actions = <MulDivError errorType={validationError[1]} isMultiplication cancelAction={cancelAction} />;
            } else {
                actions = <ConfirmMulDiv cancelAction={cancelAction} multiplyOrDivideRow={multiplyOrDivideRow} />;
            }

            break;
        }

        case NotebookState.FirstSolution: {
            actions = <FirstSolution exercise={exercise} rows={rows} selectedRows={selectedRows} showFractions={displayFractions} setNotebookState={setNotebookState} />;
            break;
        }

        case NotebookState.EquationSelection: {
            actions = <EquationSelection exercise={exercise} rows={rows} selectedRows={selectedRows} showFractions={displayFractions} setNotebookState={setNotebookState} trackChoice={trackChoice} setFirstEquationSelected={setFirstEquationSelected} />;
            break;
        }

        case NotebookState.GoodChoice: {
            endTracking();
            const textGoodChoice: TranslationInterpolation = EliminationTranslations.getTextForGoodChoice(firstEquationSelected);
            actions = <EquationChoice exercise={exercise} showFractions={displayFractions} text={textGoodChoice} handleClick={handleEnd} />;
            break;
        }

        case NotebookState.BadChoice: {
            endTracking();
            const firstIsZero: boolean = math.isZero(rows[selectedRows[0]].first);
            const textBadChoice: TranslationInterpolation = EliminationTranslations.getTextBadChoice(firstIsZero ? exercise.secondVariable.name : exercise.firstVariable.name, firstEquationSelected);
            actions = <EquationChoice exercise={exercise} showFractions={displayFractions} text={textBadChoice} handleClick={handleEnd} />;
            break;
        }

        case NotebookState.NeutralChoice: {
            endTracking();
            const textNeutralChoice: TranslationInterpolation = EliminationTranslations.getTextForNeutralChoice();
            actions = <EquationChoice exercise={exercise} showFractions={displayFractions} text={textNeutralChoice} handleClick={handleEnd} />;
            break;
        }
    }

    const buttonsDisabled: boolean = [NotebookState.FirstSolution, NotebookState.EquationSelection, NotebookState.GoodChoice, NotebookState.BadChoice, NotebookState.NeutralChoice].includes(notebookState);

    return (
        <React.Fragment>
            {showActionOverlay && actionOverlay}
            <div className={"elimination"}>
                <div className={"elimination__contents"}>
                    <div className={"elimination__post-it-container"}>
                        <div className={"elimination__switches"}>
                            <Switch id={"switch-for-images"} label={t(EliminationTranslations.SWITCH_IMAGES)} checked={displayImages} setChecked={setDisplayImages} disabled={buttonsDisabled} trackAction={trackAction} actionLabel={"images"} />
                            <Switch id={"switch-for-fractions"} label={t(EliminationTranslations.SWITCH_FRACTIONS)} checked={displayFractions} setChecked={setDisplayFractions} disabled={false} trackAction={trackAction} actionLabel={"fractions"} />
                        </div>
                        <PostIt exercise={exercise} />
                    </div>
                    <div className={"notebook"}>
                        {![NotebookState.EquationSelection, NotebookState.BadChoice, NotebookState.GoodChoice, NotebookState.NeutralChoice].includes(notebookState) ? (
                            <React.Fragment>
                                <table>
                                    <thead>
                                        <tr>
                                            <HeadEntry name={exercise.firstVariable.name} />
                                            <HeadEntry name={exercise.secondVariable.name} />
                                            <HeadEntryForCosts />
                                            <th className={"notebook__table-action-entry"} />
                                        </tr>
                                    </thead>
                                    <tbody style={{ overflowY: rows.length > 5 || (rows.length > 4 && displayImages) ? "scroll" : "hidden" }}>
                                        <React.Fragment>
                                            {[NotebookState.Division, NotebookState.Multiplication].includes(notebookState)
                                                ? rows.map((row: Row, index: number) => {
                                                      if (index === selectedRows[0]) {
                                                          return <TableInputRow key={index} exercise={exercise} row={row} index={index} currentState={notebookState} displayFractions={displayFractions} displayImages={displayImages} input={mulDivInput} setInput={setMulDivInput} validationError={validationError} setValidationError={setValidationError} multiplyOrDivideRow={multiplyOrDivideRow} />;
                                                      } else {
                                                          return <PlainTableRow key={index} exercise={exercise} row={row} displayFractions={displayFractions} displayImages={displayImages} />;
                                                      }
                                                  })
                                                : rows.map((row: Row, index: number) => {
                                                      return (
                                                          <TableRow
                                                              key={index}
                                                              exercise={exercise}
                                                              row={row}
                                                              index={index}
                                                              currentState={notebookState}
                                                              isSelected={selectedRows.includes(index)}
                                                              displayFractions={displayFractions}
                                                              displayImages={displayImages}
                                                              handleClick={selectRow}
                                                              handleMultiplicationClick={loadMultiplicationAction}
                                                              handleDivisionClick={loadDivisionAction}
                                                              handleDelete={deleteRow}
                                                              canDelete={rows.length > 2}
                                                              handleCopy={copyRow}
                                                              canCopy={rows.length < EliminationConstants.MAX_ROWS}
                                                          />
                                                      );
                                                  })}
                                            {rows.length < 5 &&
                                                [...Array(5 - rows.length)].map((_, index: number) => {
                                                    return <EmptyTableRow key={index} />;
                                                })}
                                        </React.Fragment>
                                    </tbody>
                                </table>
                                <div className={"actions"}>{actions}</div>
                            </React.Fragment>
                        ) : (
                            <React.Fragment>{actions}</React.Fragment>
                        )}
                    </div>
                </div>
                <div className={"elimination__footer"}>
                    <div className={"elimination__button-group"}>
                        <button className={"button primary-button"} disabled={currentStep < 1 || buttonsDisabled} onClick={undoLastStep}>
                            <FontAwesomeIcon icon={faRotateLeft} />
                        </button>
                        <button className={"button primary-button"} disabled={currentStep >= gameHistory.length - 1 || buttonsDisabled} onClick={loadPreviousState}>
                            <FontAwesomeIcon icon={faRotateRight} />
                        </button>
                    </div>
                    <HintPopover hints={hints} namespaces={[TranslationNamespaces.Elimination]} disabled={buttonsDisabled} trackHint={trackHint} />
                </div>
            </div>
        </React.Fragment>
    );

    function undoLastStep(): void {
        if (currentStep >= 1 && gameHistory.length >= currentStep) {
            setCurrentStep(currentStep - 1);
        }
        trackAction("UNDO");
    }

    function loadPreviousState(): void {
        if (currentStep < gameHistory.length) {
            setCurrentStep(currentStep + 1);
        }
        trackAction("REDO");
    }

    function loadAdditionOrSubtractionAction(addition: boolean): void {
        trackAction(`load ${addition ? "ADD" : "SUB"}`);
        if (addition) {
            setNotebookState(NotebookState.Addition);
        } else {
            setNotebookState(NotebookState.Subtraction);
        }
    }

    function selectRow(rowIndex: number): void {
        const index: number = selectedRows.findIndex((value: number): boolean => value === rowIndex);
        if (index !== -1) {
            setSelectedRows(
                produce((draft): void => {
                    draft.splice(index, 1);
                })
            );
            trackAction(`DESELECT row ${rowIndex}`);
        } else if (selectedRows.length < 2) {
            setSelectedRows(
                produce((draft): void => {
                    draft.push(rowIndex);
                })
            );
            trackAction(`SELECT row ${rowIndex}`);
        }
    }

    function addOrSubtractRows(addition: boolean): void {
        try {
            const newRow: Row = addition ? Row.add(rows[selectedRows[0]], rows[selectedRows[1]]) : Row.subtract(rows[selectedRows[0]], rows[selectedRows[1]]);
            setGameHistory(
                produce((draft): void => {
                    const copiedRows: Row[] = [...draft[currentStep]];
                    copiedRows.push(newRow);
                    draft[currentStep + 1] = copiedRows;
                })
            );
            setCurrentStep(currentStep + 1);
            setSelectedRows([]);
            setNotebookState(NotebookState.Initial);
            trackAction(`${addition ? "ADD" : "SUB"} ${selectedRows[0]} and ${selectedRows[1]}`);
        } catch (error) {
            trackAction("Error: RANGE");
            setValidationError([true, InputError.OutOfRange]);
        }
    }

    function switchSequenceOfSelectedRows(): void {
        trackAction("SWITCH rows");
        const firstSelected: number = selectedRows[0];
        setSelectedRows(
            produce((draft): void => {
                draft[0] = draft[1];
                draft[1] = firstSelected;
            })
        );
    }

    function loadMultiplicationAction(rowIndex: number): void {
        trackAction(`load MUL for row ${rowIndex}`);
        setNotebookState(NotebookState.Multiplication);
        setSelectedRows(
            produce((draft): void => {
                draft.push(rowIndex);
            })
        );
    }

    function loadDivisionAction(rowIndex: number): void {
        trackAction(`load DIV for row ${rowIndex}`);
        setNotebookState(NotebookState.Division);
        setSelectedRows(
            produce((draft): void => {
                draft.push(rowIndex);
            })
        );
    }

    function cancelAction(useTracking: boolean = true): void {
        if (useTracking) {
            trackAction("CANCEL");
        }
        setValidationError([false, InputError.Validation]);
        setMulDivInput("");
        setSelectedRows([]);
        setNotebookState(NotebookState.Initial);
    }

    function multiplyOrDivideRow(): void {
        if (validationError[0] || validationError[1]) {
            trackError();
            trackAction("Error: MUL or DIV DENIED");
            return;
        }

        const modifiedInput: string = mulDivInput.replace(",", ".");
        try {
            const evaluatedInput: number | Fraction = evaluate(modifiedInput);
            const modifiedRow: Row = notebookState === NotebookState.Multiplication ? Row.multiply(rows[selectedRows[0]], evaluatedInput) : Row.divide(rows[selectedRows[0]], evaluatedInput);
            setGameHistory(
                produce((draft): void => {
                    const copiedRows: Row[] = [...draft[currentStep]];
                    copiedRows[selectedRows[0]] = modifiedRow;
                    draft[currentStep + 1] = copiedRows;
                })
            );
            setCurrentStep(currentStep + 1);
            trackAction(`${notebookState === NotebookState.Multiplication ? "MUL" : "DIV"} with ${evaluatedInput}`);
            cancelAction(false);
        } catch (error) {
            if (error instanceof OperationOutOfRangeError) {
                trackAction("Error: RANGE");
                setValidationError([true, InputError.OutOfRange]);
            } else {
                trackAction(`Error: INVALID input ${modifiedInput}`);
                setValidationError([true, InputError.Evaluation]);
            }
        }
    }

    function deleteRow(index: number): void {
        setGameHistory(
            produce((draft): void => {
                const copiedRows: Row[] = [...draft[currentStep]];
                copiedRows.splice(index, 1);
                draft[currentStep + 1] = copiedRows;
            })
        );
        setCurrentStep(currentStep + 1);
        trackAction(`DELETE row ${index}`);
    }

    function copyRow(index: number): void {
        setGameHistory(
            produce((draft): void => {
                const copiedRows: Row[] = [...draft[currentStep]];
                copiedRows.push(copiedRows[index]);
                draft[currentStep + 1] = copiedRows;
            })
        );
        setCurrentStep(currentStep + 1);
        trackAction(`COPY row ${index}`);
    }

    function handleEnd(): void {
        if (isStudy) {
            if (collectData) {
                setCKStudyExerciseCompleted(studyId as number, "elimination", exercise.id);
            }
            navigate(Paths.CKStudyPath + studyId);
        } else {
            setCKExerciseCompleted(exercise.id, "elimination");
            setShowActionOverlay(true);
        }
    }
}
