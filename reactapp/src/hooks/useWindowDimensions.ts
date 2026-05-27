import { useEffect, useState } from "react";

function getWindowDimensions(): { windowWidth: number; windowHeight: number } {
    return { windowWidth: window.innerWidth, windowHeight: window.innerHeight };
}

export default function useWindowDimensions(): { windowWidth: number; windowHeight: number } {
    const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

    const handleResize = (): void => {
        setWindowDimensions(getWindowDimensions());
    };

    useEffect(() => {
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return windowDimensions;
}
