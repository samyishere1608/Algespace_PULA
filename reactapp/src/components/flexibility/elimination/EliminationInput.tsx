import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { ReactElement } from "react";

export function EliminationInput({ input, setInput, error, setError }: { input: string; setInput: (value: React.SetStateAction<string>) => void; error: boolean; setError: (value: React.SetStateAction<boolean>) => void }): ReactElement {
    return (
        <div className={"elimination-input__container"}>
            <div className={"elimination-input"}>
                <FontAwesomeIcon icon={faTimes} />
                <input className={`elimination-input__input ${error ? "error" : ""}`} value={input} pattern="^((-?(0[.,][0-9]\d*|[1-9]\d*([.,]\d+)?))|[+\-*\/])*$" maxLength={10} onChange={handleChange} />
            </div>
        </div>
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleChange(event: any): void {
        const isValid: boolean = !event.target.validity.patternMismatch;
        if (error) {
            if (isValid) {
                setError(false);
            }
        } else if (!isValid && input !== "") {
            setError(true);
        }
        setInput(event.target.value);
    }
}
