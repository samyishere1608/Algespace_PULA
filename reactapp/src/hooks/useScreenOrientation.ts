import { useEffect, useState } from "react";

export enum DeviceOrientation {
    Landscape,
    Portrait
}

export default function useScreenOrientation() {
    const [orientation, setOrientation] = useState<DeviceOrientation>(getOrientation());

    const updateOrientation = (): void => {
        setOrientation(getOrientation());
    };

    useEffect(() => {
        const matcher: MediaQueryList = window.matchMedia("(orientation: portrait)");
        matcher.addEventListener("change", updateOrientation);

        return (): void => {
            matcher.removeEventListener("change", updateOrientation);
        };
    }, []);

    return orientation;
}

function getOrientation(): DeviceOrientation {
    if (window.matchMedia("(orientation: portrait)").matches) {
        // Possible alternative: window.innerHeight > window.innerWidth
        return DeviceOrientation.Portrait;
    }
    return DeviceOrientation.Landscape;
}
