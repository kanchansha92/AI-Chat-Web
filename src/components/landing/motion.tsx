import { useEffect, useRef, useState } from "react";

/* Two small motion helpers for the landing page. Both do nothing for anyone
   who has asked their system for reduced motion. */

const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Text that types itself out once it scrolls into view, after a short
 * "…" pause - the way a reply arrives in the app. The full text is laid out
 * from the start (the untyped part is invisible), so nothing around it jumps,
 * and a screen reader gets the whole sentence at once.
 */
export function Typed({
    text,
    delay = 700,
    speed = 22,
    className = "",
}: {
    text: string;
    /** ms of "typing…" dots before the first character */
    delay?: number;
    /** ms per character */
    speed?: number;
    className?: string;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const [shown, setShown] = useState(() => (prefersReducedMotion() ? text.length : 0));
    const [started, setStarted] = useState(() => prefersReducedMotion());

    useEffect(() => {
        if (started) return;
        const el = ref.current;
        if (!el || typeof IntersectionObserver === "undefined") {
            const t = window.setTimeout(() => setStarted(true), 0);
            return () => window.clearTimeout(t);
        }
        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setStarted(true);
                    io.disconnect();
                }
            },
            { threshold: 0.6 }
        );
        io.observe(el);
        return () => io.disconnect();
    }, [started]);

    useEffect(() => {
        if (!started || shown >= text.length) return;
        const t = window.setTimeout(() => setShown((n) => Math.min(text.length, n + 1)), shown === 0 ? delay : speed);
        return () => window.clearTimeout(t);
    }, [started, shown, text.length, delay, speed]);

    const waiting = shown === 0;
    const typing = shown > 0 && shown < text.length;

    return (
        <span ref={ref} className={"relative " + className}>
            <span className="sr-only">{text}</span>
            <span aria-hidden="true">
                {waiting ? (
                    <>
                        {/* the dots sit over the invisible text, not beside it */}
                        <span className="absolute left-0 top-0 inline-flex gap-1 pt-[0.45em]">
                            <span className="chat-dot h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                            <span className="chat-dot h-1.5 w-1.5 rounded-full bg-current opacity-60" style={{ animationDelay: "0.15s" }} />
                            <span className="chat-dot h-1.5 w-1.5 rounded-full bg-current opacity-60" style={{ animationDelay: "0.3s" }} />
                        </span>
                        <span className="invisible">{text}</span>
                    </>
                ) : (
                    <>
                        {text.slice(0, shown)}
                        {typing && <span className="chat-caret inline-block w-[2px] h-[1em] -mb-[0.15em] ml-px bg-current align-baseline" />}
                        <span className="invisible">{text.slice(shown)}</span>
                    </>
                )}
            </span>
        </span>
    );
}
