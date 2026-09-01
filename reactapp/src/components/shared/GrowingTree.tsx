import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "../../i18n.ts";
import "@styles/shared/growing-tree.scss";

// ── Level thresholds (per agency wallet) ────────────────────────────────────
const LEVEL_THRESHOLDS = [0, 50, 150, 400, 800, 1500];

function getLevel(xp: number): number {
    let level = 0;
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
        if (xp >= LEVEL_THRESHOLDS[i]) level = i;
        else break;
    }
    return level;
}

interface Props {
    choiceXP: number;   // → roots
    insightXP: number;  // → branches
    resolveXP: number;  // → fruits
}

// Trunk/branch anchor Y positions for levels 1..5 (higher level = taller tree)
const LEVEL_Y = [0, 150, 134, 118, 102, 86];
const FRUIT_X = [0, 80, 54, 106, 42, 118];

export function GrowingTree({ choiceXP, insightXP, resolveXP }: Props): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Student);

    const rootLevel = getLevel(choiceXP);
    const insightLevel = getLevel(insightXP);
    const resolveLevel = getLevel(resolveXP);

    // Support chain:
    //  - Roots (Choice) hold up the trunk/branches (Insight).
    //  - Branches (Insight) hold up the fruits (Resolve).
    const hasRoots = rootLevel > 0;
    const solidLevel = hasRoots ? Math.min(insightLevel, rootLevel) : 0;  // trunk + solid branches
    const waitingBranches = Math.max(0, insightLevel - solidLevel);        // insight outpacing choice
    const fruitLevel = Math.min(resolveLevel, insightLevel);               // fruits that have a branch
    const waitingFruits = Math.max(0, resolveLevel - fruitLevel);          // resolve outpacing insight

    const trunkTop = LEVEL_Y[solidLevel];
    const groundY = 190;

    const waitingNote =
        !hasRoots && insightLevel > 0 ? t("tree-need-roots")
        : waitingFruits > 0 ? t("tree-need-branches")
        : waitingBranches > 0 ? t("tree-need-roots")
        : t("tree-balanced");

    return (
        <div className={"growing-tree"}>
            <div className={"growing-tree__title"}>{t("tree-title")}</div>

            <svg className={"growing-tree__svg"} viewBox="0 0 160 220" xmlns="http://www.w3.org/2000/svg">
                {/* ── Ground ───────────────────────────────────────── */}
                <ellipse cx="80" cy={groundY} rx="76" ry="17" fill="#0a1f11" />
                <ellipse cx="80" cy={groundY - 4} rx="72" ry="13" fill="#133320" />
                <ellipse cx="80" cy={groundY - 8} rx="68" ry="10" fill="#1a4a27" />

                <g className={solidLevel > 0 ? "gt-tree-sway" : "gt-sprout-bob"}>
                    {/* ── Roots (Choice XP) ─────────────────────────── */}
                    {rootLevel === 0 && (
                        <ellipse cx="80" cy={groundY - 3} rx="6" ry="3.5" fill="#795548" />
                    )}
                    {rootLevel >= 1 && (
                        <path d={`M72 ${groundY - 4} Q58 ${groundY + 8} 42 ${groundY + 3}`} stroke="#5d4037" strokeWidth="3" fill="none" strokeLinecap="round" />
                    )}
                    {rootLevel >= 2 && (
                        <path d={`M88 ${groundY - 4} Q102 ${groundY + 8} 118 ${groundY + 3}`} stroke="#5d4037" strokeWidth="3" fill="none" strokeLinecap="round" />
                    )}
                    {rootLevel >= 3 && (
                        <path d={`M74 ${groundY - 2} Q64 ${groundY + 12} 50 ${groundY + 11}`} stroke="#4e342e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    )}
                    {rootLevel >= 4 && (
                        <path d={`M86 ${groundY - 2} Q96 ${groundY + 12} 110 ${groundY + 11}`} stroke="#4e342e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    )}
                    {rootLevel >= 5 && (
                        <>
                            <path d={`M70 ${groundY - 6} Q56 ${groundY + 5} 40 ${groundY + 8}`} stroke="#3e2723" strokeWidth="2" fill="none" strokeLinecap="round" />
                            <path d={`M90 ${groundY - 6} Q104 ${groundY + 5} 120 ${groundY + 8}`} stroke="#3e2723" strokeWidth="2" fill="none" strokeLinecap="round" />
                        </>
                    )}

                    {/* ── Trunk (Insight, gated by roots) ──────────── */}
                    {solidLevel > 0 && (
                        <>
                            <rect x="74" y={trunkTop} width="12" height={groundY - 4 - trunkTop} rx="6" fill="#6d4c41" />
                            <rect x="77" y={trunkTop} width="6" height={groundY - 4 - trunkTop} rx="3" fill="#8d6e63" opacity="0.35" />
                        </>
                    )}

                    {/* ── Branches (Insight XP) ─────────────────────── */}
                    {hasRoots ? (
                        Array.from({ length: insightLevel }).map((_, i) => {
                            const lvl = i + 1;
                            const y = LEVEL_Y[Math.min(lvl, 5)];
                            const isSolid = lvl <= solidLevel;
                            return (
                                <g key={lvl}>
                                    <line
                                        x1="80" y1={y} x2={isSolid ? 52 : 58} y2={y - 10}
                                        stroke={isSolid ? "#5d4037" : "rgba(255,255,255,0.25)"}
                                        strokeWidth={isSolid ? 5 : 3}
                                        strokeLinecap="round"
                                        strokeDasharray={isSolid ? undefined : "3 4"}
                                    />
                                    <line
                                        x1="80" y1={y} x2={isSolid ? 108 : 102} y2={y - 10}
                                        stroke={isSolid ? "#5d4037" : "rgba(255,255,255,0.25)"}
                                        strokeWidth={isSolid ? 5 : 3}
                                        strokeLinecap="round"
                                        strokeDasharray={isSolid ? undefined : "3 4"}
                                    />
                                </g>
                            );
                        })
                    ) : insightLevel > 0 ? (
                        <line
                            x1="80" y1={groundY - 6} x2="80" y2={groundY - 24}
                            stroke="rgba(255,255,255,0.28)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 4"
                        />
                    ) : null}

                    {/* ── Canopy (Insight XP) ───────────────────────── */}
                    {solidLevel > 0 && (
                        <g className="gt-canopy-breathe">
                            {/* wide outer leaves */}
                            <circle cx={52 - solidLevel} cy={trunkTop + 4} r={13 + solidLevel * 3} fill="#1b5e20" />
                            <circle cx={108 + solidLevel} cy={trunkTop + 4} r={13 + solidLevel * 3} fill="#1b5e20" />
                            <circle cx="80" cy={trunkTop - 6} r={15 + solidLevel * 4} fill="#2e7d32" />
                            {/* mid leaves */}
                            <circle cx="63" cy={trunkTop - 12} r={11 + solidLevel * 3} fill="#388e3c" />
                            <circle cx="97" cy={trunkTop - 12} r={11 + solidLevel * 3} fill="#2e7d32" />
                            {/* upper leaves + highlights */}
                            <circle cx="80" cy={trunkTop - 20} r={9 + solidLevel * 3} fill="#43a047" />
                            <circle cx="70" cy={trunkTop - 18} r={6 + solidLevel} fill="#66bb6a" opacity="0.75" />
                            <circle cx="90" cy={trunkTop - 14} r={6 + solidLevel} fill="#4caf50" opacity="0.6" />
                        </g>
                    )}

                    {/* ── Fruits (Resolve XP) ────────────────────────── */}
                    {resolveLevel > 0 && (
                        <g>
                            {Array.from({ length: resolveLevel }).map((_, i) => {
                                const lvl = i + 1;
                                const isSolid = lvl <= fruitLevel;
                                if (!isSolid) {
                                    // Waiting fruit → bud piled at the base
                                    return (
                                        <circle
                                            key={`bud-${lvl}`}
                                            className="gt-flower"
                                            cx={66 + (i % 2) * 28}
                                            cy={groundY - 8 - Math.floor(i / 2) * 11}
                                            r="4"
                                            fill="#ef476f"
                                            opacity="0.6"
                                        />
                                    );
                                }
                                const x = FRUIT_X[lvl];
                                const y = LEVEL_Y[Math.min(lvl, 5)] - 14;
                                return (
                                    <g key={`fruit-${lvl}`}>
                                        <line x1={x} y1={y - 6} x2={x} y2={y - 10} stroke="#4caf50" strokeWidth="1.5" strokeLinecap="round" />
                                        <circle cx={x} cy={y} r="7" fill="#ef476f" />
                                        <circle cx={x - 2} cy={y - 2} r="2" fill="#ff8fa3" />
                                    </g>
                                );
                            })}
                        </g>
                    )}
                </g>
            </svg>

            {/* ── Legend ────────────────────────────────────────────── */}
            <div className={"growing-tree__legend"}>
                <div className={"growing-tree__legend-item"}>
                    <span className={"growing-tree__legend-dot growing-tree__legend-dot--roots"} />
                    <span>{t("tree-roots")}</span>
                    <strong>{choiceXP}</strong>
                </div>
                <div className={"growing-tree__legend-item"}>
                    <span className={"growing-tree__legend-dot growing-tree__legend-dot--branches"} />
                    <span>{t("tree-branches")}</span>
                    <strong>{insightXP}</strong>
                </div>
                <div className={"growing-tree__legend-item"}>
                    <span className={"growing-tree__legend-dot growing-tree__legend-dot--fruits"} />
                    <span>{t("tree-fruits")}</span>
                    <strong>{resolveXP}</strong>
                </div>
            </div>

            <div className={"growing-tree__next"}>
                <span className={"growing-tree__hint"}>{waitingNote}</span>
            </div>
        </div>
    );
}
