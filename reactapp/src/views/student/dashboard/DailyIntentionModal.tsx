import { faArrowRight, faBullseye, faChartBar, faTimes, faTrophy } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import { BuddySays } from "@components/shared/BuddySays.tsx";

/**
 * The plans a day can be given, and the only answers this question takes.
 *
 * Three, not four. There used to be a "Something else…" box as well, which sent whatever the student
 * typed to the model to be sorted into one of these three — the same decision taken twice, with a
 * round trip in between and a chance for the classifier to misread it. The three options are also
 * what the follow-through check can actually judge (two more exercises for practice, a completed goal
 * for goal, and review deliberately pays nothing on its own), so a written plan could only ever end up
 * in one of them anyway.
 */
const PLANS: { id: DailyIntentionChoice; icon: IconDefinition; labelKey: string; hintKey: string }[] = [
    { id: "practice", icon: faBullseye, labelKey: "daily-intention-practice", hintKey: "daily-intention-practice-hint" },
    { id: "goal", icon: faTrophy, labelKey: "daily-intention-goal", hintKey: "daily-intention-goal-hint" },
    { id: "review", icon: faChartBar, labelKey: "daily-intention-review", hintKey: "daily-intention-review-hint" },
];

/** One of the three plans. Named so the caller cannot be handed anything else. */
export type DailyIntentionChoice = "practice" | "goal" | "review";

interface Props {
    studentName: string;
    buddyName: string;
    buddyEmoji: string;
    buddyImgSrc?: string;
    onSelectPlan: (choice: DailyIntentionChoice) => void;
    onSkip: () => void;
}

/**
 * The daily check-in: one question, three answers.
 *
 * Nothing is recorded until an option is pressed, and pressing one closes the modal immediately — the
 * student then lands on the thing they said they would do (the exercises, the goal picker, or the
 * analytics tab). There is no confirmation step and no second question inside this dialog.
 */
export function DailyIntentionModal({ studentName, buddyName, buddyEmoji, buddyImgSrc, onSelectPlan, onSkip }: Props): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Student);
    // Locks the modal after a choice, so a double tap cannot record two intentions.
    const [submitted, setSubmitted] = useState(false);

    function choose(choice: DailyIntentionChoice): void {
        if (submitted) return;
        setSubmitted(true);
        onSelectPlan(choice);
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content daily-intention-modal buddy-panel" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onSkip} title={t("dashboard-modal-close")}>
                    <FontAwesomeIcon icon={faTimes} />
                </button>

                {/* One portrait, joined to one bubble, carrying BOTH sentences. It used to be an
                    avatar in a header box with the question stranded underneath it in the smallest
                    type on screen — the same words, said by nobody in particular. */}
                <BuddySays buddyName={buddyName} buddyEmoji={buddyEmoji} buddyImage={buddyImgSrc}>
                    <p>{t("daily-intention-greeting", { name: studentName, buddy: buddyName })}</p>
                    <p className="daily-intention-modal__ask">{t("daily-intention-question")}</p>
                </BuddySays>

                {/* ── The three answers ───────────────────────────────── */}
                <div className="daily-intention-modal__options">
                    <div className="daily-intention-modal__grid">
                        {/* No hover state in JS: the card's own `:hover` and `:focus-visible` carry it,
                            and a re-render per pointer move bought nothing. */}
                        {PLANS.map((plan) => (
                            <button
                                key={plan.id}
                                className="buddy-choice"
                                data-tone={plan.id}
                                onClick={() => choose(plan.id)}
                            >
                                <span className="buddy-choice__icon">
                                    <FontAwesomeIcon icon={plan.icon} />
                                </span>
                                <span className="buddy-choice__label">{t(plan.labelKey)}</span>
                                <span className="buddy-choice__hint">{t(plan.hintKey)}</span>
                                <FontAwesomeIcon icon={faArrowRight} className="buddy-choice__go" />
                            </button>
                        ))}
                    </div>

                    <div className="daily-intention-modal__secondary">
                        <button className="daily-intention-modal__skip-btn" onClick={onSkip}>
                            {t("daily-intention-skip")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
