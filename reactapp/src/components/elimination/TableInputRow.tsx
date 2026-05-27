import { faDivide, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement, useMemo, useRef } from "react";
import { EliminationConstants } from "@/types/elimination/eliminationConstants.ts";
import { EliminationExercise } from "@/types/elimination/eliminationExercise.ts";
import { InputError, NotebookState, RowHeight } from "@/types/elimination/enums.ts";
import { Row } from "@/types/elimination/row.ts";
import RowEntry from "@components/elimination/RowEntry.tsx";
import { increaseTableEntryHeight } from "@utils/utils.ts";

export default function TableInputRow({
    exercise,
    row,
    index,
    displayFractions,
    displayImages,
    currentState,
    input,
    setInput,
    validationError,
    setValidationError,
    multiplyOrDivideRow
}: {
    exercise: EliminationExercise;
    row: Row;
    index: number;
    displayFractions: boolean;
    displayImages: boolean;
    currentState: NotebookState;
    input: string;
    setInput: (value: React.SetStateAction<string>) => void;
    validationError: [boolean, InputError];
    setValidationError: (value: React.SetStateAction<[boolean, InputError]>) => void;
    multiplyOrDivideRow: () => void;
}): ReactElement {
    const entryHeight: RowHeight = useMemo(() => {
        return increaseTableEntryHeight(row, displayImages);
    }, [displayImages, row]);

    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <tr key={index} className={"selected-row"}>
            <RowEntry variable={exercise.firstVariable.name} entry={row.first} showFractions={displayFractions} showImages={displayImages} entryHeight={entryHeight} />
            <RowEntry variable={exercise.secondVariable.name} entry={row.second} showFractions={displayFractions} showImages={displayImages} entryHeight={entryHeight} />
            <RowEntry variable={EliminationConstants.BILL} entry={row.costs} showFractions={displayFractions} showImages={displayImages} entryHeight={entryHeight} />
            <th className={"notebook__table-input-entry"}>
                <React.Fragment>
                    {currentState === NotebookState.Multiplication && <FontAwesomeIcon className={"notebook__input-operator"} icon={faTimes} />}
                    {currentState !== NotebookState.Multiplication && <FontAwesomeIcon className={"notebook__input-operator"} icon={faDivide} />}
                    <input autoFocus className={`notebook__input ${validationError[0] ? "error" : ""}`} ref={inputRef} value={input} pattern="^((-?(0[.,][0-9]\d*|[1-9]\d*([.,]\d+)?))|[+\-*\/])*$" maxLength={10} onBlur={handleBlur} onKeyDown={handleKeyDown} onChange={handleChange} />
                </React.Fragment>
            </th>
        </tr>
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleBlur(event: any): void {
        if (!validationError[0] && (event.target.validity.patternMismatch || input === "")) {
            inputRef.current?.focus();
            setValidationError([true, InputError.Validation]);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleChange(event: any): void {
        const isValid: boolean = !event.target.validity.patternMismatch;
        if (validationError[0]) {
            if (isValid) {
                setValidationError([false, InputError.Validation]);
            }
        } else if (!isValid) {
            setValidationError([true, InputError.Validation]);
        }
        setInput(event.target.value);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleKeyDown(event: any): void {
        if (event.key === "Enter") {
            multiplyOrDivideRow();
        }
    }
}
