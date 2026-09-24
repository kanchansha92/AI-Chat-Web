import { useId } from "react";

/* Original illustrations for the landing page - drawn as inline SVG so there
   are no image files to download and nothing to license. The characters are
   Privateaile's own example cast (Maya, Alex, Arjun); the two "generated"
   pictures are illustrations of what image generation produces, not real
   output. Everything is aria-hidden: the surrounding copy says what matters. */

type PortraitVariant = "maya" | "alex" | "arjun";

const PORTRAITS: Record<
    PortraitVariant,
    { bg: [string, string]; skin: string; hair: string; top: string; long?: boolean; beard?: boolean }
> = {
    maya: { bg: ["#E6E1F6", "#F6E4E0"], skin: "#F1D2BE", hair: "#3A2828", top: "#C9C4EE", long: true },
    alex: { bg: ["#DDE6F3", "#EEE9F7"], skin: "#EBC4A7", hair: "#6B4A38", top: "#8FA3C8" },
    arjun: { bg: ["#E8E2F2", "#F1E9E2"], skin: "#C8966F", hair: "#231D1D", top: "#25315E", beard: true },
};

/** A small, friendly portrait of one of the example characters. */
export function Portrait({ variant, className = "" }: { variant: PortraitVariant; className?: string }) {
    const p = PORTRAITS[variant];
    const id = `pt-${variant}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    return (
        <svg viewBox="0 0 120 120" className={className} aria-hidden="true" focusable="false">
            <defs>
                <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor={p.bg[0]} />
                    <stop offset="1" stopColor={p.bg[1]} />
                </linearGradient>
                <clipPath id={`${id}-clip`}>
                    <rect width="120" height="120" rx="60" />
                </clipPath>
            </defs>
            <g clipPath={`url(#${id}-clip)`}>
                <rect width="120" height="120" fill={`url(#${id}-bg)`} />
                {p.long && <path d="M33 52C33 27 47 18 60 18c14 0 27 9 27 34l3 44c-9 8-51 8-60 0z" fill={p.hair} />}
                <path d="M20 122c2-24 19-35 40-35s38 11 40 35z" fill={p.top} />
                <rect x="52.5" y="66" width="15" height="24" rx="7" fill={p.skin} />
                <rect x="52.5" y="76" width="15" height="6" fill="#000" opacity="0.06" />
                <ellipse cx="60" cy="52" rx="19.5" ry="22.5" fill={p.skin} />
                {p.beard && <path d="M41 56c1 17 10 25 19 25s18-8 19-25c-4 10-11 14-19 14s-15-4-19-14z" fill={p.hair} opacity="0.88" />}
                {p.long ? (
                    <path d="M39 48c1-17 11-25 22-25 13 0 21 10 20 24-6-7-14-11-23-12-6 3-13 8-19 13z" fill={p.hair} />
                ) : (
                    <path d="M39 49c-3-18 8-29 22-29 15 0 25 10 21 29-3-9-10-15-21-15-10 0-18 6-22 15z" fill={p.hair} />
                )}
                <g fill="none" stroke="#2A2130" strokeWidth="1.9" strokeLinecap="round">
                    <path d="M49.5 54.5q3.2-3 6.4 0" />
                    <path d="M64.1 54.5q3.2-3 6.4 0" />
                    <path d="M55 64.5q5 3.6 10 0" />
                </g>
                <ellipse cx="48.5" cy="61" rx="4" ry="2.4" fill="#EE9E96" opacity="0.45" />
                <ellipse cx="71.5" cy="61" rx="4" ry="2.4" fill="#EE9E96" opacity="0.45" />
            </g>
        </svg>
    );
}

/** An illustrated "generated" picture: Mt Fuji and a pagoda at dusk. */
export function SceneFuji({ className = "" }: { className?: string }) {
    const id = `fj-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    return (
        <svg viewBox="0 0 320 200" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
            <defs>
                <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#B9B4E4" />
                    <stop offset="0.55" stopColor="#E8CFE0" />
                    <stop offset="1" stopColor="#F7DCCF" />
                </linearGradient>
                <linearGradient id={`${id}-lake`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#B8B2DA" />
                    <stop offset="1" stopColor="#8E8AC0" />
                </linearGradient>
            </defs>
            <rect width="320" height="200" fill={`url(#${id}-sky)`} />
            <circle cx="214" cy="104" r="26" fill="#FBE9DE" opacity="0.95" />
            <path d="M0 150c40-14 70-10 110-20s90-8 130 2 60 6 80 2v36H0z" fill="#A7A3CE" />
            <path d="M40 158 146 70c8-7 18-7 26 0l106 88z" fill="#7F82B2" />
            <path d="M146 70c8-7 18-7 26 0l14 12-10-1-7 7-8-6-8 6-8-6-11 1z" fill="#FBF8FF" />
            <rect y="158" width="320" height="42" fill={`url(#${id}-lake)`} />
            <g stroke="#E9E4F7" strokeWidth="1.2" opacity="0.55" strokeLinecap="round">
                <path d="M120 170h40M170 176h30M100 184h26M190 188h40" />
            </g>
            {/* pagoda */}
            <g fill="#25315E">
                <rect x="252" y="96" width="4" height="62" />
                <path d="M234 158h40l-6-8h-28z" />
                <path d="M237 150c10-4 24-4 34 0l6-6c-15-5-31-5-46 0z" />
                <rect x="244" y="132" width="20" height="14" fill="#3A4570" />
                <path d="M238 132c10-4 22-4 32 0l5-6c-14-5-28-5-42 0z" />
                <rect x="246" y="116" width="16" height="12" fill="#3A4570" />
                <path d="M240 116c9-3 19-3 28 0l5-6c-12-4-26-4-38 0z" />
                <rect x="248" y="102" width="12" height="10" fill="#3A4570" />
                <path d="M242 102c8-3 16-3 24 0l4-5c-10-4-22-4-32 0z" />
            </g>
            {/* blossom branch */}
            <path d="M0 22c30 4 52 16 70 34M34 30c4-10 12-16 22-18" stroke="#5B4552" strokeWidth="3" fill="none" strokeLinecap="round" />
            <g fill="#F3B8C8">
                {[
                    [18, 20], [30, 30], [44, 26], [52, 12], [58, 44], [66, 52], [40, 40], [24, 12], [62, 30],
                ].map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 6 : 4.5} opacity={0.75 + (i % 3) * 0.08} />
                ))}
            </g>
        </svg>
    );
}

/** Deterministic little pseudo-random, so windows don't shuffle per render. */
const rand = (n: number) => {
    const x = Math.sin(n * 91.7) * 10000;
    return x - Math.floor(x);
};

/** An illustrated "generated" picture: an explorer on a rainy Tokyo street. */
export function SceneTokyo({ className = "", tint = 0 }: { className?: string; tint?: 0 | 1 | 2 }) {
    const skies: [string, string, string][] = [
        ["#171F48", "#3E3574", "#A98BCB"],
        ["#1C2250", "#2F4A7A", "#8FB3D6"],
        ["#241A45", "#5A3570", "#D29BB6"],
    ];
    const [s0, s1, s2] = skies[tint];
    const id = `tk-${tint}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
    const buildings = [
        { x: 0, w: 46, h: 132 },
        { x: 42, w: 38, h: 158 },
        { x: 78, w: 52, h: 116 },
        { x: 186, w: 44, h: 150 },
        { x: 226, w: 40, h: 124 },
        { x: 262, w: 58, h: 166 },
    ];
    return (
        <svg viewBox="0 0 320 200" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
            <defs>
                <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={s0} />
                    <stop offset="0.6" stopColor={s1} />
                    <stop offset="1" stopColor={s2} />
                </linearGradient>
                <linearGradient id={`${id}-street`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={s1} />
                    <stop offset="1" stopColor={s0} />
                </linearGradient>
            </defs>
            <rect width="320" height="200" fill={`url(#${id}-sky)`} />
            <circle cx="160" cy="40" r="16" fill="#F4ECFF" opacity="0.85" />
            {buildings.map((b, bi) => (
                <g key={bi}>
                    <rect x={b.x} y={170 - b.h} width={b.w} height={b.h} fill={s0} opacity={0.92} />
                    {Array.from({ length: Math.floor(b.h / 12) }).map((_, r) =>
                        Array.from({ length: Math.floor(b.w / 10) }).map((__, c) => {
                            const lit = rand(bi * 97 + r * 13 + c) > 0.55;
                            return lit ? (
                                <rect
                                    key={`${r}-${c}`}
                                    x={b.x + 4 + c * 10}
                                    y={170 - b.h + 6 + r * 12}
                                    width="4"
                                    height="5"
                                    fill={rand(bi + r * 3 + c * 7) > 0.8 ? "#C9C4EE" : "#F6E3B8"}
                                    opacity={0.55 + rand(r + c + bi) * 0.4}
                                />
                            ) : null;
                        })
                    )}
                </g>
            ))}
            {/* signs */}
            <rect x="92" y="70" width="10" height="34" rx="2" fill="#E6A5CF" opacity="0.85" />
            <rect x="196" y="48" width="12" height="40" rx="2" fill="#9FD1E8" opacity="0.8" />
            <rect x="270" y="30" width="34" height="10" rx="2" fill="#F2C38B" opacity="0.8" />
            {/* street */}
            <rect y="168" width="320" height="32" fill={`url(#${id}-street)`} />
            <g opacity="0.35">
                <rect x="92" y="172" width="10" height="22" fill="#E6A5CF" />
                <rect x="196" y="172" width="12" height="24" fill="#9FD1E8" />
            </g>
            {/* explorer */}
            <g transform="translate(150 96)">
                <path d="M-14 40c2-16 8-24 18-24s16 8 18 24l2 34h-40z" fill="#12173A" />
                <rect x="-22" y="22" width="12" height="30" rx="5" fill="#2A2F5C" />
                <circle cx="4" cy="6" r="11" fill="#12173A" />
                <path d="M-7 4c2-10 20-12 22 0" fill="none" stroke="#C9C4EE" strokeWidth="1.6" opacity="0.8" />
                <path d="M-14 40c2-16 8-24 18-24" fill="none" stroke="#C9C4EE" strokeWidth="1.4" opacity="0.6" />
            </g>
            {/* rain */}
            <g stroke="#E9E4FF" strokeWidth="0.8" opacity="0.28" strokeLinecap="round">
                {Array.from({ length: 34 }).map((_, i) => {
                    const x = rand(i + 5) * 320;
                    const y = rand(i + 50) * 170;
                    return <path key={i} d={`M${x} ${y}l-4 10`} />;
                })}
            </g>
        </svg>
    );
}
