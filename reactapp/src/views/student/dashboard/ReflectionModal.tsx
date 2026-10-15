import { faArrowRight, faCheck, faLightbulb, faRobot, faSpinner, faTimes, faTrophy } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import i18n from "@/i18n.ts";
import { BuddySays } from "@components/shared/BuddySays.tsx";
import { asTranslate, describeGoal } from "@utils/goalCatalog.ts";
import { suggestionToGoal } from "@utils/goalSuggestions.ts";
import ReflectionPanelView, { panelHasContent } from "@views/student/dashboard/ReflectionPanel.tsx";
import type { ReflectionPanel } from "@utils/reflectionUtils.ts";
import type { StudyGoal } from "@/types/student/goal.ts";
import {
    completeReflection,
    evaluateReflection,
    ReflectionHistoryEntry,
    ReflectionQuestion,
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
 * The question the student is on, with its text and its chips ready to render.
 *
 * The BANK lives on the server, so nothing here decides what to ask or which chip is right. The
 * server sends the wording as a translation key plus slot keys; this resolves them with the app's
 * own copy and hands back whatever was tapped. That is what keeps the question the student reads and
 * the rule that grades it the same object.
 */
function resolveQuestion(
    question: ReflectionQuestion | undefined,
    t: (key: string, options?: Record<string, unknown>) => string
): { text: string; chips: (ReflectionQuestion["chips"][number] & { label: string })[]; id: string; terms: string[] } {
    if (!question) return { text: "", chips: [], id: "", terms: [] };

    // Slot values are translation KEYS (a step label, a method name) or literals (the student's own
    // numbers). Resolving the keys here is what lets the server describe a question without holding a
    // copy of the app's copy in three languages.
    const slotWords = Object.fromEntries(
        Object.entries(question.slots ?? {}).map(([name, key]) => [name, t(key)])
    );

    return {
        id: question.id,
        text: t(question.textKey, { ...slotWords, ...(question.values ?? {}) }),
        // The label travels with the chip so the answer we send back can name the words the student
        // actually read, rather than the internal id.
        chips: (question.chips ?? []).map((chip) => ({ ...chip, label: t(chip.textKey) })),
        terms: Object.values(slotWords),
    };
}

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
    const [question, setQuestion] = useState(1);
    const [phase, setPhase] = useState<Phase>("answering");
    const [choice, setChoice] = useState("");
    const [feedback, setFeedback] = useState("");
    const [nextStep, setNextStep] = useState("");
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<ReflectionHistoryEntry[]>([]);
    const [earnedInsight, setEarnedInsight] = useState(0);
    const [suggestedGoal, setSuggestedGoal] = useState<StudyGoal | null>(null);

    /**
     * The panel for the question on screen: the one that came with the question, until an answer is sent,
     * and then the opened one the server sends back with the verdict.
     *
     * Kept as state rather than read from `asked.panel` so that opening it is a single assignment. The
     * facts the question withheld never travel with the question, so there is nothing to reveal locally —
     * the open version has to arrive from the server, which is what makes the lock honest rather than
     * decorative.
     */
    const [openPanel, setOpenPanel] = useState<ReflectionPanel | null>(null);

    /**
     * WHICH action is in flight, not merely that one is.
     *
     * A single `loading` flag drove both buttons, so pressing either made BOTH of them spin and the
     * student could not tell which action they had actually started. Sending an answer and asking the
     * companion are different things, and each button has to look like itself: only the pressed one
     * turns, and the other goes quiet and disabled.
     */
    const [pending, setPending] = useState<"" | "self" | "pippin">("");

    const item = items[itemIndex];

    // How many questions this item has, taken from the questions themselves.
    //
    // It used to be the number 3 in four places. That was true while every item was an exercise or a
    // goal, and it is not true of the end-of-session reflection, which asks two. The server is the one
    // that decides how many a question set has, so the count is read from what it sent.
    const totalQuestions = item?.questions?.length ?? 3;

    // The server sends them in order: observe, judge, look forward.
    const asked = useMemo(
        () => resolveQuestion(item?.questions?.[question - 1], t),
        [item, question, t]
    );

    // The suggested goal, in the goal system's own wording — the same sentence the goal card and the
    // picker show for it, so the reflection is proposing a goal the student can recognise rather than
    // a second way of describing one.
    //
    // Up here with the other hooks, above the early return below: a hook after a conditional return
    // runs on some renders and not others, which React rejects outright.
    const suggestedGoalText = useMemo(
        () => (suggestedGoal ? describeGoal(suggestedGoal, asTranslate(t)) : ""),
        [suggestedGoal, t]
    );

    // The opened panel once an answer is in, and the question's own panel before that. Recomputed rather
    // than stored because the question does not change while the modal is open, and the two can never
    // both be right: after an answer the question's version is the stale one.
    const panel = openPanel ?? item?.questions?.[question - 1]?.panel ?? null;
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

    // The server's wording when it sent one, and the old generic keys only if it did not. The fallback
    // is a safety net for a row read before this shipped, not a second design.
    const questionText = asked.text
        || (question === 1 ? t("reflection-q1") : question === 2 ? t("reflection-q2-generic") : t("reflection-q3"));

    // ONE CHIP IS THE ANSWER, AND ONE BUTTON SENDS IT.
    //
    // There is no text box any more: every question in the bank ships chips, so a tap is the only way to
    // answer and the server grades it from the record without asking the model to judge anything. The
    // button is still separate from the chips — a chip selects and the button sends, so a mis-tap is
    // recoverable and a quick answer is decided rather than fired off on contact.
    const hasAnswer = choice.length > 0;

    async function handleAnswer(mode: "self" | "pippin", chipId = choice): Promise<void> {
        if (loading) return;
        setPending(mode);
        setLoading(true);
        try {
            const result = await evaluateReflection(
                studentId,
                item.id,
                question,
                mode,
                i18n.language?.slice(0, 2) ?? "en",
                asked.id,
                mode === "self" ? chipId : "",
                asked.terms,
                mode === "self" ? (asked.chips.find((chip) => chip.id === chipId)?.label ?? "") : ""
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
            // The record opens with the verdict. The server sends this only after an answer, so the facts
            // this question withheld are not on the payload the student answered from.
            setOpenPanel(result.panel ?? null);
            // The goal that would carry out what they just committed to, in its own catalogue shape so
            // the same wording can be used as everywhere else a goal is named. Converted by the same
            // function that validates the goal picker's own suggestions, so a suggestion whose fields
            // do not fit the catalogue is dropped rather than rendered as a goal nobody could complete.
            setSuggestedGoal(result.suggestedGoal ? suggestionToGoal(result.suggestedGoal) : null);
            setPhase("feedback");

            // THE CHIP BELONGS ON THE STUDENT'S ROW.
            //
            // It used to be written onto the companion's row as well, which made a chip answer look like
            // something the companion had chosen — 68 rows carried it, only 2 answered ones did. The
            // student's row is now the one row that holds the answer: the question it answered and the
            // chip that was chosen. Nothing reads the companion's copy.
            const newEntries: ReflectionHistoryEntry[] = [
                { role: "student", text: "", insightXp: 0, itemType: item.itemType, itemId: item.itemId, questionId: asked.id, choice: chipId },
                { role: "pippin", text: result.feedback, insightXp: result.insightXp, itemType: item.itemType, itemId: item.itemId, questionId: asked.id },
            ];
            setHistory((prev) => [...prev, ...newEntries]);

            if (result.insightXp > 0) {
                onAwardInsight(result.insightXp);
            }
        } catch {
            setFeedback(t("reflection-ai-unavailable"));
            setPhase("feedback");
        } finally {
            setPending("");
            setLoading(false);
        }
    }

    async function handleNext(): Promise<void> {
        if (question < totalQuestions) {
            setQuestion((q) => q + 1);
            setChoice("");
            setFeedback("");
            setNextStep("");
            setEarnedInsight(0);
            // The opened panel belongs to the question just answered. Dropping it here is what puts the
            // lock back for the next one, which withholds something of its own.
            setOpenPanel(null);
            setPhase("answering");
            return;
        }

        // Finished this item — persist history and move on
        await completeReflection(studentId, item.id, history);
        setHistory([]);
        if (itemIndex < items.length - 1) {
            setItemIndex((i) => i + 1);
            setQuestion(1);
            setChoice("");
            setFeedback("");
            setNextStep("");
            setEarnedInsight(0);
            // AND THE OPENED PANEL GOES WITH IT.
            //
            // This is the one reset that is easy to forget, because the panel is not otherwise part of the
            // per-item state: it reads from the question until an answer opens it, and only the opened
            // version is held. Leaving it here meant the next item showed the PREVIOUS one's numbers
            // until its own first answer replaced them — a goal's run circles and hint count sitting
            // beside an exercise's question, which is worse than showing nothing because it looks
            // authoritative.
            setOpenPanel(null);
            setPhase("answering");
        } else {
            onClose();
        }
    }

    /**
     * Closing the reflection is a NO.
     *
     * It used to just hide the window, which left the item pending — so dismissing a reflection
     * quietly meant "ask me again later" and the same one came back the next time the dashboard
     * opened. A student who closes a reflection has answered it, and the honest record is that they
     * did not want to take it. The server keeps the item out of the queue once it is skipped.
     *
     * If the item was already finished, the skip is harmless: it is out of the queue either way.
     */
    async function dismiss(): Promise<void> {
        await completeReflection(studentId, item.id, [], true);
        onClose();
    }

    return (
        <div className="modal-overlay">
            <div className={`modal-content reflection-modal buddy-panel${panelHasContent(panel) ? " reflection-modal--with-record" : ""}`} onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={dismiss} title={t("dashboard-modal-close")}>
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
                    aria-valuemax={totalQuestions}
                    aria-valuenow={question}
                    aria-label={t(`reflection-step-${question}`)}
                >
                    <span className="buddy-steps__bar">
                        {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((n) => (
                            <span
                                key={n}
                                className={`buddy-steps__seg${n < question ? " buddy-steps__seg--done" : n === question ? " buddy-steps__seg--active" : ""}`}
                            />
                        ))}
                    </span>
                    <span className="buddy-steps__caption">
                        <strong>{t(`reflection-step-${question}`)}</strong> · {question}/{totalQuestions}
                    </span>
                </div>

                {/* The question and the record, side by side.
                    The bubble, the chips and the reply belong together and stay in one column, so the
                    companion's question is never separated from the answer being given to it. The panel
                    is a second column because it is about the question rather than part of it. */}
                <div className="reflection-modal__body">
                    <div className="reflection-modal__conversation">
                        {/* The question, in the companion's own voice. */}
                        <BuddyBubble text={questionText} buddyName={buddyName} buddyEmoji={buddyEmoji} buddyImgSrc={buddyImgSrc} />

                {/* Answering phase */}
                {phase === "answering" && (
                    <div className="reflection-modal__answer">
                        {/* The chips ARE the answer, so they sit where the answer goes and carry the
                            "your turn" label themselves. They used to be a row of pills BELOW a text box,
                            deliberately labelled "quick answer" so they would not read as the expected
                            answer to a reflection the student was meant to write in their own words. There
                            is nothing to write now, so that framing is gone with the box: this is the
                            answer, and the label says so. */}
                        <span className="buddy-turn__label">{t("reflection-your-turn")}</span>
                        <div
                            className="reflection-modal__chips reflection-modal__chips--answer"
                            role="group"
                            aria-label={t("reflection-pick-answer")}
                        >
                            {asked.chips.map((chip) => (
                                <button
                                    key={chip.id}
                                    type="button"
                                    className={`reflection-modal__chip${choice === chip.id ? " reflection-modal__chip--on" : ""}`}
                                    aria-pressed={choice === chip.id}
                                    disabled={loading}
                                    onClick={() => setChoice(choice === chip.id ? "" : chip.id)}
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                        {/* Two actions, and they are different things: send the answer the student chose,
                            or have the companion answer this question for them. A chip selects and the
                            button sends, so nothing is decided by a single tap. */}
                        <div className="reflection-modal__actions">
                            <button
                                className="button secondary-button"
                                onClick={() => handleAnswer("pippin")}
                                disabled={loading}
                            >
                                {pending === "pippin" ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faRobot} />}
                                {t("reflection-buddy-tell-me", { buddy: buddyName })}
                            </button>
                            <button
                                className="button primary-button"
                                onClick={() => handleAnswer("self")}
                                disabled={!hasAnswer || loading}
                            >
                                {pending === "self" ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faCheck} />}
                                {t("reflection-submit-answer")}
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
                        {question === totalQuestions && nextStep && (
                            <div className="reflection-modal__next-step">
                                <FontAwesomeIcon icon={faLightbulb} className="reflection-modal__next-step-icon" />
                                <div>
                                    <span className="reflection-modal__next-step-label">{t("reflection-next-step-label")}</span>
                                    <p>{nextStep}</p>
                                    {/* The goal that would carry it out, in the goal system's own words.
                                        Composed here rather than by the server because the wording and the
                                        legal targets belong to the catalogue — the server only says WHICH
                                        goal fits, and says nothing when none does. */}
                                    {suggestedGoalText && (
                                        <p className="reflection-modal__suggested-goal">
                                            <FontAwesomeIcon icon={faTrophy} className="reflection-modal__suggested-goal-icon" />
                                            {t("reflection-suggested-goal", { goal: suggestedGoalText })}
                                        </p>
                                    )}
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

                    <ReflectionPanelView panel={panel} itemType={item.itemType} />
                </div>
            </div>
        </div>
    );
}
