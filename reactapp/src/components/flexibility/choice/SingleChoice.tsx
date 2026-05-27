import { faCircle } from "@fortawesome/free-regular-svg-icons";
import { faCircle as faCircleSelected } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement } from "react";

export function SingleChoice({ options, selectedOption, setSelectedOption, disabled, optionClassname, trackAction }: {
    options: string[];
    selectedOption: number | undefined;
    setSelectedOption: (value: React.SetStateAction<number | undefined>) => void;
    disabled: boolean;
    optionClassname?: string;
    trackAction?: (action: string) => void;
}): ReactElement {
    return (
        <div className={"choice-exercise"}>
            {options.map((option, index) => {
                return <Option key={index} index={index} selectedOption={selectedOption} setSelectedOption={setSelectedOption} classname={optionClassname}
                               disabled={disabled} trackAction={trackAction}>
                    <p>{option}</p>
                </Option>;
            })}
        </div>
    );
}

export function Option(
    {
        index,
        selectedOption,
        setSelectedOption,
        disabled,
        children,
        classname,
        trackAction
    }: {
        index: number;
        selectedOption: number | undefined;
        setSelectedOption: (value: React.SetStateAction<number | undefined>) => void;
        disabled: boolean;
        children: ReactElement;
        classname?: string;
        trackAction?: (action: string) => void;
    }
): ReactElement {
    return (
        <div className={`choice-exercise__option ${classname} ${(selectedOption !== undefined && selectedOption === index) ? "selected-option":""}`} onClick={handleClick} style={{ cursor: disabled ? "default" : "pointer" }}>
            <FontAwesomeIcon icon={(selectedOption !== undefined && selectedOption === index) ? faCircleSelected : faCircle} />
            {children}
        </div>
    );

    function handleClick(): void {
        if (disabled) {
            return;
        }
        if (selectedOption !== undefined && selectedOption === index) {
            if (trackAction !== undefined) {
                trackAction(`unselected option ${index}`);
            }
            setSelectedOption(undefined);
        } else {
            if (trackAction !== undefined) {
                trackAction(`selected option ${index}`);
            }
            setSelectedOption(index);
        }
    }
}
