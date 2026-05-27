import { TranslationNamespaces } from "@/i18n.ts";
import React, { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import "@styles/shared/switch.scss";

export default function Switch({ id, label, checked, setChecked, disabled, trackAction, actionLabel }: { id: string; label: string; checked: boolean; setChecked: (value: React.SetStateAction<boolean>) => void; disabled: boolean; trackAction?: (action: string) => void; actionLabel?: string }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.General);

    return (
        <div className={"switch-container"}>
            <p>{label}</p>
            <div className={"switch"}>
                <input className={"switch__checkbox"} type={"checkbox"} name={id} id={id} checked={checked} onChange={handleChange} disabled={disabled} />
                <label className={"switch__label"} htmlFor={id}>
                    <span className={disabled ? "switch__label-text switch-disabled" : "switch__label-text"} data-on={t(GeneralTranslations.SWITCH_ON)} data-off={t(GeneralTranslations.SWITCH_OFF)} />
                    <span className={disabled ? "switch__label-switch switch-disabled" : "switch__label-switch"} />
                </label>
            </div>
        </div>
    );

    function handleChange(): void {
        if (trackAction !== undefined && actionLabel !== undefined) {
            if (checked) {
                trackAction(`HIDE ${actionLabel}`);
            } else {
                trackAction(`SHOW ${actionLabel}`);
            }
        }
        setChecked(!checked);
    }
}
