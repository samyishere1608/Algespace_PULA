import { faArrowRight, faCheck, faLightbulb, faPen, faRobot, faRotateRight, faSpinner, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import i18n from "@/i18n.ts";
import { BuddySays } from "@components/shared/BuddySays.tsx";
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

/**
 * The second question is about the decision the student was working on, so a goal about comparing
 * methods is asked about comparing methods rather than about choosing one.
 *
 * Keyed by the goal CATEGORY, which is what a goal reflection now stores in `itemId`.
 */
const Q2_KEY_BY_CATEGORY: Record<string, string> = {
    selfExplanation: "reflection-q2-self-explanation",
    methodComparison: "reflection-q2-method-comparison",
    solveOnOwn: "reflection-q2-solve-on-own",
};

/** Exercise types whose whole point is the choice of method. */
const DECISION_EXERCISE_TYPES = ["Suitability", "Efficiency", "Matching"];

/**
 * One turn of the conversation, spoken by the student's own companion.
 *
 * The portrait AND the name above the text are the whole point. Without the name this is a panel of
 * text that happens to sit beside a small picture, and the student has to infer who is talking —
 * which is what made the dialog read as a generic popup rather than as their companion checking in
 * with them. Used for both turns, question and reply, because both are the companion talking.
 *
 * The drawing itself is `BuddySays`, shared with the daily intention, so the two dialogs cannot
 * drift into looking like two different characters.
 */
function BuddyBubble({ text, buddyName, buddyEmoji, buddyImgSrc, variant = "ask" }: {
    text: string;
    buddyName: string;
    buddyEmoji: string;
    buddyImgSrc?: string;
    variant?: "ask" | "reply";
}): ReactElement {
    return (
        <BuddySays buddyName={buddyName} buddyEmoji={buddyEmoji} buddyImage={buddyImgSrc} variant={variant}>
            <p>{text}</p>
        </BuddySays>
    );
}

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
    const [retryNotice, setRetryNotice] = useState("");

    const item = items[itemIndex];
    const totalQuestions = 3;

    const q2Key = useMemo(() => {
        if (!item) return "reflection-q2-generic";

        // A goal item carries its category in `itemId`, so the second question can be about the
        // decision the student was actually working on rather than a generic one. The old
        // hard-coded solo goal ids are gone: solo mode was removed with the free-text chat, so that
        // branch could never fire again.
        if (item.itemType === "goal") {
            const byCategory = Q2_KEY_BY_CATEGORY[item.itemId];
            if (byCategory) return byCategory;

            // A method or exercise-type goal is about choosing, which is what the decision question
            // asks. Hints and errors has no decision to ask about, so the generic question fits it
            // better than the decision one.
            return item.itemId === "method" || item.itemId === "exerciseType"
                ? "reflection-q2-decision"
                : "reflection-q2-generic";
        }

        // Exercise items carry the exercise type in `method`.
        if (DECISION_EXERCISE_TYPES.includes(item.method)) return "reflection-q2-decision";
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
                needsRetry: result.needsRetry,
            }, null, 2));

            // An off-topic answer is not a reflection: do not grade it, do not award XP and do not
            // record a turn. Stay in the answering phase so the student can rewrite it.
            if (result.needsRetry) {
                setRetryNotice(result.feedback);
                setEarnedInsight(0);
                return;
            }

            setRetryNotice("");
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
            setRetryNotice("");
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
            setRetryNotice("");
            setPhase("answering");
        } else {
            onClose();
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content reflection-modal buddy-panel" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} title={t("dashboard-modal-close")}>
                    <FontAwesomeIcon icon={faTimes} />
                </button>

                {/* The title and the step rail are chrome. Both sit ABOVE the conversation so the
                    companion's face and their question are never separated by a progress widget —
                    which is what the old row of three big labelled dots did, splitting one sentence
                    into two halves with a stepper in the middle of it. */}
                <div className="reflection-modal__heading">
                    <h2 className="reflection-modal__title">{t("reflection-title", { buddy: buddyName })}</h2>
                    <p className="reflection-modal__item">{t("reflection-completed-item", { label: item.itemLabel })}</p>
                </div>

                <div
                    className="buddy-steps"
                    role="progressbar"
                    aria-valuemin={1}
                    aria-valuemax={3}
                    aria-valuenow={question}
                    aria-label={t(`reflection-step-${question}`)}
                >
                    <span className="buddy-steps__bar">
                        {[1, 2, 3].map((n) => (
                            <span
                                key={n}
                                className={`buddy-steps__seg${n < question ? " buddy-steps__seg--done" : n === question ? " buddy-steps__seg--active" : ""}`}
                            />
                        ))}
                    </span>
                    <span className="buddy-steps__caption">
                        <strong>{t(`reflection-step-${question}`)}</strong> · {question}/3
                    </span>
                </div>

                {/* The question, in the companion's own voice. */}
                <BuddyBubble text={questionText} buddyName={buddyName} buddyEmoji={buddyEmoji} buddyImgSrc={buddyImgSrc} />

                {/* Answering phase */}
                {phase === "answering" && (
                    <div className="reflection-modal__answer">
                        {/* Whose turn it is. An empty box under a question does not say that. */}
                        <span className="buddy-turn__label">{t("reflection-your-turn")}</span>
                        <textarea
                            className="reflection-modal__input"
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder={t("reflection-answer-placeholder")}
                            rows={3}
                            maxLength={400}
                            autoFocus
                        />
                        {retryNotice && (
                            <div className="reflection-modal__retry" role="status">
                                <FontAwesomeIcon icon={faRotateRight} />
                                <p>{retryNotice}</p>
                            </div>
                        )}
                        <div className="reflection-modal__actions">
                            <button
                                className="button secondary-button"
                                onClick={() => handleAnswer("pippin")}
                                disabled={loading}
                            >
                                {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faRobot} />}
                                {t("reflection-buddy-tell-me", { buddy: buddyName })}
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
                        <BuddyBubble text={feedback} buddyName={buddyName} buddyEmoji={buddyEmoji} buddyImgSrc={buddyImgSrc} variant="reply" />
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
