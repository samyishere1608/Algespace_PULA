import { ReactElement, useEffect, useRef, useState } from "react";
import axios from "axios";
import axiosInstance from "@/types/shared/axiosInstance.ts";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import pippinImg from "@images/Character/Pipin_de.png";
import { getEquippedOutfitId, getActiveBuddyId } from "@utils/wardrobeUtils.ts";
import { resolveOutfitSrc, CHARACTER_CATALOGUE } from "@views/student/dashboard/CharacterShopModal.tsx";
import { BUDDIES } from "@views/student/dashboard/ChooseBuddyModal.tsx";
import { incrementPippinExerciseCount } from "@utils/goalUtils.ts";
import { useAuth } from "@/contexts/AuthProvider.tsx";
import { usePippinLock } from "@/contexts/PippinLockContext.tsx";

interface ChatMessage {
    role: "pippin" | "user";
    text: string;
}

interface ApiMessage {
    role: "user" | "model";
    text: string;
}

interface Props {
    exerciseContext: string;
    buddyImageSrc?: string;
}

const COOLDOWN_SECONDS = 5; // minimum gap between requests to stay under 15 RPM

export function PippinChat({ exerciseContext, buddyImageSrc }: Props): ReactElement {
    const { student } = useAuth();
    const { i18n, t } = useTranslation(TranslationNamespaces.Student);
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);          // seconds remaining
    const [showQuickActions, setShowQuickActions] = useState(true);
    const [showLockWarning, setShowLockWarning] = useState(false);
    const { soloMode, pippinUnlocked, onUnlock } = usePippinLock();
    const isLocked = soloMode && !pippinUnlocked;
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const studentId = student?.id ?? "guest";
    const activeBuddyId = getActiveBuddyId(studentId);
    const activeBuddy = BUDDIES.find((b) => b.id === activeBuddyId) ?? BUDDIES[0];
    const buddyName = activeBuddy.name;
    const quickActions = [t("pippin-hint"), t("pippin-example")];

    const [messages, setMessages] = useState<ChatMessage[]>([{
        role: "pippin",
        text: t("pippin-greeting", { buddy: buddyName })
    }]);
    const equippedId = getEquippedOutfitId(studentId, activeBuddyId);
    const catalogEntry = CHARACTER_CATALOGUE.find((c) => c.id === activeBuddyId);
    const equippedSrc = equippedId ? resolveOutfitSrc(activeBuddyId, equippedId) : undefined;
    const avatarSrc = buddyImageSrc ?? equippedSrc ?? catalogEntry?.baseSrc ?? pippinImg;

    // Scroll to bottom whenever messages update
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Countdown tick
    useEffect(() => {
        if (cooldown <= 0) return;
        cooldownRef.current = setInterval(() => {
            setCooldown((c) => {
                if (c <= 1) {
                    clearInterval(cooldownRef.current!);
                    return 0;
                }
                return c - 1;
            });
        }, 1000);
        return () => clearInterval(cooldownRef.current!);
    }, [cooldown]);

    function startCooldown(): void {
        setCooldown(COOLDOWN_SECONDS);
    }

    function buildApiHistory(): ApiMessage[] {
        return messages.slice(1).map((m) => ({
            role: m.role === "user" ? "user" : "model",
            text: m.text
        }));
    }

    async function sendMessage(userText: string): Promise<void> {
        const trimmed = userText.trim();
        if (!trimmed || loading || cooldown > 0) return;

        const userMsg: ChatMessage = { role: "user", text: trimmed };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setLoading(true);
        setShowQuickActions(false);

        try {
            const { data } = await axiosInstance.post<{ reply: string }>(
                "/chat/flexibility",
                {
                    exerciseContext,
                    userMessage: trimmed,
                    history: buildApiHistory(),
                    buddyName,
                    language: i18n.language
                }
            );
            setMessages((prev) => [...prev, { role: "pippin", text: data.reply }]);
            incrementPippinExerciseCount();
            startCooldown();
        } catch (err: unknown) {
            const isRateLimit = axios.isAxiosError(err) && err.response?.status === 429;
            setMessages((prev) => [
                ...prev,
                {
                    role: "pippin",
                    text: isRateLimit
                        ? "I'm a little overwhelmed right now! ⏳ Please wait a few seconds and ask me again."
                        : "Oops! I'm having trouble connecting right now. Please try again in a moment."
                }
            ]);
            if (isRateLimit) startCooldown();
        } finally {
            setLoading(false);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void sendMessage(input);
        }
    }

    const isBusy = loading || cooldown > 0;
    const sendLabel = cooldown > 0 ? `${cooldown}s` : "➤";

    return (
        <div className="pippin-chat">
            {isOpen && (
                <div className="pippin-chat__window">
                    {/* Header */}
                    <div className="pippin-chat__header">
                        <img src={avatarSrc} alt={buddyName} />
                        <div className="pippin-chat__header-info">
                            <h4>{buddyName}</h4>
                            <span>● AI Study Buddy</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} aria-label="Close chat">✕</button>
                    </div>

                    {/* Messages */}
                    <div className="pippin-chat__messages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`pippin-chat__msg pippin-chat__msg--${msg.role}`}>
                                <img src={msg.role === "pippin" ? avatarSrc : undefined}
                                     alt={msg.role === "pippin" ? buddyName : "You"}
                                     style={msg.role === "user" ? { background: "#219ebc", objectFit: "contain", padding: "0.1rem" } : undefined}
                                />
                                <div className="pippin-chat__msg-bubble">{msg.text}</div>
                            </div>
                        ))}

                        {loading && (
                            <div className="pippin-chat__msg pippin-chat__msg--pippin">
                                <img src={avatarSrc} alt={buddyName} />
                                <div className="pippin-chat__loading">
                                    <span /><span /><span />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick-action buttons (shown only before first send) */}
                    {showQuickActions && (
                        <div className="pippin-chat__quick-actions">
                            {quickActions.map((label) => (
                                <button key={label} disabled={isBusy} onClick={() => void sendMessage(label)}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input row */}
                    <div className="pippin-chat__input-row">
                        <input
                            type="text"
                            placeholder={cooldown > 0 ? t("pippin-wait", { seconds: cooldown }) : t("pippin-placeholder", { buddy: buddyName })}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isBusy}
                            maxLength={300}
                            autoFocus
                        />
                        <button onClick={() => void sendMessage(input)} disabled={isBusy || !input.trim()} aria-label="Send">
                            {sendLabel}
                        </button>
                    </div>
                </div>
            )}

            {/* Toggle / Lock button */}
            {isLocked ? (
                <>
                    {showLockWarning && (
                        <div className="pippin-chat__lock-warning">
                            <p dangerouslySetInnerHTML={{ __html: t("pippin-bonus-warning", { buddy: `<strong>${buddyName}</strong>` }) }} />
                            <div className="pippin-chat__lock-warning-buttons">
                                <button onClick={() => setShowLockWarning(false)}>{t("pippin-stay-solo")}</button>
                                <button onClick={() => {
                                    onUnlock();
                                    setShowLockWarning(false);
                                    setIsOpen(true);
                                }}>{t("pippin-unlock", { buddy: buddyName })}</button>
                            </div>
                        </div>
                    )}
                    <button className="pippin-chat__toggle pippin-chat__toggle--locked"
                            onClick={() => setShowLockWarning((v) => !v)}>
                        <img src={avatarSrc} alt={buddyName} />
                        {t("pippin-locked")}
                    </button>
                </>
            ) : (
                <>
                    {pippinUnlocked && (
                        <div className="pippin-chat__bonus-lost">{t("pippin-solo-bonus-removed")}</div>
                    )}
                    <button className="pippin-chat__toggle" onClick={() => setIsOpen((o) => !o)}>
                        <img src={avatarSrc} alt={buddyName} />
                        {t("pippin-ask", { buddy: buddyName })}
                    </button>
                </>
            )}
        </div>
    );
}


