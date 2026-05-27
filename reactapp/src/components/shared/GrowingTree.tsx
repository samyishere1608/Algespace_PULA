import { ReactElement } from "react";
import "@styles/shared/growing-tree.scss";

interface StageInfo {
    name: string;
    xpRequired: number;
}

const STAGES: StageInfo[] = [
    { name: "Seed",         xpRequired: 0    },
    { name: "Sprout",       xpRequired: 50   },
    { name: "Sapling",      xpRequired: 150  },
    { name: "Seedling",     xpRequired: 400  },
    { name: "Young Tree",   xpRequired: 800  },
    { name: "Full Tree",    xpRequired: 1500 },
    { name: "Ancient Tree", xpRequired: 3000 },
];

function getStageIndex(xp: number): number {
    let idx = 0;
    for (let i = 0; i < STAGES.length; i++) {
        if (xp >= STAGES[i].xpRequired) idx = i;
        else break;
    }
    return idx;
}

export function GrowingTree({ xp }: { xp: number }): ReactElement {
    const stageIdx = getStageIndex(xp);
    const stage = STAGES[stageIdx];
    const nextStage = stageIdx < STAGES.length - 1 ? STAGES[stageIdx + 1] : null;
    const xpForNext = nextStage ? nextStage.xpRequired - xp : 0;
    const progressToNext = nextStage
        ? ((xp - stage.xpRequired) / (nextStage.xpRequired - stage.xpRequired)) * 100
        : 100;

    const trunkTop    = stageIdx >= 5 ? 116 : stageIdx >= 4 ? 122 : 130;
    const trunkHeight = 166 - trunkTop;
    const trunkW      = stageIdx >= 5 ? 14 : 12;
    const trunkX      = 80 - trunkW / 2;

    return (
        <div className={"growing-tree"}>
            <div className={"growing-tree__title"}>🌳 My Growth Tree</div>

            <svg className={"growing-tree__svg"} viewBox="0 0 160 200" xmlns="http://www.w3.org/2000/svg">

                {/* ── Ground ───────────────────────────────────────── */}
                <ellipse cx="80" cy="178" rx="68" ry="16" fill="#0a1f11" />
                <ellipse cx="80" cy="174" rx="65" ry="12" fill="#133320" />
                <ellipse cx="80" cy="170" rx="62" ry="9"  fill="#1a4a27" />

                {/* ── Sprout phase  (stage 0 – 2) ──────────────────── */}
                {stageIdx < 3 && (
                    <g className="gt-sprout-bob">
                        {/* Seed */}
                        <ellipse cx="80" cy="167" rx="5.5" ry="3.5" fill="#795548" />
                        <ellipse cx="80" cy="166" rx="4"   ry="2.5" fill="#a1887f" />

                        {/* Stem */}
                        {stageIdx >= 1 && (
                            <line
                                x1="80" y1="167"
                                x2="80" y2={stageIdx === 1 ? 152 : 134}
                                stroke="#558b2f" strokeWidth="2.5" strokeLinecap="round"
                            />
                        )}

                        {/* Stage 1 leaves */}
                        {stageIdx >= 1 && (
                            <>
                                <ellipse cx="70" cy="153" rx="10" ry="5.5" fill="#66bb6a" transform="rotate(-35 70 153)" />
                                <ellipse cx="90" cy="153" rx="10" ry="5.5" fill="#4caf50" transform="rotate(35 90 153)" />
                                <circle  cx="80" cy="150" r="5"              fill="#81c784" />
                            </>
                        )}

                        {/* Stage 2 extra foliage */}
                        {stageIdx >= 2 && (
                            <>
                                <ellipse cx="66" cy="144" rx="12" ry="6"   fill="#558b2f" transform="rotate(-25 66 144)" />
                                <ellipse cx="94" cy="142" rx="12" ry="6"   fill="#388e3c" transform="rotate(25 94 142)" />
                                <ellipse cx="80" cy="135" rx="13" ry="8"   fill="#66bb6a" />
                                <ellipse cx="70" cy="136" rx="9"  ry="5"   fill="#81c784" transform="rotate(-15 70 136)" />
                                <ellipse cx="90" cy="135" rx="9"  ry="5"   fill="#4caf50" transform="rotate(15 90 135)" />
                                <circle  cx="80" cy="131" r="7"            fill="#a5d6a7" />
                            </>
                        )}
                    </g>
                )}

                {/* ── Tree phase  (stage 3+) ─────────────────────────── */}
                {stageIdx >= 3 && (
                    <g className="gt-tree-sway">
                        {/* Roots */}
                        <path d="M75 166 Q66 171 58 168" stroke="#5d4037" strokeWidth="3"   fill="none" strokeLinecap="round" />
                        <path d="M85 166 Q94 171 102 168" stroke="#5d4037" strokeWidth="3"   fill="none" strokeLinecap="round" />
                        {stageIdx >= 5 && (
                            <>
                                <path d="M75 166 Q68 174 60 173" stroke="#4e342e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                                <path d="M85 166 Q92 174 100 173" stroke="#4e342e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                            </>
                        )}

                        {/* Trunk */}
                        <rect x={trunkX}     y={trunkTop} width={trunkW}       height={trunkHeight} rx="5" fill="#6d4c41" />
                        <rect x={trunkX + 2} y={trunkTop} width={Math.max(3, trunkW - 6)} height={trunkHeight} rx="3" fill="#8d6e63" opacity="0.35" />

                        {/* Branches — stage 4+ */}
                        {stageIdx >= 4 && (
                            <>
                                <line x1="80" y1="135" x2="59"  y2="120" stroke="#6d4c41" strokeWidth="6" strokeLinecap="round" />
                                <line x1="80" y1="135" x2="101" y2="120" stroke="#6d4c41" strokeWidth="6" strokeLinecap="round" />
                            </>
                        )}

                        {/* Branches — stage 5+ */}
                        {stageIdx >= 5 && (
                            <>
                                <line x1="80" y1="128" x2="56"  y2="110" stroke="#5d4037" strokeWidth="5" strokeLinecap="round" />
                                <line x1="80" y1="128" x2="104" y2="110" stroke="#5d4037" strokeWidth="5" strokeLinecap="round" />
                                <line x1="80" y1="122" x2="80"  y2="100" stroke="#5d4037" strokeWidth="4" strokeLinecap="round" />
                                {stageIdx >= 6 && (
                                    <>
                                        <line x1="56" y1="110" x2="44"  y2="100" stroke="#4e342e" strokeWidth="3.5" strokeLinecap="round" />
                                        <line x1="104" y1="110" x2="116" y2="100" stroke="#4e342e" strokeWidth="3.5" strokeLinecap="round" />
                                    </>
                                )}
                            </>
                        )}

                        <g className="gt-canopy-breathe">
                        {/* ─ Canopy: stage 3 ─ */}
                        {stageIdx === 3 && (
                            <>
                                <circle cx="80" cy="118" r="17" fill="#2e7d32" />
                                <circle cx="68" cy="123" r="12" fill="#388e3c" />
                                <circle cx="92" cy="123" r="12" fill="#2e7d32" />
                                <circle cx="80" cy="108" r="14" fill="#43a047" />
                                <circle cx="73" cy="112" r="9"  fill="#66bb6a" opacity="0.6" />
                                <circle cx="87" cy="110" r="9"  fill="#4caf50" opacity="0.6" />
                            </>
                        )}

                        {/* ─ Canopy: stage 4 ─ */}
                        {stageIdx === 4 && (
                            <>
                                <circle cx="80" cy="112" r="21" fill="#2e7d32" />
                                <circle cx="61" cy="118" r="15" fill="#388e3c" />
                                <circle cx="99" cy="118" r="15" fill="#1b5e20" />
                                <circle cx="70" cy="103" r="15" fill="#43a047" />
                                <circle cx="90" cy="103" r="15" fill="#2e7d32" />
                                <circle cx="80" cy="96"  r="18" fill="#388e3c" />
                                <circle cx="80" cy="90"  r="13" fill="#66bb6a" opacity="0.7" />
                            </>
                        )}

                        {/* ─ Canopy: stage 5+ ─ */}
                        {stageIdx >= 5 && (
                            <>
                                {/* Wide base */}
                                <circle cx="54"  cy="122" r="16" fill="#1b5e20" />
                                <circle cx="106" cy="122" r="16" fill="#1b5e20" />
                                <circle cx="80"  cy="118" r="20" fill="#2e7d32" />
                                {/* Mid */}
                                <circle cx="63"  cy="108" r="17" fill="#388e3c" />
                                <circle cx="97"  cy="108" r="17" fill="#2e7d32" />
                                <circle cx="80"  cy="104" r="20" fill="#43a047" />
                                {/* Upper */}
                                <circle cx="68"  cy="93"  r="16" fill="#388e3c" />
                                <circle cx="92"  cy="93"  r="16" fill="#2e7d32" />
                                <circle cx="80"  cy="87"  r="19" fill="#43a047" />
                                {/* Top */}
                                <circle cx="80"  cy="75"  r="17" fill="#66bb6a" />
                                <circle cx="71"  cy="79"  r="12" fill="#81c784" opacity="0.8" />
                                <circle cx="89"  cy="79"  r="12" fill="#4caf50" opacity="0.8" />

                                {/* ─ Ancient extras: stage 6 ─ */}
                                {stageIdx >= 6 && (
                                    <>
                                        <circle cx="42"  cy="110" r="13" fill="#33691e" />
                                        <circle cx="118" cy="110" r="13" fill="#33691e" />
                                        <circle cx="50"  cy="97"  r="13" fill="#388e3c" />
                                        <circle cx="110" cy="97"  r="13" fill="#2e7d32" />

                                        {/* Yellow flowers */}
                                        {([[73,86],[88,82],[64,97],[96,95],[80,70],[61,104],[99,104],[70,77],[90,77]] as [number,number][]).map(([x, y], i) => (
                                            <g key={i} className="gt-flower" style={{ animationDelay: `${i * 0.28}s` }}>
                                                <circle cx={x} cy={y} r="4"   fill="#ffeb3b" opacity="0.9" />
                                                <circle cx={x} cy={y} r="1.8" fill="#fff176" />
                                            </g>
                                        ))}

                                        {/* Sparkle stars */}
                                        <circle className="gt-sparkle" cx="38" cy="88"  r="2.5" fill="#fff9c4" style={{ animationDelay: "0s" }} />
                                        <circle className="gt-sparkle" cx="122" cy="93" r="2.5" fill="#fff9c4" style={{ animationDelay: "0.9s" }} />
                                        <circle className="gt-sparkle" cx="80" cy="58"  r="3"   fill="#fff176" style={{ animationDelay: "1.8s" }} />
                                    </>
                                )}
                            </>
                        )}
                        </g>
                    </g>
                )}
            </svg>

            <div className={"growing-tree__stage-badge"}>{stage.name}</div>

            <div className={"growing-tree__bar-track"}>
                <div className={"growing-tree__bar-fill"} style={{ width: `${Math.min(progressToNext, 100)}%` }} />
            </div>

            <div className={"growing-tree__next"}>
                {nextStage ? (
                    <span>{xpForNext} XP to <em>{nextStage.name}</em></span>
                ) : (
                    <span className={"growing-tree__next--max"}>🌟 Fully Grown!</span>
                )}
            </div>
        </div>
    );
}
