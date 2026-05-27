import { faQuestion, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { ArrowContainer, Popover, Rect } from "react-tiny-popover";
import { TranslationInterpolation } from "@/types/shared/translationInterpolation.ts";
import "@styles/shared/popover.scss";

export default function HintPopover({ hints, namespaces, disabled, trackHint, buttonClassname }: { hints: TranslationInterpolation[]; namespaces: string[]; disabled?: boolean; trackHint: () => void; buttonClassname?: string }): ReactElement {
    const { t } = useTranslation(namespaces);

    const [open, setOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        setCurrentIndex(0);
    }, [hints]); // If hints change, reset count

    const numberOfHints: number = hints.length;

    const currentHint: TranslationInterpolation = hints[currentIndex];

    return (
        <Popover
            containerStyle={{ zIndex: "200" }}
            isOpen={open}
            positions={["top", "left"]}
            padding={16}
            transform={{ left: -16 }}
            transformMode={"relative"}
            clickOutsideCapture={true}
            onClickOutside={handleClickOutside}
            content={({ position, childRect, popoverRect }) => (
                <ArrowContainer position={position} childRect={childRect} popoverRect={shiftArrow(popoverRect)} arrowColor={"white"} arrowSize={8} className="popover-arrow-container" arrowClassName="popover-arrow">
                    <div className={"hint-popover"}>
                        <button className={"span-button primary-button hint-popover__button"} onClick={handleClick}>
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                        <div className={"hint-popover__container"}>
                            {currentHint.interpolationVariables !== null ? (
                                <p>
                                    <Trans ns={namespaces} i18nKey={currentHint.translationKey} values={currentHint.interpolationVariables} />
                                </p>
                            ) : (
                                <p>{t(currentHint.translationKey)}</p>
                            )}
                        </div>
                    </div>
                </ArrowContainer>
            )}
        >
            <button className={`button primary-button help-button ${buttonClassname}`} onClick={handleClick} disabled={disabled || false}>
                <FontAwesomeIcon icon={faQuestion} />
            </button>
        </Popover>
    );

    function shiftArrow(popoverRect: Rect): Rect {
        return { ...popoverRect, left: popoverRect.left - 16 };
    }

    function handleClick(): void {
        if (open) {
            getNextHint();
        } else {
            trackHint();
        }
        setOpen(!open);
    }

    function handleClickOutside(): void {
        setOpen(false);
        getNextHint();
    }

    function getNextHint(): void {
        if (currentIndex < numberOfHints - 1) {
            setCurrentIndex((previousHint: number) => previousHint + 1);
        } else if (numberOfHints !== 1) {
            setCurrentIndex(0);
        }
    }
}
