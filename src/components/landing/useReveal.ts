import { useEffect } from "react";

const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Fades `.lp-reveal` elements up as they enter the viewport. Only elements
 * present on mount are watched - keep it on static section wrappers.
 */
export function useReveal() {
    useEffect(() => {
        const els = Array.from(document.querySelectorAll<HTMLElement>(".lp-reveal"));
        if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
            els.forEach((el) => el.classList.add("is-in"));
            return;
        }
        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (e.isIntersecting) {
                        e.target.classList.add("is-in");
                        io.unobserve(e.target);
                    }
                }
            },
            { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
        );
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, []);
}
