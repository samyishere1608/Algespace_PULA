import { faArrowRight, faBullseye, faChartBar, faLightbulb, faPen, faSpinner, faTimes, faTrophy } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import { requestReflection } from "@utils/goalUtils.ts";

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
    const [hoveredOption, setHoveredOption] = useState<string | null>(null);
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
            const result = await requestReflection(typeof studentId === "number" ? studentId : 1, customText.trim());
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
            <div className="modal-content daily-intention-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onSkip} title={t("dashboard-modal-close")}>
                    <FontAwesomeIcon icon={faTimes} />
                </button>

                {/* ── Buddy header with speech bubble ─────────────────── */}
                <div className="daily-intention-modal__buddy">
                    <div className="daily-intention-modal__buddy-avatar">
                        {buddyImgSrc ? (
                            <img src={buddyImgSrc} alt={buddyName} />
                        ) : (
                            <span className="daily-intention-modal__buddy-emoji">{buddyEmoji}</span>
                        )}
                    </div>
                    <div className="daily-intention-modal__speech">
                        <div className="daily-intention-modal__speech-bubble">
                            <FontAwesomeIcon icon={faLightbulb} className="daily-intention-modal__sparkle" />
                            <h2>{t("daily-intention-greeting", { name: studentName, buddy: buddyName })}</h2>
                        </div>
                        <p className="daily-intention-modal__question">{t("daily-intention-question")}</p>
                    </div>
                </div>

                {/* ── Options grid ────────────────────────────────────── */}
                <div className="daily-intention-modal__options">
                    {!showCustomInput ? (
                        <>
                            <div className="daily-intention-modal__grid">
                                <button
                                    className={`daily-intention-modal__card daily-intention-modal__card--gold${hoveredOption === "practice" ? " daily-intention-modal__card--hover" : ""}`}
                                    onClick={() => handlePresetChoice("practice")}
                                    onMouseEnter={() => setHoveredOption("practice")}
                                    onMouseLeave={() => setHoveredOption(null)}
                                >
                                    <span className="daily-intention-modal__card-icon daily-intention-modal__card-icon--gold">
                                        <FontAwesomeIcon icon={faBullseye} />
                                    </span>
                                    <span className="daily-intention-modal__card-label">{t("daily-intention-practice")}</span>
                                    <span className="daily-intention-modal__card-hint">{t("daily-intention-practice-hint")}</span>
                                    <FontAwesomeIcon icon={faArrowRight} className="daily-intention-modal__card-arrow" />
                                </button>

                                <button
                                    className={`daily-intention-modal__card daily-intention-modal__card--amber${hoveredOption === "goal" ? " daily-intention-modal__card--hover" : ""}`}
                                    onClick={() => handlePresetChoice("goal")}
                                    onMouseEnter={() => setHoveredOption("goal")}
                                    onMouseLeave={() => setHoveredOption(null)}
                                >
                                    <span className="daily-intention-modal__card-icon daily-intention-modal__card-icon--amber">
                                        <FontAwesomeIcon icon={faTrophy} />
                                    </span>
                                    <span className="daily-intention-modal__card-label">{t("daily-intention-goal")}</span>
                                    <span className="daily-intention-modal__card-hint">{t("daily-intention-goal-hint")}</span>
                                    <FontAwesomeIcon icon={faArrowRight} className="daily-intention-modal__card-arrow" />
                                </button>

                                <button
                                    className={`daily-intention-modal__card daily-intention-modal__card--blue${hoveredOption === "review" ? " daily-intention-modal__card--hover" : ""}`}
                                    onClick={() => handlePresetChoice("review")}
                                    onMouseEnter={() => setHoveredOption("review")}
                                    onMouseLeave={() => setHoveredOption(null)}
                                >
                                    <span className="daily-intention-modal__card-icon daily-intention-modal__card-icon--blue">
                                        <FontAwesomeIcon icon={faChartBar} />
                                    </span>
                                    <span className="daily-intention-modal__card-label">{t("daily-intention-review")}</span>
                                    <span className="daily-intention-modal__card-hint">{t("daily-intention-review-hint")}</span>
                                    <FontAwesomeIcon icon={faArrowRight} className="daily-intention-modal__card-arrow" />
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
                                            ? t("daily-intention-cat-noxp")
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
