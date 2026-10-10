import { ReactElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { faArrowLeft, faArrowRight, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TranslationNamespaces } from "@/i18n.ts";
import {
    markTourCompleted,
    readTourStep,
    writeTourStep,
    type TourPlacement,
    type TourStep,
} from "@utils/onboardingTour.ts";
import { TourVisualBlock } from "@components/shared/TourVisuals.tsx";
import { Paths } from "@routes/paths.ts";
import type { AgencyWallets } from "@utils/wardrobeUtils.ts";
import "@styles/shared/onboarding-tour.scss";

/** Used only when a caller passes no buddy — the tree and the pills then still have something sane. */
const NO_WALLETS: AgencyWallets = { choiceXP: 0, insightXP: 0, resolveXP: 0 };

interface Props {
    studentId: number | string;
    steps: TourStep[];
    /** Called when the tour finishes or is skipped, for callers that want to react. */
    onClose?: () => void;
    /**
     * Told which step is showing, and told `null` when the overlay goes away.
     *
     * This is how the page behind is made to show what the step describes: the goal picker is the
     * real one, opened read-only, rather than a picture of it. Callers must pass a STABLE callback
     * (`useCallback`) or this fires on every render of the overlay.
     */
    onStepChange?: (step: TourStep | null) => void;
    /** The student's buddy, for the opening introduction step. */
    buddyName?: string;
    buddyImage?: string;
    /** Their current agency wallets, so the growth-tree step can draw their real tree. */
    wallets?: AgencyWallets;
}

/** How much of the page around the target stays lit, so the hole is not flush with the edge. */
const HOLE_PADDING = 8;
const CALLOUT_GAP = 14;
const VIEWPORT_MARGIN = 12;
/** How long to wait for an anchor to appear before giving up and centring the card. */
const ANCHOR_GRACE_MS = 900;

interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}

type Side = "top" | "bottom" | "left" | "right";

/** The first matching element that is actually on screen; hidden alternatives are skipped. */
function findAnchor(selector: string): HTMLElement | null {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
    return nodes.find((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }) ?? null;
}

/**
 * Where the callout goes.
 *
 * The preferred side is a hint, not a decision. Nothing here can know how far down the page an
 * element sits or how tall the text will be in the student's language, so the side is flipped when
 * the preferred one does not fit, and clamped afterwards so it can never leave the viewport.
 */
function placeCallout(rect: Rect, preferred: TourPlacement, cw: number, ch: number, vw: number, vh: number): { top: number; left: number } {
    const m = VIEWPORT_MARGIN;
    const centreX = rect.left + rect.width / 2;
    const centreY = rect.top + rect.height / 2;
    const bottom = rect.top + rect.height;

    const fits: Record<Side, boolean> = {
        top: rect.top - CALLOUT_GAP - ch >= m,
        bottom: bottom + CALLOUT_GAP + ch <= vh - m,
        left: rect.left - CALLOUT_GAP - cw >= m,
        right: rect.left + rect.width + CALLOUT_GAP + cw <= vw - m,
    };

    const opposite: Record<Side, Side> = { top: "bottom", bottom: "top", left: "right", right: "left" };
    let side: Side = preferred === "center" ? "bottom" : preferred;

    if (!fits[side]) {
        const flipped = opposite[side];
        if (fits[flipped]) {
            side = flipped;
        } else {
            // Nothing fits, which happens when the target is bigger than the space around it — a list
            // taller than the window, say. Take the side with the most room instead of the preferred
            // one, so the card covers as little of the target as it can.
            const room: Record<Side, number> = {
                top: rect.top,
                bottom: vh - bottom,
                left: rect.left,
                right: vw - (rect.left + rect.width),
            };
            side = (Object.keys(room) as Side[]).reduce((best, s) => (room[s] > room[best] ? s : best), side);
        }
    }

    let top: number;
    let left: number;

    if (side === "top") { top = rect.top - CALLOUT_GAP - ch; left = centreX - cw / 2; }
    else if (side === "bottom") { top = bottom + CALLOUT_GAP; left = centreX - cw / 2; }
    else if (side === "left") { top = centreY - ch / 2; left = rect.left - CALLOUT_GAP - cw; }
    else { top = centreY - ch / 2; left = rect.left + rect.width + CALLOUT_GAP; }

    return {
        top: Math.max(m, Math.min(top, vh - ch - m)),
        left: Math.max(m, Math.min(left, vw - cw - m)),
    };
}

/**
 * A blocking walkthrough that points at the real thing.
 *
 * The page is dimmed and a lit hole is cut around the element the current step names, so the student
 * reads the sentence while looking at the actual button, panel or picker it is about. Nothing behind
 * is interactive while a step is up — that is the point, and it is also what makes a read-only demo
 * of a real flow safe: the student cannot press anything, so nothing can be written by accident.
 *
 * The hole is painted as a `box-shadow` on a positioned div rather than as four dimming rectangles,
 * which keeps it to one element and lets a border-radius give it a soft edge.
 *
 * The step index lives in sessionStorage because the tour SPANS routes: it walks the student out of
 * the dashboard and into the flexibility training area, which unmounts and remounts this component.
 */
export function OnboardingTour({ studentId, steps, onClose, onStepChange, buddyName = "Pippin", buddyImage, wallets = NO_WALLETS }: Props): ReactElement | null {
    const { t } = useTranslation(TranslationNamespaces.Student);
    const navigate = useNavigate();

    const [index, setIndex] = useState<number>(() => Math.min(readTourStep(), Math.max(steps.length - 1, 0)));
    const [rect, setRect] = useState<Rect | null>(null);
    const [callout, setCallout] = useState<{ width: number; height: number } | null>(null);
    const [viewport, setViewport] = useState<{ w: number; h: number }>(() => ({ w: window.innerWidth, h: window.innerHeight }));
    const [anchorGaveUp, setAnchorGaveUp] = useState(false);
    // The overlay takes ITSELF down, rather than relying on the caller. Some of the pages the tour
    // passes through mount this without an `onClose` to react to, and without this the last step
    // would sit on screen forever after the student pressed Finish.
    const [closed, setClosed] = useState(false);

    const cardRef = useRef<HTMLDivElement>(null);

    const step: TourStep | undefined = steps[index];
    const total = steps.length;
    const isLast = index === total - 1;

    // Keep the stored index in step with the visible one, so a route change resumes in the right
    // place rather than restarting the tour from the beginning.
    useEffect(() => {
        writeTourStep(index);
    }, [index]);

    useEffect(() => {
        onStepChange?.(closed ? null : (step ?? null));
    }, [step, onStepChange, closed]);

    useEffect(() => {
        const el = cardRef.current;
        if (el !== null) el.focus();
    }, [index]);

    // The tour drives the navigation: a step names the route it belongs to, and the student is taken
    // there. Without this the flexibility steps would describe a screen they cannot see.
    useEffect(() => {
        if (step === undefined || window.location.pathname === step.route) return;
        navigate(step.route);
    }, [step, navigate]);

    useEffect(() => {
        function onResize(): void {
            setViewport({ w: window.innerWidth, h: window.innerHeight });
        }
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    // An anchor can be LATE: a modal has to mount, a chart has to draw, a web font has to swap in.
    // Until the grace period is over the overlay simply waits. After it, a missing anchor falls back
    // to a centred card, so a selector that no longer matches can never leave the student staring at
    // a dimmed page with no explanation on it.
    useEffect(() => {
        if (closed) return;
        setAnchorGaveUp(false);
        setRect(null);
        const timer = window.setTimeout(() => setAnchorGaveUp(true), ANCHOR_GRACE_MS);
        return () => window.clearTimeout(timer);
    }, [index, closed]);

    // Watch the anchor instead of measuring once. The target moves when the page scrolls, when the
    // window resizes, and while the content around it settles — all of which happen mid-tour.
    useEffect(() => {
        // A dismissed tour stops watching. Otherwise these intervals keep measuring a page that no
        // longer has a tour on it, for as long as the student stays there.
        if (closed) return;

        const selector = step?.anchor;
        if (selector === undefined) {
            setRect(null);
            return;
        }

        let cancelled = false;

        function measure(): void {
            if (cancelled) return;
            const el = findAnchor(selector as string);
            if (el === null) {
                setRect(null);
                return;
            }
            const r = el.getBoundingClientRect();
            setRect((prev) =>
                prev !== null && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height
                    ? prev
                    : { top: r.top, left: r.left, width: r.width, height: r.height });
        }

        // Bring it into view first — a step about something below the fold is useless — then measure
        // on the next frame, because a smooth scroll has not finished by the time this line returns.
        const target = findAnchor(selector);
        if (target !== null) {
            const r = target.getBoundingClientRect();
            if (r.top < 0 || r.bottom > window.innerHeight) {
                target.scrollIntoView({ block: "center", behavior: "smooth" });
            }
        }

        measure();
        const frame = requestAnimationFrame(measure);
        const timer = window.setInterval(measure, 200);
        window.addEventListener("scroll", measure, true);

        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
            window.clearInterval(timer);
            window.removeEventListener("scroll", measure, true);
        };
    }, [step, closed]);

    // The callout's own size decides where it can sit, and its height depends on the text, which
    // depends on the language. Measured rather than assumed — an assumed height puts the card in the
    // wrong place for exactly the students whose text is longest.
    useLayoutEffect(() => {
        if (closed) return;
        const el = cardRef.current;
        if (el === null) return;

        function measureCard(): void {
            const node = cardRef.current;
            if (node === null) return;
            const r = node.getBoundingClientRect();
            setCallout((prev) =>
                prev !== null && Math.abs(prev.width - r.width) < 1 && Math.abs(prev.height - r.height) < 1
                    ? prev
                    : { width: r.width, height: r.height });
        }

        measureCard();
        const timer = window.setInterval(measureCard, 250);
        return () => window.clearInterval(timer);
    }, [index, rect, viewport, closed]);

    const finish = useCallback((): void => {
        markTourCompleted(studentId);
        setClosed(true);
        onClose?.();

        /**
         * The walkthrough ends on a screen that is NOT part of the app — a read-only stand-in for an
         * exercise that exists only so the tour has something real to point at.
         *
         * A student left there has nothing to do but poke at a demonstration, so finishing puts them
         * back on their dashboard instead of leaving them to find their own way out of a dead end.
         *
         * The destination is named exactly rather than "anywhere that is not the dashboard", because
         * the flexibility list is a legitimate place to be left — a student who skips the tour there
         * may well want to start an exercise.
         */
        if (window.location.pathname === Paths.TourFlexibilityPreviewPath) {
            navigate(Paths.StudentDashboardPath);
        }
    }, [studentId, onClose, navigate]);

    const goTo = useCallback((next: number): void => {
        if (next < 0) return;
        if (next >= steps.length) {
            finish();
            return;
        }
        setIndex(next);
    }, [steps.length, finish]);

    useEffect(() => {
        // A dismissed tour stops listening, or the arrow keys would still be moving an invisible step
        // around behind the student's back.
        if (closed) return;

        function onKeyDown(event: KeyboardEvent): void {
            if (event.key === "Escape") { finish(); return; }
            if (event.key === "ArrowRight" || event.key === "Enter") { event.preventDefault(); goTo(index + 1); return; }
            if (event.key === "ArrowLeft") { event.preventDefault(); goTo(index - 1); }
        }
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [index, goTo, finish, closed]);

    // A lit hole only while the target is actually known. `anchorGaveUp` is what stops the card from
    // being invisible forever when the anchor never turns up.
    // The hole is clamped to the viewport. The exercise list is taller than the window, and an
    // unclamped hole would light the whole screen — the dim would simply disappear and the step
    // would look as though it had stopped working.
    const holeRect = useMemo(() => {
        if (step?.anchor === undefined || rect === null) return null;
        const top = Math.max(0, rect.top - HOLE_PADDING);
        const left = Math.max(0, rect.left - HOLE_PADDING);
        const right = Math.min(viewport.w, rect.left + rect.width + HOLE_PADDING);
        const bottom = Math.min(viewport.h, rect.top + rect.height + HOLE_PADDING);
        if (right - left <= 0 || bottom - top <= 0) return null;
        return { top, left, width: right - left, height: bottom - top };
    }, [step, rect, viewport]);

    const spotlight = holeRect !== null;
    const useCentre = step !== undefined && !spotlight && (step.anchor === undefined || anchorGaveUp);
    const position = useMemo(() => {
        if (callout === null || step === undefined) return null;
        const { w, h } = viewport;
        if (spotlight && rect !== null) {
            return placeCallout(rect, step.placement ?? "bottom", callout.width, callout.height, w, h);
        }
        if (!useCentre) return null;
        return {
            top: Math.max(VIEWPORT_MARGIN, h / 2 - callout.height / 2),
            left: Math.max(VIEWPORT_MARGIN, w / 2 - callout.width / 2),
        };
    }, [callout, step, spotlight, rect, useCentre, viewport]);

    if (closed || step === undefined) return null;

    return (
        <div className={`onboarding-tour${spotlight ? " onboarding-tour--spotlight" : ""}`} role="presentation">
            {holeRect !== null && (
                <div
                    className={"onboarding-tour__hole"}
                    aria-hidden
                    style={{
                        top: holeRect.top,
                        left: holeRect.left,
                        width: holeRect.width,
                        height: holeRect.height,
                    }}
                />
            )}

            <div
                ref={cardRef}
                className={`onboarding-tour__card${step.image === undefined ? "" : " onboarding-tour__card--wide"}`}
                style={{ top: position?.top ?? 0, left: position?.left ?? 0, opacity: position === null ? 0 : 1 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby={`tour-title-${step.id}`}
                tabIndex={-1}
            >
                <button className={"onboarding-tour__close"} onClick={finish} aria-label={t("tour-skip")}>
                    <FontAwesomeIcon icon={faXmark} />
                </button>

                <span className={"onboarding-tour__progress"}>
                    {t("tour-step-count", { current: index + 1, total })}
                </span>

                <h2 id={`tour-title-${step.id}`} className={"onboarding-tour__title"}>
                    {/* `name` is the student's own character. The buddy steps name them, and passing
                        it everywhere costs nothing and avoids a step that renders a raw {{name}}.
                        A step may point the lookup at another namespace instead, which is how the
                        exercise-kind steps get titled with the exercise module's own name for the
                        kind rather than a second copy of it. */}
                    {t(step.title?.key ?? `tour-${step.id}-title`, { name: buddyName, ns: step.title?.ns })}
                </h2>

                {step.visual !== undefined && (
                    <TourVisualBlock
                        visual={step.visual}
                        buddyName={buddyName}
                        buddyImage={buddyImage}
                        wallets={wallets}
                    />
                )}

                {/* The same substitution as the title. The buddy steps introduce the student's own
                    character in the body as well, and without this the sentence opened on an empty
                    gap where the name should be, because a missing value interpolates to "". */}
                <p className={"onboarding-tour__body"}>
                    {t(step.body?.key ?? `tour-${step.id}-body`, { name: buddyName, ns: step.body?.ns })}
                </p>

                {/* Under the explanation on purpose. A picture above the words is a thing to look at;
                    the same picture under them is the answer to what was just read. */}
                {step.image !== undefined && (
                    <img className={"onboarding-tour__image"} src={step.image} alt={""} decoding={"async"} />
                )}

                {step.noteKey !== undefined && <p className={"onboarding-tour__note"}>{t(step.noteKey)}</p>}

                <div className={"onboarding-tour__track"} aria-hidden>
                    <div className={"onboarding-tour__track-fill"} style={{ width: `${((index + 1) / total) * 100}%` }} />
                </div>

                <div className={"onboarding-tour__actions"}>
                    <button className={"onboarding-tour__skip"} onClick={finish}>{t("tour-skip")}</button>
                    {index > 0 && (
                        <button className={"button secondary-button"} onClick={() => goTo(index - 1)}>
                            <FontAwesomeIcon icon={faArrowLeft} /> {t("tour-back")}
                        </button>
                    )}
                    <button className={"button primary-button"} onClick={() => goTo(index + 1)}>
                        {isLast ? t("tour-finish") : t("tour-next")} <FontAwesomeIcon icon={faArrowRight} />
                    </button>
                </div>
            </div>
        </div>
    );
}
