import { faDivide, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useLongPress } from "@uidotdev/usehooks";
import { ReactElement, useMemo, useState } from "react";
import { EliminationConstants } from "@/types/elimination/eliminationConstants.ts";
import { EliminationExercise } from "@/types/elimination/eliminationExercise.ts";
import { NotebookState, RowHeight } from "@/types/elimination/enums.ts";
import { Row } from "@/types/elimination/row.ts";
import RowEntry from "@components/elimination/RowEntry.tsx";
import ContextMenu from "@components/elimination/notebookActions/ContextMenu.tsx";
import { increaseTableEntryHeight } from "@utils/utils.ts";

export default function TableRow({
    exercise,
    row,
    index,
    currentState,
    isSelected,
    displayFractions,
    displayImages,
    handleClick,
    handleMultiplicationClick,
    handleDivisionClick,
    handleDelete,
    canDelete,
    handleCopy,
    canCopy
}: {
    exercise: EliminationExercise;

    row: Row;
    index: number;
    currentState: NotebookState;
    isSelected: boolean;
    displayFractions: boolean;
    displayImages: boolean;
    handleClick: (index: number) => void;
    handleMultiplicationClick: (index: number) => void;
    handleDivisionClick: (index: number) => void;
    handleDelete: (index: number) => void;
    canDelete: boolean;
    handleCopy: (index: number) => void;
    canCopy: boolean;
}): ReactElement {
    const [open, setOpen] = useState(false);

    const attrs = useLongPress(
        () => {
            if (currentState !== NotebookState.Initial) {
                return;
            }
            setOpen(true);
        },
        { threshold: 500 }
    );

    const entryHeight: RowHeight = useMemo(() => {
        return increaseTableEntryHeight(row, displayImages);
    }, [displayImages, row]);

    let cssClass: string = isSelected ? "selected-row" : "";
    const isClickable: boolean = [NotebookState.Addition, NotebookState.Subtraction].includes(currentState);
    if (isClickable) {
        cssClass += " clickable-row";
    }

    const disabled: boolean = currentState !== NotebookState.Initial;

    const child: ReactElement = (
        <tr className={cssClass} {...attrs} onContextMenu={handleContextMenu} onClick={handleRowClick}>
            <RowEntry entry={row.first} variable={exercise.firstVariable.name} showFractions={displayFractions} showImages={displayImages} entryHeight={entryHeight} />
            <RowEntry entry={row.second} variable={exercise.secondVariable.name} showFractions={displayFractions} showImages={displayImages} entryHeight={entryHeight} />
            <RowEntry entry={row.costs} variable={EliminationConstants.BILL} showFractions={displayFractions} showImages={displayImages} entryHeight={entryHeight} />
            <th className={"notebook__table-action-entry"}>
                <button className={"button notebook-button"} disabled={disabled} onClick={() => handleMultiplicationClick(index)}>
                    <FontAwesomeIcon icon={faTimes} />
                </button>
                <button className={"button notebook-button"} disabled={disabled} onClick={() => handleDivisionClick(index)}>
                    <FontAwesomeIcon icon={faDivide} />
                </button>
            </th>
        </tr>
    );

    return <ContextMenu child={child} open={open} setOpen={setOpen} handleDelete={() => handleDelete(index)} canDelete={canDelete} handleCopy={() => handleCopy(index)} canCopy={canCopy} />;

    function handleRowClick(): void {
        if (disabled && isClickable) {
            handleClick(index);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleContextMenu(event: any): void {
        event.preventDefault();
        if (currentState !== NotebookState.Initial) {
            return;
        }
        setOpen(true);
    }
}

export function EmptyTableRow(): ReactElement {
    return (
        <tr>
            <th className={"notebook__table-entry"} />
            <th className={"notebook__table-entry"} />
            <th className={"notebook__table-entry"} />
            <th className={"notebook__table-action-entry"} />
        </tr>
    );
}

export function PlainTableRow({ exercise, row, displayFractions, displayImages }: { exercise: EliminationExercise; row: Row; displayFractions: boolean; displayImages: boolean }) {
    const entryHeight: RowHeight = useMemo(() => {
        return increaseTableEntryHeight(row, displayImages);
    }, [displayImages, row]);

    return (
        <tr>
            <RowEntry entry={row.first} variable={exercise.firstVariable.name} showFractions={displayFractions} showImages={displayImages} entryHeight={entryHeight} />
            <RowEntry entry={row.second} variable={exercise.secondVariable.name} showFractions={displayFractions} showImages={displayImages} entryHeight={entryHeight} />
            <RowEntry entry={row.costs} variable={EliminationConstants.BILL} showFractions={displayFractions} showImages={displayImages} entryHeight={entryHeight} />
            <th className={"notebook__table-action-entry"}></th>
        </tr>
    );
}
