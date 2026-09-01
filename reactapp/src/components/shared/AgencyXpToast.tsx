import { ReactElement, useEffect, useState } from "react";
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

const colors: Record<string, string> = {
    choice: "#ffd166",
    insight: "#06d6a0",
    resolve: "#ef476f",
};

const labels: Record<string, string> = {
    choice: "Choice",
    insight: "Insight",
    resolve: "Resolve",
};

export function AgencyXpToast(): ReactElement | null {
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
            {/* <span className="agency-toast__icon">
                {active.type === "choice" ? "🎯" : active.type === "insight" ? "🧠" : "💪"}
            </span> */}
            <span className="agency-toast__text">
                +{active.amount} <strong>{labels[active.type]}</strong> XP
            </span>
        </div>
    );
}
