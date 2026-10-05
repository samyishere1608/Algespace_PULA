import { ReactElement, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBullseye, faLightbulb, faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import { TranslationNamespaces } from "@/i18n.ts";
import xpSoundSrc from "@/assets/sounds/XPEarned.mp3";
import "@styles/shared/agency-toast.scss";

// Preload the sound
const xpAudio = new Audio(xpSoundSrc);
xpAudio.preload = "auto";
xpAudio.volume = 0.5;

interface ToastItem {
    id: number;
    type: "choice" | "insight" | "resolve";
    amount: number;
}

let toastId = 0;
const listeners: Array<(item: ToastItem) => void> = [];

/** Call this from anywhere to show a quick XP toast notification. */
export function showAgencyToast(type: "choice" | "insight" | "resolve", amount: number): void {
    const item: ToastItem = { id: ++toastId, type, amount };
    listeners.forEach((fn) => fn(item));
    // Play sound immediately
    xpAudio.currentTime = 0;
    xpAudio.play().catch(() => {});
}

// The same three colours and the same three marks the dashboard's agency pills use, so a toast reads
// as that currency arriving rather than as its own thing.
const colors: Record<ToastItem["type"], string> = {
    choice: "#ffd166",
    insight: "#06d6a0",
    resolve: "#ef476f",
};

const marks: Record<ToastItem["type"], typeof faBullseye> = {
    choice: faBullseye,
    insight: faLightbulb,
    resolve: faShieldHalved,
};

export function AgencyXpToast(): ReactElement | null {
    const { t } = useTranslation(TranslationNamespaces.Student);
    const [queue, setQueue] = useState<ToastItem[]>([]);
    const [active, setActive] = useState<ToastItem | null>(null);

    useEffect(() => {
        function onNew(item: ToastItem): void {
            setQueue((prev) => [...prev, item]);
        }
        listeners.push(onNew);
        return () => {
            const idx = listeners.indexOf(onNew);
            if (idx >= 0) listeners.splice(idx, 1);
        };
    }, []);

    useEffect(() => {
        if (active || queue.length === 0) return;
        const next = queue[0];
        setActive(next);
        setQueue((prev) => prev.slice(1));
        const timer = setTimeout(() => setActive(null), 2200);
        return () => clearTimeout(timer);
    }, [queue, active]);

    if (!active) return null;

    return (
        <div
            className="agency-toast"
            style={{ "--toast-color": colors[active.type] } as React.CSSProperties}
            key={active.id}
        >
            <span className="agency-toast__icon" aria-hidden>
                <FontAwesomeIcon icon={marks[active.type]} />
            </span>
            <span className="agency-toast__text">
                +{active.amount} <strong>{t(`agency-${active.type}`)}</strong> XP
            </span>
        </div>
    );
}
