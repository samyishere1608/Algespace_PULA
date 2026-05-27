import { useEffect } from "react";

export default function useAppHeight() {
    const handleResize = (): void => {
        document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
    };

    useEffect(() => {
        window.addEventListener("resize", handleResize);

        return (): void => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);
}
