import { faSquare } from "@fortawesome/free-regular-svg-icons";
import { faSquare as faSquareSelected } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement } from "react";

export function MultipleChoice({ options, selectedOptions, setSelectedOptions, disabled, optionClassname, trackAction }: {
    options: string[];
    selectedOptions: number[] | undefined;
    setSelectedOptions: (value: React.SetStateAction<number[] | undefined>) => void;
    disabled: boolean;
    optionClassname?: string;
    trackAction?: (action: string) => void;
}): ReactElement {
    return (
        <div className={"choice-exercise"}>
            {options.map((option, index) => {
                return <Option key={index} index={index} option={option} selectedOptions={selectedOptions} setSelectedOptions={setSelectedOptions}
                               classname={optionClassname} disabled={disabled} trackAction={trackAction} />;
            })}
        </div>
    );
}

function Option({ index, option, selectedOptions, setSelectedOptions, disabled, classname, trackAction }: {
    index: number;
    option: string;
    selectedOptions: number[] | undefined;
    setSelectedOptions: (value: React.SetStateAction<number[] | undefined>) => void;
    disabled: boolean;
    classname?: string;
    trackAction?: (action: string) => void;
}): ReactElement {
    return (
        <div className={`choice-exercise__option ${classname} ${(selectedOptions !== undefined && selectedOptions?.includes(index)) ? "selected-option":""}`} onClick={handleClick} style={{ cursor: disabled ? "default" : "pointer" }}>
            <FontAwesomeIcon icon={(selectedOptions !== undefined && selectedOptions?.includes(index)) ? faSquareSelected : faSquare} />
            <p>{option}</p>
        </div>
    );

    function handleClick(): void {
        if (disabled) {
            return;
        }
        if (selectedOptions === undefined) {
            if (trackAction !== undefined) {
                trackAction(`selected option ${index}`);
            }
            setSelectedOptions([index]);
        } else if (selectedOptions.includes(index)) {
            if (trackAction !== undefined) {
                trackAction(`unselected option ${index}`);
            }
            const newOptions = selectedOptions.filter((opt) => opt !== index);
            if (newOptions.length === 0) {
                setSelectedOptions(undefined);
            } else {
                setSelectedOptions(newOptions);
            }
        } else {
            if (trackAction !== undefined) {
                trackAction(`selected option ${index}`);
            }
            setSelectedOptions([...selectedOptions, index]);
        }
    }
}
