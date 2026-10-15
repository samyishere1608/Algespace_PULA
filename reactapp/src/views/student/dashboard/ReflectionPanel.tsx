import { ReactElement } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import type { ReflectionPanel } from "@utils/reflectionUtils.ts";

/**
 * The record, beside the question.
 *
 * WHY IT IS HERE. Every question in the reflection is decided by the record, and every chip is answered
 * from memory with the record off screen. So the app asks the student to recall exactly the thing it has
 * already decided not to trust their recall for, and "Pippin, tell me" is a student admitting they cannot
 * answer without the data. This panel closes that gap without closing the question: it shows a DIFFERENT
 * slice of the record than the chips are about, so there is real evidence to reason with and still
 * nothing to read the answer off.
 *
 * WHICH IS WHY IT IS SPOKEN, NOT TABULATED. An eleven-year-old is the reader. A labelled grid of numbers
 * reads as a report to be interpreted; "Working it out took 7 seconds" reads as something the companion
 * noticed. Same data, and the numbers are the student's own in both cases — but only one of them is a
 * thing a child can act on. Everything here is a sentence or a shape, and nothing is an axis.
 *
 * The server decides what is safe to send (see `HiddenFacts` in the bank); this file decides how it is
 * said. Nothing is computed here, so a fact the server withheld cannot appear by accident.
 */
export default function ReflectionPanelView({ panel, itemType }: {
    panel: ReflectionPanel | null | undefined;
    /** "goal" | "exercise" | "session" — decides how the subject line is worded, nothing else. */
    itemType: string;
}): ReactElement | null {
    const { t } = useTranslation(TranslationNamespaces.Student);

    if (!panel || !panelHasContent(panel)) return null;

    const hasMethod = panel.methodLabelKey.length > 0;
    const hasPhases = panel.phases.length > 0;
    const hasSplit = panel.runs.length > 1;
    const hasTotal = panel.mistakes !== null && !hasSplit;
    const hasHints = panel.hints !== null;

    // Relative to the longest phase, so the biggest is the full width of the track. The number beside each
    // bar is what the comparison is actually read from; the bar is what makes it visible at a glance.
    const longest = hasPhases ? Math.max(...panel.phases.map((phase) => phase.seconds)) : 0;

    // One exercise is a thing you solved; a goal is something you practised. The subject is a single label
    // either way and the sentence around it differs, which is why it is two keys rather than one.
    const subjectKey = itemType === "goal" ? "reflection-panel-goal-subject" : "reflection-panel-method";

    return (
        <aside className="reflection-panel" aria-label={t("reflection-panel-title")}>
            <div className="reflection-panel__head">
                <FontAwesomeIcon icon={faMagnifyingGlass} />
                <span>{t("reflection-panel-title")}</span>
            </div>

            {hasMethod && (
                <p className="reflection-panel__line">
                    {t(subjectKey, { subject: t(panel.methodLabelKey), method: t(panel.methodLabelKey) })}
                </p>
            )}

            {hasPhases && (
                <div className="reflection-panel__phases">
                    {panel.phases.map((phase) => (
                        <div className="reflection-phase" key={phase.labelKey}>
                            <span className="reflection-phase__name">{t(phase.labelKey)}</span>
                            <span className="reflection-phase__track">
                                <span
                                    className="reflection-phase__fill"
                                    style={{ width: `${longest > 0 ? Math.max((phase.seconds / longest) * 100, 4) : 0}%` }}
                                />
                            </span>
                            <span className="reflection-phase__time">{formatSeconds(t, phase.seconds)}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* One exercise reads as a sentence; a goal's window reads as one sentence about the whole
                window, unless the question allows the run-by-run split, in which case it becomes circles.
                The split is the part that says which runs went clean, so a question that grades on that
                gets the total only. */}
            {hasTotal && (
                <p className="reflection-panel__line reflection-panel__line--fact">
                    {panel.mistakes === 0
                        ? t("reflection-panel-no-mistakes")
                        : t(panel.runCount > 1 ? "reflection-panel-mistakes-total" : "reflection-panel-mistakes",
                            { count: panel.mistakes ?? 0 })}
                </p>
            )}

            {hasSplit && (
                <div className="reflection-panel__runs">
                    <div className="reflection-runs">
                        {panel.runs.map((run) => (
                            <div className="reflection-run" key={run.position}>
                                <span className={`reflection-run__bubble${run.mistakes === 0 ? " reflection-run__bubble--clean" : ""}`}>
                                    {run.mistakes}
                                </span>
                                <span className="reflection-run__order">{run.position}</span>
                            </div>
                        ))}
                    </div>
                    <p className="reflection-panel__key">{t("reflection-panel-runs-key")}</p>
                </div>
            )}

            {hasHints && (
                <p className="reflection-panel__line reflection-panel__line--fact">
                    {panel.hints === 0
                        ? t("reflection-panel-no-hints")
                        : t("reflection-panel-hints", { count: panel.hints ?? 0 })}
                </p>
            )}

            {/* A promise, not a hole. A child who cannot see the number assumes it is bad news, and the
                honest sentence — that it is coming, after they answer — is also the one that makes
                answering worth doing. */}
            {panel.heldBack && (
                <p className="reflection-panel__held">
                    <FontAwesomeIcon icon={faLock} />
                    <span>{t("reflection-panel-held-back")}</span>
                </p>
            )}
        </aside>
    );
}

/**
 * Whether the panel has anything to say.
 *
 * Exported so the dialog can decide whether to widen for it. The two decisions have to agree: a modal
 * that grew a column for an empty card would leave a blank stripe down one side, and a panel that
 * rendered inside a modal that had not widened would push the conversation off centre.
 */
export function panelHasContent(panel: ReflectionPanel | null | undefined): boolean {
    if (!panel) return false;

    return panel.methodLabelKey.length > 0
        || panel.phases.length > 0
        || panel.runs.length > 0
        || panel.mistakes !== null
        || panel.hints !== null
        || panel.heldBack;
}

/**
 * A phase's time as words rather than a measurement.
 *
 * Seconds under a minute, whole minutes above it: "7 seconds" is a thing a child can picture and
 * "6.93 s" is not, and past a minute the seconds stop mattering to anyone reading a bar chart. The
 * rounding is the point — a precise number implies a precision the student has no use for, and it
 * invites them to do arithmetic with it instead of looking at the shape.
 */
function formatSeconds(t: (key: string, options?: Record<string, unknown>) => string, seconds: number): string {
    if (seconds < 60) return t("reflection-panel-seconds", { count: Math.max(1, Math.round(seconds)) });

    return t("reflection-panel-minutes", { count: Math.max(1, Math.round(seconds / 60)) });
}
