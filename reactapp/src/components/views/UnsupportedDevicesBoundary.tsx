import { TranslationNamespaces } from "@/i18n.ts";
import { ReactElement, ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GeneralTranslations } from "@/types/shared/generalTranslations.ts";
import Logo from "@images/home/logo320.png";
import "@styles/views/unsupported-devices.scss";

export default function UnsupportedDevicesBoundary({ children }: { children: ReactNode }): ReactElement | ReactNode {
    const { t } = useTranslation(TranslationNamespaces.General);

    const [isSupported, setIsSupported] = useState<boolean>(isSupportedDevice());

    useEffect(() => {
        const checkScreenSize = () => {
            setIsSupported(isSupportedDevice());
        };

        window.addEventListener("resize", checkScreenSize);

        return () => window.removeEventListener("resize", checkScreenSize);
    }, []);

    if (isSupported) {
        return children;
    } else {
        return (
            <div className={"unsupported-devices"}>
                <img src={Logo} alt={"logo"} />
                <div className={"unsupported-devices__description"}>
                    <p> {t(GeneralTranslations.PROJECT_DESCRIPTION_1, { ns: TranslationNamespaces.General })} </p>
                    <p> {t(GeneralTranslations.PROJECT_DESCRIPTION_2, { ns: TranslationNamespaces.General })} </p>
                    <p style={{ fontWeight: 500, textDecoration: "underline" }}> {t(GeneralTranslations.UNSUPPORTED_DEVICES, { ns: TranslationNamespaces.General })} </p>
                </div>
            </div>
        );
    }

    function isSupportedDevice(): boolean {
        const deviceWidth = window.innerWidth && document.documentElement.clientWidth ? Math.min(window.innerWidth, document.documentElement.clientWidth) :
            (window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName("body")[0].clientWidth)

        const deviceHeight = window.innerHeight && document.documentElement.clientHeight ? Math.min(window.innerHeight, document.documentElement.clientHeight) :
            (window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName("body")[0].clientHeight);

        const minWidth: number = 900;
        const minHeight: number = 650;
        return (deviceWidth >= minWidth && deviceHeight >= minHeight) || (deviceWidth >= minHeight && deviceHeight >= minWidth);
    }
}
