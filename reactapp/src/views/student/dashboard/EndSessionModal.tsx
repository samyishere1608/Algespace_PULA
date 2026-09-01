import { faChartBar, faLightbulb, faMagic, faPen, faRightFromBracket, faRobot, faSpinner, faStar, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import { requestReflection } from "@utils/goalUtils.ts";
import axios from "axios";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:7273";

interface Props {
    studentId: number | string;
    onEndSession: () => void;
    onClose: () => void;
}

interface AnalysisResult {
    strengths: string;
    improvement: string;
    actionSteps: string[];
    isAiGenerated: boolean;
}

export function EndSessionModal({ studentId, onEndSession, onClose }: Props): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Student);
    const [showReflection, setShowReflection] = useState(false);
    const [reflectionMode, setReflectionMode] = useState<"free" | "ai" | null>(null);
    const [customText, setCustomText] = useState("");
    const [aiFeedback, setAiFeedback] = useState("");
    const [feedbackCategory, setFeedbackCategory] = useState("");
    const [freeLoading, setFreeLoading] = useState(false);
    const [showGibberishRetry, setShowGibberishRetry] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    async function handleFreeSubmit(): Promise<void> {
        if (!customText.trim()) return;
        setFreeLoading(true);
        setAiFeedback("");
        setShowGibberishRetry(false);
        try {
            const result = await requestReflection(typeof studentId === "number" ? studentId : 1, customText.trim());
            setAiFeedback(result.feedback);
            setFeedbackCategory(result.category ?? "unclear");
            if (result.category === "no_xp") setShowGibberishRetry(true);
        } catch {
            setAiFeedback(t("daily-intention-feedback-fallback"));
            setFeedbackCategory("unclear");
        } finally {
            setFreeLoading(false);
        }
    }

    function handleRetryGibberish(): void {
        setShowGibberishRetry(false);
        setAiFeedback("");
        setFeedbackCategory("unclear");
    }

    async function handleAiAnalyze(): Promise<void> {
        setAiLoading(true);
        try {
            const { data } = await axios.get<AnalysisResult>(`${BACKEND}/student-progress/analyze-session/${studentId}`);
            setAnalysis(data);
        } catch {
            setAnalysis({
                strengths: "You showed up and put in the work today — that's what matters most!",
                improvement: "Keep showing up consistently — growth happens one session at a time.",
                actionSteps: ["Set one small goal before your next session.", "Try an exercise type you haven't done much of.", "Take a moment to reflect after each exercise."],
                isAiGenerated: false,
            });
        } finally {
            setAiLoading(false);
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content end-session-modal">
                <button className="modal-close" onClick={onClose} title={t("dashboard-modal-close")}>
                    <FontAwesomeIcon icon={faTimes} />
                </button>

                <div className="end-session-modal__header">
                    <FontAwesomeIcon icon={faStar} className="end-session-modal__header-icon" />
                    <h2>{t("end-session-title")}</h2>
                    <p>{t("end-session-subtitle")}</p>
                </div>

                {!showReflection ? (
                    <div className="end-session-modal__choice">
                        <h3 className="end-session-modal__choice-title">{t("end-session-what-next")}</h3>
                        <div className="end-session-modal__choice-cards">
                            <button className="ess-choice-card" onClick={() => setShowReflection(true)}>
                                <span className="ess-choice-card__icon ess-choice-card__icon--cyan"><FontAwesomeIcon icon={faMagic} /></span>
                                <span className="ess-choice-card__title">{t("end-session-reflect-session")}</span>
                                <span className="ess-choice-card__desc">{t("end-session-reflect-session-desc")}</span>
                            </button>
                            <button className="ess-choice-card" onClick={onEndSession}>
                                <span className="ess-choice-card__icon ess-choice-card__icon--pink"><FontAwesomeIcon icon={faRightFromBracket} /></span>
                                <span className="ess-choice-card__title">{t("end-session-end-now")}</span>
                                <span className="ess-choice-card__desc">{t("end-session-end-now-desc")}</span>
                            </button>
                        </div>
                    </div>
                ) : !reflectionMode ? (
                    <div className="end-session-modal__reflect-options">
                        <h3>{t("end-session-reflect-title")}</h3>
                        <div className="end-session-modal__reflect-cards">
                            <button className="ess-reflect-card" onClick={() => setReflectionMode("free")}>
                                <span className="ess-reflect-card__icon"><FontAwesomeIcon icon={faPen} /></span>
                                <span className="ess-reflect-card__title">{t("end-session-reflect-free")}</span>
                                <span className="ess-reflect-card__desc">{t("end-session-reflect-free-desc")}</span>
                            </button>
                            <button className="ess-reflect-card" onClick={() => { setReflectionMode("ai"); handleAiAnalyze(); }}>
                                <span className="ess-reflect-card__icon"><FontAwesomeIcon icon={faRobot} /></span>
                                <span className="ess-reflect-card__title">{t("end-session-reflect-ai")}</span>
                                <span className="ess-reflect-card__desc">{t("end-session-reflect-ai-desc")}</span>
                            </button>
                        </div>
                        <button className="ess-action-btn ess-action-btn--ghost" onClick={() => setShowReflection(false)}>{t("end-session-back")}</button>
                    </div>
                ) : reflectionMode === "free" ? (
                    <div className="end-session-modal__free-reflect">
                        <textarea className="end-session-modal__free-input" value={customText} onChange={(e) => setCustomText(e.target.value)} placeholder={t("end-session-reflect-placeholder")} rows={4} maxLength={500} autoFocus disabled={freeLoading} />
                        {showGibberishRetry ? (
                            <div className="end-session-modal__free-actions">
                                <button className="button secondary-button" onClick={handleRetryGibberish}>{t("daily-intention-retry")}</button>
                                <button className="button danger-button" onClick={onEndSession}>{t("daily-intention-skip-anyway")}</button>
                            </div>
                        ) : (
                            <div className="end-session-modal__free-actions">
                                <button className="button secondary-button" onClick={() => setReflectionMode(null)}>{t("daily-intention-back")}</button>
                                <button className="button primary-button" onClick={handleFreeSubmit} disabled={!customText.trim() || freeLoading}>
                                    {freeLoading ? <><FontAwesomeIcon icon={faSpinner} spin /> {t("daily-intention-analyzing")}</> : t("end-session-submit-reflection")}
                                </button>
                            </div>
                        )}
                        {aiFeedback && !showGibberishRetry && (
                            <div className="end-session-modal__free-result">
                                <div className={`end-session-modal__feedback-cat end-session-modal__feedback-cat--${feedbackCategory}`}><span className="end-session-modal__feedback-dot" />{t(`daily-intention-cat-${feedbackCategory}`)}</div>
                                <p>{aiFeedback}</p>
                                <button className="button primary-button" onClick={onEndSession}>{t("daily-intention-close")}</button>
                            </div>
                        )}
                        {aiFeedback && showGibberishRetry && (
                            <div className="end-session-modal__free-result">
                                <div className="end-session-modal__feedback-cat end-session-modal__feedback-cat--no_xp"><span className="end-session-modal__feedback-dot" />{t("daily-intention-cat-no_xp")}</div>
                                <p>{aiFeedback}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="end-session-modal__ai-result">
                        {aiLoading ? (
                            <div className="end-session-modal__ai-loading"><FontAwesomeIcon icon={faSpinner} spin /><span>{t("end-session-analyzing")}</span></div>
                        ) : analysis && (
                            <>
                                <div className="ess-analysis-block ess-analysis-block--strength">
                                    <span className="ess-analysis-block__label"><FontAwesomeIcon icon={faStar} /> {t("end-session-strengths")}</span>
                                    <p>{analysis.strengths}</p>
                                </div>
                                <div className="ess-analysis-block ess-analysis-block--improve">
                                    <span className="ess-analysis-block__label"><FontAwesomeIcon icon={faLightbulb} /> {t("end-session-improvement")}</span>
                                    <p>{analysis.improvement}</p>
                                </div>
                                <div className="ess-analysis-block ess-analysis-block--actions">
                                    <span className="ess-analysis-block__label"><FontAwesomeIcon icon={faChartBar} /> {t("end-session-next-steps")}</span>
                                    <ul>{analysis.actionSteps.map((step, i) => <li key={i}>{step}</li>)}</ul>
                                </div>
                                <div className="end-session-modal__ai-footer">
                                    {!analysis.isAiGenerated && <span className="end-session-modal__ai-fallback-note">{t("end-session-fallback-note")}</span>}
                                    <button className="button primary-button" onClick={onEndSession}>{t("daily-intention-close")}</button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
