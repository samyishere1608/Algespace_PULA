import { ReactElement, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "@/i18n.ts";
import type { ReflectionPanel } from "@utils/reflectionUtils.ts";

/**
 * The dashboard above the reflection questions.
 *
 * A STILL PICTURE, NOT A CONTROL. Nothing here is tapped. Its job is to put the four numbers the three
 * questions are about on one surface - mistakes, hints, time and the decisions the student made - so an
 * answer can be checked against their own record instead of guessed at.
 *
 * ONE PLATE, FOUR SECTIONS. The sections share a single surface and are told apart by their colour and
 * their own headline number, not by being four separate boxes: four floating cards read as four unrelated
 * facts, while these questions always ask the student to weigh one number against another ("this part
 * cost the most, why?"), so they have to be on the same page.
 *
 * WHY EVERY BAR IS PRINTED WITH ITS VALUE. A bar alone asks the student to estimate a length; a bar with
 * its number beside it asks them to read. The comparison a question makes is then something they can
 * confirm with their own eyes rather than infer from a proportion.
 */
export default function ReflectionPanelView({ panel, itemType, itemLabel }: {
    panel: ReflectionPanel | null | undefined;
    /** "goal" | "exercise" | "session"; only decides the fallback headline when no method is named. */
    itemType: string;
    /** The completed item's own name, used for the headline when the panel cannot name a method. */
    itemLabel?: string;
}): ReactElement | null {
    const { t } = useTranslation(TranslationNamespaces.Student);

    if (!panel || !panelHasContent(panel)) return null;

    /** Seconds as the shortest thing that is still exact: "48s", "2m 5s", "7m". */
    const clock = (seconds: number): string => {
        const total = Math.round(seconds);
        if (total < 60) return t("r-dash-clock-sec", { n: total });

        const minutes = Math.floor(total / 60);
        const rest = total % 60;
        return rest === 0
            ? t("r-dash-clock-min-only", { m: minutes })
            : t("r-dash-clock-min", { m: minutes, s: rest });
    };

    // One row per exercise when the item covered several, otherwise one row per step of the method. The
    // split is the whole point of the bars, so a goal with a single run falls back to its steps.
    const perRun = panel.runs.length > 1;
    const rows: DashRow[] = perRun
        ? panel.runs.map((run) => ({
            key: `run-${run.position}`,
            label: t("reflection-dash-exercise", { n: run.position }),
            mistakes: run.mistakes,
            hints: run.hints,
            seconds: run.seconds,
        }))
        : panel.phases.map((phase) => ({
            key: phase.labelKey,
            label: t(phase.labelKey),
            mistakes: phase.mistakes,
            hints: phase.hints,
            seconds: phase.seconds,
        }));

    const totalSeconds = rows.reduce((sum, row) => sum + row.seconds, 0);
    const sections: ReactElement[] = [];

    if (panel.mistakes !== null) {
        sections.push(
            <Section key="mistakes" tone="mistakes" label={t("r-dash-mistakes")} value={String(panel.mistakes)} caption={t("r-dash-in-total")}>
                <Bars rows={rows} pick={(row) => row.mistakes} format={String} tone="mistakes" />
            </Section>,
        );
    }

    if (panel.hints !== null) {
        sections.push(
            <Section key="hints" tone="hints" label={t("r-dash-hints")} value={String(panel.hints)} caption={t("r-dash-in-total")}>
                <Bars rows={rows} pick={(row) => row.hints} format={String} tone="hints" />
            </Section>,
        );
    }

    if (totalSeconds > 0) {
        sections.push(
            <Section key="time" tone="time" label={t("r-dash-time")} value={clock(totalSeconds)} caption={t("r-dash-in-total")}>
                <Bars rows={rows} pick={(row) => row.seconds} format={clock} tone="time" />
                {/* What "quicker than usual" is measured against. The reason chips on the next question
                    offer "I was in a hurry", and a student can only check that claim if the usual is on
                    screen with the rest of their times. */}
                {panel.usualSeconds
                    ? <p className="rdash__note">{t("r-dash-usual", { time: clock(panel.usualSeconds) })}</p>
                    : null}
            </Section>,
        );
    }

    if (panel.decisions.length > 0) {
        // How many of the recorded steps the student did themselves. Counted rather than described so this
        // section has a headline number like the other three, and so a skipped step shows up as a fraction
        // instead of having to be spotted in the rows below.
        //
        // A goal's rows are counts across its exercises rather than two yes/no steps, so the fraction is
        // read from the calculating row: whichever way it names the majority, the number of exercises
        // they worked out themselves is the same figure the other way round.
        const calculating = panel.decisions.find((decision) => decision.labelKey === "reflection-decision-calculating");
        const counted = calculating !== undefined && calculating.total > 1;
        const own = counted
            ? (calculating.icon === "own" ? calculating.count : calculating.total - calculating.count)
            : panel.decisions.filter((decision) => decision.icon !== "skipped" && decision.icon !== "app").length;
        const steps = counted ? calculating.total : panel.decisions.length;

        sections.push(
            <Section
                key="steps"
                tone="steps"
                label={t("r-dash-decisions")}
                value={`${own}/${steps}`}
                caption={t("r-dash-steps-done")}
            >
                <ul className="rdash__steps">
                    {panel.decisions.map((decision) => (
                        <li key={decision.labelKey} className={`rdash__step rdash__step--${decision.icon}`}>
                            <span className="rdash__step-name">{t(decision.labelKey)}</span>
                            <span className="rdash__step-value">
                                {/* A goal covers several exercises, so "I skipped it" has to say how many:
                                    one skip and three read as the same row otherwise, and that difference
                                    is the whole point of the compare goal's own question. */}
                                {decision.total > 1
                                    ? t(`${decision.valueKey}-count`, { count: decision.count, total: decision.total })
                                    : t(decision.valueKey)}
                            </span>
                        </li>
                    ))}
                </ul>
            </Section>,
        );
    }

    const subject = panel.methodLabelKey.length > 0
        ? t(panel.methodLabelKey)
        : itemType === "goal" ? (itemLabel ?? "") : "";
    const pill = perRun
        ? panel.countedRuns && panel.countedRuns > panel.runs.length
            // The window is capped, so the plate says which part of the goal it is showing rather than
            // naming five exercises as if they were all of them.
            ? t("r-dash-pill-runs-window", { n: panel.runs.length, total: panel.countedRuns })
            : t("r-dash-pill-runs", { n: panel.runs.length })
        : panel.phases.length > 0 ? t("r-dash-pill-parts", { n: panel.phases.length }) : "";

    return (
        <section className="rdash" aria-label={t("reflection-dash-title")}>
            <header className="rdash__head">
                <div>
                    <span className="rdash__eyebrow">{t("reflection-dash-title")}</span>
                    {subject.length > 0 && <h4 className="rdash__headline">{subject}</h4>}
                </div>
                {pill.length > 0 && <span className="rdash__pill">{pill}</span>}
            </header>

            <div className="rdash__grid" data-sections={sections.length}>
                {sections}
            </div>
        </section>
    );
}

interface DashRow {
    key: string;
    label: string;
    mistakes: number;
    hints: number;
    seconds: number;
}

function Section({ tone, label, value, caption, children }: {
    tone: "mistakes" | "hints" | "time" | "steps";
    label: string;
    value: string;
    caption: string;
    children: ReactNode;
}): ReactElement {
    return (
        <div className={`rdash__sec rdash__sec--${tone}`}>
            <p className="rdash__label">{label}</p>
            <p className="rdash__stat">
                <span className="rdash__value">{value}</span>
                <span className="rdash__caption">{caption}</span>
            </p>
            {children}
        </div>
    );
}

/**
 * One horizontal bar per row, all measured against the largest value in the section.
 *
 * Each section is scaled on its own rather than on a shared axis, because the three numbers are not
 * comparable - five mistakes and five minutes are not the same size of thing. What the bars are for is
 * showing which PART is the big one, and that only holds within a section.
 */
function Bars({ rows, pick, format, tone }: {
    rows: DashRow[];
    pick: (row: DashRow) => number;
    format: (value: number) => string;
    tone: "mistakes" | "hints" | "time";
}): ReactElement | null {
    if (rows.length === 0) return null;

    const scale = Math.max(1, ...rows.map(pick));

    return (
        <ul className="rdash__rows">
            {rows.map((row) => {
                const value = pick(row);
                const width = value > 0 ? Math.max(6, (value / scale) * 100) : 0;

                return (
                    <li key={row.key} className="rdash__row">
                        <span className="rdash__row-label">{row.label}</span>
                        <span className="rdash__row-value">{format(value)}</span>
                        <span className="rdash__track">
                            <span className={`rdash__fill rdash__fill--${tone}`} style={{ width: `${width}%` }} />
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}

/** Whether the dashboard has anything to draw, so the dialog only makes room for a real one. */
export function panelHasContent(panel: ReflectionPanel | null | undefined): boolean {
    if (!panel) return false;

    return panel.methodLabelKey.length > 0
        || panel.phases.length > 0
        || panel.runs.length > 0
        || panel.mistakes !== null
        || panel.hints !== null
        || panel.decisions.length > 0;
}
