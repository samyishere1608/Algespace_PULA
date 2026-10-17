import { faChartBar, faLightbulb, faMagic, faRightFromBracket, faRobot, faSpinner, faStar, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import i18n from "@/i18n.ts";
import { awardChoiceForDayReflection } from "@utils/choiceAwards.ts";
import axios from "axios";

const BACKEND = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:7273";

interface Props {
    studentId: number | string;
    onEndSession: () => void;
    onClose: () => void;
    /**
     * Hands off to the guided session reflection, which the dashboard owns.
     *
     * It is the only way to reflect here now. It asks two questions the server has built from the day's
     * own exercises, and the second of them is the promise tomorrow's intention is checked against —
     * neither of which a free-text box could do.
     */
    onStartSessionReflection: () => void;
}

interface AnalysisResult {
    strengths: string;
    improvement: string;
    actionSteps: string[];
    isAiGenerated: boolean;
}

export function EndSessionModal({ studentId, onEndSession, onClose, onStartSessionReflection }: Props): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Student);
    const [showReflection, setShowReflection] = useState(false);
    const [reflectionMode, setReflectionMode] = useState<"ai" | null>(null);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    async function handleAiAnalyze(): Promise<void> {
        setAiLoading(true);
        try {
            const { data } = await axios.get<AnalysisResult>(`${BACKEND}/student-progress/analyze-session/${studentId}?language=${i18n.language?.slice(0, 2) ?? "en"}`);
            setAnalysis(data);
        } catch {
            setAnalysis({
                strengths: "You showed up and put in the work today. That's what matters most!",
                improvement: "Keep showing up consistently. Growth happens one session at a time.",
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
                            <button className="ess-choice-card" onClick={() => { awardChoiceForDayReflection(studentId); setShowReflection(true); }}>
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
                            {/* The guided reflection and the summary, and only those two.
                                A third card used to sit between them where the student typed a note in
                                their own words and the model replied to it. It is gone: it was the only
                                free text left in the student area, its reply could disagree with anything
                                else the app had recorded, and the guided reflection asks the same
                                question — what stood out today — with answers that are checkable and
                                that the next session actually uses. The summary stays because it reads
                                the day's own numbers rather than asking the student to produce anything. */}
                            <button className="ess-reflect-card" onClick={onStartSessionReflection}>
                                <span className="ess-reflect-card__icon"><FontAwesomeIcon icon={faStar} /></span>
                                <span className="ess-reflect-card__title">{t("end-session-reflect-guided")}</span>
                                <span className="ess-reflect-card__desc">{t("end-session-reflect-guided-desc")}</span>
                            </button>
                            <button className="ess-reflect-card" onClick={() => { setReflectionMode("ai"); handleAiAnalyze(); }}>
                                <span className="ess-reflect-card__icon"><FontAwesomeIcon icon={faRobot} /></span>
                                <span className="ess-reflect-card__title">{t("end-session-reflect-ai")}</span>
                                <span className="ess-reflect-card__desc">{t("end-session-reflect-ai-desc")}</span>
                            </button>
                        </div>
                        <button className="ess-action-btn ess-action-btn--ghost" onClick={() => setShowReflection(false)}>{t("end-session-back")}</button>
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
                                    <button className="button primary-button" onClick={onEndSession}>{t("end-session-finish")}</button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
