import { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { TranslationNamespaces } from "../../i18n.ts";
import "@styles/shared/coin-pot.scss";

const MAX_COINS = 500;

function getFillPercent(coins: number): number {
    return Math.min(coins / MAX_COINS, 1);
}

export function CoinPot({ coins }: { coins: number }): ReactElement {
    const { t } = useTranslation(TranslationNamespaces.Student);
    const fill = getFillPercent(coins);
    const fillPct = Math.round(fill * 100);

    // How many coins overflow the slot (0–3 based on fill)
    const overflowCoins = fill >= 0.8 ? 3 : fill >= 0.5 ? 2 : fill >= 0.25 ? 1 : 0;

    return (
        <div className="coin-pot">
            <div className="coin-pot__title">{t("coinpot-title")}</div>

            <svg className="coin-pot__svg" viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <radialGradient id="bodyGrad" cx="38%" cy="35%" r="60%">
                        <stop offset="0%"   stopColor="#ffb3c6" />
                        <stop offset="55%"  stopColor="#ff6b9d" />
                        <stop offset="100%" stopColor="#c9184a" />
                    </radialGradient>
                    <radialGradient id="earGrad" cx="40%" cy="35%" r="60%">
                        <stop offset="0%"   stopColor="#ffb3c6" />
                        <stop offset="100%" stopColor="#ff6b9d" />
                    </radialGradient>
                    <linearGradient id="coinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%"   stopColor="#ffe566" />
                        <stop offset="100%" stopColor="#c98a00" />
                    </linearGradient>
                    <filter id="pigShadow" x="-10%" y="-10%" width="120%" height="130%">
                        <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="rgba(0,0,0,0.3)" />
                    </filter>
                </defs>

                {/* Ground shadow */}
                <ellipse cx="100" cy="173" rx="58" ry="7" fill="rgba(0,0,0,0.18)" />

                {/* Tail (behind body) */}
                <path d="M160 132 Q184 118 177 107 Q170 97 161 108" fill="none" stroke="#ff6b9d" strokeWidth="5" strokeLinecap="round" />

                {/* Body */}
                <ellipse cx="100" cy="125" rx="62" ry="52" fill="url(#bodyGrad)" filter="url(#pigShadow)" />
                {/* Body highlight */}
                <ellipse cx="78" cy="100" rx="20" ry="13" fill="rgba(255,255,255,0.18)" />

                {/* Left ear (behind head) */}
                <ellipse cx="68" cy="76" rx="15" ry="13" fill="url(#earGrad)" />
                <ellipse cx="68" cy="78" rx="8"  ry="7"  fill="#ffccd5" />

                {/* Right ear (behind head) */}
                <ellipse cx="132" cy="76" rx="15" ry="13" fill="url(#earGrad)" />
                <ellipse cx="132" cy="78" rx="8"  ry="7"  fill="#ffccd5" />

                {/* Head */}
                <ellipse cx="100" cy="90" rx="38" ry="34" fill="url(#bodyGrad)" filter="url(#pigShadow)" />
                {/* Head highlight */}
                <ellipse cx="87" cy="76" rx="13" ry="9" fill="rgba(255,255,255,0.2)" />

                {/* Snout */}
                <ellipse cx="100" cy="105" rx="20" ry="14" fill="#ffccd5" />
                <circle cx="93"  cy="106" r="4" fill="#c9184a" opacity="0.45" />
                <circle cx="107" cy="106" r="4" fill="#c9184a" opacity="0.45" />

                {/* Left eye */}
                <g className="coin-pot__eye">
                    <circle cx="86"  cy="85" r="5"   fill="#fff" />
                    <circle cx="88"  cy="85" r="2.5" fill="#1a1a2e" />
                    <circle cx="89"  cy="84" r="1"   fill="#fff" />
                </g>

                {/* Right eye */}
                <g className="coin-pot__eye">
                    <circle cx="114" cy="85" r="5"   fill="#fff" />
                    <circle cx="116" cy="85" r="2.5" fill="#1a1a2e" />
                    <circle cx="117" cy="84" r="1"   fill="#fff" />
                </g>

                {/* Coin slot */}
                <rect x="90" y="57" width="20" height="5" rx="2.5" fill="#a01030" opacity="0.8" />

                {/* Overflow coins sticking out of the slot */}
                {overflowCoins >= 1 && (
                    <g className="coin-pot__coin">
                        <ellipse cx="100" cy="54" rx="10" ry="5" fill="#b8860b" />
                        <ellipse cx="100" cy="52" rx="10" ry="5" fill="url(#coinGrad)" />
                        <ellipse cx="100" cy="51" rx="7"  ry="3" fill="rgba(255,240,120,0.6)" />
                    </g>
                )}
                {overflowCoins >= 2 && (
                    <g className="coin-pot__coin" style={{ animationDelay: "0.25s" }}>
                        <ellipse cx="100" cy="47" rx="10" ry="5" fill="#b8860b" />
                        <ellipse cx="100" cy="45" rx="10" ry="5" fill="url(#coinGrad)" />
                        <ellipse cx="100" cy="44" rx="7"  ry="3" fill="rgba(255,240,120,0.6)" />
                    </g>
                )}
                {overflowCoins >= 3 && (
                    <g className="coin-pot__coin" style={{ animationDelay: "0.5s" }}>
                        <ellipse cx="100" cy="40" rx="10" ry="5" fill="#b8860b" />
                        <ellipse cx="100" cy="38" rx="10" ry="5" fill="url(#coinGrad)" />
                        <ellipse cx="100" cy="37" rx="7"  ry="3" fill="rgba(255,240,120,0.6)" />
                    </g>
                )}

                {/* Legs */}
                <rect x="60"  y="165" width="18" height="10" rx="5" fill="#ff6b9d" />
                <rect x="84"  y="165" width="18" height="10" rx="5" fill="#ff6b9d" />
                <rect x="100"  y="165" width="18" height="10" rx="5" fill="#ff6b9d" />
                <rect x="122" y="165" width="18" height="10" rx="5" fill="#ff6b9d" />

                {/* Sparkles when full */}
                {fill >= 1 && (
                    <>
                        <circle cx="52"  cy="62" r="3"   fill="#ffd700" className="coin-pot__sparkle" style={{ animationDelay: "0s" }} />
                        <circle cx="152" cy="62" r="3"   fill="#ffd700" className="coin-pot__sparkle" style={{ animationDelay: "0.5s" }} />
                        <circle cx="100" cy="24" r="4"   fill="#ffe066" className="coin-pot__sparkle" style={{ animationDelay: "1s" }} />
                        <circle cx="72"  cy="46" r="2.5" fill="#ffc107" className="coin-pot__sparkle" style={{ animationDelay: "1.5s" }} />
                        <circle cx="128" cy="46" r="2.5" fill="#ffc107" className="coin-pot__sparkle" style={{ animationDelay: "0.8s" }} />
                    </>
                )}
            </svg>

            <div className="coin-pot__count">{t("coinpot-coins", { count: coins })}</div>

            <div className="coin-pot__bar-track">
                <div className="coin-pot__bar-fill" style={{ width: `${fillPct}%` }} />
            </div>
            <div className="coin-pot__bar-label">
                {fill >= 1 ? t("coinpot-full") : t("coinpot-to-fill", { current: coins, max: MAX_COINS })}
            </div>
        </div>
    );
}

