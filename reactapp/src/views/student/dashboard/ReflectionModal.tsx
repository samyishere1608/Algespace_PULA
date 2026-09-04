import { faArrowRight, faCheck, faLightbulb, faPen, faRobot, faSpinner, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import i18n from "@/i18n.ts";
import {
    completeReflection,
    evaluateReflection,
    ReflectionHistoryEntry,
    ReflectionQueueItem,
} from "@utils/reflectionUtils.ts";

interface Props {
    studentId: number;
    items: ReflectionQueueItem[];
    buddyName: string;
    buddyEmoji: string;
    buddyImgSrc?: string;
    onAwardInsight: (amount: number) => void;
    onClose: () => void;
}

type Phase = "answering" | "feedback";

export function ReflectionModal({ studentId, items, buddyName, buddyEmoji, buddyImgSrc, onAwardInsight, onClose }: Props): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Student);

    const [itemIndex, setItemIndex] = useState(0);
    const [question, setQuestion] = useState<1 | 2 | 3>(1);
    const [phase, setPhase] = useState<Phase>("answering");
    const [answer, setAnswer] = useState("");
    const [feedback, setFeedback] = useState("");
    const [nextStep, setNextStep] = useState("");
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<ReflectionHistoryEntry[]>([]);
    const [earnedInsight, setEarnedInsight] = useState(0);

    const item = items[itemIndex];
    const totalQuestions = 3;

    const q2Key = useMemo(() => {
        if (!item) return "reflection-q2-generic";
        const soloIds = ["choose-solo-once", "perfect-solo-session", "independence-champion"];
        const decisionTypes = ["Suitability", "Efficiency", "Matching"];
        if (item.itemType === "goal" && soloIds.includes(item.itemId)) return "reflection-q2-solo";
        if (decisionTypes.includes(item.method)) return "reflection-q2-decision";
        return "reflection-q2-generic";
    }, [item]);

    if (!item) {
        return (
            <div className="modal-overlay">
                <div className="modal-content reflection-modal">
                    <p className="reflection-modal__finished">{t("reflection-finished")}</p>
                    <button className="button primary-button" onClick={onClose}>{t("dashboard-modal-close")}</button>
                </div>
            </div>
        );
    }

    const questionText =
        question === 1 ? t("reflection-q1")
        : question === 2 ? t(q2Key)
        : t("reflection-q3");

    async function handleAnswer(mode: "self" | "pippin"): Promise<void> {
        if (loading) return;
        setLoading(true);
        // ── Debug log: what we send to the backend ───────────────────────
        console.log("[Reflection] SEND", JSON.stringify({
            studentId,
            queueItemId: item.id,
            question,
            mode,
            answer: mode === "self" ? answer : "(pippin model answer)",
            itemLabel: item.itemLabel,
            itemMethod: item.method,
            itemErrors: item.errors,
            itemHints: item.hints,
            itemPippinMessages: item.pippinMessages,
        }, null, 2));
        try {
            const result = await evaluateReflection(
                studentId,
                item.id,
                question,
                mode,
                mode === "self" ? answer : "",
                i18n.language?.slice(0, 2) ?? "en"
            );
            // ── Debug log: what the backend/AI decided ───────────────────
            console.log("[Reflection] RESULT", JSON.stringify({
                feedback: result.feedback,
                aligned: result.aligned,
                insightXp: result.insightXp,
                nextStep: result.nextStep,
            }, null, 2));
            setFeedback(result.feedback);
            setNextStep(result.nextStep ?? "");
            setEarnedInsight(result.insightXp ?? 0);
            setPhase("feedback");

            const newEntries: ReflectionHistoryEntry[] = [];
            if (mode === "self" && answer.trim()) {
                newEntries.push({ role: "student", text: answer.trim(), insightXp: 0, itemType: item.itemType, itemId: item.itemId });
            }
            newEntries.push({ role: "pippin", text: result.feedback, insightXp: result.insightXp, itemType: item.itemType, itemId: item.itemId });
            setHistory((prev) => [...prev, ...newEntries]);

            if (result.insightXp > 0) {
                onAwardInsight(result.insightXp);
            }
        } catch {
            setFeedback(t("reflection-ai-unavailable"));
            setPhase("feedback");
        } finally {
            setLoading(false);
        }
    }

    async function handleNext(): Promise<void> {
        if (question < totalQuestions) {
            setQuestion((q) => (q + 1) as 1 | 2 | 3);
            setAnswer("");
            setFeedback("");
            setNextStep("");
            setEarnedInsight(0);
            setPhase("answering");
            return;
        }

        // Finished this item — persist history and move on
        await completeReflection(studentId, item.id, history);
        setHistory([]);
        if (itemIndex < items.length - 1) {
            setItemIndex((i) => i + 1);
            setQuestion(1);
            setAnswer("");
            setFeedback("");
            setNextStep("");
            setEarnedInsight(0);
            setPhase("answering");
        } else {
            onClose();
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content reflection-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} title={t("dashboard-modal-close")}>
                    <FontAwesomeIcon icon={faTimes} />
                </button>

                {/* Buddy header */}
                <div className="reflection-modal__header">
                    <div className="reflection-modal__avatar">
                        {buddyImgSrc ? (
                            <img src={buddyImgSrc} alt={buddyName} />
                        ) : (
                            <span className="reflection-modal__emoji">{buddyEmoji}</span>
                        )}
                    </div>
                    <div>
                        <h2 className="reflection-modal__title">{t("reflection-title")}</h2>
                        <p className="reflection-modal__item">{t("reflection-completed-item", { label: item.itemLabel })}</p>
                    </div>
                </div>

                {/* Progress steps */}
                <div className="reflection-modal__progress">
                    <div className="reflection-modal__steps">
                        {[1, 2, 3].map((n) => (
                            <div
                                key={n}
                                className={`reflection-modal__step${n === question ? " reflection-modal__step--active" : ""}${n < question ? " reflection-modal__step--done" : ""}`}
                            >
                                <span className="reflection-modal__step-dot">
                                    {n < question ? <FontAwesomeIcon icon={faCheck} /> : n}
                                </span>
                                <span className="reflection-modal__step-label">{t(`reflection-step-${n}`)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pippin's question bubble */}
                <div className="reflection-modal__bubble reflection-modal__bubble--pippin">
                    <span className="reflection-modal__bubble-avatar">
                        {buddyImgSrc ? <img src={buddyImgSrc} alt={buddyName} /> : <span>{buddyEmoji}</span>}
                    </span>
                    <p>{questionText}</p>
                </div>

                {/* Answering phase */}
                {phase === "answering" && (
                    <div className="reflection-modal__answer">
                        <textarea
                            className="reflection-modal__input"
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder={t("reflection-answer-placeholder")}
                            rows={3}
                            maxLength={400}
                            autoFocus
                        />
                        <div className="reflection-modal__actions">
                            <button
                                className="button secondary-button"
                                onClick={() => handleAnswer("pippin")}
                                disabled={loading}
                            >
                                {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faRobot} />}
                                {t("reflection-pippin-tell-me")}
                            </button>
                            <button
                                className="button primary-button"
                                onClick={() => handleAnswer("self")}
                                disabled={!answer.trim() || loading}
                            >
                                {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faPen} />}
                                {t("reflection-answer-myself")}
                            </button>
                        </div>
                    </div>
                )}

                {/* Feedback phase */}
                {phase === "feedback" && (
                    <div className="reflection-modal__feedback">
                        <div className="reflection-modal__bubble reflection-modal__bubble--student">
                            <p>{feedback}</p>
                        </div>
                        {earnedInsight > 0 && (
                            <div className="reflection-modal__insight-chip">
                                <FontAwesomeIcon icon={faLightbulb} />
                                <span>+{earnedInsight} {t("agency-insight")} XP</span>
                            </div>
                        )}
                        {question === 3 && nextStep && (
                            <div className="reflection-modal__next-step">
                                <FontAwesomeIcon icon={faLightbulb} className="reflection-modal__next-step-icon" />
                                <div>
                                    <span className="reflection-modal__next-step-label">{t("reflection-next-step-label")}</span>
                                    <p>{nextStep}</p>
                                </div>
                            </div>
                        )}
                        <div className="reflection-modal__actions">
                            <button className="button primary-button" onClick={handleNext}>
                                {question < totalQuestions
                                    ? <><FontAwesomeIcon icon={faArrowRight} /> {t("reflection-next")}</>
                                    : itemIndex < items.length - 1
                                        ? <><FontAwesomeIcon icon={faArrowRight} /> {t("reflection-another")}</>
                                        : <><FontAwesomeIcon icon={faCheck} /> {t("reflection-done")}</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
