import { TranslationNamespaces } from "@/i18n.ts";
import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import useScreenOrientation, { DeviceOrientation } from "@hooks/useScreenOrientation.ts";
import RotateDevice from "@images/home/rotateDevice.png";
import "@styles/shared/modal.scss";

export default function OrientationModal(): ReactElement | null {
    const screenOrientation = useScreenOrientation();
    const { t } = useTranslation(TranslationNamespaces.General);

    if (screenOrientation !== DeviceOrientation.Portrait) {
        return null;
    }

    return (
        <div className={"orientation-modal"}>
            <img className={"orientation-modal__image"} src={RotateDevice} alt={"Rotate device"} />
            <div className={"orientation-modal__text"}>
                <p className={"orientation-modal__text--rotate"}>{t(GeneralTranslations.ROTATE_DEVICE)}</p>
                <p className={"orientation-modal__text--format"}>{t(GeneralTranslations.ROTATE_DEVICE_REASON)}</p>
            </div>
        </div>
    );
}
