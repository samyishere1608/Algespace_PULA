import { faCopy, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement } from "react";
import { ArrowContainer, Popover } from "react-tiny-popover";
import "@styles/shared/popover.scss";

export default function ContextMenu({ child, open, setOpen, handleDelete, canDelete, handleCopy, canCopy }: { child: ReactElement; open: boolean; setOpen: (value: React.SetStateAction<boolean>) => void; handleDelete: () => void; canDelete: boolean; handleCopy: () => void; canCopy: boolean }): ReactElement {
    return (
        <Popover
            containerStyle={{ zIndex: "200" }}
            isOpen={open}
            positions={["left"]}
            padding={0}
            clickOutsideCapture={true}
            onClickOutside={() => setOpen(false)}
            content={({ position, childRect, popoverRect }) => (
                <ArrowContainer position={position} childRect={childRect} popoverRect={popoverRect} arrowColor={"var(--contextMenu)"} arrowSize={8} className="popover-arrow-container" arrowClassName="popover-arrow">
                    <div className={"hint-popover"}>
                        <div className={"context-menu-popover__container"}>
                            {canDelete && (
                                <div className={"context-menu-popover__item"} onClick={handleDeleteClick}>
                                    <p>Delete</p>
                                    <FontAwesomeIcon icon={faTrash} />
                                </div>
                            )}
                            {canCopy && (
                                <div className={"context-menu-popover__item"} onClick={handleCopyClick}>
                                    <p>Copy</p>
                                    <FontAwesomeIcon icon={faCopy} />
                                </div>
                            )}
                        </div>
                    </div>
                </ArrowContainer>
            )}
        >
            {child}
        </Popover>
    );

    function handleDeleteClick(): void {
        setOpen(false);
        handleDelete();
    }

    function handleCopyClick(): void {
        setOpen(false);
        handleCopy();
    }
}
