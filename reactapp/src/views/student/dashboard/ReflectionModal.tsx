import { faArrowRight, faCheck, faLightbulb, faPlus, faRobot, faSpinner, faTimes, faTrophy } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import i18n from "@/i18n.ts";
import { BuddySays } from "@components/shared/BuddySays.tsx";
import { addGoal, getActiveGoals } from "@utils/activeGoals.ts";
import { asTranslate, describeGoal } from "@utils/goalCatalog.ts";
import { suggestionToGoal } from "@utils/goalSuggestions.ts";
import ReflectionPanelView, { panelHasContent } from "@views/student/dashboard/ReflectionPanel.tsx";
import type { ReflectionPanel } from "@utils/reflectionUtils.ts";
import type { StudyGoal } from "@/types/student/goal.ts";
import {
    completeReflection,
    evaluateReflection,
    reflectionItemLabel,
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
    /**
     * Runs instead of `onClose` when the student answers the LAST question of the LAST item.
     *
     * The two are different acts. `onClose` is a dismissal — the ✕, or a "not now" — and has to leave
     * them where they are. This is the finish: the end-of-session reflection uses it to close the
     * session down, because answering it was the last thing they were asked to do today and dropping
     * them back on the dashboard afterwards leaves a finished session open behind them.
     */
    onFinished?: () => void;
    /**
     * Told when the student closes the reflection without finishing it.
     *
     * A close is a skip: the item leaves the queue as declined. That is also the moment the Choice for
     * agreeing to reflect is taken back, which is why the modal reports it rather than just hiding.
     */
    onAbandoned?: (queueItemId: number) => void;
    /** Told when the student accepts a suggested goal, so the dashboard can show it at once. */
    onGoalAdded?: (goals: StudyGoal[]) => void;
}

type Phase = "answering" | "feedback";

/**
 * The id recorded for an answer the student wrote instead of tapping.
 *
 * A real value rather than an empty string, because an empty choice already means "the help button
 * was pressed" in this codebase — two different acts must not share one code in the data.
 */
const FREE_TEXT_CHOICE = "free-text";

/**
 * How many characters a written answer needs before it can be sent.
 *
 * Three, so a stray keypress cannot be submitted as an answer, and low enough that a short true
 * answer ("more practice") is not refused. The server caps the length it will store.
 */
const MIN_FREE_TEXT = 3;

/** The most a written answer may contain, matching the server's own cap. */
const MAX_FREE_TEXT = 400;

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

    // The server sends every value as a string, and i18next only takes the singular branch for a real
    // number: given "1" it reads the plural one, which is how a one-mistake question came out as
    // "1 of them". Whole numbers are handed over as numbers so the count decides the wording.
    const values = Object.fromEntries(
        Object.entries(question.values ?? {}).map(([name, value]) => [
            name,
            /^\d+$/.test(value) ? Number(value) : value,
        ])
    );

    return {
        id: question.id,
        text: t(question.textKey, { ...slotWords, ...values }),
        // The label travels with the chip so the answer we send back can name the words the student
        // actually read, rather than the internal id.
        chips: (question.chips ?? []).map((chip) => ({
            ...chip,
            // A chip whose sentence is about a number ("3 of them had no mistakes") carries that number
            // from the server, so the plural form is picked here rather than the server keeping three
            // copies of the same sentence.
            label: chip.label && chip.label.length > 0
                ? chip.label
                : t(chip.textKey, chip.count != null ? { count: chip.count, total: chip.total ?? chip.count } : undefined),
        })),
        terms: Object.values(slotWords),
    };
}

/**
 * Whether two goals ask the same thing of the student.
 *
 * Compared field by field rather than by id, because a suggestion is built fresh from the catalogue
 * every time it is offered: the same commitment pressed twice would otherwise be stored twice and the
 * two would each count the same exercises towards themselves.
 */
function sameGoal(a: StudyGoal, b: StudyGoal): boolean {
    return a.category === b.category
        && (a.focus ?? "") === (b.focus ?? "")
        && a.metric === b.metric
        && a.target === b.target
        && (a.quality ?? "") === (b.quality ?? "")
        && (a.maxPerExercise ?? 0) === (b.maxPerExercise ?? 0);
}

/**
 * The rail's label for a question, taken from its own kind rather than its position.
 *
 * The positions used to carry three fixed names, which stopped being true the moment an item had four
 * questions: two "reflect" steps in a row says less than naming what each one is doing. The kind is what
 * the server already decides, so the label follows it and cannot drift from the question.
 */
function stageKey(question: ReflectionQuestion | undefined): string {
    switch (question?.kind) {
        case "ungraded": return "reflection-stage-think";
        case "judgement": return "reflection-stage-why";
        case "next-action": return "reflection-stage-next";
        default: return "reflection-stage-read";
    }
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

export function ReflectionModal({ studentId, items, buddyName, buddyEmoji, buddyImgSrc, onAwardInsight, onClose, onFinished, onGoalAdded, onAbandoned }: Props): ReactElement {
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
     * Where the suggested goal stands with the student's own list.
     *
     * Checked against the saved goals rather than assumed, because the same goal can be proposed after
     * every reflection and pressing plus twice would leave two identical commitments side by side,
     * each counting the same exercises.
     */
    const [goalOffer, setGoalOffer] = useState<"checking" | "offer" | "saving" | "added" | "already">("checking");

    useEffect(() => {
        if (!suggestedGoal) return;

        let live = true;
        void (async () => {
            const saved = await getActiveGoals(studentId);
            if (!live) return;
            setGoalOffer(saved.some((goal) => sameGoal(goal, suggestedGoal)) ? "already" : "offer");
        })();

        return () => { live = false; };
    }, [suggestedGoal, studentId]);

    /**
     * Accepting the suggestion with one tap.
     *
     * Recorded with origin "assistant" rather than "student": the goal is real and starts counting, but
     * the award for deciding what to work on belongs to a goal the student thought of themselves. The
     * rest of the flow is the picker's own, so a goal accepted here is an ordinary goal from then on.
     */
    async function handleAddGoal(): Promise<void> {
        if (!suggestedGoal || goalOffer === "saving" || goalOffer === "added") return;

        setGoalOffer("saving");
        const saved = await addGoal(studentId, suggestedGoal, "assistant");
        if (saved.some((goal) => sameGoal(goal, suggestedGoal))) {
            setGoalOffer("added");
            onGoalAdded?.(saved);
        } else {
            // Nothing was stored, so the offer has to stay pressable rather than claim a success.
            setGoalOffer("offer");
        }
    }

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
     * The next question, when the answer to this one changed what it should ask.
     *
     * Kept beside the number it is meant for rather than on its own: it arrives while the student is
     * still reading the reply, and applying it straight away would swap the question under the feedback
     * they are looking at. Once they move on the number matches and it is used; one step later it no
     * longer matches and stops mattering.
     */
    const [retargeted, setRetargeted] = useState<{ number: number; question: ReflectionQuestion } | null>(null);

    /**
     * WHICH action is in flight, not merely that one is.
     *
     * A single `loading` flag drove both buttons, so pressing either made BOTH of them spin and the
     * student could not tell which action they had actually started. Sending an answer and asking the
     * companion are different things, and each button has to look like itself: only the pressed one
     * turns, and the other goes quiet and disabled.
     */
    const [pending, setPending] = useState<"" | "self" | "pippin">("");

    /** Whether the "close it anyway?" prompt is showing, asked once an answer has been given. */
    const [confirmingClose, setConfirmingClose] = useState(false);

    /**
     * The student's own words, when the menu does not contain their answer.
     *
     * Every question ships chips and they are graded against the record, which is what keeps a reply
     * from contradicting the dashboard. But a menu can only ever offer the answers someone thought of
     * in advance, and a student whose experience is not on it is left choosing the least wrong option.
     * So the box sits under every menu. What they write is judged on its meaning against the same
     * record — never on how well it is written — and paid from the same table a chip is paid from.
     *
     * A chip and a sentence are mutually exclusive answers, so touching one clears the other and what
     * is on screen is always what will be sent.
     */
    const [freeText, setFreeText] = useState("");

    const item = items[itemIndex];

    // How many questions this item has, taken from the questions themselves.
    //
    // It used to be the number 3 in four places. That was true while every item was an exercise or a
    // goal, and it is not true of the end-of-session reflection, which asks two. The server is the one
    // that decides how many a question set has, so the count is read from what it sent.
    const totalQuestions = item?.questions?.length ?? 3;

    // The server sends them in order: what went well (or which run they are proudest of), the ungraded
    // follow-up, the reason, and the plan. One of them can be replaced after the reason is answered.
    const baseQuestion = retargeted?.number === question ? retargeted.question : item?.questions?.[question - 1];

    const asked = useMemo(
        () => resolveQuestion(baseQuestion, t),
        [baseQuestion, t]
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
    const panel = openPanel ?? baseQuestion?.panel ?? null;
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

    // ONE ANSWER, AND ONE BUTTON SENDS IT.
    //
    // Every question ships an answer menu, so a tap is the only way to answer a question that is
    // graded, and the server grades it from the record without asking the model to judge anything. The
    // button is still separate from the chips — a chip selects and the button sends, so a mis-tap is
    // recoverable and a quick answer is decided rather than fired off on contact.
    //
    // The menu is not the only route, though: the box under every question is the student's own words,
    // for the answers nobody wrote a chip for. Typing clears the chip and tapping a chip clears the box,
    // so only one of the two can ever be waiting to be sent.
    const ownWordsReady = freeText.trim().length >= MIN_FREE_TEXT;
    const hasAnswer = choice.length > 0 || ownWordsReady;

    async function handleAnswer(mode: "self" | "pippin", chipId = choice): Promise<void> {
        if (loading) return;
        setPending(mode);
        setLoading(true);
        // The answer this turn carries: what they tapped, or what they wrote.
        const sentChip = mode === "self" && !ownWordsReady ? chipId : "";
        const sentText = mode === "self" && ownWordsReady ? freeText.trim() : "";
        try {
            const result = await evaluateReflection(
                studentId,
                item.id,
                question,
                mode,
                i18n.language?.slice(0, 2) ?? "en",
                asked.id,
                sentChip,
                asked.terms,
                // The chip's own words, empty when they wrote instead — the words they wrote travel
                // beside it rather than standing in for a chip that was never chosen.
                asked.chips.find((chip) => chip.id === chipId)?.label ?? "",
                sentText
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
            // The plan question, rewritten around the reason they just gave. Parked against the number it
            // belongs to, so the reply they are reading is not replaced mid-sentence.
            setRetargeted(result.nextQuestion ? { number: question + 1, question: result.nextQuestion } : null);
            setPhase("feedback");

            // THE ANSWER BELONGS ON THE STUDENT'S ROW.
            //
            // It used to be written onto the companion's row as well, which made a chip answer look like
            // something the companion had chosen — 68 rows carried it, only 2 answered ones did. The
            // student's row is now the one row that holds the answer: the question it answered and what
            // was given, as a chip id or as their own sentence.
            const newEntries: ReflectionHistoryEntry[] = [
                {
                    role: "student",
                    // What they wrote, when they wrote it. This is the only copy of a written answer that
                    // survives the dialog, so a blank here would lose it.
                    text: sentText,
                    insightXp: 0,
                    itemType: item.itemType,
                    itemId: item.itemId,
                    questionId: asked.id,
                    choice: sentText.length > 0 ? FREE_TEXT_CHOICE : chipId,
                },
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
            // The box belongs to the question it was written for. Carrying it forward would answer the
            // next question with the previous one's words.
            setFreeText("");
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
            setFreeText("");
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
            // The last question of the last item. `onFinished` is the end of the sitting when there is
            // one to end; without it this is simply "done", which is what every other reflection is.
            if (onFinished) onFinished();
            else onClose();
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
     *
     * WITH ANSWERS ALREADY GIVEN IT ASKS FIRST, because closing loses the rest of the reflection and
     * nothing puts it back: the item is out of the queue and the next one is a different question set.
     */
    async function dismiss(): Promise<void> {
        const answered = history.some((entry) => entry.role === "student");
        if (answered && !confirmingClose) {
            setConfirmingClose(true);
            return;
        }
        await closeAndSkip();
    }

    async function closeAndSkip(): Promise<void> {
        await completeReflection(studentId, item.id, [], true);
        // Closing is a no, and a no does not keep the points for having said yes. Told after the skip
        // lands, so the item is already out of the queue whatever happens next.
        onAbandoned?.(item.id);
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
                    into two halves with a stepper in the middle of it.

                    THE SUBJECT IS THE BIGGEST LINE HERE, because the questions are all about it and a
                    student should never have to work out which goal they are reflecting on. It used to
                    be one dim 0.9rem line reading "Reflecting on: <label>", which is where the goal's
                    name went to be missed. */}
                <div className="reflection-modal__heading">
                    <h2 className="reflection-modal__title">{t("reflection-title", { buddy: buddyName })}</h2>
                    <div className="reflection-modal__subject">
                        <span className={`reflection-modal__subject-kind reflection-modal__subject-kind--${item.itemType}`}>
                            {t(item.itemType === "goal"
                                ? "reflection-subject-goal"
                                : item.itemType === "session"
                                    ? "reflection-subject-session"
                                    : "reflection-subject-exercise")}
                        </span>
                        {/* A session's own label is "Today's session", which the tag already says, so it
                            carries no second line. A goal and an exercise do: their name IS the thing the
                            questions are about. Resolved through the same helper the prompt uses, so an
                            exercise type arrives in the student's language here too. */}
                        {item.itemType !== "session" && (
                            <span className="reflection-modal__subject-name">{reflectionItemLabel(item, t)}</span>
                        )}
                    </div>
                </div>

                <div
                    className="buddy-steps"
                    role="progressbar"
                    aria-valuemin={1}
                    aria-valuemax={totalQuestions}
                    aria-valuenow={question}
                    aria-label={t(stageKey(baseQuestion))}
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
                        <strong>{t(stageKey(baseQuestion))}</strong> · {question}/{totalQuestions}
                    </span>
                </div>

                {/* The question and the record, side by side.
                    The bubble, the chips and the reply belong together and stay in one column, so the
                    companion's question is never separated from the answer being given to it. The panel
                    is a second column because it is about the question rather than part of it. */}
                {/* The dashboard is a band across the dialog above the question, not a column beside
                    it: the questions refer to it by name, so it has to be read before the question, and a
                    narrow side column would make the bars unreadable. */}
                <ReflectionPanelView panel={panel} itemType={item.itemType} itemLabel={item.itemLabel} />

                <div className="reflection-modal__body">
                    {/* Closing mid-way is a real choice, so it is asked rather than assumed. The wording
                        says what is actually kept: the Insight for an answer is already in the ledger by
                        the time the reply appears, so backing out never takes it away, and telling a
                        student otherwise would be a lie in the one place it would be believed. */}
                    {confirmingClose && (
                        <div className="reflection-modal__confirm" role="alertdialog" aria-live="assertive">
                            <p>
                                {t("reflection-close-confirm", {
                                    done: history.filter((entry) => entry.role === "student").length,
                                    total: totalQuestions,
                                })}
                            </p>
                            <div className="reflection-modal__confirm-actions">
                                <button className="button primary-button" onClick={() => setConfirmingClose(false)}>
                                    <FontAwesomeIcon icon={faArrowRight} /> {t("reflection-close-confirm-stay")}
                                </button>
                                <button className="button" onClick={() => void closeAndSkip()}>
                                    {t("reflection-close-confirm-leave")}
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="reflection-modal__conversation">
                        {/* The question, in the companion's own voice. */}
                        <BuddyBubble text={questionText} buddyName={buddyName} buddyEmoji={buddyEmoji} buddyImgSrc={buddyImgSrc} />

                {/* Answering phase */}
                {phase === "answering" && (
                    <div className="reflection-modal__answer">
                        {/* The chips ARE the answer, so they sit where the answer goes and carry the
                            "your turn" label themselves. They used to be a row of pills BELOW a text box,
                            deliberately labelled "quick answer" so they would not read as the expected
                            answer to a reflection the student was meant to write in their own words.

                            A box is back UNDER the menu rather than above it, and open rather than hidden:
                            the menu is what makes an answer gradeable against the record, and writing is
                            for the student whose experience the menu does not contain. */}
                        <span className="buddy-turn__label">{t("reflection-your-turn")}</span>
                        {/* The menu is the answer, and it is what the record can grade. */}
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
                                    onClick={() => {
                                        setChoice(choice === chip.id ? "" : chip.id);
                                        // A chip and a sentence are two answers to one question, so
                                        // tapping one puts the other away rather than leaving both.
                                        setFreeText("");
                                    }}
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>

                        {/* THE BOX IS ALWAYS OPEN, AND THAT IS THE POINT.
                            A menu can only offer the answers someone thought of in advance, and the
                            reflection is about an experience only the student had. Behind a button the
                            box went unopened; open, it says at a glance that writing is allowed.
                            What they write is judged on its meaning against the same record the chips
                            are graded against, never on how it is written. */}
                        <label className="reflection-modal__own-words">
                            <span className="reflection-modal__own-words-label">{t("reflection-write-own")}</span>
                            <textarea
                                className="reflection-modal__own-words-input"
                                value={freeText}
                                onChange={(event) => {
                                    const next = event.target.value.slice(0, MAX_FREE_TEXT);
                                    setFreeText(next);
                                    // One answer at a time: writing clears any chip, so the submit
                                    // button can never carry two answers.
                                    if (next.trim().length > 0) setChoice("");
                                }}
                                placeholder={t("reflection-write-own-placeholder", { buddy: buddyName })}
                                rows={3}
                                maxLength={MAX_FREE_TEXT}
                                disabled={loading}
                            />
                            <span className="reflection-modal__own-words-hint">
                                {t("reflection-write-own-hint")}
                            </span>
                        </label>

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
                                        <div className="reflection-modal__suggested-goal">
                                            <FontAwesomeIcon icon={faTrophy} className="reflection-modal__suggested-goal-icon" />
                                            <span>{t("reflection-suggested-goal", { goal: suggestedGoalText })}</span>
                                            {goalOffer === "added" ? (
                                                <span className="reflection-modal__goal-done">
                                                    <FontAwesomeIcon icon={faCheck} /> {t("reflection-goal-added")}
                                                </span>
                                            ) : goalOffer === "already" ? (
                                                <span className="reflection-modal__goal-done reflection-modal__goal-done--quiet">
                                                    <FontAwesomeIcon icon={faCheck} /> {t("reflection-goal-already-set")}
                                                </span>
                                            ) : (
                                                /* One tap turns the promise into a goal the app can count.
                                                   Nothing about the wording changes: the student is
                                                   accepting the sentence they just read. */
                                                <button
                                                    type="button"
                                                    className="reflection-modal__goal-add"
                                                    onClick={() => void handleAddGoal()}
                                                    disabled={goalOffer === "checking" || goalOffer === "saving"}
                                                    aria-label={t("reflection-goal-add", { goal: suggestedGoalText })}
                                                    title={t("reflection-goal-add", { goal: suggestedGoalText })}
                                                >
                                                    {goalOffer === "saving"
                                                        ? <FontAwesomeIcon icon={faSpinner} spin />
                                                        : <FontAwesomeIcon icon={faPlus} />}
                                                </button>
                                            )}
                                        </div>
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

                </div>
            </div>
        </div>
    );
}
