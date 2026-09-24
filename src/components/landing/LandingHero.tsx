/* Decorative pieces for the landing hero: the brand mark, the linen notebook,
   the fine lavender curves and the handwritten words. All inline SVG drawn in
   theme tokens - no image files to download - and all aria-hidden. */

/** The ink-drop mark that sits before the wordmark. */
export function BrandMark({ className = "h-7 w-5" }: { className?: string }) {
    return (
        <svg viewBox="0 0 20 28" className={className} aria-hidden="true">
            <path
                d="M10 1.5C10 1.5 3 10.2 3 15.6a7 7 0 0 0 14 0C17 10.2 10 1.5 10 1.5z"
                style={{ fill: "var(--color-rust)" }}
            />
            <path d="M6.6 15.2a3.6 3.6 0 0 0 2.4 3.9" fill="none" style={{ stroke: "var(--color-cream-light)" }} strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M3.5 26h13" style={{ stroke: "var(--color-rust)" }} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
}

/** A cloth-bound notebook lying at an angle, ribbon hanging out. */
export function NotebookArt({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 560 660" className={className} aria-hidden="true" focusable="false">
            <defs>
                <linearGradient id="lp-cover" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" style={{ stopColor: "color-mix(in srgb, var(--color-linen) 70%, white)" }} />
                    <stop offset="0.55" style={{ stopColor: "var(--color-linen)" }} />
                    <stop offset="1" style={{ stopColor: "color-mix(in srgb, var(--color-linen) 88%, #8c7a6e)" }} />
                </linearGradient>
                <linearGradient id="lp-spine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#6b5a4e" stopOpacity="0.22" />
                    <stop offset="0.6" stopColor="#6b5a4e" stopOpacity="0.05" />
                    <stop offset="1" stopColor="#6b5a4e" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="lp-ribbon" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" style={{ stopColor: "color-mix(in srgb, var(--color-rust) 55%, #8f8aa8)" }} />
                    <stop offset="0.5" style={{ stopColor: "color-mix(in srgb, var(--color-rust) 35%, #b3aec8)" }} />
                    <stop offset="1" style={{ stopColor: "color-mix(in srgb, var(--color-rust) 60%, #8f8aa8)" }} />
                </linearGradient>
                {/* fine cloth weave: two stretched noise fields, very faint */}
                <filter id="lp-weave" x="0" y="0" width="100%" height="100%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.015 1.1" numOctaves="2" seed="3" result="h" />
                    <feTurbulence type="fractalNoise" baseFrequency="1.1 0.015" numOctaves="2" seed="7" result="v" />
                    <feBlend in="h" in2="v" mode="multiply" result="w" />
                    <feColorMatrix in="w" values="0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.22  0 0 0 0.22 0" />
                    <feComposite in2="SourceGraphic" operator="in" />
                </filter>
                <filter id="lp-shadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="16" />
                </filter>
            </defs>

            <g transform="translate(0 30) rotate(-32 280 280)">
                {/* shadow on the desk */}
                <rect x="112" y="98" width="312" height="408" rx="18" style={{ fill: "var(--color-charcoal)" }} opacity="0.16" filter="url(#lp-shadow)" transform="translate(-22 20)" />

                {/* page block, seen along the fore-edge */}
                <rect x="118" y="86" width="300" height="400" rx="12" style={{ fill: "color-mix(in srgb, var(--color-linen) 80%, #b8a898)" }} transform="translate(-10 12)" />
                <rect x="118" y="86" width="300" height="400" rx="12" fill="#fbf8f4" transform="translate(-6 7)" />
                <g stroke="#e6ddd4" strokeWidth="0.8" opacity="0.9">
                    <path d="M114 491h296M113 489h298M112 487h300" transform="translate(0 2)" />
                </g>

                {/* ribbon, tucked between the pages */}
                <path d="M340 470h15l2 112-9.5-11-9.5 11z" fill="url(#lp-ribbon)" />

                {/* the cover */}
                <rect x="118" y="80" width="300" height="400" rx="12" fill="url(#lp-cover)" />
                <rect x="118" y="80" width="300" height="400" rx="12" fill="#fff" filter="url(#lp-weave)" />
                <rect x="118" y="80" width="30" height="400" rx="12" fill="url(#lp-spine)" />
                <rect x="118.5" y="80.5" width="299" height="399" rx="11.5" fill="none" stroke="#fff" strokeOpacity="0.55" />

                {/* debossed sprout */}
                <g transform="translate(350 150)" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <g stroke="#fff" strokeOpacity="0.8" strokeWidth="2.2" transform="translate(1 1.2)">
                        <path d="M0 34V-8" />
                        <path d="M0 14C-13 11-19 1-18-9c9 1 17 8 18 23z" />
                        <path d="M0 14C13 11 19 1 18-9C9-8 1-1 0 14z" />
                        <path d="M0-6C-6-15-5-26 0-33c5 7 6 18 0 27z" />
                    </g>
                    <g stroke="#b9ab9f" strokeWidth="2.2">
                        <path d="M0 34V-8" />
                        <path d="M0 14C-13 11-19 1-18-9c9 1 17 8 18 23z" />
                        <path d="M0 14C13 11 19 1 18-9C9-8 1-1 0 14z" />
                        <path d="M0-6C-6-15-5-26 0-33c5 7 6 18 0 27z" />
                    </g>
                </g>
            </g>
        </svg>
    );
}

/** Two hairline curves drifting across the hero, like a pen lifted mid-line. */
export function HeroCurves({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={className} aria-hidden="true">
            <g fill="none" style={{ stroke: "var(--color-lavender-line)" }} strokeWidth="1.2" vectorEffect="non-scaling-stroke" strokeLinecap="round">
                <path d="M101 9C94 15 88 22 80 25.5 74 28 69 28.6 64 28.4" vectorEffect="non-scaling-stroke" />
                <path d="M52 60C60 55 66 52 72 51.5 80 51 88 48 101 41" vectorEffect="non-scaling-stroke" />
            </g>
        </svg>
    );
}

/** A few words pencilled in at an angle, e.g. "think / write / remember / create". */
export function HandwrittenWords({
    className = "",
    words = ["think", "write", "remember", "create"],
}: {
    className?: string;
    words?: string[];
}) {
    return (
        <div aria-hidden="true" className={"lp-script select-none text-rust-light/70 leading-[1.9] -rotate-[14deg] " + className}>
            {words.map((w, i) => (
                <p key={w} style={{ paddingLeft: `${i * 0.55}em` }}>
                    {w}
                </p>
            ))}
        </div>
    );
}

/** A hand-drawn arrow, the kind you'd pencil in a margin. */
export function PencilArrow({ className = "", flip = false }: { className?: string; flip?: boolean }) {
    return (
        <svg viewBox="0 0 80 48" className={className} aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}>
            <g fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "currentColor" }} strokeWidth="1.6">
                <path d="M4 8c14 2 30 8 42 18 8 7 14 12 24 16" />
                <path d="M60 44l10-2-5-9" />
            </g>
        </svg>
    );
}

/** The sparkle used wherever Privateaile itself is speaking. */
export function Spark({ className = "h-4 w-4" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" style={{ fill: "currentColor" }}>
            <path d="M11 2.5c.7 4.8 2.7 6.8 7.5 7.5-4.8.7-6.8 2.7-7.5 7.5-.7-4.8-2.7-6.8-7.5-7.5 4.8-.7 6.8-2.7 7.5-7.5z" />
            <path d="M18.5 15c.35 2.2 1.3 3.15 3.5 3.5-2.2.35-3.15 1.3-3.5 3.5-.35-2.2-1.3-3.15-3.5-3.5 2.2-.35 3.15-1.3 3.5-3.5z" opacity="0.7" />
        </svg>
    );
}
