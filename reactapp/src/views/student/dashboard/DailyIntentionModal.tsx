import { faArrowRight, faBullseye, faChartBar, faLightbulb, faPen, faSpinner, faTimes, faTrophy } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import i18n from "@/i18n.ts";
import { requestReflection } from "@utils/progressUtils.ts";
import { BuddySays } from "@components/shared/BuddySays.tsx";

interface Props {
    studentId: number | string;
    studentName: string;
    buddyName: string;
    buddyEmoji: string;
    buddyImgSrc?: string;
    onSelectPlan: (choice: string, customText?: string, detectedCategory?: string) => void;
    onSkip: () => void;
}

export function DailyIntentionModal({ studentId, studentName, buddyName, buddyEmoji, buddyImgSrc, onSelectPlan, onSkip }: Props): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Student);
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [customText, setCustomText] = useState("");
    const [submitted, setSubmitted] = useState(false);  // locks modal after any choice

    // ── AI Reflection state ────────────────────────────────────────────────
    const [aiFeedback, setAiFeedback] = useState("");
    const [detectedCategory, setDetectedCategory] = useState<string>("unclear");
    const [aiLoading, setAiLoading] = useState(false);
    const [showGibberishRetry, setShowGibberishRetry] = useState(false);

    function handlePresetChoice(choice: string): void {
        if (submitted) return;
        setSubmitted(true);
        onSelectPlan(choice);
        // Preset choices navigate/close immediately — no AI feedback needed
    }

    async function handleCustomSubmit(): Promise<void> {
        if (!customText.trim() || submitted) return;

        // Request AI reflection + category detection
        setAiLoading(true);
        setAiFeedback("");
        setShowGibberishRetry(false);
        try {
            const result = await requestReflection(typeof studentId === "number" ? studentId : 1, customText.trim(), i18n.language?.slice(0, 2) ?? "en");
            setAiFeedback(result.feedback);
            setDetectedCategory(result.category ?? "unclear");

            if (result.category === "no_xp") {
                // Gibberish detected — give student a chance to rewrite
                setShowGibberishRetry(true);
            } else {
                // Valid intention — lock and proceed
                setSubmitted(true);
                onSelectPlan("custom", customText.trim(), result.category ?? "unclear");
            }
        } catch {
            setAiFeedback(t("daily-intention-feedback-fallback"));
            setDetectedCategory("unclear");
            setSubmitted(true);
            onSelectPlan("custom", customText.trim(), "unclear");
        } finally {
            setAiLoading(false);
        }
    }

    function handleRetryGibberish(): void {
        setShowGibberishRetry(false);
        setAiFeedback("");
        setDetectedCategory("unclear");
        // Let them edit their text again
    }

    function handleSkipGibberish(): void {
        setSubmitted(true);
        onSelectPlan("custom", customText.trim(), "no_xp");
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

                {/* ── Options grid ────────────────────────────────────── */}
                <div className="daily-intention-modal__options">
                    {!showCustomInput ? (
                        <>
                            <div className="daily-intention-modal__grid">
                                {/* No hover state in JS: the card's own `:hover` and `:focus-visible`
                                    carry it, and a re-render per pointer move bought nothing. */}
                                <button
                                    className="buddy-choice"
                                    data-tone="practice"
                                    onClick={() => handlePresetChoice("practice")}
                                >
                                    <span className="buddy-choice__icon">
                                        <FontAwesomeIcon icon={faBullseye} />
                                    </span>
                                    <span className="buddy-choice__label">{t("daily-intention-practice")}</span>
                                    <span className="buddy-choice__hint">{t("daily-intention-practice-hint")}</span>
                                    <FontAwesomeIcon icon={faArrowRight} className="buddy-choice__go" />
                                </button>

                                <button
                                    className="buddy-choice"
                                    data-tone="goal"
                                    onClick={() => handlePresetChoice("goal")}
                                >
                                    <span className="buddy-choice__icon">
                                        <FontAwesomeIcon icon={faTrophy} />
                                    </span>
                                    <span className="buddy-choice__label">{t("daily-intention-goal")}</span>
                                    <span className="buddy-choice__hint">{t("daily-intention-goal-hint")}</span>
                                    <FontAwesomeIcon icon={faArrowRight} className="buddy-choice__go" />
                                </button>

                                <button
                                    className="buddy-choice"
                                    data-tone="review"
                                    onClick={() => handlePresetChoice("review")}
                                >
                                    <span className="buddy-choice__icon">
                                        <FontAwesomeIcon icon={faChartBar} />
                                    </span>
                                    <span className="buddy-choice__label">{t("daily-intention-review")}</span>
                                    <span className="buddy-choice__hint">{t("daily-intention-review-hint")}</span>
                                    <FontAwesomeIcon icon={faArrowRight} className="buddy-choice__go" />
                                </button>
                            </div>

                            <div className="daily-intention-modal__secondary">
                                <button className="daily-intention-modal__custom-btn" onClick={() => setShowCustomInput(true)}>
                                    <FontAwesomeIcon icon={faPen} className="daily-intention-modal__custom-btn-icon" />
                                    <span>{t("daily-intention-custom")}</span>
                                </button>
                                <button className="daily-intention-modal__skip-btn" onClick={onSkip}>
                                    {t("daily-intention-skip")}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="daily-intention-modal__custom">
                            <p>{t("daily-intention-custom-prompt")}</p>
                            <textarea
                                className="daily-intention-modal__custom-input"
                                value={customText}
                                onChange={(e) => setCustomText(e.target.value)}
                                placeholder={t("daily-intention-custom-placeholder")}
                                rows={3}
                                maxLength={500}
                                autoFocus
                                disabled={aiLoading}
                            />
                            <div className="daily-intention-modal__custom-actions">
                                {showGibberishRetry ? (
                                    <>
                                        <button className="button secondary-button" onClick={handleRetryGibberish}>
                                            {t("daily-intention-retry")}
                                        </button>
                                        <button className="button danger-button" onClick={handleSkipGibberish}>
                                            {t("daily-intention-skip-anyway")}
                                        </button>
                                    </>
                                ) : !submitted ? (
                                    <>
                                        <button className="button secondary-button" onClick={() => setShowCustomInput(false)}>
                                            {t("daily-intention-back")}
                                        </button>
                                        <button className="button primary-button" onClick={handleCustomSubmit} disabled={!customText.trim() || aiLoading}>
                                            {aiLoading ? <><FontAwesomeIcon icon={faSpinner} spin /> {t("daily-intention-analyzing")}</> : t("daily-intention-submit")}
                                        </button>
                                    </>
                                ) : aiLoading ? (
                                    <button className="button primary-button" disabled>
                                        <FontAwesomeIcon icon={faSpinner} spin /> {t("daily-intention-analyzing")}
                                    </button>
                                ) : (
                                    <button className="button primary-button" onClick={onSkip}>
                                        {t("daily-intention-close")}
                                    </button>
                                )}
                            </div>
                            {aiFeedback && (
                                <>
                                    <div className={`daily-intention-modal__category daily-intention-modal__category--${detectedCategory}`}>
                                        <span className="daily-intention-modal__category-dot" />
                                        {detectedCategory === "practice"
                                            ? t("daily-intention-cat-practice")
                                            : detectedCategory === "goal"
                                            ? t("daily-intention-cat-goal")
                                            : detectedCategory === "both"
                                            ? t("daily-intention-cat-both")
                                            : detectedCategory === "no_xp"
                                            ? t("daily-intention-cat-no_xp")
                                            : t("daily-intention-cat-unclear")
                                        }
                                    </div>
                                    <div className="daily-intention-modal__feedback">
                                        <div className="daily-intention-modal__feedback-header">
                                            <FontAwesomeIcon icon={faLightbulb} /> {t("daily-intention-feedback-title")}
                                        </div>
                                        <p>{aiFeedback}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
